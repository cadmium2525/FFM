import { eventBus } from '../core/EventBus.js';
import { basicCommands, attackAction, defendAction, getAbilityActions, itemActions, magicSets } from '../data/abilityData.js';
import { elementNames } from '../data/bossData.js';
import { crystalShardAction } from '../database/battleCatalog.js';
import { MessageWindow } from './MessageWindow.js';

function hpBarClass(unit) {
  const ratio = unit.hpRatio();
  if (ratio <= 0.25) return 'low';
  if (ratio <= 0.5) return 'mid';
  return '';
}

const statusNamesJa = Object.freeze({
  ko: '戦闘不能', poison: '毒', blind: '暗闇', silence: '沈黙', toad: 'カエル', mini: '小人',
  petrify: '石化', confuse: '混乱', paralyze: '麻痺', sleep: '睡眠', old: '老化', berserk: '狂戦士',
  zombie: 'ゾンビ', stop: '停止', slow: 'スロウ', haste: 'ヘイスト', regen: 'リジェネ', protect: 'プロテス',
  shell: 'シェル', reflect: 'リフレク', float: 'レビテト', doom: '死の宣告', sap: 'スリップ',
});

const targetNamesJa = Object.freeze({
  self: '自分', 'single-enemy': '敵単体', one_enemy: '敵単体', enemy_group: '敵全体', all_enemies: '敵全体', one_or_all_enemies: '敵単体/全体',
  'single-ally': '味方単体', one_ally: '味方単体', all_allies: '味方全体', party: '味方全体', one_or_all_allies: '味方単体/全体',
  all_units: '全体', random_unit: 'ランダム', enemy_group_and_ally: '敵全体＋味方', enemy_and_party: '敵味方全体',
  battle: '戦場',
});

const unitRunes = Object.freeze({ p1: '✦', p2: '◈', p3: '⬢', p4: '⌁', boss1: '◆', boss2: '◇', boss3: '✧' });

function safeToken(value, fallback = 'unknown') {
  const token = String(value ?? fallback).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return token || fallback;
}

export class BattleUI {
  constructor() {
    this.enemyFieldEl = document.getElementById('enemy-field');
    this.partyFieldEl = document.getElementById('party-field');
    this.ctbListEl = document.getElementById('ctb-list');
    this.enemyInfoEl = document.getElementById('enemy-info-content');
    this.commandListEl = document.getElementById('command-list');
    this.commandHeadingEl = document.getElementById('command-heading');
    this.partyStatusEl = document.getElementById('party-status-content');
    this.effectsEl = document.getElementById('battle-effects');
    this.battleFieldEl = document.querySelector('.battle-field');

    this.submenuWindowEl = document.getElementById('submenu-window');
    this.submenuHeadingEl = document.getElementById('submenu-heading');
    this.submenuListEl = document.getElementById('submenu-list');

    this.targetWindowEl = document.getElementById('target-window');
    this.targetListEl = document.getElementById('target-list');

    this.messageWindow = new MessageWindow(
      document.getElementById('message-window'),
      document.getElementById('message-text')
    );

    this.telegraphEl = document.createElement('div');
    this.telegraphEl.className = 'battle-telegraph hidden';
    this.telegraphEl.setAttribute('role', 'alert');
    this.telegraphEl.setAttribute('aria-live', 'assertive');
    document.querySelector('.battle-layout')?.appendChild(this.telegraphEl);

    this.phaseEl = document.createElement('div');
    this.phaseEl.className = 'battle-phase-notice hidden';
    this.phaseEl.setAttribute('role', 'status');
    document.querySelector('.battle-layout')?.appendChild(this.phaseEl);
    this.currentPhase = 1;

    this.battleManager = null;
    this.pendingCommandType = null; // 'attack' | 'magic' | 'item' | 'defend'
    this.pendingSpellOrItem = null;

    this._bindStaticEvents();
  }

  attachBattle(battleManager) {
    this.battleManager = battleManager;
    this.messageWindow.reset();
    this.clearTelegraph();
    this.currentPhase = 1;
    if (this.effectsEl) this.effectsEl.innerHTML = '';
    this.battleFieldEl?.classList.remove('impacting');
    this.closeActionWindows();
    this.renderCommandListIdle();
  }

  _bindStaticEvents() {
    eventBus.on('battle:log', (text) => this.messageWindow.show(text));

    eventBus.on('battle:stateUpdate', ({ party, boss, preview }) => {
      this.renderEnemyField(boss);
      this.renderPartyField(party, this.battleManager?.currentActor);
      this.renderCtbList(preview);
      this.renderEnemyInfo(boss);
      this.renderPartyStatus(party);
    });

    eventBus.on('battle:playerTurn', ({ actor }) => {
      this.closeActionWindows();
      this.renderCommandListForActor(actor);
    });

    eventBus.on('battle:actionResolved', ({ actor, results }) => {
      if (actor?.isEnemy) this.clearTelegraph();
      this.playActionPulse(actor, results);
      results.forEach((r) => {
        const el = document.querySelector(`[data-uid="${r.targetUid}"]`);
        if (el) {
          el.classList.add('flash');
          setTimeout(() => el.classList.remove('flash'), 440);
        }
        this.showCombatResult(r, el);
      });
    });

    eventBus.on('battle:telegraph', ({ actor, hint }) => {
      this.telegraphEl.innerHTML = `<b>DANGER</b><span>${actor?.name ?? '敵'}：${hint ?? '強力な攻撃を準備中'}</span>`;
      this.telegraphEl.classList.remove('hidden', 'countered');
    });

    eventBus.on('battle:counter', ({ boss }) => {
      this.telegraphEl.innerHTML = `<b>BREAK</b><span>${boss?.name ?? '敵'}の大技を弱体化</span>`;
      this.telegraphEl.classList.add('countered');
      this.telegraphEl.classList.remove('hidden');
      setTimeout(() => this.clearTelegraph(), 1100);
    });

    eventBus.on('battle:phaseChanged', ({ boss, phase }) => {
      this.currentPhase = phase;
      this.phaseEl.textContent = `PHASE ${phase}　${boss?.name ?? '敵'}が戦闘形態を変化`;
      this.phaseEl.classList.remove('hidden');
      setTimeout(() => this.phaseEl.classList.add('hidden'), 1500);
    });

    eventBus.on('battle:end', () => this.clearTelegraph());
  }

  // ---------- Rendering ----------

  renderEnemyField(boss) {
    this.enemyFieldEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'enemy-sprite-wrap';

    const sprite = document.createElement('div');
    const bossToken = safeToken(boss.id, 'boss');
    sprite.className = `sprite-placeholder boss unit-${bossToken}${boss.isAlive() ? '' : ' dead'}`;
    sprite.dataset.uid = boss.uid;
    sprite.dataset.unitId = bossToken;
    const scale = Math.min(220, 185 * (boss.size ?? 1));
    sprite.style.width = `${scale}px`;
    sprite.style.height = `${scale}px`;

    const blob = document.createElement('div');
    blob.className = 'blob';
    blob.style.width = '100%';
    blob.style.height = '100%';
    blob.innerHTML = `
      <span class="crystal-aura"></span>
      <span class="crystal-orbit orbit-one"></span>
      <span class="crystal-orbit orbit-two"></span>
      <span class="crystal-core"><i></i><b>${unitRunes[bossToken] ?? '◆'}</b></span>
      <span class="crystal-fragment fragment-one"></span>
      <span class="crystal-fragment fragment-two"></span>
      <span class="crystal-fragment fragment-three"></span>
    `;
    sprite.appendChild(blob);

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = boss.name;
    sprite.appendChild(label);

    wrap.appendChild(sprite);
    const intel = document.createElement('div');
    const weakness = boss.weakness ? (elementNames[boss.weakness] ?? boss.weakness) : '解析不能';
    intel.className = 'enemy-intel';
    intel.innerHTML = `
      <span class="target-tag">TARGET</span>
      <strong>${boss.name}</strong>
      <span>HP ${boss.hp} / ${boss.maxHp}</span>
      <span class="enemy-intel-weak">WEAK：${weakness}</span>
      <span class="enemy-intel-phase">PHASE ${this.currentPhase}</span>
    `;
    wrap.appendChild(intel);
    this.enemyFieldEl.appendChild(wrap);
  }

  renderPartyField(party, currentActor) {
    this.partyFieldEl.innerHTML = '';
    party.forEach((unit, idx) => {
      const row = document.createElement('div');
      row.className = 'party-unit-row';

      const spriteSlot = document.createElement('div');
      spriteSlot.className = 'sprite-slot';
      const sprite = document.createElement('div');
      const unitToken = safeToken(unit.id, `p${idx + 1}`);
      sprite.className = `sprite-placeholder player unit-${unitToken}${currentActor === unit ? ' is-current' : ''}${unit.isAlive() ? '' : ' dead'}`;
      sprite.dataset.uid = unit.uid;
      sprite.dataset.unitId = unitToken;
      sprite.style.width = '100%';
      sprite.style.height = '100%';
      const blob = document.createElement('div');
      blob.className = 'blob';
      blob.style.width = '100%';
      blob.style.height = '100%';
      blob.innerHTML = `<span class="soul-flare"></span><span class="soul-core"></span><span class="soul-rune">${unitRunes[unitToken] ?? idx + 1}</span>`;
      sprite.appendChild(blob);
      spriteSlot.appendChild(sprite);
      row.appendChild(spriteSlot);

      const meta = document.createElement('div');
      meta.className = 'unit-meta';

      const nameLine = document.createElement('div');
      nameLine.className = 'unit-name-line' + (currentActor === unit ? ' active-turn' : '');
      nameLine.innerHTML = `<span>P${idx + 1}: ${unit.name}</span>`;
      meta.appendChild(nameLine);

      const roleLine = document.createElement('div');
      roleLine.className = 'unit-role';
      roleLine.textContent = unit.role ?? '';
      meta.appendChild(roleLine);

      const barTrack = document.createElement('div');
      barTrack.className = 'stat-bar-track';
      const barFill = document.createElement('div');
      barFill.className = `stat-bar-fill hp ${hpBarClass(unit)}`;
      barFill.style.width = `${Math.max(0, unit.hpRatio() * 100)}%`;
      barTrack.appendChild(barFill);
      meta.appendChild(barTrack);

      row.appendChild(meta);
      this.partyFieldEl.appendChild(row);
    });
  }

  renderCtbList(preview) {
    this.ctbListEl.innerHTML = '';
    preview.forEach((entry, index) => {
      const row = document.createElement('div');
      const entryToken = safeToken(entry.id, entry.isEnemy ? 'boss' : `p${index + 1}`);
      row.className = `ctb-entry unit-${entryToken}${entry.uid === this.battleManager?.currentActor?.uid ? ' now-acting' : ''}`;
      row.setAttribute('role', 'listitem');
      row.setAttribute('aria-label', `${index + 1}番目 ${entry.name}`);
      const icon = document.createElement('div');
      icon.className = `ctb-icon ${entry.isEnemy ? 'enemy' : 'player'}`;
      icon.textContent = unitRunes[entryToken] ?? String(index + 1).padStart(2, '0');
      const label = document.createElement('div');
      label.className = 'ctb-label';
      label.textContent = entry.name;
      row.appendChild(icon);
      row.appendChild(label);
      this.ctbListEl.appendChild(row);
    });
  }

  renderEnemyInfo(boss) {
    const weakText = boss.weakness ? (elementNames[boss.weakness] ?? boss.weakness) : '不明';
    this.enemyInfoEl.innerHTML = `
      <div>${boss.name}</div>
      <div>HP: ${boss.hp} / ${boss.maxHp}</div>
      <div class="stat-bar-track"><div class="stat-bar-fill hp ${hpBarClass(boss)}" style="width:${Math.max(0, boss.hpRatio() * 100)}%"></div></div>
      <div>弱点: ${weakText}</div>
    `;
  }

  renderPartyStatus(party) {
    this.partyStatusEl.innerHTML = '';
    party.forEach((unit, idx) => {
      const row = document.createElement('div');
      row.className = `status-row${unit === this.battleManager?.currentActor ? ' current-actor' : ''}${unit.isAlive() ? '' : ' is-ko'}`;
      const statuses = [...(unit.statuses ?? [])];
      const statusMarkup = statuses.length
        ? `<span class="status-chips">${statuses.slice(0, 3).map((status) => {
          const turns = unit.statusDurations?.get?.(status);
          return `<i>${statusNamesJa[status] ?? status}${turns ? `<b>${turns}</b>` : ''}</i>`;
        }).join('')}</span>`
        : '';
      row.innerHTML = `
        <div class="p-name"><b>${String(idx + 1).padStart(2, '0')}</b>${unit.name}<small>ATK ${unit.atk} ・ DEF ${unit.def} ・ MDEF ${unit.magicDef}</small>${statusMarkup}</div>
        <div class="p-nums">
          <span><em>HP</em> ${unit.hp}<small>/ ${unit.maxHp}</small></span>
          <div class="stat-bar-track"><div class="stat-bar-fill hp ${hpBarClass(unit)}" style="width:${Math.max(0, unit.hpRatio() * 100)}%"></div></div>
        </div>
        <div class="p-nums">
          <span><em>MP</em> ${unit.mp}<small>/ ${unit.maxMp}</small></span>
          <div class="stat-bar-track"><div class="stat-bar-fill mp" style="width:${unit.maxMp ? (unit.mp / unit.maxMp) * 100 : 0}%"></div></div>
        </div>
      `;
      this.partyStatusEl.appendChild(row);
    });
  }

  renderCommandListIdle() {
    this.commandHeadingEl.textContent = 'コマンド';
    this.commandListEl.innerHTML = '<li style="opacity:.6">・・・待機中・・・</li>';
  }

  renderCommandListForActor(actor) {
    this.commandHeadingEl.textContent = actor.name;
    this.commandListEl.innerHTML = '';
    basicCommands.forEach((cmd) => {
      const li = this.createChoice(cmd.label, () => this.handleCommandSelect(cmd.id, actor));
      this.commandListEl.appendChild(li);
    });
  }

  // ---------- Player input flow ----------

  handleCommandSelect(commandId, actor) {
    // A newly selected command always replaces any open submenu/target window.
    this.closeActionWindows();

    switch (commandId) {
      case 'attack':
        this.submitAttack(actor);
        break;
      case 'defend':
        this.submitDefend(actor);
        break;
      case 'magic': {
        const setName = actor.equippedAbilitySet ?? 'たたかう型';
        const list = magicSets[setName] ?? [];
        this.openSubmenu('まほう', list, 'spell', actor);
        break;
      }
      case 'ability': {
        this.openSubmenu('アビリティ', getAbilityActions(actor.abilityId), 'ability', actor);
        break;
      }
      case 'crystal': {
        const shardAction = crystalShardAction(actor.crystalShardId);
        this.openSubmenu('結晶技', shardAction ? [shardAction] : [], 'crystal', actor);
        break;
      }
      case 'item':
        this.openSubmenu('アイテム', itemActions, 'item', actor);
        break;
      default:
        break;
    }
  }

  submitAttack(actor) {
    this.battleManager.submitPlayerAction({ type: 'attack', ctbCost: attackAction.ctbCost }, this.battleManager.boss);
  }

  submitDefend(actor) {
    this.battleManager.submitPlayerAction({ type: 'defend', ctbCost: defendAction.ctbCost }, actor);
  }

  openSubmenu(heading, list, kind, actor) {
    this.submenuHeadingEl.textContent = heading;
    this.submenuListEl.innerHTML = '';

    const cancel = this.createChoice('もどる', () => this.closeSubmenu(), { accent: true });
    cancel.classList.add('submenu-back');
    this.submenuListEl.appendChild(cancel);

    if (list.length === 0) {
      const li = document.createElement('li');
      li.textContent = '(つかえるものがない)';
      this.submenuListEl.appendChild(li);
    }

    list.forEach((entry) => {
      const actualMpCost = Math.ceil((entry.mpCost ?? 0) * (actor.mpCostMultiplier ?? 1));
      const costLabel = entry.mpCost ? ` (MP${actualMpCost})` : '';
      const itemState = kind === 'item' && typeof this.battleManager?.getItemUseState === 'function'
        ? this.battleManager.getItemUseState(entry)
        : null;
      const itemStock = itemState?.stock ?? (kind === 'item' && typeof this.battleManager?.getItemStock === 'function'
        ? this.battleManager.getItemStock(entry.id, entry)
        : null);
      const itemUsable = itemState?.usable ?? (kind === 'item' && typeof this.battleManager?.canUseItem === 'function'
        ? this.battleManager.canUseItem(entry)
        : true);
      const disabledReason = entry.disabledReason
        ?? itemState?.disabledReason
        ?? itemState?.reason
        ?? (itemStock === 0 ? '在庫がない。' : '');
      const stockLabel = itemStock == null ? '' : ` ×${Number.isFinite(itemStock) ? itemStock : '∞'}`;
      const disabled = (['spell', 'ability', 'crystal'].includes(kind) && actualMpCost && actor.mp < actualMpCost)
        || Boolean(entry.disabledReason) || itemStock === 0 || itemUsable === false;
      const li = this.createChoice(
        `${entry.name}${costLabel}${stockLabel}`,
        () => {
          this.closeSubmenu();
          this.pendingCommandType = kind;
          this.pendingSpellOrItem = entry;
          this.promptTarget(entry, kind, actor);
        },
        { disabled, detail: disabledReason || this.entryDetail(entry, kind) }
      );
      this.submenuListEl.appendChild(li);
    });

    this.submenuWindowEl.classList.remove('hidden');
  }

  closeSubmenu() {
    this.submenuWindowEl.classList.add('hidden');
  }

  closeActionWindows() {
    this.closeSubmenu();
    this.closeTargetWindow();
    this.pendingCommandType = null;
    this.pendingSpellOrItem = null;
  }

  promptTarget(entry, kind, actor) {
    const allyTarget = ['single-ally', 'one_ally', 'one_or_all_allies', 'all_allies', 'party', 'enemy_group_and_ally'].includes(entry.target);
    const automaticTarget = ['all_allies', 'all_enemies', 'all_units', 'party', 'enemy_group', 'enemy_and_party', 'random_unit'].includes(entry.target);
    const reviveAction = entry.operations?.some((operation) => operation.op === 'revive');
    const targets = entry.target === 'self'
      ? [actor]
      : allyTarget
        ? this.battleManager.party.filter((partyUnit) => reviveAction ? !partyUnit.isAlive() : partyUnit.isAlive())
        : [this.battleManager.boss];

    if (targets.length === 0) {
      this.closeActionWindows();
      this.messageWindow.show(reviveAction ? '戦闘不能の味方はいない。' : '対象がいない。');
      return;
    }

    if (automaticTarget) {
      this.finalizeAction(entry, kind, targets[0]);
      return;
    }

    if (targets.length === 1) {
      this.finalizeAction(entry, kind, targets[0]);
      return;
    }

    this.targetListEl.innerHTML = '';
    targets.forEach((t) => {
      const li = this.createChoice(`${t.name} (HP ${t.hp}/${t.maxHp})`, () => {
        this.closeTargetWindow();
        this.finalizeAction(entry, kind, t);
      });
      this.targetListEl.appendChild(li);
    });
    this.targetWindowEl.classList.remove('hidden');
  }

  closeTargetWindow() {
    this.targetWindowEl.classList.add('hidden');
  }

  finalizeAction(entry, kind, target) {
    this.closeActionWindows();
    if (kind === 'spell') {
      this.battleManager.submitPlayerAction({ type: 'magic', spell: entry, ctbCost: entry.ctbCost }, target);
    } else if (kind === 'ability') {
      this.battleManager.submitPlayerAction({ type: 'ability', ability: entry, ctbCost: entry.ctbCost }, target);
    } else if (kind === 'crystal') {
      this.battleManager.submitPlayerAction({ type: 'crystal', shard: entry, ctbCost: entry.ctbCost }, target);
    } else if (kind === 'item') {
      this.battleManager.submitPlayerAction({ type: 'item', item: entry, ctbCost: entry.ctbCost }, target);
    }
  }

  playActionPulse(actor, results) {
    const actorEl = actor ? document.querySelector(`[data-uid="${actor.uid}"]`) : null;
    actorEl?.classList.add('action-pulse');
    setTimeout(() => actorEl?.classList.remove('action-pulse'), 420);

    if (!this.battleFieldEl || results.length === 0) return;
    const element = results.find((result) => result.element)?.element;
    const visualType = results.some((result) => ['heal', 'mp-heal', 'revive', 'absorb'].includes(result.type))
      ? 'cast-heal'
      : results.some((result) => ['status', 'buff', 'cleanse', 'dispel', 'effect'].includes(result.type))
        ? 'cast-arcane'
        : 'cast-impact';
    if (this.effectsEl) {
      [...this.effectsEl.classList].filter((name) => name.startsWith('element-')).forEach((name) => this.effectsEl.classList.remove(name));
      this.effectsEl.classList.remove('cast-heal', 'cast-arcane', 'cast-impact');
      requestAnimationFrame(() => this.effectsEl?.classList.add(visualType, ...(element ? [`element-${safeToken(element)}`] : [])));
      setTimeout(() => {
        this.effectsEl?.classList.remove(visualType);
        if (element) this.effectsEl?.classList.remove(`element-${safeToken(element)}`);
      }, 650);
    }
    this.battleFieldEl.classList.remove('impacting');
    // Restarting the class in a new frame keeps rapid multi-hit actions legible.
    requestAnimationFrame(() => {
      this.battleFieldEl?.classList.add('impacting');
      setTimeout(() => this.battleFieldEl?.classList.remove('impacting'), 320);
    });
  }

  showCombatResult(result, targetEl) {
    if (!this.effectsEl || !targetEl) return;
    const targetRect = targetEl.getBoundingClientRect();
    const stageRect = this.effectsEl.getBoundingClientRect();
    const effect = document.createElement('span');
    effect.className = `combat-result ${result.type}`;
    if (result.element) effect.classList.add(`element-${safeToken(result.element)}`);

    if (['damage', 'mp-damage'].includes(result.type)) {
      const outcome = result.nullified ? 'NULL' : result.resisted ? 'RESIST' : result.weak ? 'WEAK' : 'HIT';
      effect.textContent = `${outcome} −${result.amount ?? 0}`;
    }
    else if (['heal', 'mp-heal', 'revive', 'absorb'].includes(result.type)) effect.textContent = `+${result.amount ?? 0}`;
    else if (result.type === 'miss') effect.textContent = 'MISS';
    else if (result.type === 'blocked' || result.type === 'defend') effect.textContent = 'GUARD';
    else if (result.type === 'status') effect.textContent = statusNamesJa[result.statuses?.[0]] ?? result.statuses?.[0] ?? 'STATUS';
    else if (result.type === 'status-resist') effect.textContent = `RESIST ${statusNamesJa[result.statuses?.[0]] ?? result.statuses?.[0] ?? ''}`;
    else effect.textContent = result.label ?? 'EFFECT';

    effect.style.left = `${targetRect.left - stageRect.left + targetRect.width / 2}px`;
    effect.style.top = `${targetRect.top - stageRect.top + targetRect.height * 0.22}px`;
    this.effectsEl.appendChild(effect);
    effect.addEventListener('animationend', () => effect.remove(), { once: true });
    setTimeout(() => effect.remove(), 1300);
  }

  entryDetail(entry, kind) {
    const parts = [];
    if (entry.element) parts.push(elementNames[entry.element] ?? entry.element);
    if (entry.target) parts.push(targetNamesJa[entry.target] ?? entry.target);
    const effect = entry.effect ?? entry.battle?.description ?? entry.description;
    if (effect) parts.push(String(effect).replace(/\s+/g, ' ').slice(0, 34));
    else if (kind === 'item' && entry.healAmount) parts.push(`HP ${entry.healAmount} 回復`);
    return parts.join('・');
  }

  clearTelegraph() {
    this.telegraphEl.classList.add('hidden');
    this.telegraphEl.classList.remove('countered');
    this.telegraphEl.textContent = '';
  }

  createChoice(label, onActivate, { disabled = false, accent = false, detail = '' } = {}) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `battle-choice${accent ? ' accent' : ''}`;
    const primary = document.createElement('span');
    primary.className = 'choice-primary';
    primary.textContent = label;
    button.appendChild(primary);
    if (detail) {
      const secondary = document.createElement('small');
      secondary.className = 'choice-detail';
      secondary.textContent = detail;
      button.appendChild(secondary);
    }
    button.disabled = disabled;
    if (disabled) button.setAttribute('aria-disabled', 'true');
    else button.addEventListener('click', onActivate);
    li.appendChild(button);
    return li;
  }
}
