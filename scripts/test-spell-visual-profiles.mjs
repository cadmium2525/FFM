import assert from 'node:assert/strict';
import { getBattleEffectDescriptor } from '../src/ui/BattleEffectRegistry.js';
import { battleEffectRenderProfile } from '../src/ui/BattleUI.js';

const cases = [
  ['magic_missile', 'gravity', 'target-reticle'],
  ['magic_flare', 'astral', 'star-core'],
  ['magic_level_5_death', 'judgment', 'execution-sigil'],
];

const profiles = cases.map(([id, expectedFamily, expectedGeometry]) => {
  const descriptor = getBattleEffectDescriptor(id);
  const profile = battleEffectRenderProfile(descriptor);
  assert.equal(profile.family, expectedFamily, `${id} family mismatch`);
  assert.equal(profile.geometry, expectedGeometry, `${id} geometry mismatch`);
  assert.ok(descriptor.duration >= 620, `${id} cinematic is too short to read`);
  return profile;
});

assert.equal(new Set(profiles.map((profile) => profile.family)).size, cases.length);
assert.equal(new Set(profiles.map((profile) => profile.motion)).size, cases.length);
assert.equal(new Set(profiles.map((profile) => profile.geometry)).size, cases.length);
assert.equal(new Set(profiles.map((profile) => profile.impact)).size, cases.length);

console.log(JSON.stringify({ auditedSpells: cases.map(([id]) => id), visualFamilies: profiles.map((profile) => profile.family), status: 'ok' }, null, 2));
