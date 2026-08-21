import assert from 'node:assert/strict';
import { BattleUI, splitPresentationResults } from '../src/ui/BattleUI.js';
import { BattleManager } from '../src/battle/BattleManager.js';
import { Unit } from '../src/battle/Unit.js';
import { eventBus } from '../src/core/EventBus.js';
import { resolveFF5SpecialCommand } from '../src/battle/FF5CommandSystem.js';

const groups = splitPresentationResults([
  { type: 'damage', targetUid: 'omega', amount: 101, hits: 4 },
  { type: 'status', targetUid: 'omega', statuses: ['slow'] },
], 4, 'split-amount');

assert.deepEqual(groups.map((group) => group.filter((result) => result.type === 'damage').map((result) => result.amount)), [[25], [25], [25], [26]]);
assert.equal(groups.slice(0, 3).flat().some((result) => result.type === 'status'), false, 'status must latch on the final impact');
assert.equal(groups[3].some((result) => result.type === 'status'), true, 'status must latch on the final impact');
assert.equal(groups.flat().filter((result) => result.type === 'damage').reduce((sum, result) => sum + result.amount, 0), 101, 'split damage must preserve the exact total');

const single = splitPresentationResults([{ type: 'heal', targetUid: 'p1', amount: 165 }], 1);
assert.deepEqual(single, [[{ type: 'heal', targetUid: 'p1', amount: 165 }]]);

const decorativeImpacts = splitPresentationResults([{ type: 'damage', targetUid: 'omega', amount: 99, hits: 1 }], 2, 'final-impact');
assert.deepEqual(decorativeImpacts, [[], [{ type: 'damage', targetUid: 'omega', amount: 99, hits: 1 }]], 'decorative flashes must not invent mechanical hits');

const tinySplit = splitPresentationResults([{ type: 'damage', targetUid: 'omega', amount: 1, presentationPatch: { uid: 'omega', hp: 0 } }], 4, 'split-amount');
assert.equal(tinySplit[3][0].amount, 1, 'tiny split total must land on the final cue');
assert.equal(tinySplit[3][0].presentationPatch.hp, 0, 'final cue must retain its immutable after-state receipt');

const liveUnit = {
  uid: 'p1', hp: 100, maxHp: 100, mp: 20, maxMp: 20, atk: 10, def: 9, magicDef: 8, level: 5,
  statuses: new Set(['haste']), statusDurations: new Map([['haste', 3]]), permanentStatuses: new Set(),
  statusImmunities: new Set(), temporaryNullElements: new Set(), creatureTypes: new Set(), nested: { value: 1 },
};
const snapshot = BattleUI.prototype.presentationSnapshot.call({}, liveUnit);
liveUnit.maxHp = 200; liveUnit.atk = 99; liveUnit.def = 77; liveUnit.magicDef = 66; liveUnit.level = 80; liveUnit.nested.value = 2;
const presentationHarness = { presentationUnits: new Map([['p1', snapshot]]) };
const cloned = BattleUI.prototype.presentationUnit.call(presentationHarness, liveUnit);
assert.deepEqual({ maxHp: cloned.maxHp, atk: cloned.atk, def: cloned.def, magicDef: cloned.magicDef, level: cloned.level, nested: cloned.nested.value }, { maxHp: 100, atk: 10, def: 9, magicDef: 8, level: 5, nested: 1 }, 'live Unit fields must not leak before impact');

const actor = new Unit({ id: 'actor', name: 'Actor', hp: 100, maxHp: 100, mp: 20, maxMp: 20 });
const target = new Unit({ id: 'target', name: 'Target', isEnemy: true, hp: 100, maxHp: 100, def: 12 });
const manager = new BattleManager([actor], target);
let emittedResult = null;
const unsubscribe = eventBus.on('battle:actionResolved', ({ results }) => { emittedResult = results[0]; });
target.def = 24;
manager.emitActionResolved(actor, [{ type: 'buff', targetUid: target.uid, label: 'DEF変化' }], 0, { id: 'test-buff' });
target.def = 48;
unsubscribe();
assert.equal(emittedResult.presentationPatch.def, 24, 'action receipt must retain the state at that action, not a later counter state');

// Golem's shared pool belongs to BattleManager, so its remaining amount is
// carried by the immutable result receipt while Unit snapshots stay free of
// obsolete per-character barrier copies.
manager.partyPhysicalBarrier = 80;
let emittedBarrierResult = null;
const offBarrierResult = eventBus.on('battle:actionResolved', ({ results }) => { emittedBarrierResult = results[0]; });
manager.emitActionResolved(actor, [{ type: 'barrier-absorb', targetUid: actor.uid, amount: 40, remaining: 80, shared: 'party' }], 0, { id: 'test-golem-absorb' });
manager.partyPhysicalBarrier = 0;
offBarrierResult();
assert.equal(emittedBarrierResult.remaining, 80, 'presentation receipt must preserve the pool remaining at impact');
assert.equal(emittedBarrierResult.shared, 'party');
assert.equal(emittedBarrierResult.presentationPatch.physicalBarrier, 0, 'presentation snapshot must not revive legacy per-Unit Golem state');

const dualActor = new Unit({ id: 'dual-actor', name: 'Dual Actor', hp: 100, maxHp: 100, mp: 50, maxMp: 50 });
const dualTarget = new Unit({ id: 'dual-target', name: 'Dual Target', isEnemy: true, hp: 100, maxHp: 100 });
const dualManager = new BattleManager([dualActor], dualTarget);
const dual = resolveFF5SpecialCommand({
  manager: dualManager,
  actor: dualActor,
  action: {
    specialCommand: 'dualcast',
    dualTargetUids: [dualTarget.uid, dualTarget.uid],
    dualSpells: [
      { id: 'fixed-one', name: '一撃目', actionKind: 'fixed-damage', fixedDamage: 10, target: 'one_enemy', mpCost: 0 },
      { id: 'fixed-two', name: '二撃目', actionKind: 'fixed-damage', fixedDamage: 15, target: 'one_enemy', mpCost: 0 },
    ],
  },
  targets: [dualTarget],
});
assert.deepEqual(dual.results.map((result) => result.presentationPatch.hp), [90, 75], 'dualcast receipts must retain each cast state separately');

const endActor = new Unit({ id: 'end-actor', name: 'End Actor', hp: 100, maxHp: 100 });
const endBoss = new Unit({ id: 'end-boss', name: 'End Boss', isEnemy: true, hp: 0, maxHp: 100 });
const endManager = new BattleManager([endActor], endBoss);
const endStartedAt = Date.now();
const offEndLog = eventBus.on('battle:log', (text) => {
  if (text.includes('たおした')) endManager.deferNextTurnFor(90);
});
const endElapsed = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('battle:end did not fire')), 1500);
  const offEnd = eventBus.on('battle:end', () => {
    clearTimeout(timeout);
    offEnd();
    resolve(Date.now() - endStartedAt);
  });
  endManager.deferNextTurnFor(60);
  endManager.checkBattleEnd();
  setTimeout(() => endManager.deferNextTurnFor(330), 30);
});
offEndLog();
assert.ok(endElapsed >= 400, `battle:end ignored a later presentation hold (${endElapsed}ms)`);

console.log(JSON.stringify({
  stagedImpacts: groups.length,
  totalDamage: 101,
  finalImpactStatusLatch: true,
  fullSnapshotBlocksLiveLeak: true,
  actionReceiptIsImmutable: true,
  sharedGolemReceiptIsImmutable: true,
  dualcastReceiptsAreOrdered: true,
  battleEndRechecksPresentationHold: true,
  status: 'ok',
}, null, 2));
