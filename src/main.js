import { GameState, States } from './core/GameState.js';
import { eventBus } from './core/EventBus.js';
import { Unit } from './battle/Unit.js';
import { BattleManager } from './battle/BattleManager.js';
import { BattleUI } from './ui/BattleUI.js';
import { IntermissionUI } from './ui/IntermissionUI.js';
import { partyData } from './data/partyData.js';
import { ff5Equipment } from './database/ff5Database.js';
import { bossData } from './data/bossData.js';

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

const defaultProfile = {
  name: 'PLAYER',
  level: 1,
  gil: 2000,
  diamonds: 900,
  potions: 3,
  volume: 70,
  statusHue: 220,
  shards: [{ ...shardCatalog[0], count: 1 }],
};

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || 'null');
    if (!saved) return structuredClone(defaultProfile);
    return {
      ...structuredClone(defaultProfile),
      ...saved,
      shards: Array.isArray(saved.shards) ? saved.shards : structuredClone(defaultProfile.shards),
    };
  } catch {
    return structuredClone(defaultProfile);
  }
}

let profile = loadProfile();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function applyProfileOptions() {
  document.documentElement.style.setProperty('--status-hue', String(profile.statusHue));
}

function renderProfileStatus() {
  document.getElementById('profile-name').textContent = profile.name;
  document.getElementById('profile-level').textContent = profile.level;
  document.getElementById('profile-gil').textContent = profile.gil.toLocaleString('ja-JP');
  document.getElementById('profile-diamonds').textContent = profile.diamonds.toLocaleString('ja-JP');
}

function saveProfile() {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // The game remains usable when storage is unavailable (for example file:// previews).
  }
  applyProfileOptions();
  renderProfileStatus();
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
        <small>3連戦 / 推奨Lv 1 / 初回報酬 300 GIL</small>
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
        <small>味方ひとりのHPを400回復</small>
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
  openMenuPanel(
    'オプション',
    `<form id="options-form" class="options-form">
      ${message ? `<p class="menu-notice">${escapeHtml(message)}</p>` : ''}
      <label>プレイヤー名<input id="option-player-name" maxlength="12" value="${escapeHtml(profile.name)}"></label>
      <label>音量 <output id="volume-output">${profile.volume}</output>
        <input id="option-volume" type="range" min="0" max="100" value="${profile.volume}">
      </label>
      <label>ステータスバーの色相 <output id="hue-output">${profile.statusHue}</output>
        <input id="option-hue" type="range" min="0" max="359" value="${profile.statusHue}">
      </label>
      <button class="panel-button primary" type="submit">設定を保存</button>
    </form>`
  );

  const hueInput = document.getElementById('option-hue');
  const volumeInput = document.getElementById('option-volume');
  hueInput.addEventListener('input', () => {
    document.getElementById('hue-output').textContent = hueInput.value;
    document.documentElement.style.setProperty('--status-hue', hueInput.value);
  });
  volumeInput.addEventListener('input', () => {
    document.getElementById('volume-output').textContent = volumeInput.value;
  });
  document.getElementById('options-form').addEventListener('submit', (event) => {
    event.preventDefault();
    profile.name = document.getElementById('option-player-name').value.trim() || 'PLAYER';
    profile.volume = Number(volumeInput.value);
    profile.statusHue = Number(hueInput.value);
    saveProfile();
    renderOptions('設定を保存しました。');
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
  });
});

document.getElementById('menu-panel-back').addEventListener('click', closeMenuPanel);

// ---------- Persistent party (carries HP/MP/equip across bosses) ----------
let livingParty = null;

function freshPartyState() {
  return partyData.map((p) => ({
    ...p,
    equipment: { ...p.equipment },
    hp: p.maxHp,
    mp: p.maxMp,
    baseAtk: p.atk,
    weaponId: p.equipment?.weapon ?? null,
    weaponElement: null,
    weaponAtkBonus: 0,
  }));
}

function legacyAbilitySetFor(abilityId, fallback = 'たたかう型') {
  if (!abilityId) return fallback;
  if (abilityId === 'ability_white_magic') return '白魔法';
  if (abilityId === 'ability_black_magic') return '黒魔法';
  if (abilityId === 'ability_summon') return '召喚魔法';
  return 'たたかう型';
}

function buildPartyUnits(state) {
  return state.map(
    (p) =>
      new Unit({
        id: p.id,
        name: p.name,
        role: p.role,
        isEnemy: false,
        maxHp: p.maxHp,
        hp: p.hp,
        maxMp: p.maxMp,
        mp: p.mp,
        atk: p.baseAtk + (p.weaponAtkBonus ?? 0),
        def: p.def,
        magic: p.magic,
        agility: p.agility,
        weaponElement: p.weaponElement,
        weaponId: p.weaponId,
        baseAtk: p.baseAtk,
        equippedAbilitySet: legacyAbilitySetFor(p.abilityId, p.equippedAbilitySet),
        equipment: { ...p.equipment },
        abilityId: p.abilityId,
        crystalShardId: p.crystalShardId,
      })
  );
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
    isEnemy: true,
    maxHp: bossConfig.maxHp,
    atk: bossConfig.atk,
    def: bossConfig.def,
    magic: bossConfig.magic,
    agility: bossConfig.agility,
    weakness: bossConfig.weakness,
    resist: bossConfig.resist,
    size: bossConfig.size,
    ai: bossConfig.ai,
  });
}

// ---------- UI instances ----------
const battleUI = new BattleUI();
const intermissionUI = new IntermissionUI();

function applyPartySetup(partyUnits) {
  partyUnits.forEach((unit, index) => {
    livingParty[index].equipment = { ...unit.equipment };
    livingParty[index].weaponId = unit.equipment.weapon;
    const chosenWeapon = ff5Equipment.find((item) => item.id === unit.equipment.weapon);
    livingParty[index].weaponElement = chosenWeapon?.element ?? null;
    livingParty[index].baseAtk = unit.baseAtk;
    // Database equipment stats are intentionally not applied to the prototype battle yet.
    livingParty[index].weaponAtkBonus = 0;
    livingParty[index].abilityId = unit.abilityId;
    livingParty[index].crystalShardId = unit.crystalShardId;
    livingParty[index].equippedAbilitySet = legacyAbilitySetFor(unit.abilityId, livingParty[index].equippedAbilitySet);
    livingParty[index].hp = livingParty[index].maxHp;
    livingParty[index].mp = livingParty[index].maxMp;
  });
}

function openPartySetup(nextBoss, { canReturnToMenu = false, readyLabel = 'バトル開始' } = {}) {
  GameState.set(States.INTERMISSION);

  const partyUnits = buildPartyUnits(livingParty).map((unit, index) =>
    Object.assign(unit, {
      baseAtk: livingParty[index].baseAtk,
      weaponId: livingParty[index].weaponId,
      equippedAbilitySet: livingParty[index].equippedAbilitySet,
      equipment: { ...livingParty[index].equipment },
      abilityId: livingParty[index].abilityId,
      crystalShardId: livingParty[index].crystalShardId,
    })
  );

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
}

function beginCourseSetup() {
  GameState.bossIndex = 0;
  livingParty = freshPartyState();
  closeMenuPanel();
  openPartySetup(bossData[0], { canReturnToMenu: true, readyLabel: 'バトル開始' });
}

// ---------- Boss rush flow ----------
function startBossBattle() {
  GameState.set(States.BATTLE);

  const partyUnits = buildPartyUnits(livingParty);
  const bossConfig = bossData[GameState.bossIndex];
  const bossUnit = buildBossUnit(bossConfig);

  const battleManager = new BattleManager(partyUnits, bossUnit);
  battleUI.attachBattle(battleManager);

  const onEnd = ({ result }) => {
    eventBus.off('battle:end', onEnd);
    syncStateFromUnits(livingParty, partyUnits);

    if (result === 'victory') {
      setTimeout(() => goToIntermissionOrWin(), 1200);
    } else {
      setTimeout(() => GameState.set(States.GAMEOVER), 1200);
    }
  };
  eventBus.on('battle:end', onEnd);

  battleManager.start();
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
document.getElementById('restart-button-win').addEventListener('click', openMainMenu);
document.getElementById('restart-button-lose').addEventListener('click', openMainMenu);

// ---------- PWA ----------
if ('serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

applyProfileOptions();
renderProfileStatus();
showScreen('TITLE');
