import { eventBus } from '../core/EventBus.js';
import { basicCommands, attackAction, defendAction, getAbilityActions, itemActions } from '../data/abilityData.js';
import { elementNames } from '../data/bossData.js';
import { selectableAbilities } from '../database/ff5Database.js';
import { crystalShardActionsFor } from '../database/battleCatalog.js';
import { getBattleEffectDescriptor, resolveBattleEffectDescriptor } from './BattleEffectRegistry.js';
import { MessageWindow } from './MessageWindow.js';
import { STATUS_LABELS_JA } from '../battle/StatusEngine.js';
import { getAbilityListPosition, saveAbilityListPosition } from '../core/AbilityPosition.js';
import { createSpellArtElement, spellChoreographyDuration } from './SpellArtDirector.js';
import { SPELL_PIXEL_SEQUENCES, playSpellCanvas } from './SpellCanvasRenderer.js';

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

// Attacks/techniques were reading as too fast to actually watch — this
// scales the whole effect playback (both the procedural DOM/CSS effects and
// the pixel-canvas spell scenes) evenly slower. Doesn't apply under
// prefers-reduced-motion, which intentionally stays snappy.
const BATTLE_EFFECT_SPEED_SCALE = 1.35;

// Matches BattleManager's AUTO_ADVANCE_DELAY_MS — the breathing room a
// normal turn changeover gets between one actor's action and the next.
// Counter-attacks (see runNextBattleEffect) get the same pause inserted
// before they play, instead of chaining instantly off the triggering hit.
const TURN_CHANGE_PAUSE_MS = 550;

function clonePresentationValue(value) {
  if (value instanceof Set) return new Set([...value].map(clonePresentationValue));
  if (value instanceof Map) return new Map([...value].map(([key, entry]) => [key, clonePresentationValue(entry)]));
  if (Array.isArray(value)) return value.map(clonePresentationValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clonePresentationValue(entry)]));
  }
  return value;
}

export function splitPresentationResults(results = [], impactCount = 1, resultPolicy = 'final-impact') {
  const count = Math.max(1, Math.floor(Number(impactCount) || 1));
  const groups = Array.from({ length: count }, () => []);
  if (resultPolicy !== 'split-amount') {
    groups[count - 1] = results.map((result) => ({ ...result }));
    return groups;
  }
  results.forEach((result) => {
    const amount = Math.max(0, Math.floor(Number(result.amount) || 0));
    const canSplit = count > 1 && amount > 0 && [
      'damage', 'status-damage', 'heal', 'status-heal', 'absorb', 'mp-damage', 'mp-heal',
    ].includes(result.type);
    if (!canSplit) {
      groups[count - 1].push({ ...result });
      return;
    }
    const base = Math.floor(amount / count);
    const remainder = amount % count;
    for (let index = 0; index < count; index += 1) {
      // Put remainder points on the final cues so even tiny totals retain the
      // immutable after-state receipt at the last visible impact.
      const splitAmount = base + (index >= count - remainder ? 1 : 0);
      if (splitAmount <= 0) continue;
      groups[index].push({
        ...result,
        presentationPatch: index === count - 1 ? result.presentationPatch : undefined,
        amount: splitAmount,
        hits: 1,
        presentationImpactIndex: index,
        presentationImpactCount: count,
      });
    }
  });
  return groups;
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
    this.effectStartPending = false;
    this.effectTimer = null;
    this.activeEffectDeadline = 0;
    this.deferredBattleState = null;
    this.presentationUnits = new Map();
    this.activeEffectCleanup = null;
    this.bufferActionLogs = false;
    this.bufferedActionLogs = [];
    this.activeAbilityMenu = null;
    this.pendingDualcast = null;

    this.submenuListEl?.addEventListener('scroll', () => this.rememberAbilityMenuPosition(), { passive: true });

    this._bindStaticEvents();
  }

  attachBattle(battleManager) {
    this.battleManager = battleManager;
    this.syncPresentationFromManager();
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
      if (this.bufferActionLogs) {
        this.bufferedActionLogs.push(text);
        return;
      }
      const pendingMs = this.messageWindow.show(text);
      this.battleManager?.deferNextTurnFor(pendingMs + 40);
    });

    eventBus.on('battle:stateUpdate', (state) => {
      if (!this.battleManager?.awaitingPlayerInput) {
        this.closeActionWindows();
        this.renderCommandListIdle();
      }
      if (this.activeEffect || this.effectQueue.length) {
        this.deferredBattleState = state;
        return;
      }
      this.syncPresentationFromUnits([...(state.party ?? []), state.boss].filter(Boolean));
      this.renderBattleState(state);
    });

    eventBus.on('battle:playerTurn', ({ actor }) => {
      this.closeActionWindows();
      this.renderCommandListForActor(actor);
    });

    eventBus.on('battle:actionStarted', () => {
      this.closeActionWindows();
      this.renderCommandListIdle();
      this.bufferActionLogs = true;
      this.bufferedActionLogs = [];
    });

    eventBus.on('battle:actionCancelled', () => {
      const logs = this.bufferActionLogs ? [...this.bufferedActionLogs] : [];
      this.bufferActionLogs = false;
      this.bufferedActionLogs = [];
      this.presentActionLogs(logs);
    });

    eventBus.on('battle:actionResolved', ({ actor, action, results }) => {
      this.closeActionWindows();
      this.renderCommandListIdle();
      if (actor?.isEnemy) this.clearTelegraph();
      const presentationLogs = this.bufferActionLogs ? [...this.bufferedActionLogs] : [];
      this.bufferActionLogs = false;
      this.bufferedActionLogs = [];
      const dualVisuals = action?.specialCommand === 'dualcast'
        ? (action.dualSpells ?? []).map((spell, castIndex) => ({
          action: spell,
          results: results.filter((result) => result.castIndex === castIndex),
        })).filter((cast) => cast.results.length)
        : [];
      let queuedVisual = false;
      if (dualVisuals.length) {
        // Dualcast is two real casts, not one generic "dual magic" flash.
        // Queue both spell-specific drawings in the order selected.
        dualVisuals.forEach((cast, index) => {
          const logs = index === dualVisuals.length - 1 ? presentationLogs : [];
          queuedVisual = this.playActionPulse(actor, cast.results, cast.action, logs) || queuedVisual;
        });
      } else {
        queuedVisual = this.playActionPulse(actor, results, action, presentationLogs);
      }
      if (!queuedVisual) {
        this.presentActionResults(results, dualVisuals[0]?.action ?? action);
        this.presentActionLogs(presentationLogs);
      }
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
      // Characters removed from battle (e.g. オメガ「サークル」) vanish from
      // the field entirely — distinct from KO, which still shows the sprite.
      if (unit.removedFromBattle) return;
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
      row.className = `status-row${unit === this.battleManager?.currentActor ? ' current-actor' : ''}${unit.isAlive() ? '' : ' is-ko'}${unit.removedFromBattle ? ' is-removed' : ''}`;
      const statuses = [...(unit.statuses ?? [])];
      const statusMarkup = statuses.length
        ? `<span class="status-chips">${statuses.slice(0, 3).map((status) => {
          const turns = unit.statusDurations?.get?.(status);
          return `<i>${statusNamesJa[status] ?? status}${turns ? `<b>${turns}</b>` : ''}</i>`;
        }).join('')}</span>`
        : '';
      const removedTag = unit.removedFromBattle ? '<i class="removed-tag">除外</i>' : '';
      row.innerHTML = `
        <div class="p-name"><b>${String(idx + 1).padStart(2, '0')}</b>${unit.name}${removedTag}<small>ATK ${unit.atk} ・ DEF ${unit.def} ・ MDEF ${unit.magicDef}</small>${statusMarkup}</div>
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
        const techniqueIds = actor.crystalShardTechniqueIds?.length
          ? actor.crystalShardTechniqueIds
          : (actor.crystalShardId ? [actor.crystalShardId] : []);
        const shardActions = crystalShardActionsFor(techniqueIds);
        this.openSubmenu('えんばんせき', shardActions, 'crystal', actor);
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
    const switchableEnemyTarget = entry.target === 'one_or_all_enemies';
    const switchableAllyTarget = entry.target === 'one_or_all_allies';
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

    if (targets.length === 1 && !switchableEnemyTarget && !switchableAllyTarget) {
      this.finalizeAction(entry, kind, targets[0]);
      return;
    }

    this.targetListEl.innerHTML = '';
    if (switchableEnemyTarget || switchableAllyTarget) {
      const allTargetId = switchableEnemyTarget ? 'all_enemies' : 'all_allies';
      const allLabel = switchableEnemyTarget ? '敵全体' : '味方全体';
      const allChoice = this.createChoice(`${allLabel}（全体化）`, () => {
        this.closeTargetWindow();
        this.finalizeAction({ ...entry, target: allTargetId, visualTargetMode: 'all' }, kind, targets[0]);
      });
      this.targetListEl.appendChild(allChoice);
    }
    targets.forEach((t) => {
      const li = this.createChoice(`${t.name} (HP ${t.hp}/${t.maxHp})`, () => {
        this.closeTargetWindow();
        this.finalizeAction({ ...entry, target: switchableEnemyTarget ? 'one_enemy' : switchableAllyTarget ? 'one_ally' : entry.target, visualTargetMode: 'single' }, kind, t);
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

  playActionPulse(actor, results, action = {}, presentationLogs = []) {
    const actorEl = actor ? document.querySelector(`[data-uid="${actor.uid}"]`) : null;
    actorEl?.classList.add('action-pulse');
    setTimeout(() => actorEl?.classList.remove('action-pulse'), Math.round(420 * BATTLE_EFFECT_SPEED_SCALE));
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
      setTimeout(() => actorEl.classList.remove('casting-effect', castClass), Math.round(720 * BATTLE_EFFECT_SPEED_SCALE));
    }

    if (!this.battleFieldEl || results.length === 0) return false;
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
        this.enqueueBattleEffect(actor, action, results, visualType, presentationLogs);
        return true;
      }
    }
    return false;
  }

  presentationSnapshot(unit) {
    const snapshot = Object.fromEntries(Object.entries(unit ?? {}).map(([key, value]) => [key, clonePresentationValue(value)]));
    snapshot.uid = unit?.uid;
    snapshot.statuses = new Set(unit?.statuses ?? []);
    snapshot.statusDurations = new Map(unit?.statusDurations ?? []);
    snapshot.permanentStatuses = new Set(unit?.permanentStatuses ?? []);
    snapshot.statusImmunities = new Set(unit?.statusImmunities ?? []);
    snapshot.temporaryNullElements = new Set(unit?.temporaryNullElements ?? []);
    snapshot.creatureTypes = new Set(unit?.creatureTypes ?? []);
    return snapshot;
  }

  syncPresentationFromUnits(units = []) {
    units.forEach((unit) => {
      if (unit?.uid) this.presentationUnits.set(unit.uid, this.presentationSnapshot(unit));
    });
  }

  syncPresentationFromManager() {
    if (!this.battleManager) return;
    this.syncPresentationFromUnits(this.battleManager.units ?? [...(this.battleManager.party ?? []), this.battleManager.boss]);
  }

  presentationUnit(unit) {
    const state = this.presentationUnits.get(unit?.uid);
    if (!unit || !state) return unit;
    const clone = Object.assign(Object.create(Object.getPrototypeOf(unit)), state);
    clone.statuses = new Set(state.statuses ?? []);
    clone.statusDurations = new Map(state.statusDurations ?? []);
    return clone;
  }

  applyPresentationMpCost(actor, action = {}) {
    const state = this.presentationUnits.get(actor?.uid);
    if (!state || !(action.mpCost > 0)) return;
    const cost = Math.ceil(action.mpCost * (actor.mpCostMultiplier ?? 1));
    state.mp = Math.max(0, state.mp - cost);
  }

  applyPresentationResults(results = []) {
    results.forEach((result) => {
      const unit = this.battleManager?.units.find((candidate) => candidate.uid === result.targetUid);
      if (!unit) return;
      let state = this.presentationUnits.get(unit.uid);
      if (!state) {
        state = this.presentationSnapshot(unit);
        this.presentationUnits.set(unit.uid, state);
      }
      const amount = Math.max(0, Number(result.amount) || 0);
      if (['damage', 'status-damage'].includes(result.type)) state.hp = Math.max(0, state.hp - amount);
      if (['heal', 'status-heal', 'absorb'].includes(result.type)) state.hp = Math.min(state.maxHp, state.hp + amount);
      if (result.type === 'mp-damage') state.mp = Math.max(0, state.mp - amount);
      if (result.type === 'mp-heal') state.mp = Math.min(state.maxMp, state.mp + amount);
      if (result.type === 'revive') {
        state.hp = Math.max(1, Math.min(state.maxHp, amount));
        state.statuses.delete('ko');
      }
      if (result.type === 'status') {
        (result.statuses ?? []).forEach((status) => {
          state.statuses.add(status);
          if (status === 'ko') state.hp = 0;
        });
      }
      if (result.type === 'cleanse' || result.type === 'status-expired') {
        (result.statuses ?? [result.status]).filter(Boolean).forEach((status) => {
          state.statuses.delete(status);
          state.statusDurations.delete(status);
        });
      }
      if (result.type === 'removed') state.removedFromBattle = true;
      if (result.presentationPatch) {
        this.presentationUnits.set(unit.uid, this.presentationSnapshot(result.presentationPatch));
      }
    });
  }

  currentPresentationState() {
    return this.deferredBattleState ?? {
      party: this.battleManager?.party ?? [],
      boss: this.battleManager?.boss,
      preview: this.battleManager?.ctb?.previewQueue?.(8) ?? [],
    };
  }

  renderBattleState({ party, boss, preview } = {}) {
    if (!party || !boss) return;
    const displayBoss = this.presentationUnit(boss);
    const displayParty = party.map((unit) => this.presentationUnit(unit));
    const currentActor = displayParty.find((unit) => unit.uid === this.battleManager?.currentActor?.uid) ?? this.presentationUnit(this.battleManager?.currentActor);
    this.renderEnemyField(displayBoss);
    this.renderPartyField(displayParty, currentActor);
    this.renderCtbList(preview ?? []);
    this.renderEnemyInfo(displayBoss);
    this.renderPartyStatus(displayParty);
  }

  flushDeferredBattleState() {
    if (!this.deferredBattleState) return;
    const state = this.deferredBattleState;
    this.deferredBattleState = null;
    this.renderBattleState(state);
  }

  presentActionResults(results = [], actionOrDescriptor = null) {
    const descriptor = actionOrDescriptor?.family && actionOrDescriptor?.phaseTopology
      ? actionOrDescriptor
      : actionOrDescriptor?.id || actionOrDescriptor?.sourceId || actionOrDescriptor?.visualId || actionOrDescriptor?.name
        ? resolveBattleEffectDescriptor(actionOrDescriptor)
        : null;
    this.applyPresentationResults(results);
    this.renderBattleState(this.currentPresentationState());
    this.battleFieldEl?.classList.remove('impacting');
    requestAnimationFrame(() => {
      this.battleFieldEl?.classList.add('impacting');
      setTimeout(() => this.battleFieldEl?.classList.remove('impacting'), 320);
    });
    results.forEach((result) => {
      const targetEl = document.querySelector(`[data-uid="${result.targetUid}"]`);
      if (targetEl) {
        targetEl.classList.add('flash');
        setTimeout(() => targetEl.classList.remove('flash'), Math.round(440 * BATTLE_EFFECT_SPEED_SCALE));
        if (descriptor) this.playTargetReaction(targetEl, descriptor, result);
      }
      this.showCombatResult(result, targetEl);
    });
  }

  presentActionLogs(logs = []) {
    let pendingMs = 0;
    logs.forEach((text) => { pendingMs = Math.max(pendingMs, this.messageWindow.show(text)); });
    if (pendingMs > 0) this.battleManager?.deferNextTurnFor(pendingMs + 40);
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
      setTimeout(() => targetEl.classList.remove('target-reaction', reactionClass), Math.round(720 * BATTLE_EFFECT_SPEED_SCALE));
    });
  }

  enqueueBattleEffect(actor, action = {}, results = [], visualType = 'cast-impact', presentationLogs = []) {
    if (!this.effectsEl) return false;
    const descriptor = resolveBattleEffectDescriptor(action);
    const pixelDuration = spellChoreographyDuration(action);
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const rawDuration = pixelDuration ? (reducedMotion ? 360 : pixelDuration) : effectDuration(descriptor);
    const duration = reducedMotion ? rawDuration : Math.round(rawDuration * BATTLE_EFFECT_SPEED_SCALE);
    // Counter-attacks (e.g. オメガ「サークル」) fire back-to-back with zero
    // gap by default, which reads as abnormally fast compared to a normal
    // turn changeover. Give them the same breathing room a real turn gets.
    const startDelay = action.isCounterAction && !reducedMotion ? TURN_CHANGE_PAUSE_MS : 0;
    this.effectQueue.push({ actor, action, results, visualType, descriptor, duration, presentationLogs, startDelay });
    const remainingMs = Math.max(0, this.activeEffectDeadline - Date.now());
    const queuedMs = this.effectQueue.reduce((total, queued) => total + queued.duration + (queued.startDelay ?? 0) + 180, 0);
    this.battleManager?.deferNextTurnFor(remainingMs + queuedMs + 20);
    this.runNextBattleEffect();
    return true;
  }

  runNextBattleEffect() {
    if (this.activeEffect || this.effectStartPending || !this.effectsEl || this.effectQueue.length === 0) return;
    const startDelay = this.effectQueue[0].startDelay ?? 0;
    if (startDelay > 0) {
      this.effectQueue[0].startDelay = 0;
      this.effectStartPending = true;
      setTimeout(() => {
        this.effectStartPending = false;
        this.runNextBattleEffect();
      }, startDelay);
      return;
    }
    const effectState = this.effectQueue.shift();
    const { actor, action, results, visualType, descriptor, duration, presentationLogs = [] } = effectState;
    this.applyPresentationMpCost(actor, action);
    this.renderBattleState(this.currentPresentationState());
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

    let pixelSceneContext = { targetX: actor?.isEnemy ? 78 : 24, targetY: 48 };
    {
      const stageRect = this.effectsEl.getBoundingClientRect();
      const pointFor = (unit) => {
        const element = unit ? document.querySelector(`[data-uid="${unit.uid}"]`) : null;
        const rect = element?.getBoundingClientRect();
        return rect ? {
          x: ((rect.left - stageRect.left + rect.width / 2) / Math.max(1, stageRect.width)) * 100 + Number(unit.effectAnchor?.x ?? 0),
          y: ((rect.top - stageRect.top + rect.height / 2) / Math.max(1, stageRect.height)) * 100 + Number(unit.effectAnchor?.y ?? 0),
        } : null;
      };
      const casterPointRaw = pointFor(actor) ?? { x: actor?.isEnemy ? 24 : 78, y: 42 };
      const targetPoints = targetUnits.map(pointFor).filter(Boolean);
      const targetPointRaw = targetPoints.length ? {
        x: targetPoints.reduce((sum, point) => sum + point.x, 0) / targetPoints.length,
        y: targetPoints.reduce((sum, point) => sum + point.y, 0) / targetPoints.length,
      } : (hostileTargets.length ? { x: actor?.isEnemy ? 78 : 24, y: 48 } : casterPointRaw);
      pixelSceneContext = {
        casterX: casterPointRaw.x,
        casterY: casterPointRaw.y,
        targetX: targetPointRaw.x,
        targetY: targetPointRaw.y,
        targets: targetPoints,
        targetMode: mixedTarget ? 'mixed' : multiTarget ? 'multi' : friendlyTarget ? 'friendly' : 'hostile',
        actorIsEnemy: Boolean(actor?.isEnemy),
      };
      // direction-player mirrors the complete sequence so its logical
      // coordinates must be mirrored as well. This keeps pixel spell art on
      // the actual target instead of reflecting it back onto the caster.
      const mirrored = directionClass === 'direction-player';
      const casterPoint = { x: mirrored ? 100 - casterPointRaw.x : casterPointRaw.x, y: casterPointRaw.y };
      const targetPoint = { x: mirrored ? 100 - targetPointRaw.x : targetPointRaw.x, y: targetPointRaw.y };
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
    const dedicatedPixelScene = Boolean(spellArt?.dataset.spellScene && spellArt.querySelector('.spell-pixel-canvas'));
    const pixelSequence = dedicatedPixelScene ? SPELL_PIXEL_SEQUENCES[spellArt.dataset.spellScene] : null;
    if (dedicatedPixelScene) sequence.classList.add('has-pixel-choreography');
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
    if (dedicatedPixelScene) this.effectsEl.classList.add('pixel-choreography-active');
    let stopPixelScene = () => {};
    const impactResultGroups = splitPresentationResults(results, pixelSequence?.impactFrames?.length ?? 1, pixelSequence?.resultPolicy);
    const presentedImpacts = new Set();
    let logsPresented = false;
    let fallbackImpactTimer = null;
    const presentImpact = (impactIndex = 0) => {
      const normalizedIndex = Math.max(0, Math.min(impactResultGroups.length - 1, impactIndex));
      if (presentedImpacts.has(normalizedIndex)) return;
      presentedImpacts.add(normalizedIndex);
      const impactResults = impactResultGroups[normalizedIndex] ?? [];
      if (impactResults.length) this.presentActionResults(impactResults, descriptor);
      if (!logsPresented && normalizedIndex === impactResultGroups.length - 1) {
        logsPresented = true;
        this.presentActionLogs(presentationLogs);
      }
    };
    if (dedicatedPixelScene) {
      stopPixelScene = playSpellCanvas(spellArt, duration, (cue) => {
        if (cue.type === 'impact') presentImpact(cue.impactIndex);
      }, pixelSceneContext);
    } else {
      fallbackImpactTimer = setTimeout(() => presentImpact(0), Math.round(duration * .62));
    }
    const cleanupPlayback = () => {
      clearTimeout(fallbackImpactTimer);
      stopPixelScene();
    };
    this.activeEffectCleanup = cleanupPlayback;

    this.activeEffectDeadline = Date.now() + duration + 180;
    const finish = () => {
      if (this.activeEffect !== sequence) return;
      sequence.remove();
      impactResultGroups.forEach((_, impactIndex) => presentImpact(impactIndex));
      this.activeEffect = null;
      this.effectsEl?.classList.remove('pixel-choreography-active');
      this.activeEffectDeadline = 0;
      clearTimeout(this.effectTimer);
      this.effectTimer = null;
      cleanupPlayback();
      this.activeEffectCleanup = null;
      eventBus.emit('battle:effectComplete', { actor, action, descriptor });
      if (this.effectQueue.length === 0) {
        this.syncPresentationFromManager();
        this.flushDeferredBattleState();
      }
      this.runNextBattleEffect();
    };
    sequence.addEventListener('animationend', (event) => {
      if (event.target === sequence) finish();
    }, { once: true });
    this.effectTimer = setTimeout(finish, duration + 160);
  }

  clearBattleEffects() {
    clearTimeout(this.effectTimer);
    this.activeEffectCleanup?.();
    this.activeEffectCleanup = null;
    this.effectTimer = null;
    this.effectQueue = [];
    this.activeEffect = null;
    this.effectStartPending = false;
    this.activeEffectDeadline = 0;
    this.deferredBattleState = null;
    if (this.effectsEl) {
      this.effectsEl.innerHTML = '';
      this.effectsEl.classList.remove('pixel-choreography-active');
    }
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
