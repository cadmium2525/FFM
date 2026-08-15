import assert from 'node:assert/strict';
import { Unit } from '../src/battle/Unit.js';
import { resolveAction, resolvePhysicalDamage } from '../src/battle/ActionResolver.js';
import { CTBEngine, BASE_THRESHOLD } from '../src/battle/CTBEngine.js';
import { BattleManager } from '../src/battle/BattleManager.js';
import { bossActionsFor } from '../src/battle/BossActionProfiles.js';
import { battleReadyMagic, battleReadyShards, crystalShardAction, magicRecordToAction } from '../src/database/battleCatalog.js';
import { calculateEquipmentBonuses } from '../src/battle/EquipmentSystem.js';
import { ff5Equipment } from '../src/database/ff5Database.js';

const makeUnit = (overrides = {}) => new Unit({
  id: 'test', name: 'Test', maxHp: 2000, maxMp: 999, atk: 80, def: 30,
  magic: 70, magicDef: 25, agility: 30, ctValue: 0, ...overrides,
});

// Timed statuses expire naturally without permanently mutating base stats.
const sleeper = makeUnit();
assert.equal(sleeper.addStatus('sleep', { force: true, duration: 2 }), true);
sleeper.processTurnStatuses();
assert.equal(sleeper.statuses.has('sleep'), true);
sleeper.processTurnStatuses();
assert.equal(sleeper.statuses.has('sleep'), false);
assert.equal(sleeper.agility, 30);

const afflicted = makeUnit({ hp: 1000 });
afflicted.addStatus('poison', { force: true });
const poisonTick = afflicted.processTurnStatuses().find((result) => result.status === 'poison');
assert.equal(poisonTick.amount, 125);

// Front/back rows change physical outcomes while ranged attacks bypass the penalty.
const oldRandom = Math.random;
Math.random = () => 0.5;
const attacker = makeUnit({ atk: 100, row: 'front' });
const front = makeUnit({ isEnemy: true, row: 'front', def: 20 });
const back = makeUnit({ isEnemy: true, row: 'back', def: 20 });
assert.ok(resolvePhysicalDamage(attacker, back) < resolvePhysicalDamage(attacker, front));
assert.equal(resolvePhysicalDamage(attacker, back, { ranged: true }), resolvePhysicalDamage(attacker, front, { ranged: true }));
Math.random = oldRandom;

// CTB costs are materially different and haste is calculated without stat drift.
const ctbUnit = makeUnit({ ctValue: BASE_THRESHOLD });
const ctb = new CTBEngine([ctbUnit]);
ctb.consumeTurn(ctbUnit, 0.55);
assert.equal(ctbUnit.ctValue, 450);
ctbUnit.ctValue = BASE_THRESHOLD;
ctb.consumeTurn(ctbUnit, 1.8);
assert.equal(ctbUnit.ctValue, -800);

// Equipment status immunities are generated from the reference database.
const immunityItem = ff5Equipment.find((item) => item.special === 'confuse_mini_immunity');
assert.ok(immunityItem);
const immunityEffects = calculateEquipmentBonuses({ accessory: immunityItem.id });
const immune = makeUnit({ equipmentEffects: immunityEffects });
assert.equal(immune.addStatus('confuse', { force: false, random: () => 0 }), false);

// Every spell action descriptor executes through the resolver without throwing.
for (const record of battleReadyMagic) {
  assert.ok(record.battle.operations.every((operation) => operation.op !== 'effect.script'), `${record.id} still uses a generic spell placeholder`);
  const actor = makeUnit({ id: `caster-${record.id}` });
  const ally = makeUnit({ id: 'ally', hp: 0, isEnemy: false });
  const enemy = makeUnit({ id: 'enemy', isEnemy: true, heavy: false });
  const action = magicRecordToAction(record);
  const targets = action.target?.includes('ally') ? [ally] : [enemy];
  const result = resolveAction({ actor, action: { kind: action.actionKind, ...action }, targets, battleUnits: [actor, ally, enemy] });
  assert.ok(Array.isArray(result), `${record.id} should resolve to result array`);
}

const magicAction = (id) => magicRecordToAction(battleReadyMagic.find((record) => record.id === id));

const semanticCaster = makeUnit({ level: 50, magic: 60 });
const semanticAlly = makeUnit({ hp: 900 });
const semanticEnemy = makeUnit({ isEnemy: true, heavy: true, statusImmunities: ['ko', 'petrify'] });
const hpBeforeProtect = semanticAlly.hp;
resolveAction({ actor: semanticCaster, action: { kind: magicAction('magic_protect').actionKind, ...magicAction('magic_protect') }, targets: [semanticAlly], battleUnits: [semanticCaster, semanticAlly, semanticEnemy] });
assert.equal(semanticAlly.hp, hpBeforeProtect, 'Protect must not deal accidental damage');
assert.equal(semanticAlly.statuses.has('protect'), true);
const hpBeforeRegen = semanticAlly.hp;
resolveAction({ actor: semanticCaster, action: { kind: magicAction('magic_regen').actionKind, ...magicAction('magic_regen') }, targets: [semanticAlly], battleUnits: [semanticCaster, semanticAlly, semanticEnemy] });
assert.equal(semanticAlly.hp, hpBeforeRegen, 'Regen must not include an accidental instant heal');
assert.equal(semanticAlly.statuses.has('regen'), true);
const fallen = makeUnit({ hp: 0 });
resolveAction({ actor: semanticCaster, action: { kind: magicAction('magic_arise').actionKind, ...magicAction('magic_arise') }, targets: [fallen], battleUnits: [semanticCaster, fallen] });
assert.equal(fallen.hp, fallen.maxHp, 'Arise must revive at full HP');
const hammerTarget = makeUnit({ isEnemy: true, mp: 200, maxMp: 200, heavy: false });
resolveAction({ actor: semanticCaster, action: { kind: magicAction('magic_magic_hammer').actionKind, ...magicAction('magic_magic_hammer') }, targets: [hammerTarget], battleUnits: [semanticCaster, hammerTarget] });
assert.equal(hammerTarget.mp, 100, 'Magic Hammer was applied more than once');
const odinResults = resolveAction({ actor: semanticCaster, action: { kind: magicAction('magic_odin').actionKind, ...magicAction('magic_odin') }, targets: [semanticEnemy], battleUnits: [semanticCaster, semanticEnemy] });
assert.ok(odinResults.some((result) => result.type === 'damage' && result.odinFallback === 'gungnir'), 'Odin must use Gungnir when instant death is invalid');

// Former scripted placeholders now have explicit runtime semantics or a visible boss restriction.
const speedAction = magicAction('magic_speed');
assert.equal(speedAction.actionKind, 'field-speed');
const speedCaster = makeUnit();
resolveAction({ actor: speedCaster, action: { kind: speedAction.actionKind, ...speedAction }, targets: [speedCaster], battleUnits: [speedCaster] });
assert.equal(speedCaster.statuses.has('time_focus'), true);

const muteAction = magicAction('magic_mute');
assert.equal(muteAction.actionKind, 'field-status');
const muteCaster = makeUnit();
const muteEnemy = makeUnit({ isEnemy: true });
resolveAction({ actor: muteCaster, action: { kind: muteAction.actionKind, ...muteAction }, targets: [muteCaster, muteEnemy], battleUnits: [muteCaster, muteEnemy] });
assert.equal(muteCaster.statuses.has('silence'), true);
assert.equal(muteEnemy.statuses.has('silence'), true);
assert.equal(muteEnemy.canUseMagic(), false);

for (const id of ['magic_teleport', 'magic_return']) {
  const action = magicAction(id);
  assert.ok(action.disabledReason?.includes('ボス戦'), `${id} must explain why it cannot be used`);
  const actor = makeUnit();
  const result = resolveAction({ actor, action: { kind: action.actionKind, ...action }, targets: [actor], battleUnits: [actor] });
  assert.equal(result[0].type, 'unavailable');
}

const golemAction = magicAction('magic_golem');
assert.equal(golemAction.actionKind, 'barrier-physical');
const golemCaster = makeUnit({ level: 20, magic: 50 });
const protectedAlly = makeUnit({ def: 0 });
resolveAction({ actor: golemCaster, action: { kind: golemAction.actionKind, ...golemAction }, targets: [protectedAlly], battleUnits: [golemCaster, protectedAlly] });
const barrierBefore = protectedAlly.physicalBarrier;
assert.ok(barrierBefore >= 400);
const barrierAttacker = makeUnit({ isEnemy: true, atk: 70 });
const hpBeforeBarrierHit = protectedAlly.hp;
Math.random = () => 0.5;
const firstBarrierHit = resolveAction({ actor: barrierAttacker, action: { kind: 'physical-attack' }, targets: [protectedAlly] });
assert.ok(firstBarrierHit.some((result) => result.type === 'barrier-absorb'));
assert.equal(protectedAlly.hp, hpBeforeBarrierHit);
assert.ok(protectedAlly.physicalBarrier < barrierBefore);
protectedAlly.physicalBarrier = 1;
resolveAction({ actor: barrierAttacker, action: { kind: 'physical-attack' }, targets: [protectedAlly] });
assert.ok(protectedAlly.hp < hpBeforeBarrierHit);
Math.random = oldRandom;

// A freshly equipped summon command must cast through BattleManager, spend MP,
// and carry its school metadata to the presentation layer.
const summonFaris = makeUnit({ id: 'faris-summoner', name: 'ピーシィ', maxMp: 350, mp: 350, ctValue: BASE_THRESHOLD });
const summonBoss = makeUnit({ id: 'summon-target', name: '召喚検証用', isEnemy: true, maxHp: 9999, hp: 9999, ctValue: 0 });
const summonManager = new BattleManager([summonFaris], summonBoss);
summonManager.scheduleNextTurn = () => {};
summonManager.broadcastState = () => {};
summonManager.currentActor = summonFaris;
summonManager.awaitingPlayerInput = true;
const ifritAction = magicAction('magic_ifrit');
assert.equal(ifritAction.school, 'summon');
assert.equal(ifritAction.sourceType, 'magic');
assert.equal(summonManager.submitPlayerAction({ type: 'ability', ability: ifritAction }, summonBoss), true);
assert.equal(summonFaris.mp, 350 - ifritAction.mpCost);

// If summoning really is sealed, report the concrete status instead of a
// generic wiring-looking error and leave the turn/MP untouched.
const silencedFaris = makeUnit({ id: 'faris-silenced', name: 'ピーシィ', maxMp: 350, mp: 350, ctValue: BASE_THRESHOLD });
silencedFaris.addStatus('silence', { force: true });
const sealedManager = new BattleManager([silencedFaris], summonBoss);
sealedManager.scheduleNextTurn = () => {};
sealedManager.broadcastState = () => {};
sealedManager.currentActor = silencedFaris;
sealedManager.awaitingPlayerInput = true;
assert.equal(sealedManager.submitPlayerAction({ type: 'ability', ability: ifritAction }, summonBoss), false);
assert.equal(silencedFaris.mp, 350);
assert.match(sealedManager.logJournal.at(-1).text, /沈黙状態.*召喚/);

// Crystal shards use the same operation pipeline and deal their own element damage.
for (const shard of battleReadyShards) {
  const shardAction = crystalShardAction(shard.id);
  assert.equal(shardAction.element, shard.battle.element);
  const shardCaster = makeUnit();
  const shardTarget = makeUnit({ isEnemy: true, weakness: shardAction.element });
  const shardResults = resolveAction({ actor: shardCaster, action: { kind: shardAction.actionKind, ...shardAction }, targets: [shardTarget], battleUnits: [shardCaster, shardTarget] });
  assert.ok(shardResults.some((result) => result.type === 'damage' && result.weak));
}

// Each encounter phase has at least three actions; every boss has a telegraphed finisher.
for (const id of ['boss1', 'boss2', 'boss3']) {
  const boss = makeUnit({ id, isEnemy: true, hp: 400, maxHp: 2000 });
  const actions = bossActionsFor(boss);
  assert.ok(actions.length >= 3, `${id} phase needs 3 actions`);
  assert.ok(actions.some((action) => action.telegraph), `${id} needs a telegraph`);
}

// Telegraph is stored for a later turn, then actually fires; sleep never stalls CTB.
Math.random = () => 0.999999;
const party = [makeUnit({ id: 'hero', ctValue: 0 })];
const boss = makeUnit({ id: 'boss1', name: 'Boss', isEnemy: true, hp: 700, maxHp: 2000, ctValue: BASE_THRESHOLD });
const manager = new BattleManager(party, boss);
manager.scheduleNextTurn = () => {};
manager.broadcastState = () => {};
manager.enemyAct(boss);
assert.equal(manager.pendingEnemyActions.has(boss.uid), true);
const hpBeforeFinisher = party[0].hp;
manager.enemyAct(boss);
assert.equal(manager.pendingEnemyActions.has(boss.uid), false);
assert.ok(party[0].hp < hpBeforeFinisher);

const sleepingHero = makeUnit({ id: 'sleeping-hero', ctValue: BASE_THRESHOLD });
sleepingHero.addStatus('sleep', { force: true, duration: 2 });
const slowBoss = makeUnit({ id: 'dummy', isEnemy: true, agility: 1, ctValue: 0 });
const statusManager = new BattleManager([sleepingHero], slowBoss);
statusManager.scheduleNextTurn = () => {};
statusManager.broadcastState = () => {};
statusManager.advanceTurn();
assert.equal(statusManager.awaitingPlayerInput, false);
sleepingHero.ctValue = BASE_THRESHOLD;
statusManager.advanceTurn();
assert.equal(sleepingHero.statuses.has('sleep'), false);
assert.equal(statusManager.awaitingPlayerInput, true);

// Item stock is queryable, consumed exactly once, persisted by hook, and zero stock refuses the turn.
let potionStock = 1;
let persistCalls = 0;
const itemHero = makeUnit({ hp: 500, ctValue: BASE_THRESHOLD });
const itemBoss = makeUnit({ id: 'dummy-item-boss', isEnemy: true, ctValue: 0 });
const itemManager = new BattleManager([itemHero], itemBoss, {
  getItemStock: (id) => id === 'potion' ? potionStock : 0,
  consumeItem: (id, amount) => {
    if (id !== 'potion' || potionStock < amount) return false;
    potionStock -= amount;
    persistCalls += 1;
    return true;
  },
});
itemManager.scheduleNextTurn = () => {};
itemManager.broadcastState = () => {};
assert.deepEqual(itemManager.getItemUseState('potion'), { stock: 1, usable: true, reason: null });
itemManager.currentActor = itemHero;
itemManager.awaitingPlayerInput = true;
assert.equal(itemManager.submitPlayerAction({ type: 'item', item: { id: 'potion', name: 'ポーション', healAmount: 400, ctbCost: 0.8 } }, itemHero), true);
assert.equal(itemManager.getItemStock('potion'), 0);
assert.equal(persistCalls, 1);
const ctBeforeRejectedItem = itemHero.ctValue;
itemManager.currentActor = itemHero;
itemManager.awaitingPlayerInput = true;
assert.equal(itemManager.submitPlayerAction({ type: 'item', item: { id: 'potion', name: 'ポーション', healAmount: 400 } }, itemHero), false);
assert.equal(itemHero.ctValue, ctBeforeRejectedItem);
assert.equal(persistCalls, 1);
Math.random = oldRandom;

console.log(JSON.stringify({ spellsResolved: battleReadyMagic.length, shardsResolved: battleReadyShards.length, bossesAudited: 3, status: 'ok' }, null, 2));
