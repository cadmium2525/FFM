import assert from 'node:assert/strict';
import { Unit } from '../src/battle/Unit.js';
import { ff5MagicDamage, ff5MonsterDamage, ff5PhysicalDamage, ff5PhysicalHit, ff5ThrowDamage, ff5Zeninage } from '../src/battle/FF5FormulaEngine.js';
import { resolveFF5SpecialCommand } from '../src/battle/FF5CommandSystem.js';
import { nextBossActionFor, counterSequenceFor } from '../src/battle/BossActionProfiles.js';
import { getAbilityActions, itemActions } from '../src/data/abilityData.js';

const makeUnit = (overrides = {}) => new Unit({
  id: 'unit', name: 'Unit', maxHp: 4000, maxMp: 500, atk: 70, def: 30,
  strength: 40, vitality: 35, magic: 40, magicDef: 25, agility: 32,
  level: 30, weaponAttack: 50, weaponType: 'sword', ...overrides,
});
const fixed = () => 0.5;

// Integer A/D/M formula and weapon-family branches.
const target = makeUnit({ id: 'target', isEnemy: true, def: 20, magicDef: 20 });
const sword = makeUnit({ weaponType: 'sword', weaponAttack: 50 });
const axe = makeUnit({ weaponType: 'axe', weaponAttack: 50 });
const knifeSlow = makeUnit({ weaponType: 'knife', weaponAttack: 50, agility: 10 });
const knifeFast = makeUnit({ weaponType: 'knife', weaponAttack: 50, agility: 90 });
assert.notEqual(ff5PhysicalDamage(sword, target, {}, fixed).damage, ff5PhysicalDamage(axe, target, {}, fixed).damage, 'axe and sword formulas collapsed');
assert.ok(ff5PhysicalDamage(knifeFast, target, {}, fixed).damage > ff5PhysicalDamage(knifeSlow, target, {}, fixed).damage, 'dagger must use Agility');
const spear = makeUnit({ weaponType: 'spear', weaponAttack: 50 });
assert.equal(ff5PhysicalDamage(spear, target, { commandFormula: 'jump' }, fixed).damage, ff5PhysicalDamage(spear, target, {}, fixed).damage * 2, 'spear Jump must double M');
assert.equal(ff5MagicDamage(makeUnit({ level: 30, magic: 40 }), target, { ff5Power: 50 }, fixed).formula.multiplier, 8, 'magic M integer formula changed');
assert.ok(ff5ThrowDamage(sword, target, 50, fixed) > ff5PhysicalDamage(sword, target, {}, fixed).damage, 'Throw must use its Strength+Agility doubled multiplier');
assert.deepEqual(ff5Zeninage(sword, 4), { cost: 1500, attack: 40, multiplier: 50, targetCount: 4 });
const monster = makeUnit({ isEnemy: true, atk: 115, monsterM: 12 });
assert.equal(ff5MonsterDamage(monster, makeUnit({ def: 30 }), {}, fixed).damage, 1104, 'monster attacks must use MonsterM, not a sword Strength formula');
const bell = makeUnit({ weaponType: 'bell', weaponAttack: 50, magic: 60, agility: 60 });
const rod = makeUnit({ weaponType: 'rod', weaponAttack: 50, magic: 60 });
assert.ok(ff5PhysicalDamage(bell, makeUnit({ def: 0, magicDef: 40 }), {}, fixed).formula.defense === 40, 'bells must use Magic Defense');
assert.ok(ff5PhysicalDamage(rod, makeUnit({ def: 0, magicDef: 40 }), {}, fixed).formula.defense === 40, 'rods must use Magic Defense');
assert.ok(ff5PhysicalDamage(makeUnit({ weaponType: 'fist', weaponAttack: 0, hasBrawl: true }), target, {}, fixed).damage
  > ff5PhysicalDamage(makeUnit({ weaponType: 'fist', weaponAttack: 0, hasBrawl: false }), target, {}, fixed).damage, 'Brawl and ordinary unarmed formulas must remain distinct');
const hitRolls = [0.2, 0.3];
assert.equal(ff5PhysicalHit({ attacker: sword, defender: makeUnit({ evasion: 50 }), action: { accuracy: 100 }, random: () => hitRolls.shift() }), false, 'physical hit must perform the separate accuracy and evasion rolls');

const stocks = new Map(itemActions.map((item) => [item.id, 3]));
let gil = 100000;
const manager = {
  units: [], lastPartyAction: null,
  getItemStock: (id) => stocks.get(id) ?? 0,
  consumeItemStock: (id, amount = 1) => { if ((stocks.get(id) ?? 0) < amount) return false; stocks.set(id, stocks.get(id) - amount); return true; },
  addItemStock: (id, amount = 1) => { stocks.set(id, (stocks.get(id) ?? 0) + amount); return true; },
  getGil: () => gil,
  spendGil: (amount) => { if (gil < amount) return false; gil -= amount; return true; },
};
const actor = makeUnit({ id: 'hero', name: 'Hero' });
const boss = makeUnit({ id: 'omega', name: 'Omega', isEnemy: true, heavy: true, maxHp: 55530, hp: 55530, statusImmunities: [] });
manager.units = [actor, boss];

const actionFor = (abilityId, actionId) => getAbilityActions(abilityId).find((action) => !actionId || action.id === actionId);
const execute = (abilityId, actionId, targets = [boss]) => resolveFF5SpecialCommand({ manager, actor, action: actionFor(abilityId, actionId), targets });

const oldRandom = Math.random;
Math.random = () => 0;
const stolenBefore = stocks.get('item_dragon_fang');
const stolen = execute('ability_steal');
assert.equal(stolen.results[0].type, 'steal');
assert.equal(stocks.get('item_dragon_fang'), stolenBefore + 1, 'Steal must add the rare item on the rare roll');

boss.stolen = false;
assert.ok(execute('ability_mug').results.some((result) => result.type === 'damage'), 'Mug must attack');
const jump = execute('ability_jump');
assert.equal(jump.results[0].type, 'jump-start');
assert.equal(actor.hidden, true);
assert.ok(actor.pendingJump, 'Jump must queue a later landing');

const mixActions = getAbilityActions('ability_mix');
assert.equal(mixActions.length, 78, 'Mix must expose all 78 unordered ingredient pairs');
const mixAction = mixActions.find((action) => action.mixEffect === 'x-potion');
const potionBefore = stocks.get('item_potion');
const mixed = resolveFF5SpecialCommand({ manager, actor, action: mixAction, targets: [actor] });
assert.equal(mixed.valid, true);
assert.equal(stocks.get('item_potion'), potionBefore - 1, 'Mix must consume both materials');

for (const recipe of mixActions) {
  actor.hp = actor.maxHp;
  actor.mp = actor.maxMp;
  actor.statuses.delete('ko');
  boss.hp = boss.maxHp;
  boss.mp = boss.maxMp;
  boss.statuses.delete('ko');
  recipe.ingredients.forEach((id) => stocks.set(id, 99));
  const recipeTargets = recipe.target === 'single-ally' ? [actor] : [boss];
  const recipeResult = resolveFF5SpecialCommand({ manager, actor, action: recipe, targets: recipeTargets });
  assert.equal(recipeResult.valid, true, `${recipe.name} must have an executable, non-placeholder Mix effect`);
  assert.ok(recipeResult.results.length > 0, `${recipe.name} must produce a battle result`);
}

const throwBefore = stocks.get('item_fire_scroll');
assert.equal(execute('ability_throw', 'throw-fire-scroll').valid, true);
assert.equal(stocks.get('item_fire_scroll'), throwBefore - 1, 'Throw must consume the selected projectile');

const gilBefore = gil;
assert.equal(execute('ability_zeninage').valid, true);
assert.ok(gil < gilBefore, 'Zeninage must consume gil');
assert.equal(execute('ability_gaia').action.id, 'gaia-wind-slash');
assert.equal(execute('ability_animals').action.id, 'animal-mysidian-rabbit');
assert.equal(execute('ability_dance').action.id, 'tempting-tango');
Math.random = oldRandom;

actor.hp = actor.maxHp;
actor.statuses.delete('ko');
boss.hp = boss.maxHp;
boss.statuses.delete('ko');
boss.imageHits = 0;
manager.lastPartyAction = { action: { id: 'copied', name: 'コピー攻撃', kind: 'physical-attack', mpCost: 30 }, targetIds: [boss.uid] };
const mimic = execute('ability_mimic', null, [actor]);
assert.equal(mimic.action.mpCost, 0);
assert.ok(mimic.results.some((result) => result.type === 'damage'), 'Mimic must replay the previous action');

const redSpells = getAbilityActions('ability_dualcast');
const dualMpBefore = actor.mp;
const dualcast = resolveFF5SpecialCommand({
  manager,
  actor,
  action: { specialCommand: 'dualcast', dualSpells: redSpells.slice(0, 2), dualTargetUids: [boss.uid, boss.uid] },
  targets: [boss],
});
assert.equal(dualcast.valid, true);
assert.ok(actor.mp < dualMpBefore, 'Dualcast must spend each selected spell MP independently');

const beast = makeUnit({ id: 'beast', name: 'Beast', isEnemy: true, heavy: false, creatureTypes: ['beast'] });
manager.units = [actor, beast];
assert.ok(resolveFF5SpecialCommand({ manager, actor, action: actionFor('ability_calm'), targets: [beast] }).results.some((result) => result.type === 'status'), 'Calm must stop eligible beast targets');
beast.hp = Math.floor(beast.maxHp / 10);
const caught = resolveFF5SpecialCommand({ manager, actor, action: actionFor('ability_catch', 'catch'), targets: [beast] });
assert.equal(caught.results[0].type, 'captured');
assert.ok(actor.capturedMonster, 'Catch must retain a releasable monster');
manager.units = [actor, boss];
const released = resolveFF5SpecialCommand({ manager, actor, action: actionFor('ability_catch', 'release'), targets: [beast] });
assert.equal(actor.capturedMonster, null, 'Release must consume the captured monster');
assert.equal(released.action.id, 'release-beast');

const continuousSong = getAbilityActions('ability_sing').find((song) => song.songMode === 'continuous');
const sung = resolveFF5SpecialCommand({ manager, actor, action: continuousSong, targets: [actor] });
assert.ok(actor.singing && sung.results.some((result) => result.type === 'buff'), 'continuous Sing must enter a retained singing state');
const spellblades = getAbilityActions('ability_spellblade');
assert.equal(spellblades.length, 18, 'Spellblade list was simplified');

assert.equal(itemActions.length, 28, 'all database items must be represented in the battle item list');
for (const abilityId of ['ability_steal', 'ability_mug', 'ability_mimic', 'ability_mix', 'ability_dance', 'ability_animals', 'ability_gaia', 'ability_jump', 'ability_throw', 'ability_zeninage']) {
  assert.ok(getAbilityActions(abilityId).every((action) => action.specialCommand || action.operations), `${abilityId} fell back to a generic action`);
}

const omegaCycle = Array.from({ length: 8 }, (_, cursor) => nextBossActionFor(makeUnit({ id: 'omega', isEnemy: true }), cursor));
[1, 3, 7].forEach((index) => assert.equal(omegaCycle[index].id, 'wave-cannon', `Omega slot ${index + 1} must be Wave Cannon`));
assert.equal(omegaCycle[5].id, 'targeting', 'Omega slot 6 must be Targeting');
assert.equal(omegaCycle[5].reflectable, true, 'Omega Targeting must be reflectable');
assert.ok(Array.isArray(omegaCycle[4].multi) && omegaCycle[4].multi.length === 2, 'Omega slot 5 must be a double-action turn');

const omegaBoss = makeUnit({ id: 'omega', isEnemy: true, permanentStatuses: ['shell', 'reflect'] });
assert.ok(omegaBoss.statuses.has('shell') && omegaBoss.statuses.has('reflect'), 'Omega must start with permanent Shell/Reflect');
assert.equal(omegaBoss.removeStatus('reflect'), false, "Dispel must not be able to strip Omega's permanent Reflect");
assert.ok(omegaBoss.statuses.has('reflect'), 'Omega must retain Reflect after a dispel attempt');

const omegaCounters = counterSequenceFor(omegaBoss);
assert.equal(omegaCounters.length, 2, 'Omega must have two counter slots');
assert.deepEqual(omegaCounters[0].choices.map((c) => c.id).sort(), ['mustard-bomb', 'rocket-punch'], 'Omega 1st counter slot must be ロケットパンチ/マスタードボム only');
assert.deepEqual(omegaCounters[1].choices.map((c) => c.id).sort(), ['circle', 'rocket-punch'], 'Omega 2nd counter slot must be ロケットパンチ/サークル only');

console.log(JSON.stringify({ formulas: 12, specialCommandScenarios: 15, mixRecipes: mixActions.length, spellblades: spellblades.length, battleItems: itemActions.length, omegaAiSlots: omegaCycle.length, status: 'ok' }, null, 2));
