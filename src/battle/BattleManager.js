import { CTBEngine } from './CTBEngine.js';
import { resolveAction } from './ActionResolver.js';
import { attackAction, defendAction, itemActions, magicSets } from '../data/abilityData.js';
import { eventBus } from '../core/EventBus.js';
import { isIncapacitated } from './StatusEngine.js';
import { bossActionsFor, bossPhaseIndex } from './BossActionProfiles.js';

const ENEMY_TURN_DELAY_MS = 900;
const AUTO_ADVANCE_DELAY_MS = 550;

export class BattleManager {
  constructor(partyUnits, bossUnit, options = {}) {
    this.party = partyUnits;
    this.boss = bossUnit;
    this.units = [...partyUnits, bossUnit];
    this.ctb = new CTBEngine(this.units);

    this.currentActor = null;
    this.awaitingPlayerInput = false;
    this.finished = false;
    this.result = null; // 'victory' | 'defeat'
    this.logSequence = 0;
    this.logJournal = [];
    this.pendingEnemyActions = new Map();
    this.bossPhase = 0;
    this.itemStockProvider = options.getItemStock ?? (() => Infinity);
    this.itemConsumer = options.consumeItem ?? (() => true);
  }

  itemId(itemOrId) {
    return typeof itemOrId === 'string' ? itemOrId : itemOrId?.sourceId ?? itemOrId?.id ?? '';
  }

  getItemStock(itemOrId) {
    const stock = Number(this.itemStockProvider(this.itemId(itemOrId), itemOrId));
    return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : Infinity;
  }

  canUseItem(itemOrId) {
    return this.getItemStock(itemOrId) > 0;
  }

  getItemUseState(itemOrId) {
    const stock = this.getItemStock(itemOrId);
    return Object.freeze({ stock, usable: stock > 0, reason: stock > 0 ? null : '在庫がない。' });
  }

  consumeItemStock(itemOrId, amount = 1) {
    if (this.getItemStock(itemOrId) < amount) return false;
    return this.itemConsumer(this.itemId(itemOrId), amount, itemOrId) !== false;
  }

  log(text, kind = 'info') {
    const entry = Object.freeze({ id: ++this.logSequence, text, kind, timestamp: Date.now() });
    this.logJournal.push(entry);
    if (this.logJournal.length > 80) this.logJournal.shift();
    eventBus.emit('battle:log', text);
    eventBus.emit('battle:logEntry', entry);
    return entry;
  }

  emitActionResolved(actor, results, fromSequence = 0) {
    const entries = this.logJournal.filter((entry) => entry.id > fromSequence);
    eventBus.emit('battle:actionResolved', { actor, results, logEntries: entries });
    eventBus.emit('battle:logBatch', { actorUid: actor.uid, entries });
  }

  broadcastState() {
    eventBus.emit('battle:stateUpdate', {
      party: this.party,
      boss: this.boss,
      preview: this.ctb.previewQueue(8),
    });
  }

  start() {
    this.log(`${this.boss.name} が あらわれた！`);
    this.broadcastState();
    this.scheduleNextTurn(400);
  }

  scheduleNextTurn(delay = AUTO_ADVANCE_DELAY_MS) {
    if (this.finished) return;
    setTimeout(() => this.advanceTurn(), delay);
  }

  checkBattleEnd() {
    if (!this.boss.isAlive() || this.boss.removedFromBattle || this.boss.statuses.has('petrify')) {
      this.finished = true;
      this.result = 'victory';
      this.log(`${this.boss.name} を たおした！`);
      eventBus.emit('battle:end', { result: 'victory' });
      return true;
    }
    if (this.party.every((p) => !p.isAlive() || p.removedFromBattle || p.statuses.has('petrify'))) {
      this.finished = true;
      this.result = 'defeat';
      this.log('パーティは ぜんめつした...');
      eventBus.emit('battle:end', { result: 'defeat' });
      return true;
    }
    return false;
  }

  advanceTurn() {
    if (this.finished) return;
    const actor = this.ctb.advanceToNextActor();
    if (!actor) return;
    this.currentActor = actor;

    const tickResults = actor.processTurnStatuses();
    tickResults.forEach((result) => {
      if (result.type === 'status-damage') this.log(`${actor.name} は ${result.status}で ${result.amount} ダメージ！`);
      if (result.type === 'status-heal' && result.amount > 0) this.log(`${actor.name} の HPが ${result.amount} 回復した。`);
      if (result.type === 'doom') this.log(`${actor.name} は死の宣告に倒れた！`);
      if (result.type === 'status-expired' && result.status !== 'doom') this.log(`${actor.name} の ${result.status} が切れた。`);
    });
    if (tickResults.length) eventBus.emit('battle:actionResolved', { actor, results: tickResults });
    if (this.checkBattleEnd()) return;

    // Reset defend stance at the start of a unit's own turn.
    actor.defending = false;
    actor.physicalDamageMultiplier = actor.equipmentEffects?.physicalDamageMultiplier ?? 1;

    if (isIncapacitated(actor)) {
      this.log(`${actor.name} は動けない！`);
      this.ctb.consumeTurn(actor, 0.45);
      this.broadcastState();
      this.scheduleNextTurn(260);
    } else if (actor.statuses.has('berserk') || actor.statuses.has('confuse')) {
      this.broadcastState();
      setTimeout(() => this.forcedAct(actor), 360);
    } else if (actor.isEnemy) {
      this.broadcastState();
      setTimeout(() => this.enemyAct(actor), ENEMY_TURN_DELAY_MS);
    } else {
      this.awaitingPlayerInput = true;
      this.broadcastState();
      eventBus.emit('battle:playerTurn', { actor });
    }
  }

  forcedAct(actor) {
    const confused = actor.statuses.has('confuse');
    const candidates = this.units.filter((unit) => unit.isAlive() && !unit.removedFromBattle && (confused || unit.isEnemy !== actor.isEnemy));
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    if (!target) return this.scheduleNextTurn();
    this.log(`${actor.name} は${confused ? '混乱して' : '狂戦士となり'} ${target.name} を攻撃！`);
    const results = resolveAction({ actor, action: { kind: 'physical-attack' }, targets: [target], battleUnits: this.units });
    eventBus.emit('battle:actionResolved', { actor, results });
    results.filter((result) => result.type === 'damage').forEach((result) => this.log(`${target.name} に ${result.amount} の ダメージ！`));
    this.ctb.consumeTurn(actor, 1);
    this.broadcastState();
    if (!this.checkBattleEnd()) this.scheduleNextTurn();
  }

  /** Simple AI: picks a target based on the boss's `ai` behaviour tag. */
  pickEnemyTarget() {
    const aliveParty = this.party.filter((p) => p.isAlive());
    if (aliveParty.length === 0) return null;

    switch (this.boss.ai) {
      case 'lowestHp':
        return aliveParty.reduce((a, b) => (a.hp < b.hp ? a : b));
      case 'aggressive':
        return aliveParty.reduce((a, b) => (a.atk > b.atk ? a : b));
      case 'random':
      default:
        return aliveParty[Math.floor(Math.random() * aliveParty.length)];
    }
  }

  enemyAct(actor) {
    if (this.finished) return;
    const target = this.pickEnemyTarget();
    if (!target) {
      this.checkBattleEnd();
      return;
    }

    const actionStartSequence = this.logSequence;
    const pendingAction = this.pendingEnemyActions.get(actor.uid);
    if (pendingAction) this.pendingEnemyActions.delete(actor.uid);
    const usableAiActions = bossActionsFor(actor).filter((action) => actor.canAffordMp(action.mpCost ?? 0));
    const weightedActions = usableAiActions.flatMap((action) => Array(Math.max(1, action.weight ?? 1)).fill(action));
    const chosenAction = pendingAction ?? (weightedActions.length ? weightedActions[Math.floor(Math.random() * weightedActions.length)] : { kind: 'physical-attack' });
    if (chosenAction.telegraph && !pendingAction) {
      const preparedAction = { ...chosenAction, telegraph: null };
      this.pendingEnemyActions.set(actor.uid, preparedAction);
      this.log(`${actor.name}：${chosenAction.telegraph}`, 'telegraph');
      eventBus.emit('battle:telegraph', { actor, action: preparedAction, hint: chosenAction.telegraph });
      this.ctb.consumeTurn(actor, 0.5);
      this.broadcastState();
      this.scheduleNextTurn(420);
      return;
    }
    const targets = chosenAction.target === 'all_enemies'
      ? this.party.filter((unit) => unit.isAlive())
      : [target];
    this.log(`${actor.name} の ${chosenAction.name ?? 'こうげき'}！`, chosenAction.power >= 2 ? 'danger' : 'action');
    const results = chosenAction.kind === 'physical-attack' && targets.length > 1
      ? targets.flatMap((eachTarget) => resolveAction({ actor, action: chosenAction, targets: [eachTarget], battleUnits: this.units }))
      : resolveAction({ actor, action: chosenAction, targets, battleUnits: this.units });

    results.forEach((r) => {
      if (r.type === 'damage') {
        const affected = this.units.find((unit) => unit.uid === r.targetUid) ?? target;
        this.log(`${affected.name} に ${r.amount} の ダメージ！`);
      } else if (r.type === 'miss') {
        this.log(`${actor.name} の こうげきは はずれた！`);
      } else if (r.type === 'blocked') {
        this.log(`${target.name} は こうげきを ふせいだ！`);
      }
    });

    this.emitActionResolved(actor, results, actionStartSequence);
    this.ctb.consumeTurn(actor, chosenAction.ctbCost ?? attackAction.ctbCost);
    this.broadcastState();

    if (this.checkBattleEnd()) return;
    this.scheduleNextTurn();
  }

  /**
   * Called by the UI once the player has picked a command (+ target).
   * `choice` shape: { kind, name, ctbCost, element, power, mpCost, healAmount }
   */
  submitPlayerAction(choice, targetUnit) {
    if (!this.awaitingPlayerInput || !this.currentActor) return;
    const actor = this.currentActor;
    const actionStartSequence = this.logSequence;

    let action;
    let targets;
    const resolveTargets = (targetId, fallback) => {
      if (targetId === 'self') return [actor];
      if (['all_allies', 'party'].includes(targetId)) return this.party.filter((unit) => unit.isAlive());
      if (['all_enemies', 'enemy_group'].includes(targetId)) return this.units.filter((unit) => unit.isAlive() && unit.isEnemy !== actor.isEnemy);
      if (targetId === 'all_units' || targetId === 'enemy_and_party') return this.units.filter((unit) => unit.isAlive());
      if (targetId === 'enemy_group_and_ally') return [this.boss, fallback ?? actor];
      if (targetId === 'random_unit') {
        const alive = this.units.filter((unit) => unit.isAlive());
        return [alive[Math.floor(Math.random() * alive.length)]];
      }
      return [fallback ?? (String(targetId).includes('ally') ? actor : this.boss)];
    };

    switch (choice.type) {
      case 'attack':
        action = { kind: 'physical-attack' };
        targets = [targetUnit ?? this.boss];
        this.log(`${actor.name} の こうげき！`);
        break;
      case 'magic':
        action = {
          kind: choice.spell.actionKind ?? (choice.spell.healAmount !== undefined && choice.spell.power === undefined
            ? 'heal'
            : 'magic-attack'),
          ...choice.spell,
        };
        targets = resolveTargets(choice.spell.target, targetUnit ?? (action.kind === 'heal' ? actor : this.boss));
        this.log(`${actor.name} の ${choice.spell.name}！`);
        break;
      case 'ability':
        action = {
          kind: choice.ability.actionKind ?? (choice.ability.healAmount !== undefined ? 'heal' : 'magic-attack'),
          ...choice.ability,
        };
        targets = resolveTargets(choice.ability.target, targetUnit);
        this.log(`${actor.name} の ${choice.ability.name}！`);
        break;
      case 'crystal': {
        const shard = choice.shard;
        action = {
          kind: shard.actionKind ?? 'magic-attack',
          ...shard,
          operations: shard.operations ?? shard.battle?.operations,
        };
        targets = resolveTargets(shard.target ?? shard.battle?.target?.id ?? 'one_enemy', targetUnit);
        this.log(`${actor.name} の結晶技 ${shard.name ?? shard.techniqueNameJa}！`);
        break;
      }
      case 'item':
        if (!this.canUseItem(choice.item)) {
          this.log(`${choice.item.name ?? 'アイテム'} の在庫がない！`);
          return false;
        }
        action = (choice.item.operations ?? choice.item.battle?.operations)?.length
          ? { ...choice.item, operations: choice.item.operations ?? choice.item.battle.operations, kind: choice.item.actionKind ?? 'scripted' }
          : { kind: 'heal', healAmount: choice.item.healAmount };
        targets = [targetUnit ?? actor];
        this.log(`${actor.name} は ${choice.item.name} を つかった！`);
        break;
      case 'defend':
        action = { kind: 'defend' };
        targets = [actor];
        this.log(`${actor.name} は みをまもっている。`);
        break;
      default:
        return false;
    }

    if (!actor.canAffordMp(action.mpCost ?? 0)) {
      this.log(`${actor.name} の MPが足りない！`);
      return false;
    }
    if (action.disabledReason) {
      this.log(action.disabledReason, 'unavailable');
      return false;
    }

    const isMagicLike = choice.type === 'magic' || choice.type === 'crystal' || (choice.type === 'ability' && (action.mpCost ?? 0) > 0);
    if (isMagicLike && !actor.canUseMagic()) {
      this.log(`${actor.name} は魔法を使えない！`);
      return false;
    }
    if (isMagicLike && !action.ignoreReflect) {
      targets = targets.map((target) => {
        if (!target.statuses?.has('reflect')) return target;
        const reflected = this.units.filter((unit) => unit.isAlive() && unit.isEnemy !== target.isEnemy);
        const redirect = reflected[Math.floor(Math.random() * reflected.length)] ?? actor;
        this.log(`${target.name} のリフレク！ ${redirect.name} へ反射した！`);
        return redirect;
      });
    }

    if (choice.type === 'item' && !this.consumeItemStock(choice.item)) {
      this.log(`${choice.item.name ?? 'アイテム'} の使用に失敗した。`);
      return false;
    }
    const results = resolveAction({ actor, action, targets, battleUnits: this.units });
    if (results.some((result) => ['insufficient-mp', 'sealed', 'invalid-target', 'unavailable'].includes(result.type))) {
      this.log('その行動は実行できない。');
      return false;
    }
    results.forEach((r) => {
      const affectedUnit = this.units.find((unit) => unit.uid === r.targetUid) ?? targets[0] ?? actor;
      if (r.type === 'damage') {
        const weakText = r.weak ? '(弱点！)' : '';
        const hitText = r.hits > 1 ? ` ${r.hits}ヒット！` : '';
        const nullText = r.nullified ? ' 無効！' : '';
        this.log(`${affectedUnit.name} に ${r.amount} の ダメージ！${hitText}${weakText}${nullText}`);
      } else if (r.type === 'heal') {
        const healedUnit = this.units.find((unit) => unit.uid === r.targetUid) ?? targets[0];
        this.log(`${healedUnit.name} の HPが ${r.amount} かいふくした。`);
      } else if (r.type === 'mp-heal') {
        this.log(`${affectedUnit.name} の MPが ${r.amount} かいふくした。`);
      } else if (r.type === 'mp-damage') {
        this.log(`${affectedUnit.name} の MPが ${r.amount} へった。`);
      } else if (r.type === 'miss') {
        this.log(`${r.hits > 1 ? `${r.hits}回 ` : ''}ミス！`);
      } else if (r.type === 'blocked') {
        this.log(`${targets[0].name} は こうげきを ふせいだ！`);
      } else if (r.type === 'absorb') {
        this.log(`${affectedUnit.name} は属性攻撃を吸収し、HPが ${r.amount} かいふくした。`);
      } else if (r.type === 'buff') {
        this.log(`${affectedUnit.name}：${r.label}`);
      } else if (r.type === 'revive') {
        this.log(`${affectedUnit.name} は HP${r.amount} で復帰した！`);
      } else if (r.type === 'scan') {
        this.log(`${affectedUnit.name} HP ${r.hp}/${r.maxHp}　弱点 ${r.weakness ?? 'なし'}`);
      } else if (r.type === 'status') {
        this.log(`${affectedUnit.name} に ${r.statuses.join('・') || '特殊効果'}。`);
      } else if (r.type === 'status-resist') {
        this.log(`${affectedUnit.name} は ${r.statuses.join('・')} を防いだ！`);
      } else if (r.type === 'cleanse') {
        this.log(`${affectedUnit.name} の状態異常を治療した。`);
      } else if (r.type === 'dispel') {
        this.log(`${affectedUnit.name} の有利な効果を解除した。`);
      } else if (r.type === 'effect') {
        this.log(`${affectedUnit.name}：${r.label}`);
      } else if (r.type === 'removed') {
        this.log(`${affectedUnit.name} は戦場から消え去った！`);
      } else if (r.type === 'barrier') {
        this.log(`${affectedUnit.name} を物理障壁（${r.amount}）が守る！`);
      } else if (r.type === 'barrier-absorb') {
        this.log(`物理障壁が ${r.amount} ダメージを肩代わりした。残り ${r.remaining}`);
      } else if (r.type === 'field-status') {
        this.log(`${affectedUnit.name} は時の流れを見切った！`);
      }
    });

    this.emitActionResolved(actor, results, actionStartSequence);

    const pendingBossAction = this.pendingEnemyActions.get(this.boss.uid);
    if (pendingBossAction && action.element && action.element === this.boss.weakness && results.some((result) => result.targetUid === this.boss.uid && result.type === 'damage')) {
      pendingBossAction.power = Math.max(0.5, (pendingBossAction.power ?? 1) * 0.55);
      pendingBossAction.name = `${pendingBossAction.name}（体勢崩し）`;
      this.log(`${this.boss.name} の構えが崩れ、大技の威力が低下した！`, 'counter');
      eventBus.emit('battle:counter', { actor, boss: this.boss, action: pendingBossAction });
    }

    const nextPhase = bossPhaseIndex(this.boss);
    if (nextPhase > this.bossPhase && this.boss.isAlive()) {
      this.bossPhase = nextPhase;
      this.log(`${this.boss.name} の気配が変わった――フェーズ ${nextPhase + 1}！`, 'phase');
      eventBus.emit('battle:phaseChanged', { boss: this.boss, phase: nextPhase + 1 });
    }

    const costUsed = choice.ctbCost ?? action.ctbCost ?? 1.0;
    this.ctb.consumeTurn(actor, costUsed);

    this.awaitingPlayerInput = false;
    this.currentActor = null;
    this.broadcastState();

    if (this.checkBattleEnd()) return;
    this.scheduleNextTurn();
    return true;
  }
}

export { magicSets, itemActions, defendAction };
