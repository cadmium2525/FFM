import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BattleManager } from '../src/battle/BattleManager.js';
import { calculateEquipmentBonuses } from '../src/battle/EquipmentSystem.js';
import { Unit } from '../src/battle/Unit.js';

function makeUnit(overrides = {}) {
  return new Unit({
    id: 'test-unit',
    name: 'TEST',
    maxHp: 1000,
    maxMp: 100,
    atk: 40,
    def: 30,
    agility: 30,
    ...overrides,
  });
}

const hermesEffects = calculateEquipmentBonuses({ accessory: 'equipment_accessory_hermes_sandals' });
const hermesUser = makeUnit({ id: 'hermes-user', equipmentEffects: hermesEffects });
assert.equal(hermesUser.statuses.has('haste'), true);
assert.equal(hermesUser.permanentStatuses.has('haste'), true);
assert.equal(hermesUser.statusDurations.has('haste'), false);
for (let turn = 0; turn < 20; turn += 1) hermesUser.processTurnStatuses();
assert.equal(hermesUser.statuses.has('haste'), true, 'Hermes haste must never expire naturally');
assert.equal(hermesUser.removeStatus('haste'), false, 'equipment auto-status must resist ordinary removal');

const cursedEffects = calculateEquipmentBonuses({ accessory: 'equipment_accessory_cursed_ring' });
const cursedUser = makeUnit({ id: 'cursed-user', equipmentEffects: cursedEffects });
assert.equal(cursedUser.statuses.has('doom'), true);
assert.equal(cursedUser.permanentStatuses.has('doom'), false, 'Cursed Ring Doom is a countdown, not a permanent buff');
assert.equal(cursedUser.statusDurations.get('doom'), 5);

const masamuneEffects = calculateEquipmentBonuses({ weapon: 'equipment_weapon_masamune' });
assert.equal(masamuneEffects.autoStatuses.includes('haste'), false, 'Masamune casts Haste when used; it is not Auto-Haste');
assert.ok(masamuneEffects.initialCtBonus > 0, 'Masamune still grants its first-action property');
const defenderEffects = calculateEquipmentBonuses({ weapon: 'equipment_weapon_defender' });
assert.equal(defenderEffects.autoStatuses.includes('protect'), false, 'Defender casts Protect when used; it is not Auto-Protect');

const mirageEffects = calculateEquipmentBonuses({ body: 'equipment_body_mirage_vest' });
const mirageUser = makeUnit({ id: 'mirage-user', equipmentEffects: mirageEffects });
assert.equal(mirageUser.imageHits, 1);
mirageUser.imageHits = 0;

const boss = makeUnit({ id: 'omega', name: 'オメガ', isEnemy: true, level: 119, weakness: 'thunder', maxHp: 3200 });
const manager = new BattleManager([hermesUser, mirageUser], boss);
assert.deepEqual(manager.bossIntel, { hp: false, mp: false, weakness: false, status: false, level: false });
manager.revealBossIntel({ kind: 'scan', id: 'check' }, boss);
assert.equal(manager.bossIntel.hp, true);
assert.equal(manager.bossIntel.weakness, false, 'Check reveals HP only');

let restored = BattleManager.fromSnapshot(manager.createSnapshot());
assert.equal(restored.party[0].statuses.has('haste'), true);
assert.equal(restored.party[0].statusDurations.has('haste'), false);
assert.equal(restored.party[1].imageHits, 0, 'suspend resume must not recharge Mirage Vest');
assert.equal(restored.bossIntel.hp, true);
assert.equal(restored.bossIntel.weakness, false);

restored.revealBossIntel({ kind: 'scan', sourceId: 'magic_libra', name: 'ライブラ' }, restored.boss);
assert.equal(restored.bossIntel.weakness, true);
assert.equal(restored.bossIntel.level, true);
restored = BattleManager.fromSnapshot(restored.createSnapshot());
assert.equal(restored.bossIntel.weakness, true, 'Libra knowledge must survive suspend resume');

const uiSource = fs.readFileSync(new URL('../src/ui/BattleUI.js', import.meta.url), 'utf8');
const intermissionSource = fs.readFileSync(new URL('../src/ui/IntermissionUI.js', import.meta.url), 'utf8');
assert.match(uiSource, /battle:actionStarted/);
assert.match(uiSource, /renderCommandListIdle\(\)[\s\S]*?this\.commandListEl\.innerHTML = '';/);
assert.match(uiSource, /DATA UNANALYZED/);
assert.doesNotMatch(uiSource, /enemy-intel-phase[^\n]*PHASE/);
assert.doesNotMatch(intermissionSource, /つぎのボス:[^\n]*弱点/);

console.log(JSON.stringify({
  commandWindowClearsDuringActions: true,
  bossIntelHiddenUntilScan: true,
  hermesHastePermanent: true,
  mirageChargesPreservedOnResume: true,
  libraIntelPreservedOnResume: true,
  status: 'ok',
}, null, 2));
