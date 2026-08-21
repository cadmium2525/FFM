import assert from 'node:assert/strict';
import { SPELL_PIXEL_SEQUENCES } from '../src/ui/SpellCanvasRenderer.js';
import { SPELL_CHOREOGRAPHIES, spellChoreographyForAction } from '../src/ui/SpellArtDirector.js';

const sequences = Object.entries(SPELL_PIXEL_SEQUENCES);
assert.ok(sequences.length >= 36, 'the cross-category pixel VFX production set regressed');

for (const [sceneId, spec] of sequences) {
  assert.equal(spec.referenceVersion, 'SFC-JP-1992', `${sceneId}: wrong reference target`);
  assert.equal(spec.fps, 60, `${sceneId}: timeline fps changed`);
  assert.ok(['final-impact', 'split-amount'].includes(spec.resultPolicy), `${sceneId}: invalid result policy`);
  assert.ok(['each-target', 'centroid'].includes(spec.placement), `${sceneId}: invalid placement`);
  assert.ok(spec.reference && Object.hasOwn(spec.reference, 'sourceMediaHash'), `${sceneId}: missing machine-readable reference schema`);
  assert.ok(spec.frameCount >= 58, `${sceneId}: timeline is too short to have readable phases`);
  assert.ok(spec.phases.length >= 4, `${sceneId}: cast/travel/impact/decay phases required`);
  assert.equal(spec.phases[0].from, 0, `${sceneId}: timeline must start at frame zero`);
  assert.equal(spec.phases.at(-1).to, spec.frameCount - 1, `${sceneId}: timeline must cover its final frame`);
  spec.phases.forEach((entry, index) => {
    assert.ok(entry.from <= entry.to, `${sceneId}/${entry.type}: invalid phase range`);
    if (index) assert.equal(entry.from, spec.phases[index - 1].to + 1, `${sceneId}: phase gap or overlap`);
  });
  for (const impactFrame of spec.impactFrames) {
    assert.ok(impactFrame >= 0 && impactFrame < spec.frameCount, `${sceneId}: impact outside timeline`);
    const impactPhaseIndex = spec.phases.findIndex((entry) => impactFrame >= entry.from && impactFrame <= entry.to);
    assert.ok(impactPhaseIndex >= 2 && spec.phases[impactPhaseIndex]?.type !== 'decay', `${sceneId}: impact cue is not inside a resolved phase`);
  }
}

assert.equal(SPELL_PIXEL_SEQUENCES.meteor.resultPolicy, 'split-amount', 'Meteor must stage its four mechanical impacts');
assert.equal(SPELL_PIXEL_SEQUENCES.firaga.resultPolicy, 'final-impact', 'decorative Firaga flashes must not invent hits');

const choreographySceneIds = new Set(Object.values(SPELL_CHOREOGRAPHIES).map((entry) => entry.id));
for (const sceneId of Object.keys(SPELL_PIXEL_SEQUENCES)) {
  assert.ok(choreographySceneIds.has(sceneId), `${sceneId}: pixel sequence is unreachable from spell art`);
}

for (const required of ['missile', 'flare', 'level-5-death', 'fire', 'blizzard', 'thunder', 'cure', 'haste', 'shiva', 'ifrit', 'bahamut']) {
  assert.ok(SPELL_PIXEL_SEQUENCES[required], `${required}: strict visual audit spell missing`);
}

for (const required of [
  'raise', 'protect', 'holy',
  'steal', 'jump', 'rapid-fire', 'zeninage', 'mix',
  'atomic-ray', 'wave-cannon', 'blaster', 'maelstrom', 'delta-attack',
]) {
  assert.ok(SPELL_PIXEL_SEQUENCES[required], `${required}: dedicated cross-category sequence missing`);
}

const reachabilityCases = [
  [{ sourceId: 'magic_raise' }, 'raise'],
  [{ sourceId: 'ability_steal', visualId: 'ability_steal_steal' }, 'steal'],
  [{ sourceId: 'ability_jump', visualId: 'ability_jump_jump' }, 'jump'],
  [{ sourceId: 'ability_rapid_fire', visualId: 'ability_rapid_fire_rapid-fire' }, 'rapid-fire'],
  [{ sourceId: 'ability_mix', visualId: 'ability_mix_potion' }, 'mix'],
  [{ id: 'atomic-ray' }, 'atomic-ray'],
  [{ id: 'wave-cannon' }, 'wave-cannon'],
  [{ id: 'delta-attack' }, 'delta-attack'],
];
for (const [action, expectedScene] of reachabilityCases) {
  assert.equal(spellChoreographyForAction(action)?.id, expectedScene, `${expectedScene}: runtime action cannot reach its dedicated scene`);
}

assert.equal(SPELL_PIXEL_SEQUENCES['rapid-fire'].resultPolicy, 'split-amount', 'Rapid Fire must stage four mechanical impacts');
assert.equal(SPELL_PIXEL_SEQUENCES['rapid-fire'].impactFrames.length, 4, 'Rapid Fire needs four impact cues');

console.log(JSON.stringify({
  targetVersion: 'SFC-JP-1992',
  pixelSequences: sequences.length,
  verifiedAgainstCapture: sequences.filter(([, spec]) => spec.referenceCaptureId).length,
  provisional: sequences.filter(([, spec]) => !spec.referenceCaptureId).length,
  schemaStatus: 'ok',
  originalVerification: 'not-run-no-reference-captures',
}, null, 2));
