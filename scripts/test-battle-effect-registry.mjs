import assert from 'node:assert/strict';
import { battleReadyAbilities, battleReadyMagic, battleReadyShards, battleReadySongs } from '../src/database/battleCatalog.js';
import {
  abilityEffectDescriptors,
  battleEffectDescriptors,
  battleEffectRecipes,
  battleEffectRegistryStats,
  crystalEffectDescriptors,
  getBattleEffectDescriptor,
  getBattleEffectRecipe,
  magicEffectDescriptors,
  resolveBattleEffectDescriptor,
  songEffectDescriptors,
} from '../src/ui/BattleEffectRegistry.js';

assert.equal(battleReadyMagic.length, 99);
assert.equal(battleReadyAbilities.length, 74);
assert.equal(battleReadySongs.length, 8);
assert.equal(battleReadyShards.length, 4);
assert.deepEqual(battleEffectRegistryStats, { magic: 99, abilities: 74, songs: 8, crystals: 4, total: 185 });
assert.equal(Object.keys(magicEffectDescriptors).length, 99);
assert.equal(Object.keys(abilityEffectDescriptors).length, 74);
assert.equal(Object.keys(songEffectDescriptors).length, 8);
assert.equal(Object.keys(crystalEffectDescriptors).length, 4);
assert.equal(Object.keys(battleEffectDescriptors).length, 185);
assert.equal(battleEffectRecipes, battleEffectDescriptors);

const requiredFields = [
  'family', 'motion', 'geometry', 'trajectory', 'pulsePattern', 'particleCount',
  'timing', 'glyph', 'textureMode', 'impactMode', 'seed',
  'actionId', 'castMotion', 'cameraCue', 'targetReaction', 'audioCue',
  'reducedMotionVariant', 'performanceTier', 'phaseTopology',
];
const records = [...battleReadyMagic, ...battleReadyAbilities, ...battleReadySongs, ...battleReadyShards];
records.forEach((record) => {
  const descriptor = getBattleEffectDescriptor(record.id);
  assert.ok(descriptor, `${record.id} descriptor missing`);
  requiredFields.forEach((field) => assert.notEqual(descriptor[field], undefined, `${record.id}.${field} missing`));
  ['key', 'impact', 'palette', 'duration', 'titleTag'].forEach((field) => assert.notEqual(descriptor[field], undefined, `${record.id}.${field} integration field missing`));
  assert.equal(Object.isFrozen(descriptor), true, `${record.id} descriptor must be immutable`);
  assert.ok(descriptor.particleCount >= 8 && descriptor.particleCount <= 14, `${record.id} mobile particle budget`);
  assert.equal(descriptor.mobileBudget.maxParticles, 14);
  assert.equal(descriptor.timing.totalMs, descriptor.timing.windupMs + descriptor.timing.travelMs + descriptor.timing.impactMs + descriptor.timing.decayMs);
  assert.ok(descriptor.glyph.runeSequence.includes(record.id.replace(/^(magic|ability|song|shard)_/, '').slice(0, 12)));
});

// Choreography must remain unique even when identity and seed are excluded.
const choreographySignature = (descriptor) => JSON.stringify({
  family: descriptor.family,
  motion: descriptor.motion,
  geometry: descriptor.geometry,
  trajectory: descriptor.trajectory,
  pulsePattern: descriptor.pulsePattern,
  particleCount: descriptor.particleCount,
  timing: descriptor.timing,
  glyph: descriptor.glyph,
  textureMode: descriptor.textureMode,
  impactMode: descriptor.impactMode,
});
const uniqueChoreographies = new Set(Object.values(battleEffectDescriptors).map(choreographySignature));
assert.equal(uniqueChoreographies.size, 185, 'every ID needs unique choreography beyond its seed');

const structuralSignature = (descriptor) => JSON.stringify({
  family: descriptor.family,
  motion: { kind: descriptor.motion.kind, entrance: descriptor.motion.entrance },
  geometry: { primary: descriptor.geometry.primary, secondary: descriptor.geometry.secondary, formation: descriptor.geometry.formation },
  trajectory: { kind: descriptor.trajectory.kind, origin: descriptor.trajectory.origin, turns: descriptor.trajectory.turns },
  impact: descriptor.impact,
  targetReaction: descriptor.targetReaction,
  cameraCue: descriptor.cameraCue,
  phaseTopology: descriptor.phaseTopology,
});
const commandAbilities = battleReadyAbilities.filter((record) => record.type === 'command');
assert.equal(commandAbilities.length, 41);
const combatRecords = [...battleReadyMagic, ...commandAbilities, ...battleReadySongs, ...battleReadyShards];
assert.equal(combatRecords.length, 152);
const uniqueCombatStructures = new Set(combatRecords.map((record) => structuralSignature(getBattleEffectDescriptor(record.id))));
assert.equal(uniqueCombatStructures.size, 152, 'combat choreography must be structurally unique without cosmetic fields');

const summons = battleReadyMagic.filter((record) => record.school === 'summon');
assert.equal(summons.length, 15);
const summonMotifs = summons.map((record) => getBattleEffectDescriptor(record.id).summonMotif);
assert.equal(summonMotifs.every(Boolean), true, 'every summon needs an abstract identity emblem');
assert.equal(new Set(summonMotifs).size, 15, 'summon emblems must be individually recognizable');
const songPatterns = battleReadySongs.map((record) => getBattleEffectDescriptor(record.id).songPattern);
assert.equal(songPatterns.every(Boolean), true, 'every song needs a rhythmic identity');
assert.equal(new Set(songPatterns).size, 8, 'song waveforms must be individually recognizable');
for (const id of ['magic_cure', 'magic_cura', 'magic_curaga', 'magic_raise', 'magic_protect']) {
  assert.notEqual(getBattleEffectDescriptor(id).targetReaction, 'recoil', `${id} must not use a damage reaction`);
}

const sampleMagic = battleReadyMagic[0];
const sampleAbility = battleReadyAbilities[0];
const sampleSong = battleReadySongs[0];
const sampleCrystal = battleReadyShards[0];
assert.equal(getBattleEffectRecipe({ visualId: sampleMagic.id }), magicEffectDescriptors[sampleMagic.id]);
assert.equal(getBattleEffectRecipe({ sourceId: sampleMagic.id }), magicEffectDescriptors[sampleMagic.id]);
assert.equal(getBattleEffectRecipe({ commandSourceId: sampleAbility.id }), abilityEffectDescriptors[sampleAbility.id]);
assert.equal(getBattleEffectRecipe({ song: { sourceId: sampleSong.id } }), songEffectDescriptors[sampleSong.id]);
assert.equal(getBattleEffectRecipe({ visualId: sampleCrystal.id }), crystalEffectDescriptors[sampleCrystal.id]);
assert.equal(resolveBattleEffectDescriptor({ visualId: `dual-${sampleMagic.id}` }), magicEffectDescriptors[sampleMagic.id]);
const fallbackA = resolveBattleEffectDescriptor({ id: 'future-prismatic-strike', name: 'プリズムストライク', kind: 'magic-attack' });
const fallbackB = resolveBattleEffectDescriptor({ id: 'future-prismatic-strike', name: 'プリズムストライク', kind: 'magic-attack' });
assert.equal(fallbackA, fallbackB, 'runtime fallback should be cached and deterministic');
assert.ok(fallbackA.particleCount <= 14);

// Regression: these three formerly looked identical despite radically different semantics.
const missile = getBattleEffectDescriptor('magic_missile');
const flare = getBattleEffectDescriptor('magic_flare');
const level5Death = getBattleEffectDescriptor('magic_level_5_death');
assert.equal(missile.family, 'gravity');
assert.equal(missile.geometry.primary, 'target-reticle');
assert.equal(flare.family, 'astral');
assert.equal(flare.geometry.primary, 'star-core');
assert.equal(level5Death.family, 'judgment');
assert.equal(level5Death.geometry.primary, 'execution-sigil');
assert.equal(new Set([missile, flare, level5Death].map(choreographySignature)).size, 3);
assert.equal(new Set([missile.motion.kind, flare.motion.kind, level5Death.motion.kind]).size, 3);
assert.equal(new Set([missile.trajectory.kind, flare.trajectory.kind, level5Death.trajectory.kind]).size, 3);
assert.equal(new Set([missile.impactMode.split(':')[0], flare.impactMode.split(':')[0], level5Death.impactMode.split(':')[0]]).size, 3);

console.log(JSON.stringify({
  magicDescriptors: battleEffectRegistryStats.magic,
  abilityDescriptors: battleEffectRegistryStats.abilities,
  songDescriptors: battleEffectRegistryStats.songs,
  crystalDescriptors: battleEffectRegistryStats.crystals,
  uniqueChoreographies: uniqueChoreographies.size,
  uniqueCombatStructures: uniqueCombatStructures.size,
  regressionTriplet: ['magic_missile', 'magic_flare', 'magic_level_5_death'],
  status: 'ok',
}, null, 2));
