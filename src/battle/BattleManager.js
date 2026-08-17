import { CTBEngine } from './CTBEngine.js';
import { resolveAction } from './ActionResolver.js';
import { defendAction, itemActions, magicSets } from '../data/abilityData.js';
import { eventBus } from '../core/EventBus.js';
import { isIncapacitated, statusLabels } from './StatusEngine.js';
import { bossActionsFor, bossPhaseIndex, counterPoolFor, nextBossActionFor } from './BossActionProfiles.js';
import { Unit } from './Unit.js';
import { resolveFF5SpecialCommand } from './FF5CommandSystem.js';

const ENEMY_TURN_DELAY_MS = 900;
const AUTO_ADVANCE_DELAY_MS = 550;
// FFV resets the enemy ATB interval after every ordinary command. A powerful
// spell does not make the next gauge 1.2x or 1.55x longer; animation pacing is
// already handled by the presentation gate.
export const FF5_ENEMY_TURN_COST = 1;

function cloneSerializable(value, fallback) {
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }
}

function snapshotUnit(unit) {
  return {
    id: unit.id,
    name: unit.name,
    isEnemy: unit.isEnemy,
    role: unit.role,
    spriteUrl: unit.spriteUrl,
    effectAnchor: cloneSerializable(unit.effectAnchor, null),
    maxHp: unit.maxHp,
    hp: unit.hp,
    maxMp: unit.maxMp,
    mp: unit.mp,
    atk: unit.atk,
    monsterM: unit.monsterM,
    def: unit.def,
    magicDef: unit.magicDef,
    magic: unit.magic,
    agility: unit.agility,
    evasion: unit.evasion,
    weakness: unit.weakness,
    resist: unit.resist,
    weaponElement: unit.weaponElement,
    weaponAccuracy: unit.weaponAccuracy,
    weaponSpecial: unit.weaponSpecial,
    weaponId: unit.weaponId,
    weaponAttack: unit.weaponAttack,
    weaponType: unit.weaponType,
    hasBrawl: unit.hasBrawl,
    strength: unit.strength,
    vitality: unit.vitality,
    baseAtk: unit.baseAtk,
    baseDef: unit.baseDef,
    baseMagicDef: unit.baseMagicDef,
    baseMagic: unit.baseMagic,
    baseAgility: unit.baseAgility,
    equipmentEffects: cloneSerializable(unit.equipmentEffects, {}),
    physicalDamageMultiplier: unit.physicalDamageMultiplier,
    magicDamageMultiplier: unit.magicDamageMultiplier,
    imageHits: unit.imageHits,
    nextAttackMultiplier: unit.nextAttackMultiplier,
    physicalBarrier: unit.physicalBarrier,
    statuses: [...unit.statuses],
    statusDurations: [...unit.statusDurations],
    permanentStatuses: [...(unit.permanentStatuses ?? [])],
    statusImmunities: [...unit.statusImmunities],
    statusResistance: unit.statusResistance,
    temporaryNullElements: [...(unit.temporaryNullElements ?? [])],
    elementalPower: Boolean(unit.elementalPower),
    level: unit.level,
    equippedAbilitySet: unit.equippedAbilitySet,
    equipment: cloneSerializable(unit.equipment, {}),
    abilityId: unit.abilityId,
    crystalShardId: unit.crystalShardId,
    crystalShardTechniqueIds: [...(unit.crystalShardTechniqueIds ?? [])],
    size: unit.size,
    ai: unit.ai,
    counterOnHit: cloneSerializable(unit.counterOnHit, null),
    creatureTypes: [...unit.creatureTypes],
    row: unit.row,
    heavy: unit.heavy,
    isUndead: unit.isUndead,
    removedFromBattle: unit.removedFromBattle,
    hidden: unit.hidden,
    pendingJump: cloneSerializable(unit.pendingJump, null),
    capturedMonster: cloneSerializable(unit.capturedMonster, null),
    singing: cloneSerializable(unit.singing, null),
    weaponSpellblade: cloneSerializable(unit.weaponSpellblade, null),
    stolen: unit.stolen,
    ctValue: unit.ctValue,
    defending: unit.defending,
    magicList: cloneSerializable(unit.magicList, []),
  };
}

function restoreUnit(snapshot) {
  const unit = new Unit({
    ...snapshot,
    equipmentEffects: cloneSerializable(snapshot.equipmentEffects, {}),
    equipment: cloneSerializable(snapshot.equipment, {}),
    statuses: snapshot.statuses ?? [],
    statusDurations: snapshot.statusDurations ?? [],
    permanentStatuses: snapshot.permanentStatuses ?? [],
    statusImmunities: snapshot.statusImmunities ?? [],
    temporaryNullElements: snapshot.temporaryNullElements ?? [],
    elementalPower: Boolean(snapshot.elementalPower),
    creatureTypes: snapshot.creatureTypes ?? [],
    magicList: cloneSerializable(snapshot.magicList, []),
  });
  unit.physicalDamageMultiplier = snapshot.physicalDamageMultiplier ?? unit.physicalDamageMultiplier;
  unit.magicDamageMultiplier = snapshot.magicDamageMultiplier ?? 1;
  unit.imageHits = snapshot.imageHits ?? 0;
  unit.nextAttackMultiplier = snapshot.nextAttackMultiplier ?? 1;
  unit.physicalBarrier = snapshot.physicalBarrier ?? 0;
  unit.removedFromBattle = Boolean(snapshot.removedFromBattle);
  unit.defending = Boolean(snapshot.defending);
  return unit;
}

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
    this.bossIntel = { hp: false, mp: false, weakness: false, status: false, level: false };
    this.presentationHoldUntil = 0;
    this.battleEndTimer = null;
    this.itemStockProvider = options.getItemStock ?? (() => Infinity);
    this.itemConsumer = options.consumeItem ?? (() => true);
    this.itemAdder = options.addItemStock ?? (() => true);
    this.gilProvider = options.getGil ?? (() => 0);
    this.gilConsumer = options.spendGil ?? (() => false);
    this.lastPartyAction = null;
    this.magicLampUse = 0;
    this.enemyActionCursor = 0;
  }

  createSnapshot() {
    const currentActorIndex = this.currentActor ? this.units.indexOf(this.currentActor) : -1;
    return {
      version: 1,
      partyLength: this.party.length,
      units: this.units.map(snapshotUnit),
      currentActorIndex,
      awaitingPlayerInput: this.awaitingPlayerInput,
      bossPhase: this.bossPhase,
      bossIntel: cloneSerializable(this.bossIntel, {}),
      logSequence: this.logSequence,
      logJournal: cloneSerializable(this.logJournal, []),
      pendingEnemyActions: [...this.pendingEnemyActions.entries()].map(([uid, action]) => [
        this.units.findIndex((unit) => unit.uid === uid),
        cloneSerializable(action, null),
      ]).filter(([index, action]) => index >= 0 && action),
      // Unit uids are recreated while restoring a suspended battle. Persist
      // target indexes as the stable reference so Mimic keeps the exact
      // original targets after a task-kill/resume cycle.
      lastPartyAction: this.lastPartyAction ? {
        action: cloneSerializable(this.lastPartyAction.action, null),
        targetIndexes: (this.lastPartyAction.targetIds ?? [])
          .map((uid) => this.units.findIndex((unit) => unit.uid === uid))
          .filter((index) => index >= 0),
      } : null,
      magicLampUse: this.magicLampUse,
      enemyActionCursor: this.enemyActionCursor,
    };
  }

  static fromSnapshot(snapshot, options = {}) {
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.units)) {
      throw new Error('Invalid battle suspend snapshot');
    }
    const units = snapshot.units.map(restoreUnit);
    const partyLength = Math.max(1, Math.min(units.length - 1, Number(snapshot.partyLength) || units.length - 1));
    const manager = new BattleManager(units.slice(0, partyLength), units[partyLength], options);
    manager.currentActor = units[snapshot.currentActorIndex] ?? null;
    manager.awaitingPlayerInput = Boolean(snapshot.awaitingPlayerInput && manager.currentActor && !manager.currentActor.isEnemy);
    manager.bossPhase = Math.max(0, Number(snapshot.bossPhase) || 0);
    manager.bossIntel = {
      hp: Boolean(snapshot.bossIntel?.hp),
      mp: Boolean(snapshot.bossIntel?.mp),
      weakness: Boolean(snapshot.bossIntel?.weakness),
      status: Boolean(snapshot.bossIntel?.status),
      level: Boolean(snapshot.bossIntel?.level),
    };
    manager.logSequence = Math.max(0, Number(snapshot.logSequence) || 0);
    manager.logJournal = Array.isArray(snapshot.logJournal) ? snapshot.logJournal.slice(-80) : [];
    manager.pendingEnemyActions = new Map((snapshot.pendingEnemyActions ?? []).flatMap(([index, action]) => {
      const unit = units[index];
      return unit && action ? [[unit.uid, action]] : [];
    }));
    manager.lastPartyAction = snapshot.lastPartyAction ? {
      action: cloneSerializable(snapshot.lastPartyAction.action, null),
      targetIds: (snapshot.lastPartyAction.targetIndexes ?? [])
        .map((index) => units[index]?.uid)
        .filter(Boolean),
    } : null;
    manager.magicLampUse = Math.max(0, Number(snapshot.magicLampUse) || 0);
    manager.enemyActionCursor = Math.max(0, Number(snapshot.enemyActionCursor) || 0);
    return manager;
  }

  resume() {
    if (this.checkBattleEnd()) return;
    this.presentationHoldUntil = 0;
    this.broadcastState();
    const actor = this.currentActor;
    if (!actor) {
      this.awaitingPlayerInput = false;
      this.scheduleNextTurn(350);
      return;
    }
    if (this.awaitingPlayerInput && !actor.isEnemy) {
      eventBus.emit('battle:playerTurn', { actor });
      return;
    }
    this.beginActorTurn(actor);
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

  emitActionResolved(actor, results, fromSequence = 0, action = null) {
    const entries = this.logJournal.filter((entry) => entry.id > fromSequence);
    const presentationResults = results.map((result) => {
      const target = this.units.find((unit) => unit.uid === result.targetUid);
      return target ? { ...result, presentationPatch: result.presentationPatch ?? { uid: target.uid, ...snapshotUnit(target) } } : { ...result };
    });
    eventBus.emit('battle:actionResolved', { actor, action, results: presentationResults, logEntries: entries });
    eventBus.emit('battle:logBatch', { actorUid: actor.uid, entries });
  }

  broadcastState() {
    eventBus.emit('battle:stateUpdate', {
      party: this.party,
      boss: this.boss,
      preview: this.ctb.previewQueue(8),
    });
  }

  addItemStock(itemOrId, amount = 1) {
    return this.itemAdder(this.itemId(itemOrId), amount, itemOrId) !== false;
  }

  getGil() { return Math.max(0, Math.floor(Number(this.gilProvider()) || 0)); }

  spendGil(amount) { return this.gilConsumer(Math.max(0, Math.floor(amount))) !== false; }

  revealBossIntel(action, target = this.boss) {
    if (!target || target.uid !== this.boss.uid || action?.kind !== 'scan') return false;
    const actionKey = [action.id, action.sourceId, action.visualId, action.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const detailed = /libra|scan|ライブラ|みやぶる/.test(actionKey);
    this.bossIntel.hp = true;
    if (detailed) {
      this.bossIntel.mp = true;
      this.bossIntel.weakness = true;
      this.bossIntel.status = true;
      this.bossIntel.level = true;
    }
    return true;
  }

  start() {
    this.log(`${this.boss.name} が あらわれた！`);
    this.broadcastState();
    this.scheduleNextTurn(400);
  }

  deferNextTurnFor(durationMs = 0) {
    const safeDuration = Math.max(0, Number(durationMs) || 0);
    this.presentationHoldUntil = Math.max(this.presentationHoldUntil, Date.now() + safeDuration);
  }

  scheduleNextTurn(delay = AUTO_ADVANCE_DELAY_MS) {
    if (this.finished) return;
    const presentationDelay = Math.max(0, this.presentationHoldUntil - Date.now());
    setTimeout(() => this.advanceTurn(), Math.max(delay, presentationDelay));
  }

  checkBattleEnd() {
    if (this.finished) return true;
    const finish = (result, message) => {
      this.finished = true;
      this.result = result;
      clearTimeout(this.battleEndTimer);
      let announced = false;
      const settleThenEnd = () => {
        const remaining = Math.max(0, this.presentationHoldUntil - Date.now());
        if (remaining > 0) {
          this.battleEndTimer = setTimeout(settleThenEnd, remaining + 20);
          return;
        }
        if (!announced) {
          announced = true;
          // battle:log listeners synchronously extend presentationHoldUntil
          // for the victory/defeat message. Re-check it before emitting end.
          this.log(message);
          this.battleEndTimer = setTimeout(settleThenEnd, 20);
          return;
        }
        this.battleEndTimer = null;
        eventBus.emit('battle:end', { result });
      };
      this.battleEndTimer = setTimeout(settleThenEnd, 120);
      return true;
    };
    if (!this.boss.isAlive() || this.boss.removedFromBattle || this.boss.statuses.has('petrify')) {
      return finish('victory', `${this.boss.name} を たおした！`);
    }
    if (this.party.every((p) => !p.isAlive() || p.removedFromBattle || p.statuses.has('petrify'))) {
      return finish('defeat', 'パーティは ぜんめつした...');
    }
    return false;
  }

  advanceTurn() {
    if (this.finished) return;
    const presentationDelay = Math.max(0, this.presentationHoldUntil - Date.now());
    if (presentationDelay > 0) {
      this.scheduleNextTurn(presentationDelay);
      return;
    }
    this.presentationHoldUntil = 0;
    const actor = this.ctb.advanceToNextActor();
    if (!actor) return;
    this.currentActor = actor;

    // Stop freezes a unit's own CTB gauge (effectiveAgility -> 0), so its own
    // turn never comes around again on its own — meaning the normal
    // "decrement duration when it's your turn" tick would never fire and
    // Stop would never wear off. FF5's Stop instead runs down over the
    // course of *other* units' turns, so tick it here, once per turn taken
    // by anyone else, independently of the frozen unit's own (frozen) CTB.
    this.units.forEach((unit) => {
      if (unit === actor || !unit.isAlive() || !unit.statuses.has('stop')) return;
      if (unit.permanentStatuses?.has('stop')) return;
      const remaining = (unit.statusDurations.get('stop') ?? 1) - 1;
      if (remaining <= 0) {
        unit.removeStatus('stop');
        this.log(`${unit.name} の ${statusLabels(['stop'])} が切れた。`);
      } else {
        unit.statusDurations.set('stop', remaining);
      }
    });

    const tickAction = { id: 'status-tick', name: '継続効果', kind: 'status-tick' };
    const tickActionStartSequence = this.logSequence;
    const tickResults = actor.processTurnStatuses();
    if (tickResults.length) eventBus.emit('battle:actionStarted', { actor, action: tickAction });
    tickResults.forEach((result) => {
      if (result.type === 'status-damage') this.log(`${actor.name} は ${statusLabels([result.status])}で ${result.amount} ダメージ！`);
      if (result.type === 'status-heal' && result.amount > 0) this.log(`${actor.name} の HPが ${result.amount} 回復した。`);
      if (result.type === 'doom') this.log(`${actor.name} は死の宣告に倒れた！`);
      if (result.type === 'status-expired' && result.status !== 'doom') this.log(`${actor.name} の ${statusLabels([result.status])} が切れた。`);
    });
    if (tickResults.length) this.emitActionResolved(actor, tickResults, tickActionStartSequence, tickAction);
    if (this.checkBattleEnd()) return;

    const statusMessageDelay = Math.max(0, this.presentationHoldUntil - Date.now());
    if (tickResults.length && statusMessageDelay > 0) {
      setTimeout(() => this.beginActorTurn(actor), statusMessageDelay);
      return;
    }
    this.beginActorTurn(actor);
  }

  beginActorTurn(actor) {
    if (this.finished || this.currentActor !== actor) return;

    // Reset defend stance at the start of a unit's own turn.
    actor.defending = false;
    actor.physicalDamageMultiplier = actor.equipmentEffects?.physicalDamageMultiplier ?? 1;

    if (actor.pendingJump) {
      this.resolveJumpLanding(actor);
    } else if (isIncapacitated(actor)) {
      this.log(`${actor.name} は動けない！`);
      this.ctb.consumeTurn(actor, 0.45);
      this.currentActor = null;
      this.broadcastState();
      this.scheduleNextTurn(260);
    } else if (actor.singing) {
      const actionStartSequence = this.logSequence;
      const action = { ...actor.singing, specialCommand: 'sing' };
      eventBus.emit('battle:actionStarted', { actor, action });
      this.log(`${actor.name} は ${action.name}を歌い続けている。`);
      const special = resolveFF5SpecialCommand({ manager: this, actor, action, targets: this.party });
      const results = special.results ?? [];
      this.emitActionResolved(actor, results, actionStartSequence, action);
      this.ctb.consumeTurn(actor, action.ctbCost ?? 1.15);
      this.currentActor = null;
      this.broadcastState();
      if (!this.checkBattleEnd()) this.scheduleNextTurn();
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

  resolveJumpLanding(actor) {
    const pending = actor.pendingJump;
    actor.pendingJump = null;
    actor.hidden = false;
    const target = this.units.find((unit) => unit.uid === pending?.targetUid && unit.isAlive())
      ?? this.units.find((unit) => unit.isAlive() && unit.isEnemy !== actor.isEnemy);
    if (!target) { this.currentActor = null; this.scheduleNextTurn(); return; }
    const actionStartSequence = this.logSequence;
    const action = { ...pending.action, name: 'ジャンプ' };
    eventBus.emit('battle:actionStarted', { actor, action });
    this.log(`${actor.name} の ジャンプ！`);
    const results = resolveAction({ actor, action, targets: [target], battleUnits: this.units });
    results.filter((result) => result.type === 'damage').forEach((result) => this.log(`${target.name} に ${result.amount} の ダメージ！`));
    this.emitActionResolved(actor, results, actionStartSequence, action);
    this.ctb.consumeTurn(actor, 1);
    this.currentActor = null;
    this.broadcastState();
    if (!this.checkBattleEnd()) this.scheduleNextTurn();
  }

  forcedAct(actor) {
    const confused = actor.statuses.has('confuse');
    const candidates = this.units.filter((unit) => unit.isAlive() && !unit.hidden && !unit.removedFromBattle && (confused || unit.isEnemy !== actor.isEnemy));
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    if (!target) return this.scheduleNextTurn();
    const action = { kind: 'physical-attack', name: 'こうげき' };
    const actionStartSequence = this.logSequence;
    eventBus.emit('battle:actionStarted', { actor, action });
    this.log(`${actor.name} は${confused ? '混乱して' : '狂戦士となり'} ${target.name} を攻撃！`);
    const results = resolveAction({ actor, action, targets: [target], battleUnits: this.units });
    results.filter((result) => result.type === 'damage').forEach((result) => this.log(`${target.name} に ${result.amount} の ダメージ！`));
    this.emitActionResolved(actor, results, actionStartSequence, action);
    this.ctb.consumeTurn(actor, 1);
    this.currentActor = null;
    this.broadcastState();
    if (!this.checkBattleEnd()) this.scheduleNextTurn();
  }

  /** Simple AI: picks a target based on the boss's `ai` behaviour tag. */
  pickEnemyTarget() {
    const aliveParty = this.party.filter((p) => p.isAlive() && !p.hidden && !p.removedFromBattle);
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
      this.log(`${actor.name} は攻撃対象を見失った。`);
      this.ctb.consumeTurn(actor, 1);
      this.currentActor = null;
      this.broadcastState();
      if (!this.checkBattleEnd()) this.scheduleNextTurn();
      return;
    }

    const actionStartSequence = this.logSequence;
    const pendingAction = this.pendingEnemyActions.get(actor.uid);
    if (pendingAction) this.pendingEnemyActions.delete(actor.uid);
    const scriptedAction = nextBossActionFor(actor, this.enemyActionCursor);
    const chosenAction = pendingAction ?? (actor.canAffordMp(scriptedAction.mpCost ?? 0) ? scriptedAction : { id: 'enemy-attack', name: 'こうげき', kind: 'physical-attack' });
    if (chosenAction.telegraph && !pendingAction) {
      const preparedAction = { ...chosenAction, telegraph: null };
      this.pendingEnemyActions.set(actor.uid, preparedAction);
      this.log(`${actor.name}：${chosenAction.telegraph}`, 'telegraph');
      eventBus.emit('battle:telegraph', { actor, action: preparedAction, hint: chosenAction.telegraph });
      this.ctb.consumeTurn(actor, 0.5);
      this.currentActor = null;
      this.broadcastState();
      this.scheduleNextTurn(420);
      return;
    }
    const targets = chosenAction.target === 'all_enemies'
      ? this.party.filter((unit) => unit.isAlive() && !unit.hidden && !unit.removedFromBattle)
      : [target];
    eventBus.emit('battle:actionStarted', { actor, action: chosenAction });
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

    this.emitActionResolved(actor, results, actionStartSequence, chosenAction);
    this.enemyActionCursor += 1;
    this.ctb.consumeTurn(actor, FF5_ENEMY_TURN_COST);
    this.currentActor = null;
    this.broadcastState();

    if (this.checkBattleEnd()) return;
    this.scheduleNextTurn();
  }

  /**
   * Some bosses (e.g. Omega) always retaliate with a burst of counter-moves
   * immediately after taking damage, independent of the CTB turn order.
   * Faithful to the source game's "反撃行動: 2つ選んで行動" pattern.
   */
  resolveCounterAttacks(originalActor) {
    const pool = counterPoolFor(this.boss);
    const counterConfig = this.boss.counterOnHit;
    if (!pool.length || !counterConfig || !this.boss.isAlive()) return;
    // Faithful to the source game: a boss frozen by Stop (or otherwise
    // incapacitated — paralyzed, asleep, petrified) cannot act at all,
    // including its automatic counterattack.
    if (isIncapacitated(this.boss)) return;
    if (Math.random() > (counterConfig.chance ?? 1)) return;

    const times = counterConfig.times ?? 1;
    for (let i = 0; i < times; i += 1) {
      const aliveParty = this.party.filter((unit) => unit.isAlive() && !unit.hidden && !unit.removedFromBattle);
      if (!aliveParty.length || !this.boss.isAlive()) break;
      const counterAction = { ...pool[Math.floor(Math.random() * pool.length)], isCounterAction: true };
      const focusTarget = aliveParty.includes(originalActor) ? originalActor : aliveParty[Math.floor(Math.random() * aliveParty.length)];
      const counterTargets = counterAction.target === 'all_enemies' ? aliveParty : [focusTarget];

      const actionStartSequence = this.logSequence;
      eventBus.emit('battle:actionStarted', { actor: this.boss, action: counterAction });
      this.log(`${this.boss.name} の反撃！ ${counterAction.name}！`, 'counter');
      const results = resolveAction({ actor: this.boss, action: counterAction, targets: counterTargets, battleUnits: this.units });
      results.forEach((r) => {
        const affected = this.units.find((unit) => unit.uid === r.targetUid);
        if (r.type === 'damage') this.log(`${affected?.name ?? '???'} に ${r.amount} の ダメージ！`, 'counter');
        else if (r.type === 'status') this.log(`${affected?.name ?? '???'} に ${statusLabels(r.statuses) || '特殊効果'}！`, 'counter');
        else if (r.type === 'status-resist') this.log(`${affected?.name ?? '???'} は ${statusLabels(r.statuses)} を防いだ！`, 'counter');
        else if (r.type === 'removed') this.log(`${affected?.name ?? '???'} は戦場から消え去った！`, 'counter');
      });
      this.emitActionResolved(this.boss, results, actionStartSequence, counterAction);
    }
    this.broadcastState();
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
      if (['all_allies', 'party'].includes(targetId)) {
        const revive = (choice.spell?.operations ?? choice.ability?.operations ?? choice.item?.operations ?? []).some((operation) => operation.op === 'revive');
        return this.party.filter((unit) => revive ? !unit.isAlive() : unit.isAlive());
      }
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
        this.log(`${actor.name} のえんばんせき ${shard.name ?? shard.techniqueNameJa}！`);
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
        targets = resolveTargets(choice.item.target ?? choice.item.battle?.target?.id, targetUnit ?? actor);
        if (choice.item.sourceId === 'item_magic_lamp' || choice.item.id === 'item_magic_lamp') {
          const lampOrder = ['magic_bahamut', 'magic_leviathan', 'magic_phoenix', 'magic_odin', 'magic_syldra', 'magic_carbuncle', 'magic_catoblepas', 'magic_golem', 'magic_titan', 'magic_ifrit', 'magic_ramuh', 'magic_shiva', 'magic_remora', 'magic_sylph', 'magic_chocobo'];
          const summonId = lampOrder[Math.min(this.magicLampUse, lampOrder.length - 1)];
          const summon = Object.values(magicSets).flat().find((spell) => spell.sourceId === summonId);
          if (summon) {
            this.magicLampUse += 1;
            action = { ...summon, kind: summon.actionKind, mpCost: 0, name: `${choice.item.name}：${summon.name}` };
            targets = resolveTargets(summon.target, this.boss);
          }
        }
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

    const isSummon = action.school === 'summon';
    const isCrystal = choice.type === 'crystal';
    const isMagicLike = choice.type === 'magic'
      || isCrystal
      || action.sourceType === 'magic'
      || (choice.type === 'ability' && (action.mpCost ?? 0) > 0);
    if (isMagicLike && !actor.canUseMagic()) {
      const reason = actor.statuses?.has('silence')
        ? '沈黙状態'
        : actor.statuses?.has('toad')
          ? 'カエル状態'
          : '行動不能状態';
      const commandName = isSummon ? '召喚' : isCrystal ? 'えんばんせき' : '魔法';
      this.log(`${actor.name} は${reason}のため${commandName}を使えない！`, 'unavailable');
      return false;
    }
    if (choice.type === 'item' && choice.item.consumable !== false && !this.consumeItemStock(choice.item)) {
      this.log(`${choice.item.name ?? 'アイテム'} の使用に失敗した。`);
      return false;
    }

    eventBus.emit('battle:actionStarted', { actor, action });
    if (isMagicLike && !action.ignoreReflect) {
      targets = targets.map((target) => {
        if (!target.statuses?.has('reflect')) return target;
        const reflected = this.units.filter((unit) => unit.isAlive() && unit.isEnemy !== target.isEnemy);
        const redirect = reflected[Math.floor(Math.random() * reflected.length)] ?? actor;
        this.log(`${target.name} のリフレク！ ${redirect.name} へ反射した！`);
        return redirect;
      });
    }

    let results;
    if (action.specialCommand) {
      const special = resolveFF5SpecialCommand({ manager: this, actor, action, targets });
      if (!special.valid) {
        this.log(special.reason ?? 'その行動は実行できない。', 'unavailable');
        eventBus.emit('battle:actionCancelled', { actor, action });
        eventBus.emit('battle:playerTurn', { actor });
        return false;
      }
      action = special.action ?? action;
      targets = special.targets ?? targets;
      results = special.results ?? [];
      action._doNotRemember = special.remember === false;
    } else {
      results = resolveAction({ actor, action, targets, battleUnits: this.units });
    }
    if (results.some((result) => ['insufficient-mp', 'sealed', 'invalid-target', 'unavailable'].includes(result.type))) {
      this.log('その行動は実行できない。');
      eventBus.emit('battle:actionCancelled', { actor, action });
      eventBus.emit('battle:playerTurn', { actor });
      return false;
    }
    results
      .filter((result) => result.type === 'scan')
      .forEach((result) => this.revealBossIntel(action, this.units.find((unit) => unit.uid === result.targetUid)));
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
        if (this.bossIntel.weakness) {
          const activeStatuses = statusLabels(r.statuses) || 'なし';
          this.log(`${affectedUnit.name} Lv${r.level} HP ${r.hp}/${r.maxHp} MP ${r.mp}/${r.maxMp}　弱点 ${r.weakness ?? 'なし'}　状態 ${activeStatuses}`);
        } else {
          this.log(`${affectedUnit.name} HP ${r.hp}/${r.maxHp}`);
        }
      } else if (r.type === 'status') {
        this.log(`${affectedUnit.name} に ${statusLabels(r.statuses) || '特殊効果'}。`);
      } else if (r.type === 'status-resist') {
        this.log(`${affectedUnit.name} は ${statusLabels(r.statuses)} を防いだ！`);
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
      } else if (r.type === 'steal') {
        this.log(`${r.itemName}を ぬすんだ！${r.rare ? '（レア）' : ''}`);
      } else if (r.type === 'command-message') {
        this.log(r.label);
      } else if (r.type === 'jump-start') {
        this.log(`${actor.name} は空高く跳び上がった！`);
      } else if (r.type === 'captured' || r.type === 'hidden' || r.type === 'revealed') {
        this.log(r.label ?? (r.type === 'hidden' ? `${actor.name}は身を隠した。` : `${actor.name}は姿を現した。`));
      } else if (r.type === 'song-stopped') {
        this.log(`${affectedUnit.name} の歌が中断された。`);
      }
    });

    this.emitActionResolved(actor, results, actionStartSequence, action);

    if (!actor.isEnemy && !action._doNotRemember && !['defend'].includes(action.kind)) {
      this.lastPartyAction = {
        action: cloneSerializable({ ...action, mpCost: action.mpCost ?? 0 }, null),
        targetIds: targets.map((unit) => unit.uid),
      };
    }

    const pendingBossAction = this.pendingEnemyActions.get(this.boss.uid);
    if (pendingBossAction && action.element && action.element === this.boss.weakness && results.some((result) => result.targetUid === this.boss.uid && result.type === 'damage')) {
      pendingBossAction.power = Math.max(0.5, (pendingBossAction.power ?? 1) * 0.55);
      pendingBossAction.name = `${pendingBossAction.name}（体勢崩し）`;
      this.log(`${this.boss.name} の構えが崩れ、大技の威力が低下した！`, 'counter');
      eventBus.emit('battle:counter', { actor, boss: this.boss, action: pendingBossAction });
    }

    if (this.boss.isAlive() && results.some((result) => result.targetUid === this.boss.uid && result.type === 'damage' && result.amount > 0)) {
      this.resolveCounterAttacks(actor);
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
