import { GameState, States } from './core/GameState.js';
import { eventBus } from './core/EventBus.js';
import { Unit } from './battle/Unit.js';
import { calculateEquipmentBonuses, equipmentDetailText } from './battle/EquipmentSystem.js';
import { BattleManager } from './battle/BattleManager.js';
import { BattleUI } from './ui/BattleUI.js';
import { IntermissionUI } from './ui/IntermissionUI.js';
import { partyData } from './data/partyData.js';
import {
  crystalShards,
  ff5BattleRules,
  ff5Equipment,
  ff5Items,
  ff5JobAbilities,
  ff5Magic,
  ff5Songs,
} from './database/ff5Database.js';
import { FirebaseAccountService } from './services/FirebaseAccountService.js';
import { MESSAGE_SPEED_PRESETS, getMessageSpeed, setMessageSpeed } from './core/Settings.js';
import { getUnitLoadout } from './core/Loadout.js';
import { clearSuspendSave, readSuspendSave, writeSuspendSave } from './core/SuspendSave.js';
import { bossData } from './data/bossData.js';
import { ff5BossTechniques } from './database/ff5BossTechniques.js';
import {
  battleReadyAbilities,
  battleReadyEquipment,
  battleReadyItems,
  battleReadyMagic,
  battleReadyShards,
  battleReadySongs,
} from './database/battleCatalog.js';

// ---------- Screen switching ----------
const screens = {
  TITLE: document.getElementById('title-screen'),
  MENU: document.getElementById('menu-screen'),
  BATTLE: document.getElementById('battle-screen'),
  INTERMISSION: document.getElementById('intermission-screen'),
  VICTORY: document.getElementById('victory-screen'),
  GAMEOVER: document.getElementById('gameover-screen'),
};

function showScreen(stateName) {
  Object.values(screens).forEach((el) => el.classList.remove('active-screen'));
  screens[stateName]?.classList.add('active-screen');
}

eventBus.on('state:changed', ({ next }) => showScreen(next));

// ---------- Player profile / menu ----------
const PROFILE_STORAGE_KEY = 'ff-crystal-rush-profile-v1';
const shardCatalog = [
  { id: 'azure', name: '蒼光のかけら', ability: 'アクアスパイラル' },
  { id: 'ember', name: '紅炎のかけら', ability: 'フレイムバースト' },
  { id: 'storm', name: '紫電のかけら', ability: 'ライトニングエッジ' },
  { id: 'verdant', name: '翠風のかけら', ability: 'ウィンドカッター' },
];
const defaultItemInventory = Object.freeze(Object.fromEntries(battleReadyItems.map((item) => [
  item.id,
  item.id === 'item_potion' ? 3
    : ['item_magic_lamp', 'item_beastmaster_gourd'].includes(item.id) ? 1
      : item.category === 'camp' ? 0 : 2,
])));

const defaultProfile = {
  name: 'PLAYER',
  loginId: '',
  level: 1,
  gil: 2000,
  diamonds: 900,
  potions: 3,
  items: { ...defaultItemInventory },
  volume: 70,
  windowHue: 220,
  shards: [{ ...shardCatalog[0], count: 1 }],
};

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || 'null');
    if (!saved) return structuredClone(defaultProfile);
    const merged = {
      ...structuredClone(defaultProfile),
      ...saved,
      shards: Array.isArray(saved.shards) ? saved.shards : structuredClone(defaultProfile.shards),
      items: { ...defaultItemInventory, ...(saved.items ?? {}) },
    };
    // Migrate the earlier status-bar-only color setting to the whole UI.
    merged.windowHue = Number(saved.windowHue ?? saved.statusHue ?? defaultProfile.windowHue);
    merged.items.item_potion = Number(saved.items?.item_potion ?? saved.potions ?? merged.items.item_potion);
    merged.potions = merged.items.item_potion;
    delete merged.statusHue;
    return merged;
  } catch {
    return structuredClone(defaultProfile);
  }
}

let profile = loadProfile();
let firebaseAccount = null;
let accountSnapshot = {
  status: 'unconfigured',
  user: null,
  isConfigured: false,
  isSignedIn: false,
  isAdmin: false,
};
let loadedCloudUid = null;
let cloudSaveTimer = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function applyProfileOptions() {
  document.documentElement.style.setProperty('--window-hue', String(profile.windowHue));
}

function renderProfileStatus() {
  document.getElementById('profile-name').textContent = profile.name;
  document.getElementById('profile-level').textContent = profile.level;
  document.getElementById('profile-gil').textContent = profile.gil.toLocaleString('ja-JP');
  document.getElementById('profile-diamonds').textContent = profile.diamonds.toLocaleString('ja-JP');
}

function saveProfile({ cloud = true } = {}) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // The game remains usable when storage is unavailable (for example file:// previews).
  }
  applyProfileOptions();
  renderProfileStatus();

  if (cloud && firebaseAccount?.isSignedIn) {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
      firebaseAccount.saveProfile(profile).catch((error) => {
        console.warn('Firestore profile sync failed:', error);
      });
    }, 350);
  }
}

function accountStatusText() {
  if (accountSnapshot.status === 'unconfigured') return 'Firebase未接続：設定値を登録するとクラウド保存を利用できます。';
  if (accountSnapshot.status === 'connecting' || accountSnapshot.status === 'idle') return 'Firebaseへ接続しています…';
  if (accountSnapshot.status === 'error') return 'Firebaseへの接続に失敗しました。設定値と許可ドメインを確認してください。';
  if (accountSnapshot.isSignedIn) {
    return `ログイン中：${profile.name}`;
  }
  return '未ログイン：新規登録またはログインしてください。';
}

function updateAccountUi() {
  const adminButton = document.getElementById('admin-mode-button');
  adminButton?.classList.toggle('hidden', !accountSnapshot.isAdmin);
  const status = document.getElementById('account-status');
  if (status) status.textContent = accountStatusText();
}

function applyCloudProfile(data) {
  if (!data) return;
  profile = {
    ...profile,
    name: data.playerName ?? profile.name,
    loginId: data.loginId ?? profile.loginId,
    level: Number(data.level ?? profile.level),
    gil: Number(data.gil ?? profile.gil),
    diamonds: Number(data.diamonds ?? profile.diamonds),
    potions: Number(data.potions ?? profile.potions),
    items: { ...profile.items, ...(data.items ?? {}) },
    volume: Number(data.volume ?? profile.volume),
    windowHue: Number(data.windowHue ?? profile.windowHue),
    shards: Array.isArray(data.shards) ? data.shards : profile.shards,
  };
  profile.items.item_potion = Number(data.items?.item_potion ?? data.potions ?? profile.items.item_potion);
  profile.potions = profile.items.item_potion;
  saveProfile({ cloud: false });
}

async function handleAccountState(snapshot) {
  accountSnapshot = snapshot;
  updateAccountUi();
  if (!snapshot.user) {
    loadedCloudUid = null;
    return;
  }
  if (loadedCloudUid === snapshot.user.uid) return;
  loadedCloudUid = snapshot.user.uid;
  try {
    applyCloudProfile(await firebaseAccount.loadProfile());
    updateAccountUi();
  } catch (error) {
    console.warn('Firestore profile load failed:', error);
  }
}

const menuPanelEl = document.getElementById('menu-panel');
const menuPanelTitleEl = document.getElementById('menu-panel-title');
const menuPanelContentEl = document.getElementById('menu-panel-content');

function closeMenuPanel() {
  menuPanelEl.classList.add('hidden');
  menuPanelContentEl.innerHTML = '';
}

function openMenuPanel(title, html) {
  menuPanelTitleEl.textContent = title;
  menuPanelContentEl.innerHTML = html;
  menuPanelEl.classList.remove('hidden');
}

function openMainMenu() {
  closeMenuPanel();
  renderProfileStatus();
  GameState.set(States.MENU);
}

function renderCourseSelect() {
  openMenuPanel(
    'コース選択',
    `<div class="course-list">
      <button id="course-beginner" class="course-card">
        <span class="course-rank">COURSE 01</span>
        <strong>クリスタル探索・初級</strong>
        <small>3連戦 / 1戦目「オメガ」実装検証 / 初回報酬 300 GIL</small>
        <span class="course-start-label">編成へ進む</span>
      </button>
    </div>`
  );
  document.getElementById('course-beginner').addEventListener('click', beginCourseSetup);
}

function renderShop(message = '') {
  openMenuPanel(
    'ショップ',
    `${message ? `<p class="menu-notice">${escapeHtml(message)}</p>` : ''}
    <div class="shop-card">
      <div>
        <strong>ポーション</strong>
        <small>味方ひとりのHPを50回復</small>
      </div>
      <div class="shop-card-side">
        <span>所持 ${profile.potions}</span>
        <button id="buy-potion" class="panel-button">100 GIL</button>
      </div>
    </div>`
  );
  document.getElementById('buy-potion').addEventListener('click', () => {
    if (profile.gil < 100) {
      renderShop('ギルが足りません。');
      return;
    }
    profile.gil -= 100;
    profile.potions += 1;
    profile.items.item_potion = profile.potions;
    saveProfile();
    renderShop('ポーションを購入しました。');
  });
}

function renderGacha(message = '') {
  openMenuPanel(
    'クリスタルガチャ',
    `<div class="gacha-visual" aria-hidden="true"><span></span></div>
    <p>クリスタルに眠る技の記憶を「かけら」として呼び出します。</p>
    ${message ? `<p class="menu-notice">${escapeHtml(message)}</p>` : ''}
    <button id="draw-crystal" class="panel-button primary">1回召喚 / 300 DIAMOND</button>`
  );
  document.getElementById('draw-crystal').addEventListener('click', () => {
    if (profile.diamonds < 300) {
      renderGacha('ダイヤが足りません。');
      return;
    }
    profile.diamonds -= 300;
    const drawn = shardCatalog[Math.floor(Math.random() * shardCatalog.length)];
    const owned = profile.shards.find((item) => item.id === drawn.id);
    if (owned) owned.count += 1;
    else profile.shards.push({ ...drawn, count: 1 });
    saveProfile();
    renderGacha(`${drawn.name}を入手！ アビリティ「${drawn.ability}」の記憶が輝いている。`);
  });
}

function renderKeyItems() {
  const items = profile.shards.length
    ? profile.shards
        .map(
          (item) => `<li class="shard-row">
            <span class="shard-gem" aria-hidden="true"></span>
            <span><strong>${escapeHtml(item.name)}</strong><small>記憶技：${escapeHtml(item.ability)}</small></span>
            <b>×${item.count}</b>
          </li>`
        )
        .join('')
    : '<li class="empty-state">まだクリスタルのかけらを持っていません。</li>';
  openMenuPanel('だいじなもの', `<ul class="shard-list">${items}</ul>`);
}

function renderOptions(message = '') {
  const accountDisabled = !accountSnapshot.isConfigured || ['connecting', 'idle', 'error'].includes(accountSnapshot.status);
  const signedIn = accountSnapshot.isSignedIn;
  openMenuPanel(
    'オプション',
    `<form id="options-form" class="options-form">
      ${message ? `<p class="menu-notice">${escapeHtml(message)}</p>` : ''}
      <section class="account-card">
        <h4>ユーザーアカウント</h4>
        ${signedIn
          ? `<div class="account-actions account-status-row">
               <p id="account-status" class="account-status">${escapeHtml(accountStatusText())}</p>
               <button id="account-sign-out" class="panel-button" type="button">ログアウト</button>
             </div>`
          : `<p id="account-status" class="account-status">${escapeHtml(accountStatusText())}</p>`}
        <label>プレイヤー名
          <input id="option-player-name" maxlength="12" autocomplete="nickname" value="${escapeHtml(profile.name)}">
        </label>
        ${signedIn
          ? ''
          : `<label>ログインID
               <input id="option-login-id" minlength="4" maxlength="24" pattern="[A-Za-z0-9_-]{4,24}" autocomplete="username" value="${escapeHtml(profile.loginId)}" placeholder="半角英数字・_・-（4～24文字）">
             </label>
             <label>パスワード
               <input id="option-password" type="password" minlength="6" maxlength="64" autocomplete="current-password" placeholder="6文字以上">
             </label>
             <div class="account-actions">
               <button id="account-register" class="panel-button" type="button" ${accountDisabled ? 'disabled' : ''}>新規登録</button>
               <button id="account-sign-in" class="panel-button" type="button" ${accountDisabled ? 'disabled' : ''}>ログイン</button>
             </div>
             <small>プレイヤー名は表示名、ログインIDは認証専用です。</small>`}
      </section>
      <label>音量 <output id="volume-output">${profile.volume}</output>
        <input id="option-volume" type="range" min="0" max="100" value="${profile.volume}">
      </label>
      <label>ウィンドウの色 <output id="hue-output">${profile.windowHue}</output>
        <input id="option-hue" type="range" min="0" max="359" value="${profile.windowHue}">
      </label>
      <label>メッセージの表示速度
        <select id="option-message-speed">
          ${Object.entries(MESSAGE_SPEED_PRESETS)
            .map(([key, preset]) => `<option value="${key}" ${key === getMessageSpeed() ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`)
            .join('')}
        </select>
      </label>
      <small>戦闘メッセージウインドウが自動で閉じるまでの速さを調整します。じっくり読みたい場合は「おそい」を選んでください。</small>
      <button class="panel-button primary" type="submit">設定を保存</button>
    </form>`
  );

  const hueInput = document.getElementById('option-hue');
  const volumeInput = document.getElementById('option-volume');
  const messageSpeedInput = document.getElementById('option-message-speed');
  hueInput.addEventListener('input', () => {
    document.getElementById('hue-output').textContent = hueInput.value;
    document.documentElement.style.setProperty('--window-hue', hueInput.value);
  });
  volumeInput.addEventListener('input', () => {
    document.getElementById('volume-output').textContent = volumeInput.value;
  });
  document.getElementById('options-form').addEventListener('submit', (event) => {
    event.preventDefault();
    profile.name = document.getElementById('option-player-name').value.trim() || 'PLAYER';
    profile.volume = Number(volumeInput.value);
    profile.windowHue = Number(hueInput.value);
    setMessageSpeed(messageSpeedInput.value);
    saveProfile();
    renderOptions('設定を保存しました。');
  });

  const runAccountAction = async (action) => {
    const name = document.getElementById('option-player-name')?.value.trim() ?? '';
    const loginId = document.getElementById('option-login-id')?.value.trim() ?? '';
    const password = document.getElementById('option-password')?.value ?? '';
    try {
      if (action === 'register') {
        profile.name = name || 'PLAYER';
        profile.loginId = firebaseAccount.normalizeLoginId(loginId);
        await firebaseAccount.register(profile.loginId, password, profile);
        saveProfile();
        renderOptions('アカウントを作成し、Firestoreへユーザー情報を保存しました。');
      }
      if (action === 'sign-in') {
        profile.loginId = firebaseAccount.normalizeLoginId(loginId);
        await firebaseAccount.signIn(profile.loginId, password);
        applyCloudProfile(await firebaseAccount.loadProfile());
        renderOptions('ログインしてクラウドデータを読み込みました。');
      }
      if (action === 'password') {
        await firebaseAccount.changePassword(password);
        renderOptions('パスワードを変更しました。');
      }
      if (action === 'sign-out') {
        await firebaseAccount.signOut();
        renderOptions('ログアウトしました。端末内のデータは残っています。');
      }
    } catch (error) {
      const knownMessages = {
        'auth/email-already-in-use': 'そのログインIDは既に使用されています。',
        'auth/invalid-credential': 'ログインIDまたはパスワードが違います。',
        'auth/weak-password': 'パスワードは6文字以上で設定してください。',
        'auth/requires-recent-login': '安全のため、いったんログアウトして再ログイン後に変更してください。',
      };
      renderOptions(knownMessages[error.code] ?? error.message ?? 'アカウント操作に失敗しました。');
    }
  };

  document.getElementById('account-register')?.addEventListener('click', () => runAccountAction('register'));
  document.getElementById('account-sign-in')?.addEventListener('click', () => runAccountAction('sign-in'));
  document.getElementById('account-password-change')?.addEventListener('click', () => runAccountAction('password'));
  document.getElementById('account-sign-out')?.addEventListener('click', () => runAccountAction('sign-out'));
}

const adminTargetNamesJa = Object.freeze({
  one_enemy: '味方単体（ボスから見て）', all_enemies: '味方全体（ボスから見て）',
  self: '自分', all_allies: '仲間全体', one_ally: '仲間単体',
});

const adminStatusNamesJa = Object.freeze({
  ko: '戦闘不能', poison: '毒', blind: '暗闇', silence: '沈黙', toad: 'カエル', mini: '小人',
  petrify: '石化', confuse: '混乱', paralyze: '麻痺', sleep: '睡眠', old: '老化', berserk: '狂戦士',
  zombie: 'ゾンビ', stop: '停止', slow: 'スロウ', haste: 'ヘイスト', regen: 'リジェネ', protect: 'プロテス',
  shell: 'シェル', reflect: 'リフレク', float: 'レビテト', doom: '死の宣告', sap: 'スリップ',
});

const adminElementNamesJa = Object.freeze({
  fire: '炎', ice: '氷', lightning: '雷', water: '水', wind: '風', earth: '地', holy: '聖', poison: '毒',
});

// Flatten the boss reference catalog into one row per technique so the admin
// search box can match on boss name, technique name, or effect text at once.
const bossTechniqueRecords = ff5BossTechniques.flatMap((boss) =>
  boss.techniques.map((technique) => ({
    id: technique.id,
    nameJa: technique.nameJa,
    bossId: boss.id,
    bossNameJa: boss.nameJa,
    bossNameConfidence: boss.nameConfidence,
    bossLocation: boss.location,
    bossWorld: boss.world,
    element: technique.element,
    target: technique.target,
    power: technique.power,
    statuses: technique.statuses,
    note: technique.note,
    implemented: technique.implemented,
  }))
);

const adminCatalogs = {
  equipment: { label: `装備 (${battleReadyEquipment.length})`, records: battleReadyEquipment },
  magic: { label: `魔法 (${battleReadyMagic.length})`, records: battleReadyMagic },
  abilities: { label: `アビリティ・歌 (${battleReadyAbilities.length + battleReadySongs.length})`, records: [...battleReadyAbilities, ...battleReadySongs] },
  items: { label: `アイテム (${battleReadyItems.length})`, records: battleReadyItems },
  crystals: { label: `クリスタルのかけら (${battleReadyShards.length})`, records: battleReadyShards },
  bossTechniques: { label: `ボス技一覧 (${bossTechniqueRecords.length})`, records: bossTechniqueRecords },
  battle: { label: 'バトル仕様', records: [ff5BattleRules] },
};

function adminRecordName(record) {
  if (record.bossNameJa) return `${record.nameJa}（${record.bossNameJa}）`;
  return record.nameJa ?? record.id;
}

function adminRecordDetail(record) {
  if (record.bossNameJa) {
    const element = record.element ? (adminElementNamesJa[record.element] ?? record.element) : '無属性';
    const target = adminTargetNamesJa[record.target] ?? record.target;
    const statuses = record.statuses.length
      ? record.statuses.map((status) => adminStatusNamesJa[status] ?? status).join('・')
      : 'なし';
    const worldText = record.bossWorld === 'ex' ? 'EXステージ' : `第${record.bossWorld}世界`;
    const confidence = { high: '確定', medium: 'ほぼ確定' }[record.bossNameConfidence] ?? record.bossNameConfidence;
    const location = record.bossLocation ? ` / 出現: ${record.bossLocation}` : '';
    return `属性: ${element} / 対象: ${target} / 威力: ${record.power} / 付与状態: ${statuses} / 登場: ${worldText}${location} / 技名の確度: ${confidence} / ${record.note}`;
  }
  const operations = record.battle?.operations?.map((operation) => operation.op).join(' → ');
  if (record.slot) return `${equipmentDetailText(record)} / 戦闘処理: ${operations}`;
  if (record.effect) return `効果: ${record.effect} / 戦闘処理: ${operations}`;
  if (record.techniqueNameJa) return `記憶技: ${record.techniqueNameJa} / ${record.lore} / 戦闘処理: ${operations}`;
  return JSON.stringify(record);
}


function renderAdminCatalog(selectedCatalog = 'equipment') {
  if (!firebaseAccount?.isAdmin) {
    openMenuPanel('管理者モード', '<p class="menu-notice">管理者アカウントでのログインが必要です。</p>');
    return;
  }

  const catalog = adminCatalogs[selectedCatalog] ?? adminCatalogs.equipment;
  const options = Object.entries(adminCatalogs)
    .map(([id, item]) => `<option value="${id}" ${id === selectedCatalog ? 'selected' : ''}>${escapeHtml(item.label)}</option>`)
    .join('');
  const records = catalog.records
    .map((record) => {
      const json = JSON.stringify(record);
      return `<article class="admin-record" data-search="${escapeHtml(`${adminRecordName(record)} ${record.id} ${json}`.toLocaleLowerCase('ja-JP'))}">
        <strong>${escapeHtml(adminRecordName(record))}</strong>
        <small>ID: ${escapeHtml(record.id)}</small>
        <small class="admin-record-detail">${escapeHtml(adminRecordDetail(record))}</small>
        <small>${escapeHtml(json)}</small>
      </article>`;
    })
    .join('');

  openMenuPanel(
    '管理者モード',
    `<div class="admin-toolbar">
      <select id="admin-catalog-select" aria-label="データ種別">${options}</select>
      <input id="admin-search" type="search" placeholder="名前・ID・効果で検索" aria-label="管理データ検索">
    </div>
    <div id="admin-count" class="admin-count">${catalog.records.length}件</div>
    <div id="admin-records" class="admin-records">${records}</div>`
  );

  document.getElementById('admin-catalog-select').addEventListener('change', (event) => {
    renderAdminCatalog(event.target.value);
  });
  document.getElementById('admin-search').addEventListener('input', (event) => {
    const query = event.target.value.trim().toLocaleLowerCase('ja-JP');
    let visible = 0;
    document.querySelectorAll('.admin-record').forEach((record) => {
      const matches = !query || record.dataset.search.includes(query);
      record.classList.toggle('hidden', !matches);
      if (matches) visible += 1;
    });
    document.getElementById('admin-count').textContent = `${visible}件 / ${catalog.records.length}件`;
  });
}

document.querySelectorAll('[data-menu-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.menuAction;
    if (action === 'battle') renderCourseSelect();
    if (action === 'shop') renderShop();
    if (action === 'gacha') renderGacha();
    if (action === 'key-items') renderKeyItems();
    if (action === 'options') renderOptions();
    if (action === 'admin') renderAdminCatalog();
  });
});

document.getElementById('menu-panel-back').addEventListener('click', closeMenuPanel);

// ---------- Persistent party (carries HP/MP/equip across bosses) ----------
let livingParty = null;
let activeSetupUnits = null;
let activeBattleManager = null;
let activeBattlePartyUnits = null;

function copyRunState(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function partyStateFromUnits(units, source = livingParty) {
  if (!Array.isArray(source)) return [];
  return source.map((state, index) => {
    const unit = units?.[index];
    if (!unit) return copyRunState(state);
    return {
      ...copyRunState(state),
      hp: unit.hp,
      mp: unit.mp,
      equipment: { ...unit.equipment },
      abilityId: unit.abilityId,
      crystalShardId: unit.crystalShardId,
      weaponId: unit.weaponId,
      baseAtk: unit.baseAtk,
      baseDef: unit.baseDef,
      baseMagicDef: unit.baseMagicDef,
      baseMagic: unit.baseMagic,
      baseAgility: unit.baseAgility,
      equippedAbilitySet: unit.equippedAbilitySet,
    };
  });
}

function updateResumeButton() {
  document.getElementById('resume-button')?.classList.toggle('hidden', !readSuspendSave());
}

function deleteSuspendData() {
  clearSuspendSave();
  updateResumeButton();
}

function saveCurrentSuspendState() {
  if (!Array.isArray(livingParty)) return false;
  let snapshot = null;
  if (GameState.is(States.BATTLE) && activeBattleManager && !activeBattleManager.finished) {
    snapshot = {
      screen: 'battle',
      bossIndex: GameState.bossIndex,
      livingParty: partyStateFromUnits(activeBattlePartyUnits),
      battle: activeBattleManager.createSnapshot(),
    };
  } else if (GameState.is(States.INTERMISSION)) {
    snapshot = {
      screen: 'intermission',
      bossIndex: GameState.bossIndex,
      livingParty: partyStateFromUnits(activeSetupUnits),
    };
  }
  if (!snapshot) return false;
  const saved = writeSuspendSave(snapshot);
  updateResumeButton();
  return saved;
}

function resumeSuspendedRun() {
  const suspended = readSuspendSave();
  if (!suspended) {
    updateResumeButton();
    return;
  }

  // Consume the old checkpoint before restoring it. From this point onward,
  // every state update/page interruption writes a fresh, newer snapshot.
  clearSuspendSave();
  GameState.bossIndex = Math.max(0, Math.min(bossData.length - 1, suspended.bossIndex));
  livingParty = suspended.livingParty.map((state) => {
    const loadout = getUnitLoadout(state.id);
    return {
      ...state,
      equipment: { ...state.equipment, ...(loadout?.equipment ?? {}) },
      abilityId: loadout?.abilityId ?? state.abilityId,
      crystalShardId: loadout?.crystalShardId ?? state.crystalShardId,
    };
  });

  if (suspended.screen === 'battle' && suspended.battle) {
    startBossBattle(suspended.battle);
    return;
  }
  openPartySetup(bossData[GameState.bossIndex], {
    canReturnToMenu: GameState.bossIndex === 0,
    readyLabel: GameState.bossIndex === 0 ? 'バトル開始' : '次のバトルへ',
  });
}

function freshPartyState() {
  return partyData.map((p) => {
    const saved = getUnitLoadout(p.id);
    const equipment = { ...p.equipment, ...(saved?.equipment ?? {}) };
    return {
      ...p,
      equipment,
      abilityId: saved?.abilityId ?? p.abilityId,
      crystalShardId: saved?.crystalShardId ?? p.crystalShardId,
      hp: p.maxHp,
      mp: p.maxMp,
      baseAtk: p.atk,
      baseDef: p.def,
      baseMagicDef: p.magicDef ?? Math.round(p.def * 0.5),
      baseMagic: p.magic,
      baseAgility: p.agility,
      weaponId: equipment?.weapon ?? null,
    };
  });
}

function legacyAbilitySetFor(abilityId, fallback = 'たたかう型') {
  if (!abilityId) return fallback;
  if (abilityId === 'ability_white_magic') return '白魔法';
  if (abilityId === 'ability_black_magic') return '黒魔法';
  if (abilityId === 'ability_summon') return '召喚魔法';
  if (abilityId === 'ability_time_magic') return '時空魔法';
  if (abilityId === 'ability_red_magic' || abilityId === 'ability_dualcast') return '赤魔法';
  if (abilityId === 'ability_blue_magic') return '青魔法';
  return 'たたかう型';
}

function buildPartyUnits(state) {
  return state.map((p) => {
    const equipmentBonuses = calculateEquipmentBonuses(p.equipment);
    return new Unit({
        id: p.id,
        name: p.name,
        role: p.role,
        spriteUrl: p.spriteUrl,
        isEnemy: false,
        maxHp: p.maxHp,
        hp: p.hp,
        maxMp: p.maxMp,
        mp: p.mp,
	        level: p.level,
	        atk: p.baseAtk + equipmentBonuses.attack,
	        strength: p.baseAtk,
	        vitality: p.baseDef,
        def: p.baseDef + equipmentBonuses.defense,
        magicDef: p.baseMagicDef + equipmentBonuses.magicDefense,
        magic: p.baseMagic + equipmentBonuses.magic,
        agility: p.baseAgility + equipmentBonuses.agility,
        evasion: equipmentBonuses.evasion,
        weaponElement: equipmentBonuses.weaponElement,
        weaponAccuracy: equipmentBonuses.weaponAccuracy,
	        weaponSpecial: equipmentBonuses.weaponSpecial,
	        weaponAttack: equipmentBonuses.weaponAttack,
	        weaponType: equipmentBonuses.weaponType,
        equipmentEffects: equipmentBonuses,
        weaponId: p.weaponId,
        baseAtk: p.baseAtk,
        baseDef: p.baseDef,
        baseMagicDef: p.baseMagicDef,
        baseMagic: p.baseMagic,
        baseAgility: p.baseAgility,
        equippedAbilitySet: legacyAbilitySetFor(p.abilityId, p.equippedAbilitySet),
        equipment: { ...p.equipment },
        abilityId: p.abilityId,
        crystalShardId: p.crystalShardId,
      });
  });
}

function syncStateFromUnits(state, units) {
  state.forEach((p, i) => {
    p.hp = units[i].hp;
    p.mp = units[i].mp;
  });
}

function buildBossUnit(bossConfig) {
  return new Unit({
    id: bossConfig.id,
    name: bossConfig.name,
    spriteUrl: bossConfig.spriteUrl,
    effectAnchor: bossConfig.effectAnchor,
    isEnemy: true,
    maxHp: bossConfig.maxHp,
    maxMp: bossConfig.maxMp,
    level: bossConfig.level,
    atk: bossConfig.atk,
    monsterM: bossConfig.monsterM,
    def: bossConfig.def,
    magicDef: bossConfig.magicDef,
    evasion: bossConfig.evasion,
    magic: bossConfig.magic,
    agility: bossConfig.agility,
    weakness: bossConfig.weakness,
    resist: bossConfig.resist,
    size: bossConfig.size,
    ai: bossConfig.ai,
    equipmentEffects: bossConfig.equipmentEffects,
    statusImmunities: bossConfig.statusImmunities,
    statusResistance: bossConfig.statusResistance,
    counterOnHit: bossConfig.counterOnHit,
    creatureTypes: bossConfig.creatureTypes,
  });
}

// ---------- UI instances ----------
const battleUI = new BattleUI();
const intermissionUI = new IntermissionUI();

function applyPartySetup(partyUnits) {
  partyUnits.forEach((unit, index) => {
    livingParty[index].equipment = { ...unit.equipment };
    livingParty[index].weaponId = unit.equipment.weapon;
    livingParty[index].baseAtk = unit.baseAtk;
    livingParty[index].baseDef = unit.baseDef;
    livingParty[index].baseMagicDef = unit.baseMagicDef;
    livingParty[index].baseMagic = unit.baseMagic;
    livingParty[index].baseAgility = unit.baseAgility;
    livingParty[index].abilityId = unit.abilityId;
    livingParty[index].crystalShardId = unit.crystalShardId;
    livingParty[index].equippedAbilitySet = legacyAbilitySetFor(unit.abilityId, livingParty[index].equippedAbilitySet);
    livingParty[index].hp = livingParty[index].maxHp;
    livingParty[index].mp = livingParty[index].maxMp;
  });
}

function openPartySetup(nextBoss, { canReturnToMenu = false, readyLabel = 'バトル開始' } = {}) {
  GameState.set(States.INTERMISSION);
  activeBattleManager = null;
  activeBattlePartyUnits = null;

  const partyUnits = buildPartyUnits(livingParty).map((unit, index) =>
    Object.assign(unit, {
      baseAtk: livingParty[index].baseAtk,
      baseDef: livingParty[index].baseDef,
      baseMagicDef: livingParty[index].baseMagicDef,
      baseMagic: livingParty[index].baseMagic,
      baseAgility: livingParty[index].baseAgility,
      weaponId: livingParty[index].weaponId,
      equippedAbilitySet: livingParty[index].equippedAbilitySet,
      equipment: { ...livingParty[index].equipment },
      abilityId: livingParty[index].abilityId,
      crystalShardId: livingParty[index].crystalShardId,
    })
  );
  activeSetupUnits = partyUnits;

  intermissionUI.render(partyUnits, nextBoss);

  const backButton = document.getElementById('setup-back-button');
  const readyButton = document.getElementById('ready-button');
  backButton.classList.toggle('hidden', !canReturnToMenu);
  backButton.onclick = canReturnToMenu ? openMainMenu : null;
  readyButton.textContent = readyLabel;
  readyButton.onclick = () => {
    applyPartySetup(partyUnits);
    startBossBattle();
  };
  saveCurrentSuspendState();
}

function beginCourseSetup() {
  deleteSuspendData();
  GameState.bossIndex = 0;
  livingParty = freshPartyState();
  closeMenuPanel();
  openPartySetup(bossData[0], { canReturnToMenu: true, readyLabel: 'バトル開始' });
}

function profileItemStock(itemId) {
  const normalized = itemId === 'potion' ? 'item_potion' : itemId;
  return Math.max(0, Number(profile.items?.[normalized] ?? 0));
}

function consumeProfileItem(itemId, amount = 1) {
  const normalized = itemId === 'potion' ? 'item_potion' : itemId;
  if (profileItemStock(normalized) < amount) return false;
  profile.items[normalized] -= amount;
  profile.potions = profile.items.item_potion;
  saveProfile();
  return true;
}

function addProfileItem(itemId, amount = 1) {
  const normalized = itemId === 'potion' ? 'item_potion' : itemId;
  profile.items[normalized] = profileItemStock(normalized) + Math.max(0, amount);
  profile.potions = profile.items.item_potion;
  saveProfile();
  return true;
}

function spendProfileGil(amount) {
  if (profile.gil < amount) return false;
  profile.gil -= amount;
  saveProfile();
  return true;
}

// ---------- Boss rush flow ----------
function startBossBattle(restoredBattle = null) {
  GameState.set(States.BATTLE);
  activeSetupUnits = null;

  // Formation lists contain hundreds of option nodes. They are rebuilt only
  // when needed, keeping the live battle DOM lean on mobile Safari.
  intermissionUI.clear();

  const battleOptions = {
    getItemStock: profileItemStock,
    consumeItem: consumeProfileItem,
    addItemStock: addProfileItem,
    getGil: () => profile.gil,
    spendGil: spendProfileGil,
  };
  const battleManager = restoredBattle
    ? BattleManager.fromSnapshot(restoredBattle, battleOptions)
    : new BattleManager(
      buildPartyUnits(livingParty),
      buildBossUnit(bossData[GameState.bossIndex]),
      battleOptions
    );
  const partyUnits = battleManager.party;
  activeBattleManager = battleManager;
  activeBattlePartyUnits = partyUnits;
  battleUI.attachBattle(battleManager);

  const onEnd = ({ result }) => {
    eventBus.off('battle:end', onEnd);
    syncStateFromUnits(livingParty, partyUnits);
    activeBattleManager = null;
    activeBattlePartyUnits = null;
    deleteSuspendData();

    if (result === 'victory') {
      setTimeout(() => goToIntermissionOrWin(), 1800);
    } else {
      setTimeout(() => GameState.set(States.GAMEOVER), 1800);
    }
  };
  eventBus.on('battle:end', onEnd);

  if (restoredBattle) battleManager.resume();
  else battleManager.start();
}

function goToIntermissionOrWin() {
  GameState.bossIndex += 1;
  if (GameState.bossIndex >= bossData.length) {
    profile.gil += 300;
    saveProfile();
    GameState.set(States.VICTORY);
    return;
  }

  openPartySetup(bossData[GameState.bossIndex], {
    canReturnToMenu: false,
    readyLabel: '次のバトルへ',
  });
}

// ---------- Title / restart wiring ----------
document.getElementById('start-button').addEventListener('click', openMainMenu);
document.getElementById('resume-button').addEventListener('click', resumeSuspendedRun);
document.getElementById('restart-button-win').addEventListener('click', () => {
  deleteSuspendData();
  openMainMenu();
});
document.getElementById('restart-button-lose').addEventListener('click', () => {
  deleteSuspendData();
  openMainMenu();
});

eventBus.on('battle:stateUpdate', saveCurrentSuspendState);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveCurrentSuspendState();
});
window.addEventListener('pagehide', saveCurrentSuspendState);

// ---------- PWA ----------
if ('serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

firebaseAccount = new FirebaseAccountService({ onStateChange: handleAccountState });
firebaseAccount.initialize().catch((error) => {
  console.warn('Firebase initialization failed:', error);
});

applyProfileOptions();
renderProfileStatus();
updateResumeButton();
showScreen('TITLE');
