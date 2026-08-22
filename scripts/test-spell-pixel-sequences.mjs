import assert from 'node:assert/strict';
import { SPELL_PIXEL_SEQUENCES } from '../src/ui/SpellCanvasRenderer.js';
import { SPELL_CHOREOGRAPHIES, spellChoreographyForAction } from '../src/ui/SpellArtDirector.js';
import { ff5Magic } from '../src/database/ff5Database.js';

const sequences = Object.entries(SPELL_PIXEL_SEQUENCES);
assert.ok(sequences.length >= 111, 'the complete magic pixel VFX production set regressed');
const assertPendingGolden = (spec, sceneId) => {
  assert.equal(spec.reference.goldenFrames.length, 0, `${sceneId}: reference evidence must not be mislabeled as rendered golden output`);
  assert.equal(spec.reference.goldenStatus, 'pending-render-diff', `${sceneId}: rendered golden comparison status regressed`);
};

for (const [sceneId, spec] of sequences) {
  assert.equal(spec.referenceVersion, 'SFC-JP-1992', `${sceneId}: wrong reference target`);
  assert.equal(spec.fps, 60, `${sceneId}: timeline fps changed`);
  assert.ok(['final-impact', 'split-amount'].includes(spec.resultPolicy), `${sceneId}: invalid result policy`);
  assert.ok(['each-target', 'centroid'].includes(spec.placement), `${sceneId}: invalid placement`);
  assert.ok(spec.reference && Object.hasOwn(spec.reference, 'sourceMediaHash'), `${sceneId}: missing machine-readable reference schema`);
  assert.ok(Object.hasOwn(spec, 'originalEffectHeader'), `${sceneId}: original effect header metadata is not machine-readable`);
  assert.ok(Object.hasOwn(spec, 'sharedOriginalFamily'), `${sceneId}: original shared-family metadata is not machine-readable`);
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
for (const sceneId of ['almagest', 'grand-cross']) {
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  assert.equal(spec.verification, 'reference-locked', `${sceneId}: Neo Exdeath VFX lost its reference lock`);
  assert.equal(spec.renderMode, 'stage-direct', `${sceneId}: full-stage original composition regressed`);
  assert.equal(spec.reference.sourceFps, 30, `${sceneId}: observed source frame rate changed`);
  assert.equal(spec.reference.evidenceFrames.length, 4, `${sceneId}: four observed source frames required`);
  assertPendingGolden(spec, sceneId);
  assert.equal(spec.portraitAdaptation.sourceAspectVerified, true, `${sceneId}: portrait transformation is unverified`);
}
for (const sceneId of ['missile', 'flare', 'level-5-death']) {
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  assert.equal(spec.verification, 'reference-locked', `${sceneId}: priority VFX lost its source lock`);
  assert.equal(spec.renderMode, 'stage-direct', `${sceneId}: observed full-stage choreography regressed`);
  assert.equal(spec.reference.sourceFps, 30, `${sceneId}: observed source frame rate changed`);
  assert.equal(spec.reference.evidenceFrames.length, 4, `${sceneId}: four observed source frames required`);
  assertPendingGolden(spec, sceneId);
  assert.equal(spec.portraitAdaptation.sourceAspectVerified, true, `${sceneId}: portrait transformation is unverified`);
}
const elementalScenes = ['fire', 'fira', 'firaga', 'blizzard', 'blizzara', 'blizzaga', 'thunder', 'thundara', 'thundaga'];
for (const sceneId of elementalScenes) {
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  assert.equal(spec.verification, 'reference-locked', `${sceneId}: SFC elemental reference lock regressed`);
  assert.equal(spec.reference.evidenceFrames.length, 4, `${sceneId}: four observed source frames required`);
  assertPendingGolden(spec, sceneId);
  assert.equal(spec.originalEffectHeader, '20 10 07 00 FF', `${sceneId}: SFC script 07 header regressed`);
  assert.equal(spec.sharedOriginalFamily, 'black-magic-script-07', `${sceneId}: original shared family regressed`);
  assert.deepEqual(
    spec.phases.map((entry) => entry.type),
    ['green-caster-aura', 'script-07-element-formation', 'script-07-palette-cycle', 'damage-latch', 'decay'],
    `${sceneId}: observed script 07 phase order regressed`,
  );
}
const whiteReferenceScenes = {
  cure: { header: '20 11 08 00 13', family: 'white-magic-script-08', phases: ['white-caster-sparkle', 'script-08-yellow-stars', 'script-08-green-cross', 'heal-latch', 'decay'] },
  cura: { header: '20 11 09 00 13', family: 'white-magic-script-09', phases: ['white-caster-sparkle', 'script-09-yellow-star-chain', 'script-09-green-cross', 'heal-latch', 'decay'] },
  curaga: { header: '20 12 0A 2C 13', family: 'white-magic-script-0a', phases: ['white-caster-sparkle', 'script-0a-blue-starbursts', 'script-0a-green-cross', 'heal-latch', 'decay'] },
  raise: { header: '24 20 0D 80 65', family: 'white-magic-script-0d', phases: ['white-caster-sparkle', 'script-0d-winged-halo', 'script-0d-life-star', 'revive-latch', 'decay'] },
  protect: { header: '23 11 0E 00 4F', family: 'white-magic-script-0e', phases: ['white-caster-sparkle', 'script-0e-gold-brackets', 'script-0e-ward-pulse', 'protect-latch', 'decay'] },
  holy: { header: '0D 12 7F A2 15', family: 'white-magic-script-7f', phases: ['white-caster-sparkle', 'script-7f-square-descent', 'script-7f-blue-blackout-orbit', 'script-7f-light-columns', 'holy-latch', 'decay'] },
};
for (const [sceneId, expected] of Object.entries(whiteReferenceScenes)) {
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  assert.equal(spec.verification, 'reference-locked', `${sceneId}: SFC white-magic reference lock regressed`);
  assert.equal(spec.reference.evidenceFrames.length, 4, `${sceneId}: four observed source frames required`);
  assertPendingGolden(spec, sceneId);
  assert.equal(spec.originalEffectHeader, expected.header, `${sceneId}: SFC effect header regressed`);
  assert.equal(spec.sharedOriginalFamily, expected.family, `${sceneId}: original rendering family regressed`);
  assert.deepEqual(spec.phases.map((entry) => entry.type), expected.phases, `${sceneId}: observed phase order regressed`);
}
const timeReferenceScenes = {
  haste: { header: '2A 10 2D 00 6B', family: 'haste-header-2a-10-2d-00-6b', phases: ['target-white-radial-seed', 'silver-shard-fan', 'orange-core-four-satellites', 'haste-latch', 'decay'] },
  gravity: { header: '2E 25 7A 00 2D', family: 'time-magic-script-7a', phases: ['caster-white-radial-seed', 'indigo-orb-launch', 'target-orb-capture', 'white-lightning-latch', 'decay'] },
  meteor: { header: '04 10 7B 91 46', family: 'time-magic-script-7b', phases: ['caster-white-radial-seed', 'red-black-palette-field', 'fireball-descent', 'four-hit-barrage', 'red-black-afterfield', 'decay'] },
  return: { header: '00 00 75 00 08', family: 'time-magic-script-75', phases: ['caster-white-radial-seed', 'target-pixel-expansion', 'stage-block-fracture', 'timeline-reset-blackout', 'decay'] },
};
for (const [sceneId, expected] of Object.entries(timeReferenceScenes)) {
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  assert.equal(spec.verification, 'reference-locked', `${sceneId}: SFC time-magic reference lock regressed`);
  assert.equal(spec.renderMode, 'stage-direct', `${sceneId}: observed full-stage choreography regressed`);
  assert.ok(spec.reference.evidenceFrames.length >= 4, `${sceneId}: four observed source frames required`);
  assertPendingGolden(spec, sceneId);
  assert.equal(spec.originalEffectHeader, expected.header, `${sceneId}: SFC effect header regressed`);
  assert.equal(spec.sharedOriginalFamily, expected.family, `${sceneId}: original rendering family regressed`);
  assert.deepEqual(spec.phases.map((entry) => entry.type), expected.phases, `${sceneId}: observed phase order regressed`);
}
assert.deepEqual(SPELL_PIXEL_SEQUENCES.meteor.impactFrames, [98, 126, 154, 182], 'Meteor must preserve four separately presented hit cues');
const blueReferenceScenes = {
  '1000-needles': {
    header: '53 40 AC 00 24',
    family: 'blue-magic-script-ac',
    phases: ['whole-field-shudder', 'thin-needle-streaks', 'target-pin-flash', 'fixed-damage-latch', 'decay'],
  },
  'white-wind': {
    header: '1A 10 B0 00 56',
    family: 'blue-magic-script-b0',
    phases: ['party-white-pulse', 'short-horizontal-wind', 'ally-white-lift', 'caster-hp-heal-latch', 'decay'],
  },
  'aqua-breath': {
    header: '40 18 A6 80 35',
    family: 'blue-magic-script-a6',
    phases: ['target-water-refraction', 'horizontal-aqua-raster', 'target-pale-afterimage', 'non-elemental-damage-latch', 'decay'],
  },
  'mighty-guard': {
    header: '25 10 11 00 57',
    family: 'blue-magic-script-11',
    phases: ['blue-diamond-manifest', 'eight-diamond-party-orbit', 'diamond-ward-lock', 'protect-shell-float-latch', 'decay'],
  },
  'goblin-punch': {
    header: '76 68 DD 00 29',
    family: 'blue-magic-script-dd',
    phases: ['blue-diamond-cast', 'white-eleven-tooth-ring', 'radial-damage-latch', 'decay'],
  },
  'magic-hammer': {
    header: '4D 3B AF 00 25',
    family: 'blue-magic-script-af',
    phases: ['blue-diamond-cast', 'small-hammer-drop', 'mp-half-result-latch', 'decay'],
  },
  aero: {
    header: '4F 30 AB 00 37',
    family: 'blue-magic-script-ab',
    phases: ['blue-diamond-cast', 'grey-white-small-tornado-group', 'wind-damage-latch', 'decay'],
  },
  aera: {
    header: '53 28 AC 00 24',
    family: 'blue-magic-script-ac',
    phases: ['blue-diamond-cast', 'green-vortex-travel', 'double-ellipse-wind-latch', 'decay'],
  },
  aeroga: {
    header: '51 28 AD 80 27',
    family: 'blue-magic-script-ad',
    phases: ['blue-diamond-cast', 'three-linked-wind-columns', 'column-crossing-damage-latch', 'decay'],
  },
  'flame-thrower': {
    header: '51 28 AE 21 28',
    family: 'blue-magic-script-ae',
    phases: ['blue-diamond-cast', 'nine-flame-sprite-crossing', 'fire-damage-latch', 'decay'],
  },
};
for (const [sceneId, expected] of Object.entries(blueReferenceScenes)) {
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  assert.equal(spec.verification, 'reference-locked', `${sceneId}: SFC blue-magic reference lock regressed`);
  assert.equal(spec.renderMode, 'stage-direct', `${sceneId}: observed stage choreography regressed`);
  assert.equal(spec.reference.evidenceFrames.length, 4, `${sceneId}: four observed source frames required`);
  assertPendingGolden(spec, sceneId);
  assert.equal(spec.originalEffectHeader, expected.header, `${sceneId}: SFC effect header regressed`);
  assert.equal(spec.sharedOriginalFamily, expected.family, `${sceneId}: original rendering family regressed`);
  assert.deepEqual(spec.phases.map((entry) => entry.type), expected.phases, `${sceneId}: observed phase order regressed`);
}
assert.deepEqual(
  SPELL_PIXEL_SEQUENCES.missile.phases.map((entry) => entry.type),
  ['white-orb-launch', 'crescent-echo-flight', 'orange-blue-target-flicker', 'result-latch', 'decay'],
  'Missile must not regress to a physical rocket or targeting reticle',
);
assert.deepEqual(
  SPELL_PIXEL_SEQUENCES.flare.phases.map((entry) => entry.type),
  ['green-caster-aura', 'red-black-orb-field', 'target-gold-ignition', 'white-hot-sphere', 'red-black-afterflash', 'damage-latch', 'decay'],
  'Flare must preserve the observed SFC palette/orb/sphere progression',
);
assert.deepEqual(
  SPELL_PIXEL_SEQUENCES['level-5-death'].phases.map((entry) => entry.type),
  ['green-serrated-sweep', 'target-ring-repeat', 'cream-orange-success-bursts', 'status-latch', 'decay'],
  'Level 5 Death must not regress to the invented red gate and literal five',
);
assert.deepEqual(
  SPELL_PIXEL_SEQUENCES.almagest.phases.slice(1, 6).map((entry) => entry.type),
  ['white-flash-one', 'white-flash-two', 'white-blue-flash', 'blue-flash-one', 'blue-flash-two'],
  'Almagest must preserve the observed white/white/white-blue/blue/blue sequence',
);
assert.ok(SPELL_PIXEL_SEQUENCES['grand-cross'].frameCount >= 510, 'Grand Cross lost its original long-form field duration');
const expectedOriginalHeaders = {
  fire: '20 10 07 00 FF',
  fira: '20 10 07 00 FF',
  firaga: '20 10 07 00 FF',
  blizzard: '20 10 07 00 FF',
  blizzara: '20 10 07 00 FF',
  blizzaga: '20 10 07 00 FF',
  thunder: '20 10 07 00 FF',
  thundara: '20 10 07 00 FF',
  thundaga: '20 10 07 00 FF',
  cure: '20 11 08 00 13',
  cura: '20 11 09 00 13',
  curaga: '20 12 0A 2C 13',
  raise: '24 20 0D 80 65',
  protect: '23 11 0E 00 4F',
  holy: '0D 12 7F A2 15',
  gravity: '2E 25 7A 00 2D',
  return: '00 00 75 00 08',
  meteor: '04 10 7B 91 46',
  libra: '0F 1B 14 00 14',
  poisona: '23 11 0B 00 0F',
  silence: '28 1E 0C 31 7B',
  poison: '21 18 0F 00 0F',
  sleep: '21 19 0F 00 0F',
  bio: '11 15 20 00 10',
  speed: '00 10 A9 00 02',
  regen: '20 12 A4 00 13',
  float: '24 20 43 80 24',
  old: '21 26 0F 00 0F',
  mute: '00 10 A9 00 02',
  slow: '2A 19 2C 8F 39',
  slowga: '2A 19 2C 8F 39',
  haste: '2A 10 2D 00 6B',
  hastega: '2A 10 2D 00 6B',
  remora: '1C 2C 25 99 7C',
  catoblepas: '42 10 A5 00 14',
  chocobo: '76 68 DD 00 29',
  ramuh: '07 11 80 78 44',
  titan: '00 00 82 F8 74',
  syldra: '07 12 9D 5B 78',
  leviathan: '35 2F 37 54 4A',
  teleport: '00 00 79 00 40',
  '1000-needles': '53 40 AC 00 24',
  'white-wind': '1A 10 B0 00 56',
  'aqua-breath': '40 18 A6 80 35',
  'mighty-guard': '25 10 11 00 57',
  'goblin-punch': '76 68 DD 00 29',
  'magic-hammer': '4D 3B AF 00 25',
  aero: '4F 30 AB 00 37',
  aera: '53 28 AC 00 24',
  aeroga: '51 28 AD 80 27',
  'flame-thrower': '51 28 AE 21 28',
};
for (const [sceneId, header] of Object.entries(expectedOriginalHeaders)) {
  assert.equal(SPELL_PIXEL_SEQUENCES[sceneId].originalEffectHeader, header, `${sceneId}: SFC effect header regressed`);
}
assert.equal(SPELL_PIXEL_SEQUENCES.speed.sharedOriginalFamily, SPELL_PIXEL_SEQUENCES.mute.sharedOriginalFamily, 'Speed and Mute must share the original A9 rendering family');
assert.equal(SPELL_PIXEL_SEQUENCES.slow.sharedOriginalFamily, SPELL_PIXEL_SEQUENCES.slowga.sharedOriginalFamily, 'Slow and Slowga must share their original rendering family');
assert.equal(SPELL_PIXEL_SEQUENCES.haste.sharedOriginalFamily, SPELL_PIXEL_SEQUENCES.hastega.sharedOriginalFamily, 'Haste and Hastega must share their original rendering family');
assert.equal(new Set(elementalScenes.map((sceneId) => SPELL_PIXEL_SEQUENCES[sceneId].sharedOriginalFamily)).size, 1, 'nine elemental spells must retain their shared original script 07 family');
assert.equal(SPELL_PIXEL_SEQUENCES.chocobo.originalVariantHeaders?.fat, '00 10 98 C0 2E', 'Fat Chocobo SFC branch header regressed');
for (const sceneId of ['poison', 'sleep', 'old']) {
  assert.equal(SPELL_PIXEL_SEQUENCES[sceneId].sharedOriginalFamily, 'status-script-0f', `${sceneId}: SFC status script 0F family regressed`);
}

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
  'almagest', 'grand-cross',
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
  'libra', 'poisona', 'silence', 'poison', 'sleep',
  'bio', 'speed', 'regen', 'float', 'old',
  'slowga', 'hastega', 'remora', 'catoblepas', 'chocobo',
  'ramuh', 'titan', 'syldra', 'leviathan', 'teleport',
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
  [{ id: 'almagest' }, 'almagest'],
  [{ id: 'grand-cross' }, 'grand-cross'],
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
  [{ sourceId: 'magic_libra' }, 'libra'],
  [{ sourceId: 'magic_poisona' }, 'poisona'],
  [{ sourceId: 'magic_silence' }, 'silence'],
  [{ sourceId: 'magic_poison' }, 'poison'],
  [{ sourceId: 'magic_sleep' }, 'sleep'],
  [{ sourceId: 'magic_bio' }, 'bio'],
  [{ sourceId: 'magic_speed' }, 'speed'],
  [{ sourceId: 'magic_regen' }, 'regen'],
  [{ sourceId: 'magic_float' }, 'float'],
  [{ sourceId: 'magic_old' }, 'old'],
  [{ sourceId: 'magic_slowga' }, 'slowga'],
  [{ sourceId: 'magic_hastega' }, 'hastega'],
  [{ sourceId: 'magic_remora' }, 'remora'],
  [{ sourceId: 'magic_catoblepas' }, 'catoblepas'],
  [{ sourceId: 'magic_chocobo' }, 'chocobo'],
  [{ sourceId: 'magic_ramuh' }, 'ramuh'],
  [{ sourceId: 'magic_titan' }, 'titan'],
  [{ sourceId: 'magic_syldra' }, 'syldra'],
  [{ sourceId: 'magic_leviathan' }, 'leviathan'],
  [{ sourceId: 'magic_teleport' }, 'teleport'],
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
  originalVerification: 'reference-locks-present-golden-diff-pending',
}, null, 2));
