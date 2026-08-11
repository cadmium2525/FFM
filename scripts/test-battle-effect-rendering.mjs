import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { battleReadyAbilities, battleReadyMagic, battleReadyShards, battleReadySongs } from '../src/database/battleCatalog.js';
import { getBattleEffectDescriptor } from '../src/ui/BattleEffectRegistry.js';
import { battleEffectRenderProfile } from '../src/ui/BattleUI.js';

const commands = battleReadyAbilities.filter((ability) => ability.type === 'command');
const combatRecords = [...battleReadyMagic, ...commands, ...battleReadySongs, ...battleReadyShards];
assert.equal(combatRecords.length, 152, 'strict combat VFX coverage changed');

const renderSignatures = combatRecords.map((record) => {
  const descriptor = getBattleEffectDescriptor(record.id);
  assert.ok(descriptor, `${record.id}: descriptor missing`);
  const profile = battleEffectRenderProfile(descriptor);
  return JSON.stringify({
    family: profile.family,
    motion: profile.motion,
    geometry: profile.geometry,
    impact: profile.impact,
    modifiers: profile.modifiers.filter((name) => !name.startsWith('source-')),
  });
});
assert.equal(new Set(renderSignatures).size, 152, 'renderer collapsed structurally unique combat recipes');

const css = await readFile(new URL('../css/battle-effects.css', import.meta.url), 'utf8');
const axes = [
  ['family', (descriptor) => descriptor.family],
  ['motion', (descriptor) => descriptor.motion.kind],
  ['geometry', (descriptor) => descriptor.geometry.primary],
  ['impact', (descriptor) => descriptor.impact.topology],
  ['entrance', (descriptor) => descriptor.motion.entrance],
  ['secondary', (descriptor) => descriptor.geometry.secondary],
  ['formation', (descriptor) => descriptor.geometry.formation],
  ['pulse', (descriptor) => descriptor.pulsePattern.shape],
  ['texture', (descriptor) => descriptor.textureMode],
  ['camera', (descriptor) => descriptor.cameraCue],
  ['reaction', (descriptor) => descriptor.targetReaction],
  ['trajectory', (descriptor) => descriptor.trajectory.kind],
  ['placement', (descriptor) => descriptor.impact.placement],
];

const descriptors = combatRecords.map((record) => getBattleEffectDescriptor(record.id));
for (const [prefix, select] of axes) {
  const values = new Set(descriptors.map(select));
  for (const value of values) {
    assert.ok(css.includes(`.${prefix}-${value}`), `${prefix}-${value}: visual CSS missing`);
  }
}

assert.match(css, /nth-child\(n \+ 15\)\s*\{\s*display:\s*none;/, 'particle cap missing');
assert.match(css, /prefers-reduced-motion:\s*reduce/, 'reduced-motion variant missing');
assert.doesNotMatch(css, /backdrop-filter\s*:/, 'full-screen backdrop filters exceed the iPhone budget');
for (const descriptor of descriptors.filter((entry) => entry.summonMotif)) {
  assert.ok(css.includes(`.fx-summon-emblem.motif-${descriptor.summonMotif}`), `${descriptor.actionId}: summon emblem CSS missing`);
}
for (const descriptor of descriptors.filter((entry) => entry.songPattern)) {
  assert.ok(css.includes(`.fx-song-wave.song-${descriptor.songPattern}`), `${descriptor.actionId}: song waveform CSS missing`);
}

console.log(JSON.stringify({
  activeEffects: combatRecords.length,
  uniqueRenderSignatures: new Set(renderSignatures).size,
  cssAxes: axes.length,
  particleCap: 14,
  status: 'ok',
}, null, 2));
