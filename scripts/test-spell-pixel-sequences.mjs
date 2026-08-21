import assert from 'node:assert/strict';
import { SPELL_PIXEL_SEQUENCES } from '../src/ui/SpellCanvasRenderer.js';
import { SPELL_CHOREOGRAPHIES, spellChoreographyForAction } from '../src/ui/SpellArtDirector.js';
import { ff5Magic } from '../src/database/ff5Database.js';

const sequences = Object.entries(SPELL_PIXEL_SEQUENCES);
assert.ok(sequences.length >= 89, 'the transformation/status pixel VFX production set regressed');

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
  'shell', 'reflect', 'gravity', 'graviga', 'return',
  '1000-needles', 'white-wind', 'aqua-breath', 'mighty-guard',
  'goblin-punch', 'magic-hammer', 'aero', 'aera', 'aeroga',
  'flame-thrower', 'time-slip', 'death-claw', 'mind-blast', 'flash',
  'roulette', 'self-destruct', 'vampire', 'question-marks', 'moon-flute',
  'lilliputian-lyric', 'ponds-chorus', 'level-4-graviga', 'doom', 'level-2-old',
  'transfusion', 'level-3-flare', 'off-guard', 'dark-spark',
  'phoenix', 'sylph', 'odin', 'golem', 'carbuncle',
  'quick', 'mute', 'banish', 'drain', 'osmose',
  'mini', 'toad', 'break', 'death', 'arise',
  'blink', 'berserk', 'dispel', 'esuna', 'confuse',
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
  [{ sourceId: 'magic_shell' }, 'shell'],
  [{ sourceId: 'magic_reflect' }, 'reflect'],
  [{ sourceId: 'magic_gravity' }, 'gravity'],
  [{ sourceId: 'magic_graviga' }, 'graviga'],
  [{ sourceId: 'magic_return' }, 'return'],
  [{ sourceId: 'magic_1000_needles' }, '1000-needles'],
  [{ sourceId: 'magic_white_wind' }, 'white-wind'],
  [{ sourceId: 'magic_aqua_breath' }, 'aqua-breath'],
  [{ sourceId: 'magic_mighty_guard' }, 'mighty-guard'],
  [{ sourceId: 'magic_goblin_punch' }, 'goblin-punch'],
  [{ sourceId: 'magic_magic_hammer' }, 'magic-hammer'],
  [{ sourceId: 'magic_aero' }, 'aero'],
  [{ sourceId: 'magic_aera' }, 'aera'],
  [{ sourceId: 'magic_aeroga' }, 'aeroga'],
  [{ sourceId: 'magic_flame_thrower' }, 'flame-thrower'],
  [{ sourceId: 'magic_time_slip' }, 'time-slip'],
  [{ sourceId: 'magic_death_claw' }, 'death-claw'],
  [{ sourceId: 'magic_mind_blast' }, 'mind-blast'],
  [{ sourceId: 'magic_flash' }, 'flash'],
  [{ sourceId: 'magic_roulette' }, 'roulette'],
  [{ sourceId: 'magic_self_destruct' }, 'self-destruct'],
  [{ sourceId: 'magic_vampire' }, 'vampire'],
  [{ sourceId: 'magic_question_marks' }, 'question-marks'],
  [{ sourceId: 'magic_moon_flute' }, 'moon-flute'],
  [{ sourceId: 'magic_lilliputian_lyric' }, 'lilliputian-lyric'],
  [{ sourceId: 'magic_pond_s_chorus' }, 'ponds-chorus'],
  [{ sourceId: 'magic_level_4_graviga' }, 'level-4-graviga'],
  [{ sourceId: 'magic_doom' }, 'doom'],
  [{ sourceId: 'magic_level_2_old' }, 'level-2-old'],
  [{ sourceId: 'magic_transfusion' }, 'transfusion'],
  [{ sourceId: 'magic_level_3_flare' }, 'level-3-flare'],
  [{ sourceId: 'magic_off_guard' }, 'off-guard'],
  [{ sourceId: 'magic_dark_spark' }, 'dark-spark'],
  [{ sourceId: 'magic_phoenix' }, 'phoenix'],
  [{ sourceId: 'magic_sylph' }, 'sylph'],
  [{ sourceId: 'magic_odin' }, 'odin'],
  [{ sourceId: 'magic_golem' }, 'golem'],
  [{ sourceId: 'magic_carbuncle' }, 'carbuncle'],
  [{ sourceId: 'magic_quick' }, 'quick'],
  [{ sourceId: 'magic_mute' }, 'mute'],
  [{ sourceId: 'magic_banish' }, 'banish'],
  [{ sourceId: 'magic_drain' }, 'drain'],
  [{ sourceId: 'magic_osmose' }, 'osmose'],
  [{ sourceId: 'magic_mini' }, 'mini'],
  [{ sourceId: 'magic_toad' }, 'toad'],
  [{ sourceId: 'magic_break' }, 'break'],
  [{ sourceId: 'magic_death' }, 'death'],
  [{ sourceId: 'magic_arise' }, 'arise'],
  [{ sourceId: 'magic_blink' }, 'blink'],
  [{ sourceId: 'magic_berserk' }, 'berserk'],
  [{ sourceId: 'magic_dispel' }, 'dispel'],
  [{ sourceId: 'magic_esuna' }, 'esuna'],
  [{ sourceId: 'magic_confuse' }, 'confuse'],
];
for (const [action, expectedScene] of reachabilityCases) {
  assert.equal(spellChoreographyForAction(action)?.id, expectedScene, `${expectedScene}: runtime action cannot reach its dedicated scene`);
}

const blueMagic = ff5Magic.filter((record) => record.school === 'blue');
assert.equal(blueMagic.length, 30, 'FFV blue magic catalog count changed');
for (const record of blueMagic) {
  const scene = spellChoreographyForAction({ sourceId: record.id });
  assert.ok(scene && SPELL_PIXEL_SEQUENCES[scene.id], `${record.id}: blue magic still falls back to generic CSS`);
}

assert.equal(SPELL_PIXEL_SEQUENCES['rapid-fire'].resultPolicy, 'split-amount', 'Rapid Fire must stage four mechanical impacts');
assert.equal(SPELL_PIXEL_SEQUENCES['rapid-fire'].impactFrames.length, 4, 'Rapid Fire needs four impact cues');

console.log(JSON.stringify({
  targetVersion: 'SFC-JP-1992',
  pixelSequences: sequences.length,
  verifiedAgainstCapture: sequences.filter(([, spec]) => spec.referenceCaptureId).length,
  provisional: sequences.filter(([, spec]) => !spec.referenceCaptureId).length,
  dedicatedBlueMagic: blueMagic.length,
  schemaStatus: 'ok',
  originalVerification: 'not-run-no-reference-captures',
}, null, 2));
