import { GitHubClient, GitHubApiError, AdminAuth } from './githubClient.js';
import * as Schema from './schema.js';

const DATA_PATHS = {
  techniques: 'src/data/techniqueCatalog.json',
  bosses: 'src/data/bosses.json',
  stages: 'src/data/stages.json',
};

const state = {
  client: null,
  repoLabel: '',
  files: { techniques: null, bosses: null, stages: null }, // {sha, path, data}
  selectedBossId: null,
  selectedStageId: null,
  dirty: { bosses: false, stages: false, techniques: false },
};

const $ = (id) => document.getElementById(id);

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function slugify(name, existingIds) {
  const base = name.trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '') || uid('id');
  let candidate = base;
  let i = 2;
  while (existingIds.includes(candidate)) {
    candidate = `${base}-${i}`;
    i += 1;
  }
  return candidate;
}

function showToast(message, isError = false) {
  const t = $('toast');
  t.textContent = message;
  t.className = isError ? 'error' : '';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.add('hidden'), 4000);
}

function markDirty(kind) {
  state.dirty[kind] = true;
  if (kind === 'bosses') renderBossList();
  if (kind === 'stages') renderStageList();
}

// ---------- boot / connection ----------

async function boot() {
  wireConnectForm();
  wireTabBar();
  $('new-boss-button').addEventListener('click', handleNewBoss);
  $('new-stage-button').addEventListener('click', handleNewStage);
  $('disconnect-button').addEventListener('click', handleDisconnect);

  const saved = AdminAuth.load();
  if (saved) {
    $('input-token').value = saved.token ?? '';
    $('input-repo').value = saved.owner && saved.repo ? `${saved.owner}/${saved.repo}` : '';
    $('input-branch').value = saved.branch ?? 'main';
    await tryConnect(saved, { fromSaved: true });
  }
}

function wireConnectForm() {
  $('connect-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = $('input-token').value.trim();
    const [owner, repo] = $('input-repo').value.trim().split('/').map((s) => s.trim());
    const branch = $('input-branch').value.trim() || 'main';
    if (!token || !owner || !repo) {
      setConnectStatus('owner/repo の形式 (例: cadmium2525/FFM) を確認してください', true);
      return;
    }
    await tryConnect({ token, owner, repo, branch });
  });
}

async function tryConnect(config, { fromSaved = false } = {}) {
  setConnectStatus(fromSaved ? '保存済みの接続情報で再接続中…' : '接続中…', false);
  $('connect-button').disabled = true;
  try {
    const client = new GitHubClient(config);
    await client.verifyAccess();
    state.client = client;
    state.repoLabel = `${config.owner}/${config.repo} @ ${config.branch}`;
    AdminAuth.save(config);
    await loadAllData();
    showToolPanel();
    setConnectStatus('', false);
  } catch (err) {
    console.error(err);
    setConnectStatus(describeConnectError(err), true);
  } finally {
    $('connect-button').disabled = false;
  }
}

function describeConnectError(err) {
  if (err instanceof GitHubApiError) {
    if (err.status === 401) return '認証に失敗しました。トークンを確認してください。';
    if (err.status === 404) return 'リポジトリまたはブランチが見つかりません（権限も確認してください）。';
    if (err.status === 403) return 'アクセスが拒否されました（トークンの権限、またはAPIレート制限を確認してください）。';
    return `GitHub APIエラー: ${err.message}`;
  }
  return `接続に失敗しました: ${err.message}`;
}

function setConnectStatus(text, isError) {
  const elx = $('connect-status');
  elx.textContent = text;
  elx.className = `status-message ${text ? (isError ? 'error' : 'ok') : ''}`;
}

function handleDisconnect() {
  if (!confirm('保存されているトークンを削除し、ログアウトしますか？未コミットの変更は失われます。')) return;
  AdminAuth.clear();
  location.reload();
}

async function loadAllData() {
  const [techniques, bosses, stages] = await Promise.all([
    state.client.getFile(DATA_PATHS.techniques),
    state.client.getFile(DATA_PATHS.bosses),
    state.client.getFile(DATA_PATHS.stages),
  ]);
  state.files.techniques = { ...techniques, data: JSON.parse(techniques.content) };
  state.files.bosses = { ...bosses, data: JSON.parse(bosses.content) };
  state.files.stages = { ...stages, data: JSON.parse(stages.content) };
  state.dirty = { bosses: false, stages: false, techniques: false };
  renderBossList();
  renderStageList();
}

function showToolPanel() {
  $('connect-panel').classList.add('hidden');
  $('tool-panel').classList.remove('hidden');
  $('connection-badge').classList.remove('hidden');
  $('connection-label').textContent = `接続中: ${state.repoLabel}`;
}

function wireTabBar() {
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      $(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ---------- shared technique helpers ----------

function techniques() {
  return state.files.techniques.data;
}

function techniqueById(id) {
  return techniques().find((t) => t.id === id);
}

function bosses() {
  return state.files.bosses.data;
}

function bossById(id) {
  return bosses().find((b) => b.id === id);
}

function bossNameById(id) {
  return bossById(id)?.name ?? id;
}

/** Label shown in technique pickers: base name + origin boss, for
 * disambiguating same-named techniques from different bosses. This label is
 * for the admin UI only — it is never written into the technique's stored
 * name, and never shown to players in battle. */
function techniqueCatalogLabel(t) {
  const origin = t.originBossId ? bossNameById(t.originBossId) : null;
  return origin ? `${t.baseName}（元: ${origin}）` : t.baseName;
}

// ---------- boss list ----------

function usedBossIds() {
  const ids = new Set();
  state.files.stages.data.forEach((s) => s.bossSequence?.forEach((id) => ids.add(id)));
  return ids;
}

function renderBossList() {
  const used = usedBossIds();
  const listEl = $('boss-list');
  listEl.innerHTML = bosses().map((b) => `
    <li data-id="${escapeAttr(b.id)}" class="${b.id === state.selectedBossId ? 'selected' : ''}">
      <span>${escapeHtml(b.name || '(無名)')}${state.dirty.bosses && b.id === state.selectedBossId ? '<span class="dirty-dot">●</span>' : ''}</span>
      ${used.has(b.id) ? '' : '<span class="unused-tag">未使用</span>'}
    </li>
  `).join('');
  listEl.querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => selectBoss(li.dataset.id));
  });
}

function handleNewBoss() {
  const name = prompt('新規ボスの名称を入力してください');
  if (!name) return;
  const id = slugify(name, bosses().map((b) => b.id));
  const newBoss = {
    id, name, spriteUrl: null, controllable: false, capturable: false,
    maxHp: 1000, maxMp: 100, level: 1, atk: 30, monsterM: 3, def: 10, magic: 10,
    magicDef: 10, evasion: 5, agility: 20, weakness: null, resist: null,
    equipmentEffects: { absorbs: [], weaknesses: [], resistances: [], nullElements: [] },
    categoryWeaknesses: Object.fromEntries(Schema.CATEGORIES.map(([id_]) => [id_, '-'])),
    statusResistanceTable: Object.fromEntries(Schema.STATUS_ROWS.map(([id_]) => [id_, '有効'])),
    statusImmunities: [],
    counterOnHit: null,
    size: 1, ai: 'random',
    techniqueRoster: [],
    actionPattern: { phases: [{ maxHpRatio: 1, sequence: [] }], counterSequence: [] },
  };
  bosses().push(newBoss);
  markDirty('bosses');
  selectBoss(id);
}

function selectBoss(id) {
  state.selectedBossId = id;
  renderBossList();
  renderBossEditor();
}

// ---------- boss editor ----------

function renderBossEditor() {
  const pane = $('boss-editor');
  const boss = bossById(state.selectedBossId);
  if (!boss) { pane.innerHTML = '<p class="empty-hint">左のリストからボスを選択するか、新規ボスを作成してください。</p>'; return; }

  pane.innerHTML = `
    <h3>${escapeHtml(boss.name)} <button type="button" id="delete-boss-button" class="small-button danger-button">このボスを削除</button></h3>

    <h4>基本情報</h4>
    <div class="field-grid" id="boss-basic-fields"></div>

    <h4>属性耐性</h4>
    <div id="boss-element-table"></div>

    <h4>カテゴリ弱点</h4>
    <div id="boss-category-table"></div>

    <h4>ステータス異常への耐性</h4>
    <div id="boss-status-table"></div>

    <h4>使用する技構成</h4>
    <div id="boss-roster"></div>

    <h4>行動パターン</h4>
    <div id="boss-pattern"></div>
    <button type="button" id="add-turn-button" class="small-button">＋ ターンを追加</button>

    <h4>カウンター行動</h4>
    <div id="boss-counter"></div>

    <div class="editor-actions">
      <button type="button" id="save-boss-button" class="primary-button">この内容でローカルに保存</button>
      <span class="hint">※GitHubへの実コミットは次フェーズで実装します。ここでの保存はブラウザ内の一時反映です。</span>
    </div>
  `;

  renderBasicFields(boss);
  renderElementTable(boss);
  renderCategoryTable(boss);
  renderStatusTable(boss);
  renderRoster(boss);
  renderPattern(boss);
  renderCounter(boss);

  $('delete-boss-button').addEventListener('click', () => {
    if (!confirm(`「${boss.name}」を削除します。よろしいですか？`)) return;
    state.files.bosses.data = bosses().filter((b) => b.id !== boss.id);
    state.selectedBossId = null;
    markDirty('bosses');
    renderBossEditor();
  });
  $('add-turn-button').addEventListener('click', () => {
    boss.actionPattern.phases[0].sequence.push({ choiceOf: [] });
    markDirty('bosses');
    renderPattern(boss);
  });
  $('save-boss-button').addEventListener('click', () => {
    collectBasicFields(boss);
    markDirty('bosses');
    showToast(`「${boss.name}」をローカルに反映しました（未コミット）`);
    renderBossList();
  });
}

function renderBasicFields(boss) {
  const fields = [
    ['name', '名称', 'text'], ['spriteUrl', '画像URL(暫定)', 'text'],
    ['level', 'レベル', 'number'], ['maxHp', 'HP', 'number'], ['maxMp', 'MP', 'number'],
    ['atk', '攻撃力', 'number'], ['def', '物理防御', 'number'], ['evasion', '回避', 'number'],
    ['magicDef', '魔法防御', 'number'], ['magic', '魔力', 'number'], ['agility', '素早さ', 'number'],
  ];
  $('boss-basic-fields').innerHTML = fields.map(([key, label, type]) => `
    <label>${label}
      <input data-key="${key}" type="${type}" value="${escapeAttr(boss[key] ?? '')}">
    </label>
  `).join('') + `
    <label>あやつる
      <select data-key="controllable">${Schema.YES_NO.map(([v, l]) => `<option value="${v}" ${String(!!boss.controllable) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </label>
    <label>とらえる
      <select data-key="capturable">${Schema.YES_NO.map(([v, l]) => `<option value="${v}" ${String(!!boss.capturable) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </label>
  `;
}

function collectBasicFields(boss) {
  $('boss-basic-fields').querySelectorAll('[data-key]').forEach((input) => {
    const key = input.dataset.key;
    if (input.tagName === 'SELECT') {
      boss[key] = input.value === 'true';
    } else if (input.type === 'number') {
      boss[key] = Number(input.value);
    } else {
      boss[key] = input.value;
    }
  });
}

function renderElementTable(boss) {
  const effects = boss.equipmentEffects ?? (boss.equipmentEffects = { absorbs: [], weaknesses: [], resistances: [], nullElements: [] });
  const stateFor = (elId) => {
    if (boss.weakness === elId) return '弱点';
    if (boss.resist === elId) return '耐性';
    for (const [label, arrKey] of Object.entries(Schema.ELEMENT_STATE_TO_ARRAY)) {
      if (effects[arrKey]?.includes(elId)) return label;
    }
    return '-';
  };
  $('boss-element-table').innerHTML = `
    <table class="matrix-table"><thead><tr>${Schema.ELEMENTS.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead>
    <tbody><tr>${Schema.ELEMENTS.map(([id]) => `
      <td><select data-el="${id}">${Schema.ELEMENT_STATES.map((s) => `<option ${stateFor(id) === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    `).join('')}</tr></tbody></table>
  `;
  $('boss-element-table').querySelectorAll('select').forEach((sel) => {
    sel.addEventListener('change', () => {
      const elId = sel.dataset.el;
      // Clear this element from every state bucket, then re-apply the chosen one.
      if (boss.weakness === elId) boss.weakness = null;
      if (boss.resist === elId) boss.resist = null;
      Object.values(Schema.ELEMENT_STATE_TO_ARRAY).forEach((arrKey) => {
        effects[arrKey] = (effects[arrKey] ?? []).filter((e) => e !== elId);
      });
      if (sel.value !== '-') effects[Schema.ELEMENT_STATE_TO_ARRAY[sel.value]].push(elId);
      markDirty('bosses');
    });
  });
}

function renderCategoryTable(boss) {
  const table = boss.categoryWeaknesses ?? (boss.categoryWeaknesses = Object.fromEntries(Schema.CATEGORIES.map(([id]) => [id, '-'])));
  $('boss-category-table').innerHTML = `
    <table class="matrix-table"><thead><tr>${Schema.CATEGORIES.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead>
    <tbody><tr>${Schema.CATEGORIES.map(([id]) => `
      <td><select data-cat="${id}">${Schema.CATEGORY_STATES.map((s) => `<option ${table[id] === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    `).join('')}</tr></tbody></table>
  `;
  $('boss-category-table').querySelectorAll('select').forEach((sel) => {
    sel.addEventListener('change', () => { table[sel.dataset.cat] = sel.value; markDirty('bosses'); });
  });
}

function renderStatusTable(boss) {
  const table = boss.statusResistanceTable ?? (boss.statusResistanceTable = Object.fromEntries(Schema.STATUS_ROWS.map(([id]) => [id, '有効'])));
  const rows = [Schema.STATUS_ROWS.slice(0, 8), Schema.STATUS_ROWS.slice(8)];
  $('boss-status-table').innerHTML = rows.map((row) => `
    <table class="matrix-table"><thead><tr>${row.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead>
    <tbody><tr>${row.map(([id]) => `
      <td><select data-status="${id}">${Schema.STATUS_STATES.map((s) => `<option ${table[id] === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    `).join('')}</tr></tbody></table>
  `).join('');
  $('boss-status-table').querySelectorAll('select').forEach((sel) => {
    sel.addEventListener('change', () => {
      table[sel.dataset.status] = sel.value;
      // Keep statusImmunities (what the battle engine actually reads today)
      // in sync with the table: 耐性 = fully immune, 有効 = not immune.
      const immuneIds = Schema.STATUS_ROWS.filter(([id]) => table[id] === '耐性').map(([id]) => id);
      boss.statusImmunities = immuneIds;
      markDirty('bosses');
    });
  });
}

function renderRoster(boss) {
  const roster = boss.techniqueRoster ?? (boss.techniqueRoster = []);
  const catalogOptions = techniques()
    .filter((t) => !roster.includes(t.id))
    .map((t) => `<option value="${escapeAttr(t.id)}">${escapeHtml(techniqueCatalogLabel(t))}</option>`)
    .join('');

  $('boss-roster').innerHTML = `
    <div class="roster-list">${roster.map((id) => {
      const t = techniqueById(id);
      return `<span class="roster-chip">${escapeHtml(t ? techniqueCatalogLabel(t) : `(不明: ${id})`)}<button type="button" data-remove="${escapeAttr(id)}" title="ロスターから外す">×</button></span>`;
    }).join('') || '<span class="hint">技が登録されていません</span>'}</div>
    <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
      <select id="roster-add-select"><option value="">-- 既存の技から選択 --</option>${catalogOptions}</select>
      <button type="button" id="roster-add-button" class="small-button">追加</button>
      <button type="button" id="roster-new-button" class="small-button">＋ 新規技を作成</button>
    </div>
    <div id="roster-new-form"></div>
  `;

  $('boss-roster').querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.remove;
      const usedInPattern = patternUsesTechnique(boss, id);
      if (usedInPattern && !confirm('この技は行動パターンで使用中です。ロスターから外すと該当ターンからも削除されます。よろしいですか？')) return;
      boss.techniqueRoster = roster.filter((r) => r !== id);
      removeTechniqueFromPattern(boss, id);
      markDirty('bosses');
      renderRoster(boss);
      renderPattern(boss);
      renderCounter(boss);
    });
  });
  $('roster-add-button').addEventListener('click', () => {
    const id = $('roster-add-select').value;
    if (!id) return;
    roster.push(id);
    markDirty('bosses');
    renderRoster(boss);
  });
  $('roster-new-button').addEventListener('click', () => renderNewTechniqueForm(boss));
}

function renderNewTechniqueForm(boss) {
  const box = $('roster-new-form');
  box.innerHTML = `
    <div class="new-technique-form">
      <label>技名<input id="nt-name" type="text" placeholder="例：だきしめる"></label>
      <label>種別<select id="nt-kind">${Schema.TECHNIQUE_KINDS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <label>対象<select id="nt-target">${Schema.TARGETS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <label>CTBコスト<input id="nt-ctb" type="number" step="0.05" value="1"></label>
      <label class="span-all">パラメータ (JSON。物理: power / 魔法: ff5Power,formula,element / 状態異常: statuses,statusChance / いずれか1つ: options / スクリプト: operations)
        <textarea id="nt-params" placeholder='例: {"power": 1.5}'></textarea>
      </label>
      <button type="button" id="nt-save" class="small-button primary-button span-all">技を作成してロスターに追加</button>
    </div>
  `;
  $('nt-save').addEventListener('click', () => {
    const name = $('nt-name').value.trim();
    if (!name) { showToast('技名を入力してください', true); return; }
    let params = {};
    const rawParams = $('nt-params').value.trim();
    if (rawParams) {
      try { params = JSON.parse(rawParams); } catch { showToast('パラメータのJSONが不正です', true); return; }
    }
    const id = slugify(name, techniques().map((t) => t.id));
    const entry = {
      id, baseName: name, kind: $('nt-kind').value, target: $('nt-target').value,
      ctbCost: Number($('nt-ctb').value), originBossId: boss.id, ...params,
    };
    techniques().push(entry);
    boss.techniqueRoster.push(id);
    state.dirty.techniques = true;
    markDirty('bosses');
    renderRoster(boss);
    showToast(`技「${name}」を作成しました`);
  });
}

function patternUsesTechnique(boss, id) {
  const inSeq = (seq) => seq.some((entry) => entryUsesTechnique(entry, id));
  return boss.actionPattern.phases.some((p) => inSeq(p.sequence)) || inSeq(boss.actionPattern.counterSequence ?? []);
}
function entryUsesTechnique(entry, id) {
  if (entry.techniqueId === id) return true;
  if (entry.choiceOf?.includes(id)) return true;
  if (entry.multi) return entry.multi.some((sub) => entryUsesTechnique(sub, id));
  return false;
}
function removeTechniqueFromPattern(boss, id) {
  const clean = (seq) => seq.map((entry) => cleanEntry(entry, id)).filter(Boolean);
  boss.actionPattern.phases.forEach((p) => { p.sequence = clean(p.sequence); });
  boss.actionPattern.counterSequence = clean(boss.actionPattern.counterSequence ?? []);
}
function cleanEntry(entry, id) {
  if (entry.techniqueId === id) return null;
  if (entry.choiceOf) {
    entry.choiceOf = entry.choiceOf.filter((c) => c !== id);
    return entry.choiceOf.length ? entry : null;
  }
  if (entry.multi) {
    entry.multi = entry.multi.map((sub) => cleanEntry(sub, id)).filter(Boolean);
    return entry.multi.length ? entry : null;
  }
  return entry;
}

// ---------- action pattern editor ----------

function renderPattern(boss) {
  const seq = boss.actionPattern.phases[0].sequence;
  const roster = boss.techniqueRoster ?? [];
  $('boss-pattern').innerHTML = seq.map((entry, i) => `
    <div class="turn-row" data-index="${i}">
      <div class="turn-row-head">
        <b>${i + 1} ターン目</b>
        <span>
          <label style="font-size:11px;"><input type="checkbox" class="turn-double-toggle" ${entry.multi ? 'checked' : ''}> 2回行動にする</label>
          <button type="button" class="small-button danger-button turn-remove">削除</button>
        </span>
      </div>
      <div class="turn-body"></div>
    </div>
  `).join('') || '<p class="hint">まだターンが登録されていません。</p>';

  seq.forEach((entry, i) => {
    const row = $('boss-pattern').querySelector(`.turn-row[data-index="${i}"]`);
    renderTurnBody(row.querySelector('.turn-body'), entry, roster, () => { markDirty('bosses'); });
    row.querySelector('.turn-double-toggle').addEventListener('change', (e) => {
      if (e.target.checked) {
        seq[i] = { multi: [{ choiceOf: [] }, { choiceOf: [] }] };
      } else {
        seq[i] = { choiceOf: [] };
      }
      markDirty('bosses');
      renderPattern(boss);
    });
    row.querySelector('.turn-remove').addEventListener('click', () => {
      seq.splice(i, 1);
      markDirty('bosses');
      renderPattern(boss);
    });
  });
}

/** Renders either a single choice-group (normal turn) or two side-by-side
 * choice-groups (2回行動 turn) into `container`, wiring change handlers that
 * mutate `entry` in place. */
function renderTurnBody(container, entry, roster, onChange) {
  if (entry.multi) {
    container.innerHTML = `
      <div class="double-slot"><b>1回目</b><div class="slot-a"></div></div>
      <div class="double-slot"><b>2回目</b><div class="slot-b"></div></div>
    `;
    renderChoiceChecks(container.querySelector('.slot-a'), entry.multi[0], roster, onChange);
    renderChoiceChecks(container.querySelector('.slot-b'), entry.multi[1], roster, onChange);
  } else {
    renderChoiceChecks(container, entry, roster, onChange);
  }
}

function renderChoiceChecks(container, slot, roster, onChange) {
  const selected = slot.choiceOf ?? (slot.choiceOf = slot.techniqueId ? [slot.techniqueId] : []);
  delete slot.techniqueId;
  container.innerHTML = `<div class="choice-checks">${roster.map((id) => {
    const t = techniqueById(id);
    return `<label><input type="checkbox" value="${escapeAttr(id)}" ${selected.includes(id) ? 'checked' : ''}> ${escapeHtml(t?.baseName ?? id)}</label>`;
  }).join('') || '<span class="hint">先に「使用する技構成」へ技を追加してください</span>'}</div>
  <p class="hint">1つだけ選択＝毎回そのターンで確定。複数選択＝その中からランダムに1つ。</p>`;
  container.querySelectorAll('input[type=checkbox]').forEach((cb) => {
    cb.addEventListener('change', () => {
      slot.choiceOf = [...container.querySelectorAll('input[type=checkbox]:checked')].map((c) => c.value);
      onChange();
    });
  });
}

// ---------- counter editor ----------

function renderCounter(boss) {
  const roster = boss.techniqueRoster ?? [];
  const times = boss.counterOnHit?.times ?? 0;
  const seq = boss.actionPattern.counterSequence ?? (boss.actionPattern.counterSequence = []);
  while (seq.length < times) seq.push({ choiceOf: [] });
  seq.length = times;

  $('boss-counter').innerHTML = `
    <label style="max-width:200px;">カウンター行動回数
      <select id="counter-times">
        <option value="0" ${times === 0 ? 'selected' : ''}>なし</option>
        <option value="1" ${times === 1 ? 'selected' : ''}>1回</option>
        <option value="2" ${times === 2 ? 'selected' : ''}>2回</option>
      </select>
    </label>
    ${seq.map((slot, i) => `<div class="counter-slot"><b>${i + 1}回目</b><div class="counter-slot-body" data-index="${i}"></div></div>`).join('')}
  `;
  seq.forEach((slot, i) => {
    renderChoiceChecks($('boss-counter').querySelector(`.counter-slot-body[data-index="${i}"]`), slot, roster, () => markDirty('bosses'));
  });
  $('counter-times').addEventListener('change', (e) => {
    const n = Number(e.target.value);
    boss.counterOnHit = n > 0 ? { chance: 1, times: n } : null;
    markDirty('bosses');
    renderCounter(boss);
  });
}

// ---------- stage list / editor ----------

function stages() {
  return state.files.stages.data;
}
function stageById(id) {
  return stages().find((s) => s.id === id);
}

function renderStageList() {
  const listEl = $('stage-list');
  listEl.innerHTML = stages().map((s) => `
    <li data-id="${escapeAttr(s.id)}" class="${s.id === state.selectedStageId ? 'selected' : ''}">
      <span>${escapeHtml(s.name || s.id)}${state.dirty.stages && s.id === state.selectedStageId ? '<span class="dirty-dot">●</span>' : ''}</span>
    </li>
  `).join('');
  listEl.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => selectStage(li.dataset.id)));
}

function handleNewStage() {
  const name = prompt('新規ステージのID/名称を入力してください（例：1-2）');
  if (!name) return;
  const id = slugify(name, stages().map((s) => s.id));
  const newStage = {
    id, name, subtitle: '', background: null, bgm: null, restrictions: [],
    firstClearReward: { gil: 0 }, bossSequence: [],
  };
  stages().push(newStage);
  markDirty('stages');
  selectStage(id);
}

function selectStage(id) {
  state.selectedStageId = id;
  renderStageList();
  renderStageEditor();
}

function renderStageEditor() {
  const pane = $('stage-editor');
  const stage = stageById(state.selectedStageId);
  if (!stage) { pane.innerHTML = '<p class="empty-hint">左のリストからステージを選択するか、新規ステージを作成してください。</p>'; return; }

  const bossOptions = bosses().map((b) => `<option value="${escapeAttr(b.id)}">${escapeHtml(b.name)}</option>`).join('');

  pane.innerHTML = `
    <h3>ステージ ${escapeHtml(stage.name || stage.id)} <button type="button" id="delete-stage-button" class="small-button danger-button">このステージを削除</button></h3>

    <div class="field-grid">
      <label>対象ステージ(ID)<input id="stage-id" type="text" value="${escapeAttr(stage.id)}"></label>
      <label>名称<input id="stage-name" type="text" value="${escapeAttr(stage.name ?? '')}"></label>
      <label>サブタイトル<input id="stage-subtitle" type="text" value="${escapeAttr(stage.subtitle ?? '')}"></label>
      <label>初回クリア報酬(GIL)<input id="stage-gil" type="number" value="${escapeAttr(stage.firstClearReward?.gil ?? 0)}"></label>
    </div>

    <h4>背景 / BGM</h4>
    <div class="field-grid">
      <label>背景画像URL(暫定・Phase4でアップロード対応)<input id="stage-background" type="text" value="${escapeAttr(stage.background ?? '')}"></label>
      <label>BGM URL(暫定・Phase4でアップロード対応)<input id="stage-bgm" type="text" value="${escapeAttr(stage.bgm ?? '')}"></label>
    </div>

    <h4>制限</h4>
    <p class="hint">バトルルールとしての強制はPhase5で実装予定です。ここでは内容の登録のみ行えます。</p>
    <div id="stage-restrictions"></div>
    <button type="button" id="add-restriction-button" class="small-button">＋ 制限を追加</button>

    <h4>連戦順(1戦目から順番に)</h4>
    <div id="stage-boss-sequence"></div>
    <div style="margin-top:8px; display:flex; gap:8px;">
      <select id="stage-add-boss"><option value="">-- ボスを選択 --</option>${bossOptions}</select>
      <button type="button" id="stage-add-boss-button" class="small-button">追加</button>
    </div>

    <div class="editor-actions">
      <button type="button" id="save-stage-button" class="primary-button">この内容でローカルに保存</button>
      <span class="hint">※GitHubへの実コミットは次フェーズで実装します。</span>
    </div>
  `;

  renderRestrictions(stage);
  renderBossSequence(stage);

  $('delete-stage-button').addEventListener('click', () => {
    if (!confirm(`ステージ「${stage.name || stage.id}」を削除します。よろしいですか？`)) return;
    state.files.stages.data = stages().filter((s) => s.id !== stage.id);
    state.selectedStageId = null;
    markDirty('stages');
    renderStageEditor();
  });
  $('add-restriction-button').addEventListener('click', () => {
    stage.restrictions.push('');
    markDirty('stages');
    renderRestrictions(stage);
  });
  $('stage-add-boss-button').addEventListener('click', () => {
    const id = $('stage-add-boss').value;
    if (!id) return;
    stage.bossSequence.push(id);
    markDirty('stages');
    renderBossSequence(stage);
  });
  $('save-stage-button').addEventListener('click', () => {
    stage.id = $('stage-id').value.trim() || stage.id;
    stage.name = $('stage-name').value.trim();
    stage.subtitle = $('stage-subtitle').value.trim();
    stage.background = $('stage-background').value.trim() || null;
    stage.bgm = $('stage-bgm').value.trim() || null;
    stage.firstClearReward = { gil: Number($('stage-gil').value) || 0 };
    state.selectedStageId = stage.id;
    markDirty('stages');
    showToast(`ステージ「${stage.name}」をローカルに反映しました（未コミット）`);
    renderStageList();
  });
}

function renderRestrictions(stage) {
  const list = stage.restrictions ?? (stage.restrictions = []);
  $('stage-restrictions').innerHTML = list.map((r, i) => `
    <div style="display:flex; gap:6px; margin-bottom:6px;">
      <input type="text" data-index="${i}" value="${escapeAttr(r)}" placeholder="例：1人縛り、魔法使用不可">
      <button type="button" class="small-button danger-button" data-remove-restriction="${i}">削除</button>
    </div>
  `).join('') || '<p class="hint">制限はありません</p>';
  $('stage-restrictions').querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => { list[Number(input.dataset.index)] = input.value; markDirty('stages'); });
  });
  $('stage-restrictions').querySelectorAll('[data-remove-restriction]').forEach((btn) => {
    btn.addEventListener('click', () => {
      list.splice(Number(btn.dataset.removeRestriction), 1);
      markDirty('stages');
      renderRestrictions(stage);
    });
  });
}

function renderBossSequence(stage) {
  const seq = stage.bossSequence ?? (stage.bossSequence = []);
  $('stage-boss-sequence').innerHTML = seq.length ? seq.map((id, i) => `
    <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
      <b style="width:24px;">${i + 1}</b>
      <span style="flex:1;">${escapeHtml(bossNameById(id))}</span>
      <button type="button" class="small-button" data-up="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="small-button" data-down="${i}" ${i === seq.length - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="small-button danger-button" data-remove="${i}">削除</button>
    </div>
  `).join('') : '<p class="hint">まだボスが登録されていません</p>';
  const box = $('stage-boss-sequence');
  box.querySelectorAll('[data-up]').forEach((btn) => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.up);
    [seq[i - 1], seq[i]] = [seq[i], seq[i - 1]];
    markDirty('stages'); renderBossSequence(stage);
  }));
  box.querySelectorAll('[data-down]').forEach((btn) => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.down);
    [seq[i + 1], seq[i]] = [seq[i], seq[i + 1]];
    markDirty('stages'); renderBossSequence(stage);
  }));
  box.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => {
    seq.splice(Number(btn.dataset.remove), 1);
    markDirty('stages'); renderBossSequence(stage);
  }));
}

// ---------- utils ----------

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}

boot();
