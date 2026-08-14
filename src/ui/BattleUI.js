import { eventBus } from '../core/EventBus.js';
import { basicCommands, attackAction, defendAction, getAbilityActions, itemActions } from '../data/abilityData.js';
import { elementNames } from '../data/bossData.js';
import { selectableAbilities } from '../database/ff5Database.js';
import { crystalShardAction } from '../database/battleCatalog.js';
import { getBattleEffectDescriptor, resolveBattleEffectDescriptor } from './BattleEffectRegistry.js';
import { MessageWindow } from './MessageWindow.js';
import { STATUS_LABELS_JA } from '../battle/StatusEngine.js';
import { getAbilityListPosition, saveAbilityListPosition } from '../core/AbilityPosition.js';
import { createSpellArtElement } from './SpellArtDirector.js';

function hpBarClass(unit) {
  const ratio = unit.hpRatio();
  if (ratio <= 0.25) return 'low';
  if (ratio <= 0.5) return 'mid';
  return '';
}

const statusNamesJa = STATUS_LABELS_JA;

const targetNamesJa = Object.freeze({
  self: '自分', one_target: '単体', 'single-enemy': '敵単体', one_enemy: '敵単体', enemy_group: '敵全体', all_enemies: '敵全体', one_or_all_enemies: '敵単体/全体',
  'single-ally': '味方単体', one_ally: '味方単体', 'single-any': '単体', all_allies: '味方全体', party: '味方全体', one_or_all_allies: '味方単体/全体',
  all_units: '全体', random_unit: 'ランダム', enemy_group_and_ally: '敵全体＋味方', enemy_and_party: '敵味方全体',
  battle: '戦場',
});

const unitRunes = Object.freeze({ p1: '✦', p2: '◈', p3: '⬢', p4: '⌁', omega: '⊗', boss1: '◆', boss2: '◇', boss3: '✧' });

function safeToken(value, fallback = 'unknown') {
  const token = String(value ?? fallback).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return token || fallback;
}

function abilityCommandName(abilityId) {
  return selectableAbilities.find((ability) => ability.id === abilityId)?.nameJa ?? 'アビリティ';
}

function effectModifier(prefix, value) {
  return value ? `${prefix}-${safeToken(value)}` : '';
}

function effectDuration(descriptor) {
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Keep the signature frame readable while suppressing the full travel and
  // camera choreography. 160ms was effectively invisible on mobile capture.
  return reducedMotion ? 360 : Math.min(1600, Math.max(620, descriptor.duration));
}

export function battleEffectRenderProfile(actionOrDescriptor = {}, results = []) {
  const descriptor = actionOrDescriptor.family && actionOrDescriptor.phaseTopology
    ? actionOrDescriptor
    : resolveBattleEffectDescriptor(actionOrDescriptor);
  const action = actionOrDescriptor.family ? {} : actionOrDescriptor;
  const family = safeToken(descriptor.family);
  const motion = safeToken(descriptor.motion.kind);
  const geometry = safeToken(descriptor.geometry.primary);
  const impact = safeToken(descriptor.impact.topology);
  const modifiers = [
    effectModifier('entrance', descriptor.motion.entrance),
    effectModifier('secondary', descriptor.geometry.secondary),
    effectModifier('formation', descriptor.geometry.formation),
    effectModifier('placement', descriptor.impact?.placement),
    effectModifier('pulse', descriptor.pulsePattern.shape),
    effectModifier('texture', descriptor.textureMode),
    effectModifier('camera', descriptor.cameraCue),
    effectModifier('reaction', descriptor.targetReaction),
    effectModifier('phases', descriptor.phaseTopology.phases),
    effectModifier('topology', descriptor.phaseTopology.topology),
    effectModifier('trajectory', descriptor.trajectory.kind),
    effectModifier('origin', descriptor.trajectory.origin),
    effectModifier('turns', descriptor.trajectory.turns),
    effectModifier('source', descriptor.sourceType),
    effectModifier('school', String(descriptor.titleTag).split(':')[0]),
    effectModifier('command', action.commandSourceId),
  ].filter(Boolean);
  return Object.freeze({ descriptor, family, motion, geometry, impact, modifiers: Object.freeze(modifiers) });
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
    this.effectQueue = [];
    this.activeEffect = null;
    this.effectTimer = null;
    this.activeEffectDeadline = 0;
    this.activeAbilityMenu = null;
    this.pendingDualcast = null;

    this.submenuListEl?.addEventListener('scroll', () => this.rememberAbilityMenuPosition(), { passive: true });

    this._bindStaticEvents();
  }

  attachBattle(battleManager) {
    this.battleManager = battleManager;
    this.messageWindow.reset();
    this.clearTelegraph();
    this.currentPhase = 1;
    this.clearBattleEffects();
    this.battleFieldEl?.classList.remove('impacting');
    this.closeActionWindows();
    this.renderCommandListIdle();
  }

  _bindStaticEvents() {
    eventBus.on('battle:log', (text) => {
      const pendingMs = this.messageWindow.show(text);
      this.battleManager?.deferNextTurnFor(pendingMs + 40);
    });

    eventBus.on('battle:stateUpdate', ({ party, boss, preview }) => {
      if (!this.battleManager?.awaitingPlayerInput) {
        this.closeActionWindows();
        this.renderCommandListIdle();
      }
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

    eventBus.on('battle:actionStarted', () => {
      this.closeActionWindows();
      this.renderCommandListIdle();
    });

    eventBus.on('battle:actionResolved', ({ actor, action, results }) => {
      this.closeActionWindows();
      this.renderCommandListIdle();
      if (actor?.isEnemy) this.clearTelegraph();
      const dualVisuals = action?.specialCommand === 'dualcast'
        ? (action.dualSpells ?? []).map((spell, castIndex) => ({
          action: spell,
          results: results.filter((result) => result.castIndex === castIndex),
        })).filter((cast) => cast.results.length)
        : [];
      if (dualVisuals.length) {
        // Dualcast is two real casts, not one generic "dual magic" flash.
        // Queue both spell-specific drawings in the order selected.
        dualVisuals.forEach((cast) => this.playActionPulse(actor, cast.results, cast.action));
      } else {
        this.playActionPulse(actor, results, action);
      }
      const reactionAction = dualVisuals[0]?.action ?? action;
      const effectDescriptor = reactionAction?.id || reactionAction?.sourceId || reactionAction?.visualId || reactionAction?.name
        ? resolveBattleEffectDescriptor(reactionAction)
        : null;
      results.forEach((r) => {
        const el = document.querySelector(`[data-uid="${r.targetUid}"]`);
        if (el) {
          el.classList.add('flash');
          setTimeout(() => el.classList.remove('flash'), 440);
          if (effectDescriptor) this.playTargetReaction(el, effectDescriptor, r);
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
    if (boss.spriteUrl) {
      sprite.classList.add('has-sprite-image');
      const img = document.createElement('img');
      img.className = 'sprite-image';
      img.src = boss.spriteUrl;
      img.alt = boss.name;
      img.draggable = false;
      sprite.appendChild(img);
    } else {
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
    }

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = boss.name;
    sprite.appendChild(label);

    wrap.appendChild(sprite);
    const intel = document.createElement('div');
    const intelState = this.battleManager?.bossIntel ?? {};
    const weakness = boss.weakness ? (elementNames[boss.weakness] ?? boss.weakness) : '解析不能';
    const hpLine = intelState.hp ? `<span>HP ${boss.hp} / ${boss.maxHp}</span>` : '';
    const weakLine = intelState.weakness ? `<span class="enemy-intel-weak">WEAK：${weakness}</span>` : '';
    const levelLine = intelState.level ? `<span class="enemy-intel-detail">LEVEL ${boss.level}</span>` : '';
    const unknownLine = intelState.hp ? '' : '<span class="enemy-intel-unknown">DATA UNANALYZED</span>';
    intel.className = 'enemy-intel';
    intel.innerHTML = `
      <span class="target-tag">TARGET</span>
      <strong>${boss.name}</strong>
      ${unknownLine}
      ${hpLine}
      ${weakLine}
      ${levelLine}
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
      if (unit.spriteUrl) {
        sprite.classList.add('has-sprite-image');
        const img = document.createElement('img');
        img.className = 'sprite-image';
        img.src = unit.spriteUrl;
        img.alt = unit.name;
        img.draggable = false;
        sprite.appendChild(img);
      } else {
        const blob = document.createElement('div');
        blob.className = 'blob';
        blob.style.width = '100%';
        blob.style.height = '100%';
        blob.innerHTML = `<span class="soul-flare"></span><span class="soul-core"></span><span class="soul-rune">${unitRunes[unitToken] ?? idx + 1}</span>`;
        sprite.appendChild(blob);
      }
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
    const intelState = this.battleManager?.bossIntel ?? {};
    if (!intelState.hp) {
      this.enemyInfoEl.innerHTML = '<div class="enemy-info-unknown">未解析<br><small>ライブラ・しらべる・みやぶるで確認</small></div>';
      return;
    }
    const weakText = boss.weakness ? (elementNames[boss.weakness] ?? boss.weakness) : '不明';
    const weaknessLine = intelState.weakness ? `<div>弱点: ${weakText}</div>` : '';
    const levelLine = intelState.level ? `<div>レベル: ${boss.level}</div>` : '';
    const statusLine = intelState.status
      ? `<div>状態: ${[...(boss.statuses ?? [])].map((status) => statusNamesJa[status] ?? status).join('・') || 'なし'}</div>`
      : '';
    this.enemyInfoEl.innerHTML = `
      <div>${boss.name}</div>
      <div>HP: ${boss.hp} / ${boss.maxHp}</div>
      <div class="stat-bar-track"><div class="stat-bar-fill hp ${hpBarClass(boss)}" style="width:${Math.max(0, boss.hpRatio() * 100)}%"></div></div>
      ${levelLine}${weaknessLine}${statusLine}
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
    this.commandListEl.innerHTML = '';
  }

  renderCommandListForActor(actor) {
    this.commandHeadingEl.textContent = actor.name;
    this.commandListEl.innerHTML = '';
    basicCommands.forEach((cmd) => {
      const label = cmd.id === 'ability' ? abilityCommandName(actor.abilityId) : cmd.label;
      const li = this.createChoice(label, () => this.handleCommandSelect(cmd.id, actor));
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
      case 'ability': {
        this.openSubmenu(abilityCommandName(actor.abilityId), getAbilityActions(actor.abilityId), 'ability', actor);
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
    this.rememberAbilityMenuPosition();
    this.activeAbilityMenu = kind === 'ability'
      ? { unitId: actor.id, abilityId: actor.abilityId }
      : null;
    this.submenuHeadingEl.textContent = heading;
    this.submenuListEl.innerHTML = '';

    const cancel = this.createChoice('もどる', () => {
      this.pendingDualcast = null;
      this.closeSubmenu();
    }, { accent: true });
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
      const requiredItemIds = [entry.requiredItemId, ...(entry.ingredients ?? [])].filter(Boolean);
      const requiredCounts = requiredItemIds.reduce((map, id) => map.set(id, (map.get(id) ?? 0) + 1), new Map());
      const missingRequiredItem = [...requiredCounts].some(([id, amount]) => this.battleManager.getItemStock(id) < amount);
      const captureUnavailable = (entry.requiresCapture && !actor.capturedMonster)
        || (entry.requiresNoCapture && Boolean(actor.capturedMonster));
      const requirementLabel = requiredItemIds.length
        ? ` / 素材 ${[...requiredCounts].map(([id, amount]) => `${id.replace('item_', '')}×${amount}`).join('+')}`
        : '';
      const disabledReason = entry.disabledReason
        ?? itemState?.disabledReason
        ?? itemState?.reason
        ?? (itemStock === 0 ? '在庫がない。' : '');
      const stockLabel = itemStock == null ? '' : ` ×${Number.isFinite(itemStock) ? itemStock : '∞'}`;
      const disabled = (['spell', 'ability', 'crystal'].includes(kind) && actualMpCost && actor.mp < actualMpCost)
        || itemStock === 0 || itemUsable === false || missingRequiredItem || captureUnavailable || Boolean(entry.disabledReason);
      const li = this.createChoice(
        `${entry.name}${costLabel}${stockLabel}`,
        () => {
          this.rememberAbilityMenuPosition();
          this.closeSubmenu();
          if (entry.disabledReason) {
            this.messageWindow.show(entry.disabledReason);
            this.playActionPulse(actor, [{ type: 'status', targetUid: actor.uid, statuses: ['unavailable'] }], entry);
            return;
          }
          this.pendingCommandType = kind;
          this.pendingSpellOrItem = entry;
          this.promptTarget(entry, kind, actor);
        },
        { disabled, detail: missingRequiredItem ? `必要な素材がない${requirementLabel}` : captureUnavailable ? (entry.requiresCapture ? 'とらえたモンスターがいない' : '先に「はなつ」を使用') : disabledReason || `${this.entryDetail(entry, kind)}${requirementLabel}` }
      );
      li.querySelector('button')?.setAttribute('data-entry-id', entry.id ?? entry.sourceId ?? entry.name);
      this.submenuListEl.appendChild(li);
    });

    this.submenuWindowEl.classList.remove('hidden');
    if (this.activeAbilityMenu) {
      const { unitId, abilityId } = this.activeAbilityMenu;
      requestAnimationFrame(() => {
        this.submenuListEl.scrollTop = getAbilityListPosition(unitId, 'battle', abilityId);
      });
    }
  }

  closeSubmenu() {
    this.rememberAbilityMenuPosition();
    this.submenuWindowEl.classList.add('hidden');
    this.activeAbilityMenu = null;
  }

  rememberAbilityMenuPosition() {
    if (!this.activeAbilityMenu || !this.submenuListEl) return;
    saveAbilityListPosition(
      this.activeAbilityMenu.unitId,
      'battle',
      this.submenuListEl.scrollTop,
      this.activeAbilityMenu.abilityId
    );
  }

  closeActionWindows({ preserveDualcast = false } = {}) {
    this.closeSubmenu();
    this.closeTargetWindow();
    this.pendingCommandType = null;
    this.pendingSpellOrItem = null;
    if (!preserveDualcast) this.pendingDualcast = null;
  }

  promptTarget(entry, kind, actor) {
    const anyTarget = entry.target === 'single-any';
    const allyTarget = ['single-ally', 'one_ally', 'one_or_all_allies', 'all_allies', 'party', 'enemy_group_and_ally'].includes(entry.target);
    const automaticTarget = ['all_allies', 'all_enemies', 'all_units', 'party', 'enemy_group', 'enemy_and_party', 'random_unit'].includes(entry.target);
    const reviveAction = ['resurrection', 'reincarnate', 'phoenix-down', 'kiss-of-life'].includes(entry.mixEffect)
      || entry.operations?.some((operation) => operation.op === 'revive');
    const targets = entry.target === 'self'
      ? [actor]
      : anyTarget
        ? [...this.battleManager.party.filter((partyUnit) => partyUnit.isAlive()), this.battleManager.boss].filter((unit) => unit?.isAlive())
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
    if (kind === 'ability' && entry.dualcastCandidate) {
      const actor = this.battleManager?.currentActor;
      if (!this.pendingDualcast) {
        this.pendingDualcast = { firstSpell: entry, firstTargetUid: target?.uid ?? null, actorUid: actor?.uid };
        this.closeTargetWindow();
        this.closeSubmenu();
        this.openSubmenu('れんぞくま：2つめ', getAbilityActions('ability_dualcast'), 'ability', actor);
        return;
      }
      const first = this.pendingDualcast;
      const dualAbility = {
        id: `dualcast-${first.firstSpell.sourceId}-${entry.sourceId}`,
        name: `${first.firstSpell.name} → ${entry.name}`,
        actionKind: 'special-command',
        specialCommand: 'dualcast',
        sourceType: 'ability',
        sourceId: 'ability_dualcast',
        commandSourceId: 'ability_dualcast',
        visualId: `ability_dualcast_${first.firstSpell.sourceId}_${entry.sourceId}`,
        dualSpells: [first.firstSpell, entry],
        dualTargetUids: [first.firstTargetUid, target?.uid ?? null],
        mpCost: (first.firstSpell.mpCost ?? 0) + (entry.mpCost ?? 0),
        ctbCost: 1.25,
        target: 'self',
      };
      this.pendingDualcast = null;
      this.closeActionWindows();
      this.battleManager.submitPlayerAction({ type: 'ability', ability: dualAbility, ctbCost: dualAbility.ctbCost }, actor);
      return;
    }
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

  playActionPulse(actor, results, action = {}) {
    const actorEl = actor ? document.querySelector(`[data-uid="${actor.uid}"]`) : null;
    actorEl?.classList.add('action-pulse');
    setTimeout(() => actorEl?.classList.remove('action-pulse'), 420);
    if (actorEl && (action?.id || action?.sourceId || action?.visualId || action?.name)) {
      const castDescriptor = getBattleEffectDescriptor(action.commandSourceId) ?? resolveBattleEffectDescriptor(action);
      const castClass = `cast-motion-${safeToken(castDescriptor.castMotion)}`;
      [...actorEl.classList].filter((name) => name.startsWith('cast-motion-')).forEach((name) => actorEl.classList.remove(name));
      actorEl.classList.add('casting-effect', castClass);
      const castDistance = 4 + castDescriptor.motion.oscillation * 2;
      actorEl.style.setProperty('--cast-distance', `${castDistance}px`);
      actorEl.style.setProperty('--cast-distance-negative', `${-castDistance}px`);
      actorEl.style.setProperty('--cast-distance-half-negative', `${Math.round(castDistance * -0.6)}px`);
      actorEl.style.setProperty('--cast-distance-half-positive', `${Math.round(castDistance * 0.6)}px`);
      actorEl.style.setProperty('--cast-angle-negative', `${castDescriptor.motion.rotationDegrees * -0.15}deg`);
      actorEl.style.setProperty('--cast-angle-positive', `${castDescriptor.motion.rotationDegrees * 0.12}deg`);
      setTimeout(() => actorEl.classList.remove('casting-effect', castClass), 720);
    }

    if (!this.battleFieldEl || results.length === 0) return;
    const element = action?.element ?? results.find((result) => result.element)?.element;
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
      if (action?.id || action?.sourceId || action?.visualId || action?.name) {
        this.enqueueBattleEffect(actor, action, results, visualType);
      }
    }
    this.battleFieldEl.classList.remove('impacting');
    // Restarting the class in a new frame keeps rapid multi-hit actions legible.
    requestAnimationFrame(() => {
      this.battleFieldEl?.classList.add('impacting');
      setTimeout(() => this.battleFieldEl?.classList.remove('impacting'), 320);
    });
  }

  playTargetReaction(targetEl, descriptor, result = {}) {
    const semanticReaction = ['heal', 'mp-heal', 'buff'].includes(result.type)
      ? 'lift'
      : result.type === 'revive'
        ? 'silhouette-flash'
        : ['cleanse', 'dispel'].includes(result.type)
          ? 'dissolve-edge'
          : descriptor.targetReaction;
    const reactionClass = `reaction-${safeToken(semanticReaction)}`;
    [...targetEl.classList].filter((name) => name.startsWith('reaction-')).forEach((name) => targetEl.classList.remove(name));
    targetEl.classList.remove('target-reaction');
    requestAnimationFrame(() => {
      targetEl.classList.add('target-reaction', reactionClass);
      setTimeout(() => targetEl.classList.remove('target-reaction', reactionClass), 720);
    });
  }

  enqueueBattleEffect(actor, action = {}, results = [], visualType = 'cast-impact') {
    if (!this.effectsEl) return;
    const descriptor = resolveBattleEffectDescriptor(action);
    const duration = effectDuration(descriptor);
    this.effectQueue.push({ actor, action, results, visualType, descriptor, duration });
    const remainingMs = Math.max(0, this.activeEffectDeadline - Date.now());
    const queuedMs = this.effectQueue.reduce((total, queued) => total + queued.duration + 180, 0);
    this.battleManager?.deferNextTurnFor(remainingMs + queuedMs + 20);
    this.runNextBattleEffect();
  }

  runNextBattleEffect() {
    if (this.activeEffect || !this.effectsEl || this.effectQueue.length === 0) return;
    const effectState = this.effectQueue.shift();
    const { actor, action, results, visualType, descriptor, duration } = effectState;
    const commandDescriptor = getBattleEffectDescriptor(action.commandSourceId);
    const sequence = document.createElement('div');
    const profile = battleEffectRenderProfile(action, results);
    const { family, motion, geometry, impact } = profile;
    const targetUnits = [...new Set(results.map((result) => result.targetUid).filter(Boolean))]
      .map((uid) => this.battleManager?.units.find((unit) => unit.uid === uid))
      .filter(Boolean);
    const alliedTargets = actor ? targetUnits.filter((unit) => unit.isEnemy === actor.isEnemy) : [];
    const hostileTargets = actor ? targetUnits.filter((unit) => unit.isEnemy !== actor.isEnemy) : targetUnits;
    const friendlyTarget = Boolean(actor && targetUnits.length && alliedTargets.length === targetUnits.length);
    const mixedTarget = alliedTargets.length > 0 && hostileTargets.length > 0;
    const multiTarget = targetUnits.length > 1 || ['all_allies', 'all_enemies', 'all_units', 'party', 'enemy_group', 'enemy_and_party', 'enemy_group_and_ally'].includes(action.target);
    const directionClass = friendlyTarget
      ? `target-friendly-${actor?.isEnemy ? 'enemy' : 'player'}`
      : actor?.isEnemy ? 'direction-enemy' : 'direction-player';
    const modifiers = [
      ...profile.modifiers,
      directionClass,
      friendlyTarget ? 'target-friendly' : 'target-hostile',
      mixedTarget ? 'target-mixed' : '',
      multiTarget ? 'target-multi' : 'target-single',
      descriptor.summonMotif ? `motif-${safeToken(descriptor.summonMotif)}` : '',
      descriptor.songPattern ? `song-${safeToken(descriptor.songPattern)}` : '',
    ].filter(Boolean);
    sequence.className = [
      'effect-sequence', `effect-${safeToken(descriptor.actionId)}`, `family-${family}`, `motion-${motion}`, `geometry-${geometry}`,
      `impact-${impact}`, visualType, ...modifiers,
    ].join(' ');
    sequence.dataset.effectId = descriptor.actionId;
    sequence.dataset.visualId = String(action.visualId ?? action.sourceId ?? action.id ?? descriptor.actionId);
    sequence.dataset.effectFamily = descriptor.family;
    sequence.dataset.motion = descriptor.motion.kind;
    sequence.dataset.geometry = descriptor.geometry.primary;
    sequence.dataset.phaseTopology = descriptor.phaseTopology.topology;
    sequence.style.setProperty('--fx-duration', `${duration}ms`);
    sequence.style.setProperty('--fx-primary', descriptor.palette[1]);
    sequence.style.setProperty('--fx-secondary', descriptor.palette[2]);
    sequence.style.setProperty('--fx-highlight', descriptor.palette[0]);
    sequence.style.setProperty('--fx-rotation', `${descriptor.motion.rotationDegrees}deg`);
    sequence.style.setProperty('--fx-intensity', String(descriptor.pulsePattern.amplitude));
    sequence.style.setProperty('--fx-beats', String(descriptor.pulsePattern.beats));
    sequence.style.setProperty('--fx-layers', String(descriptor.geometry.layers));
    sequence.style.setProperty('--fx-symmetry', String(descriptor.geometry.symmetry));
    sequence.style.setProperty('--fx-arc-bias', String(descriptor.trajectory.arcBias));
    sequence.style.setProperty('--fx-turns', String(descriptor.trajectory.turns));

    if (friendlyTarget) {
      const stageRect = this.effectsEl.getBoundingClientRect();
      const pointFor = (unit) => {
        const element = unit ? document.querySelector(`[data-uid="${unit.uid}"]`) : null;
        const rect = element?.getBoundingClientRect();
        return rect ? {
          x: ((rect.left - stageRect.left + rect.width / 2) / Math.max(1, stageRect.width)) * 100,
          y: ((rect.top - stageRect.top + rect.height / 2) / Math.max(1, stageRect.height)) * 100,
        } : null;
      };
      const casterPoint = pointFor(actor) ?? { x: actor?.isEnemy ? 24 : 78, y: 42 };
      const targetPoints = targetUnits.map(pointFor).filter(Boolean);
      const targetPoint = targetPoints.length ? {
        x: targetPoints.reduce((sum, point) => sum + point.x, 0) / targetPoints.length,
        y: targetPoints.reduce((sum, point) => sum + point.y, 0) / targetPoints.length,
      } : casterPoint;
      sequence.style.setProperty('--fx-caster-x', `${casterPoint.x.toFixed(2)}%`);
      sequence.style.setProperty('--fx-caster-y', `${casterPoint.y.toFixed(2)}%`);
      sequence.style.setProperty('--fx-target-x', `${targetPoint.x.toFixed(2)}%`);
      sequence.style.setProperty('--fx-target-y', `${targetPoint.y.toFixed(2)}%`);
    }

    const backdrop = document.createElement('span');
    backdrop.className = 'fx-backdrop';
    const title = document.createElement('span');
    title.className = 'fx-title';
    const titleText = document.createElement('b');
    titleText.textContent = `${String(descriptor.titleTag).split(':')[0].toUpperCase()} // ${action.name ?? descriptor.actionId}`;
    title.appendChild(titleText);
    const sigil = document.createElement('span');
    sigil.className = 'fx-caster-sigil';
    let commandLayer = null;
    if (commandDescriptor && commandDescriptor.actionId !== descriptor.actionId) {
      commandLayer = document.createElement('span');
      commandLayer.className = [
        'fx-command-layer',
        `family-${safeToken(commandDescriptor.family)}`,
        `motion-${safeToken(commandDescriptor.motion.kind)}`,
        `geometry-${safeToken(commandDescriptor.geometry.primary)}`,
        `entrance-${safeToken(commandDescriptor.motion.entrance)}`,
      ].join(' ');
      commandLayer.dataset.commandEffectId = commandDescriptor.actionId;
      const commandCore = document.createElement('i');
      commandCore.className = 'fx-core';
      commandCore.textContent = commandDescriptor.glyph.symbol;
      commandLayer.appendChild(commandCore);
    }
    const path = document.createElement('span');
    path.className = 'fx-path';
    const core = document.createElement('span');
    core.className = 'fx-core';
    const orbit = document.createElement('span');
    orbit.className = 'fx-orbit';
    const hit = document.createElement('span');
    hit.className = 'fx-impact';
    let mixedImpact = null;
    if (mixedTarget) {
      mixedImpact = document.createElement('span');
      mixedImpact.className = 'fx-impact fx-impact-echo';
      mixedImpact.setAttribute('aria-hidden', 'true');
    }
    const glyph = document.createElement('span');
    glyph.className = 'fx-glyph';
    const glyphText = document.createElement('b');
    glyphText.textContent = descriptor.glyph.symbol;
    glyph.appendChild(glyphText);
    glyph.setAttribute('aria-hidden', 'true');
    let summonEmblem = null;
    if (descriptor.summonMotif) {
      summonEmblem = document.createElement('span');
      summonEmblem.className = `fx-summon-emblem motif-${safeToken(descriptor.summonMotif)}`;
      summonEmblem.setAttribute('aria-hidden', 'true');
    }
    let songWave = null;
    if (descriptor.songPattern) {
      songWave = document.createElement('span');
      songWave.className = `fx-song-wave song-${safeToken(descriptor.songPattern)}`;
      songWave.setAttribute('aria-hidden', 'true');
    }
    const spellArt = createSpellArtElement(action);
    const particles = document.createElement('span');
    particles.className = 'fx-particles';
    const reservedAnimatedNodes = Number(Boolean(commandLayer)) + Number(Boolean(summonEmblem)) + Number(Boolean(songWave)) + Number(Boolean(mixedImpact)) + Number(Boolean(spellArt));
    const particleCount = Math.max(8, Math.min(descriptor.mobileBudget.maxParticles - reservedAnimatedNodes, descriptor.particleCount));
    for (let index = 0; index < particleCount; index += 1) {
      const particle = document.createElement('i');
      const angle = Math.round((360 / particleCount) * index + ((descriptor.seed >>> (index % 16)) & 15));
      particle.style.setProperty('--particle-angle', `${angle}deg`);
      particle.style.setProperty('--particle-distance', `${48 + ((descriptor.seed >>> (index % 19)) & 63)}px`);
      particle.style.setProperty('--fx-delay', `${Math.round((index % Math.max(1, descriptor.pulsePattern.beats)) * descriptor.pulsePattern.spacingMs * -0.18)}ms`);
      particles.appendChild(particle);
    }
    sequence.append(backdrop, title, sigil);
    if (commandLayer) sequence.appendChild(commandLayer);
    sequence.append(path, core, orbit, hit);
    if (spellArt) sequence.appendChild(spellArt);
    if (mixedImpact) sequence.appendChild(mixedImpact);
    sequence.append(particles, glyph);
    if (summonEmblem) sequence.appendChild(summonEmblem);
    if (songWave) sequence.appendChild(songWave);
    this.effectsEl.appendChild(sequence);
    this.activeEffect = sequence;

    this.activeEffectDeadline = Date.now() + duration + 180;
    const finish = () => {
      if (this.activeEffect !== sequence) return;
      sequence.remove();
      this.activeEffect = null;
      this.activeEffectDeadline = 0;
      clearTimeout(this.effectTimer);
      this.effectTimer = null;
      eventBus.emit('battle:effectComplete', { actor, action, descriptor });
      this.runNextBattleEffect();
    };
    sequence.addEventListener('animationend', (event) => {
      if (event.target === sequence) finish();
    }, { once: true });
    this.effectTimer = setTimeout(finish, duration + 160);
  }

  clearBattleEffects() {
    clearTimeout(this.effectTimer);
    this.effectTimer = null;
    this.effectQueue = [];
    this.activeEffect = null;
    this.activeEffectDeadline = 0;
    if (this.effectsEl) this.effectsEl.innerHTML = '';
  }

  showCombatResult(result, targetEl) {
    if (!this.effectsEl || !targetEl) return;
    const targetRect = targetEl.getBoundingClientRect();
    const stageRect = this.effectsEl.getBoundingClientRect();
    const effect = document.createElement('span');
    effect.className = `combat-result ${result.type}`;
    if (result.element) effect.classList.add(`element-${safeToken(result.element)}`);

    if (['damage', 'mp-damage'].includes(result.type)) {
      const outcome = result.nullified ? '無効' : result.resisted ? '耐性' : result.weak ? '弱点' : '';
      effect.textContent = `${outcome} −${result.amount ?? 0}`;
    }
    else if (['heal', 'mp-heal', 'revive', 'absorb'].includes(result.type)) effect.textContent = `+${result.amount ?? 0}`;
    else if (result.type === 'miss') effect.textContent = 'ミス';
    else if (result.type === 'blocked' || result.type === 'defend') effect.textContent = 'ガード';
    else if (result.type === 'status') effect.textContent = statusNamesJa[result.statuses?.[0]] ?? result.statuses?.[0] ?? '状態異常';
    else if (result.type === 'status-resist') effect.textContent = `耐性 ${statusNamesJa[result.statuses?.[0]] ?? result.statuses?.[0] ?? ''}`;
    else effect.textContent = result.label ?? '効果';

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
