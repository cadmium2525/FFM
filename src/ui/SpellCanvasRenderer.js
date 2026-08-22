/**
 * Fixed-resolution pixel VFX renderer.
 *
 * This is the migration path away from the previous one-size-fits-all CSS
 * grammar.  Each sequence owns its frame count, impact cues and drawing path.
 * The target is the 1992 Japanese SFC release; entries remain explicitly
 * provisional until a captured reference is attached and golden frames pass.
 */
export const { SPELL_PIXEL_SEQUENCES, createSpellCanvas, renderSpellCanvasFrame, playSpellCanvas } = (() => {
const TARGET_VERSION = 'SFC-JP-1992';
const LOGICAL_SIZE = 192;
const STAGE_WIDTH = 320;
const STAGE_HEIGHT = 400;
const scratchByCanvas = new WeakMap();

const phase = (type, from, to) => Object.freeze({ type, from, to });
const referenceRecord = (reference = null) => Object.freeze({
  sourceCitation: reference?.sourceCitation ?? null,
  sourceMediaHash: reference?.sourceMediaHash ?? null,
  captureId: reference?.captureId ?? null,
  region: reference?.region ?? 'JP',
  revision: reference?.revision ?? 'SFC-1992-target-unverified',
  emulatorCore: reference?.emulatorCore ?? null,
  sourceFps: reference?.sourceFps ?? null,
  captureResolution: reference?.captureResolution ?? null,
  crop: reference?.crop ?? null,
  evidenceFrames: Object.freeze([...(reference?.evidenceFrames ?? [])]),
  goldenFrames: Object.freeze([...(reference?.goldenFrames ?? [])]),
  reviewer: reference?.reviewer ?? null,
  reviewedAt: reference?.reviewedAt ?? null,
});
const sequence = (frameCount, impactFrames, phases, options = {}) => Object.freeze({
  referenceVersion: TARGET_VERSION,
  verification: options.verification ?? 'provisional-needs-reference-capture',
  referenceCaptureId: options.referenceCaptureId ?? options.reference?.captureId ?? null,
  reference: referenceRecord(options.reference),
  portraitAdaptation: Object.freeze({
    mode: 'target-anchored-portrait-stage',
    sourceAspectVerified: false,
    ...(options.portraitAdaptation ?? {}),
  }),
  resultPolicy: options.resultPolicy ?? 'final-impact',
  placement: options.placement ?? 'each-target',
  sceneSpace: options.sceneSpace ?? 'target-local',
  renderMode: options.renderMode ?? 'scratch',
  originalEffectHeader: options.originalEffectHeader ?? null,
  sharedOriginalFamily: options.sharedOriginalFamily ?? null,
  originalVariantHeaders: options.originalVariantHeaders ? Object.freeze({ ...options.originalVariantHeaders }) : null,
  fps: 60,
  frameCount,
  impactFrames: Object.freeze(impactFrames),
  phases: Object.freeze(phases),
});

const SPELL_PIXEL_SEQUENCES = Object.freeze({
  fire: sequence(64, [43], [phase('kindle', 0, 18), phase('rise', 19, 42), phase('impact', 43, 52), phase('decay', 53, 63)]),
  fira: sequence(78, [54], [phase('ring', 0, 22), phase('coil', 23, 53), phase('impact', 54, 66), phase('decay', 67, 77)]),
  firaga: sequence(92, [62, 67], [phase('gate', 0, 24), phase('pillar', 25, 61), phase('impact', 62, 75), phase('decay', 76, 91)]),
  blizzard: sequence(66, [44], [phase('mist', 0, 17), phase('needles', 18, 43), phase('impact', 44, 54), phase('decay', 55, 65)]),
  blizzara: sequence(80, [55], [phase('freeze', 0, 21), phase('spire', 22, 54), phase('shatter', 55, 68), phase('decay', 69, 79)]),
  blizzaga: sequence(96, [65, 71], [phase('veil', 0, 24), phase('crown', 25, 64), phase('avalanche', 65, 80), phase('decay', 81, 95)]),
  thunder: sequence(58, [37], [phase('mark', 0, 15), phase('bolt', 16, 36), phase('impact', 37, 47), phase('decay', 48, 57)]),
  thundara: sequence(74, [48, 53], [phase('charge', 0, 18), phase('fork', 19, 47), phase('impact', 48, 62), phase('decay', 63, 73)]),
  thundaga: sequence(88, [57, 61, 65], [phase('cage', 0, 22), phase('column', 23, 56), phase('impact', 57, 72), phase('decay', 73, 87)]),
  cure: sequence(70, [48], [phase('seed', 0, 18), phase('rise', 19, 47), phase('restore', 48, 59), phase('decay', 60, 69)]),
  cura: sequence(82, [56], [phase('halo', 0, 21), phase('petals', 22, 55), phase('restore', 56, 70), phase('decay', 71, 81)]),
  curaga: sequence(96, [64], [phase('sanctuary', 0, 24), phase('column', 25, 63), phase('restore', 64, 81), phase('decay', 82, 95)]),
  raise: sequence(96, [66], [phase('soul-mark', 0, 24), phase('return', 25, 65), phase('revive', 66, 82), phase('decay', 83, 95)]),
  protect: sequence(84, [58], [phase('trace', 0, 20), phase('shield-form', 21, 57), phase('ward-lock', 58, 70), phase('decay', 71, 83)]),
  holy: sequence(118, [78], [phase('stars', 0, 26), phase('judgment', 27, 77), phase('holy-impact', 78, 98), phase('decay', 99, 117)]),
  shell: sequence(88, [60], [phase('prism-seed', 0, 21), phase('shell-weave', 22, 59), phase('prism-lock', 60, 74), phase('decay', 75, 87)]),
  reflect: sequence(96, [68], [phase('mirror-shards', 0, 24), phase('mirror-form', 25, 67), phase('reflect-lock', 68, 82), phase('decay', 83, 95)]),
  haste: sequence(72, [49], [phase('clock', 0, 20), phase('accelerate', 21, 48), phase('latch', 49, 60), phase('decay', 61, 71)], { originalEffectHeader: '2A 10 2D 00 6B', sharedOriginalFamily: 'haste-header-2a-10-2d-00-6b' }),
  slow: sequence(76, [52], [phase('clock', 0, 20), phase('drag', 21, 51), phase('latch', 52, 64), phase('decay', 65, 75)], { originalEffectHeader: '2A 19 2C 8F 39', sharedOriginalFamily: 'slow-header-2a-19-2c-8f-39' }),
  stop: sequence(84, [57], [phase('clock', 0, 23), phase('freeze', 24, 56), phase('latch', 57, 70), phase('decay', 71, 83)]),
  comet: sequence(78, [53], [phase('sky', 0, 18), phase('fall', 19, 52), phase('crater', 53, 66), phase('decay', 67, 77)]),
  meteor: sequence(118, [62, 72, 82, 91], [phase('rift', 0, 27), phase('fall', 28, 61), phase('barrage', 62, 98), phase('decay', 99, 117)], { resultPolicy: 'split-amount', placement: 'centroid', sceneSpace: 'stage' }),
  gravity: sequence(86, [58], [phase('lens', 0, 20), phase('compress', 21, 57), phase('half-crush', 58, 72), phase('decay', 73, 85)]),
  graviga: sequence(104, [70], [phase('black-lens', 0, 25), phase('triple-collapse', 26, 69), phase('three-quarter-crush', 70, 87), phase('decay', 88, 103)]),
  return: sequence(122, [84], [phase('hourglass', 0, 28), phase('rewind', 29, 83), phase('timeline-snap', 84, 101), phase('decay', 102, 121)], { placement: 'centroid', sceneSpace: 'stage' }),
  missile: sequence(86, [59], [phase('scan', 0, 26), phase('lock', 27, 42), phase('launch', 43, 58), phase('quarter', 59, 72), phase('decay', 73, 85)]),
  flare: sequence(108, [72], [phase('dust', 0, 26), phase('collapse', 27, 61), phase('whiteout', 62, 82), phase('decay', 83, 107)]),
  'level-5-death': sequence(112, [76], [phase('level-scan', 0, 29), phase('selection', 30, 52), phase('death-gate', 53, 75), phase('soul-cut', 76, 92), phase('decay', 93, 111)]),
  shiva: sequence(126, [87], [phase('seal', 0, 31), phase('curtain', 32, 67), phase('diamond-dust', 68, 101), phase('decay', 102, 125)], { placement: 'centroid', sceneSpace: 'stage' }),
  ifrit: sequence(128, [88], [phase('seal', 0, 30), phase('hellfire', 31, 70), phase('eruption', 71, 103), phase('decay', 104, 127)], { placement: 'centroid', sceneSpace: 'stage' }),
  bahamut: sequence(148, [104], [phase('seal', 0, 34), phase('charge', 35, 77), phase('mega-flare', 78, 119), phase('decay', 120, 147)], { placement: 'centroid', sceneSpace: 'stage' }),

  steal: sequence(70, [45], [phase('vanish', 0, 16), phase('reach', 17, 44), phase('snatch', 45, 57), phase('decay', 58, 69)]),
  jump: sequence(92, [61], [phase('launch', 0, 20), phase('airborne', 21, 60), phase('lance-impact', 61, 75), phase('decay', 76, 91)]),
  'rapid-fire': sequence(100, [48, 58, 68, 78], [phase('aim', 0, 22), phase('rush', 23, 47), phase('fourfold', 48, 84), phase('decay', 85, 99)], { resultPolicy: 'split-amount' }),
  zeninage: sequence(92, [64], [phase('draw-coins', 0, 20), phase('coin-rain', 21, 63), phase('gil-impact', 64, 78), phase('decay', 79, 91)]),
  mix: sequence(90, [62], [phase('reagents', 0, 21), phase('combine', 22, 61), phase('compound', 62, 76), phase('decay', 77, 89)]),

  'atomic-ray': sequence(96, [65], [phase('reactor', 0, 21), phase('ray-grid', 22, 64), phase('atomic-impact', 65, 80), phase('decay', 81, 95)]),
  'wave-cannon': sequence(112, [76], [phase('charge-lines', 0, 27), phase('compression', 28, 75), phase('wave-release', 76, 94), phase('decay', 95, 111)], { placement: 'centroid', sceneSpace: 'stage' }),
  blaster: sequence(88, [59], [phase('target-split', 0, 22), phase('binary-lock', 23, 58), phase('blaster-impact', 59, 73), phase('decay', 74, 87)]),
  maelstrom: sequence(108, [72], [phase('wind-ring', 0, 24), phase('vortex', 25, 71), phase('critical-collapse', 72, 90), phase('decay', 91, 107)], { placement: 'centroid', sceneSpace: 'stage' }),
  'delta-attack': sequence(100, [68], [phase('three-points', 0, 22), phase('delta-bind', 23, 67), phase('petrify-impact', 68, 83), phase('decay', 84, 99)]),
  almagest: sequence(96, [74], [
    phase('part-tremor', 0, 11),
    phase('white-flash-one', 12, 23),
    phase('white-flash-two', 24, 35),
    phase('white-blue-flash', 36, 49),
    phase('blue-flash-one', 50, 61),
    phase('blue-flash-two', 62, 73),
    phase('damage-latch', 74, 83),
    phase('decay', 84, 95),
  ], {
    placement: 'centroid',
    sceneSpace: 'stage',
    renderMode: 'stage-direct',
    verification: 'reference-locked',
    referenceCaptureId: 'yt-XPuj38ABwMQ-almagest-373.074-375.074',
    reference: {
      sourceCitation: 'https://www.youtube.com/watch?v=XPuj38ABwMQ&t=372s | https://yarikomiff.sakura.ne.jp/playdiary.cgi/playdiary.cgi?read=ff5_lowlvgba_29',
      sourceMediaHash: 'sha256:evidence-frame-set:cf53bdb08635768073fe06f4e80c49550c42e79f40b0ad0c19d46a7bec5827d2',
      captureId: 'yt-XPuj38ABwMQ-almagest-373.074-375.074',
      region: 'JP',
      revision: 'SFC-JP-1992; public gameplay upload',
      emulatorCore: 'source-upload-provenance-not-disclosed',
      sourceFps: 30,
      captureResolution: '640x480',
      crop: 'full 4:3 gameplay frame',
      evidenceFrames: [
        { role: 'telegraph', seconds: 373.073985, sha256: 'e21ea9c54b3dba150dcdec64f205ea5850c44d15bcab1db0392d70b0d98fda04' },
        { role: 'white-flash', seconds: 373.740645, sha256: '18d4b6806744b03c2143cd4fc836e96ca69b9e61ecfb6f0f6830c964dbe052bb' },
        { role: 'white-blue-flash', seconds: 374.40731, sha256: 'ad2392642df55d3c9aa5ddf51c63f4f095f9b36784c19d678d6f9f78bbedbfd6' },
        { role: 'damage-latch', seconds: 375.073976, sha256: '712968b21150ee25e1dfb25eeb4fdeb49968a0cfccd82c1fcf1475ac434d7603' },
      ],
      goldenFrames: [
        { role: 'telegraph', seconds: 373.073985, sha256: 'e21ea9c54b3dba150dcdec64f205ea5850c44d15bcab1db0392d70b0d98fda04' },
        { role: 'white-flash', seconds: 373.740645, sha256: '18d4b6806744b03c2143cd4fc836e96ca69b9e61ecfb6f0f6830c964dbe052bb' },
        { role: 'white-blue-flash', seconds: 374.40731, sha256: 'ad2392642df55d3c9aa5ddf51c63f4f095f9b36784c19d678d6f9f78bbedbfd6' },
        { role: 'damage-latch', seconds: 375.073976, sha256: '712968b21150ee25e1dfb25eeb4fdeb49968a0cfccd82c1fcf1475ac434d7603' },
      ],
      reviewer: 'Codex browser frame audit',
      reviewedAt: '2026-08-22',
    },
    portraitAdaptation: { mode: 'full-stage-4x3-to-portrait', sourceAspectVerified: true },
  }),
  'grand-cross': sequence(516, [455], [
    phase('part-color-telegraph', 0, 38),
    phase('red-blue-fracture', 39, 82),
    phase('white-silhouette-flash', 83, 119),
    phase('orb-depth-field', 120, 443),
    phase('status-latch', 444, 467),
    phase('decay', 468, 515),
  ], {
    placement: 'centroid',
    sceneSpace: 'stage',
    renderMode: 'stage-direct',
    verification: 'reference-locked',
    referenceCaptureId: 'yt-XPuj38ABwMQ-grand-cross-477.074-485.074',
    reference: {
      sourceCitation: 'https://www.youtube.com/watch?v=XPuj38ABwMQ&t=476s | https://yarikomiff.sakura.ne.jp/playdiary.cgi/playdiary.cgi?read=ff5_lowlvgba_29',
      sourceMediaHash: 'sha256:evidence-frame-set:d8d73f681a4a68a0b33d8c59c1778b6d16156e6d60df4cc2eabc066ff81766dd',
      captureId: 'yt-XPuj38ABwMQ-grand-cross-477.074-485.074',
      region: 'JP',
      revision: 'SFC-JP-1992; public gameplay upload',
      emulatorCore: 'source-upload-provenance-not-disclosed',
      sourceFps: 30,
      captureResolution: '640x480',
      crop: 'full 4:3 gameplay frame',
      evidenceFrames: [
        { role: 'cast', seconds: 477.073973, sha256: '478cc8d6909d081729a60255c57f0141ba50ab17558eb210a7150b3daeb85de0' },
        { role: 'fracture', seconds: 479.073965, sha256: '7834931c4467ca28ae94d96334fa0388a2d2b23ded8841e991861df89fed1f77' },
        { role: 'orb-depth-field', seconds: 482.407281, sha256: '9ab209385be621e77282a8d090922c96edfce32ded4a02fbe7a47c551d162b9c' },
        { role: 'status-latch', seconds: 485.073941, sha256: '515e0b37c4197fa2fad72f65f0d317aa22583a403ca3fcb5f37d14dee0e7bdfe' },
      ],
      goldenFrames: [
        { role: 'cast', seconds: 477.073973, sha256: '478cc8d6909d081729a60255c57f0141ba50ab17558eb210a7150b3daeb85de0' },
        { role: 'fracture', seconds: 479.073965, sha256: '7834931c4467ca28ae94d96334fa0388a2d2b23ded8841e991861df89fed1f77' },
        { role: 'orb-depth-field', seconds: 482.407281, sha256: '9ab209385be621e77282a8d090922c96edfce32ded4a02fbe7a47c551d162b9c' },
        { role: 'status-latch', seconds: 485.073941, sha256: '515e0b37c4197fa2fad72f65f0d317aa22583a403ca3fcb5f37d14dee0e7bdfe' },
      ],
      reviewer: 'Codex browser frame audit',
      reviewedAt: '2026-08-22',
    },
    portraitAdaptation: { mode: 'full-stage-4x3-to-portrait', sourceAspectVerified: true },
  }),

  '1000-needles': sequence(96, [66], [phase('needle-count', 0, 22), phase('needle-fan', 23, 65), phase('thousand-impact', 66, 80), phase('decay', 81, 95)]),
  'white-wind': sequence(104, [72], [phase('feather-seed', 0, 24), phase('party-wind', 25, 71), phase('white-heal', 72, 87), phase('decay', 88, 103)], { placement: 'centroid', sceneSpace: 'party-field' }),
  'aqua-breath': sequence(116, [78], [phase('water-orb', 0, 25), phase('breath-surge', 26, 77), phase('tidal-impact', 78, 96), phase('decay', 97, 115)], { placement: 'centroid', sceneSpace: 'stage' }),
  'mighty-guard': sequence(118, [80], [phase('triple-seal', 0, 27), phase('field-assemble', 28, 79), phase('mighty-lock', 80, 98), phase('decay', 99, 117)], { placement: 'centroid', sceneSpace: 'party-field' }),
  'goblin-punch': sequence(78, [52], [phase('knuckle-mark', 0, 17), phase('fist-rush', 18, 51), phase('level-impact', 52, 65), phase('decay', 66, 77)]),
  'magic-hammer': sequence(94, [64], [phase('mana-nails', 0, 22), phase('hammer-swing', 23, 63), phase('mp-shatter', 64, 79), phase('decay', 80, 93)]),
  aero: sequence(72, [48], [phase('wind-seed', 0, 15), phase('crescent-flight', 16, 47), phase('air-cut', 48, 60), phase('decay', 61, 71)]),
  aera: sequence(88, [58], [phase('wind-tunnel', 0, 21), phase('cross-crescents', 22, 57), phase('cross-impact', 58, 73), phase('decay', 74, 87)]),
  aeroga: sequence(108, [72], [phase('pressure-eye', 0, 24), phase('tornado-column', 25, 71), phase('vacuum-impact', 72, 90), phase('decay', 91, 107)]),
  'flame-thrower': sequence(96, [64], [phase('ignition', 0, 19), phase('jet-sweep', 20, 63), phase('burn-line', 64, 80), phase('decay', 81, 95)]),
  'time-slip': sequence(108, [73], [phase('dream-clock', 0, 23), phase('hourglass-slip', 24, 72), phase('sleep-age-lock', 73, 90), phase('decay', 91, 107)]),
  'death-claw': sequence(98, [66], [phase('shadow-palm', 0, 21), phase('claw-rake', 22, 65), phase('critical-grip', 66, 82), phase('decay', 83, 97)]),
  'mind-blast': sequence(102, [68], [phase('mind-eye', 0, 23), phase('neural-focus', 24, 67), phase('psyche-break', 68, 85), phase('decay', 86, 101)]),
  flash: sequence(84, [56], [phase('aperture', 0, 19), phase('light-charge', 20, 55), phase('blind-flash', 56, 70), phase('decay', 71, 83)], { placement: 'centroid', sceneSpace: 'stage' }),
  roulette: sequence(116, [80], [phase('unit-scan', 0, 31), phase('roulette-spin', 32, 79), phase('random-cut', 80, 96), phase('decay', 97, 115)], { placement: 'centroid', sceneSpace: 'stage' }),
  'self-destruct': sequence(110, [74], [phase('caster-core', 0, 24), phase('critical-crack', 25, 73), phase('sacrifice-burst', 74, 92), phase('decay', 93, 109)], { placement: 'centroid', sceneSpace: 'caster-local' }),
  vampire: sequence(106, [70], [phase('fang-mark', 0, 23), phase('blood-draw', 24, 69), phase('life-return', 70, 90), phase('decay', 91, 105)], { placement: 'centroid', sceneSpace: 'stage' }),
  'question-marks': sequence(88, [59], [phase('broken-glyph', 0, 20), phase('unknown-stutter', 21, 58), phase('missing-hp-hit', 59, 73), phase('decay', 74, 87)]),
  'moon-flute': sequence(110, [74], [phase('moon-rise', 0, 25), phase('lunar-song', 26, 73), phase('berserk-crescendo', 74, 92), phase('decay', 93, 109)], { placement: 'centroid', sceneSpace: 'party-field' }),
  'lilliputian-lyric': sequence(96, [65], [phase('lyric-staff', 0, 21), phase('shrink-song', 22, 64), phase('tiny-lock', 65, 80), phase('decay', 81, 95)]),
  'ponds-chorus': sequence(98, [66], [phase('pond-ripple', 0, 21), phase('frog-song', 22, 65), phase('toad-lock', 66, 82), phase('decay', 83, 97)]),
  'level-4-graviga': sequence(112, [76], [phase('level-four-scan', 0, 27), phase('fourfold-collapse', 28, 75), phase('level-four-impact', 76, 94), phase('decay', 95, 111)], { placement: 'centroid', sceneSpace: 'party-field' }),
  doom: sequence(108, [73], [phase('doom-clock', 0, 26), phase('countdown', 27, 72), phase('death-sentence', 73, 90), phase('decay', 91, 107)]),
  'level-2-old': sequence(110, [75], [phase('level-two-scan', 0, 27), phase('double-age', 28, 74), phase('level-two-impact', 75, 92), phase('decay', 93, 109)], { placement: 'centroid', sceneSpace: 'party-field' }),
  transfusion: sequence(122, [82], [phase('soul-link', 0, 27), phase('life-mana-transfer', 28, 81), phase('ally-restore', 82, 101), phase('caster-fade', 102, 121)], { placement: 'centroid', sceneSpace: 'stage' }),
  'level-3-flare': sequence(124, [84], [phase('level-three-scan', 0, 29), phase('triple-star-core', 30, 83), phase('threefold-nova', 84, 104), phase('decay', 105, 123)], { placement: 'centroid', sceneSpace: 'party-field' }),
  'off-guard': sequence(96, [65], [phase('defense-grid', 0, 22), phase('lattice-fracture', 23, 64), phase('armor-break', 65, 80), phase('decay', 81, 95)]),
  'dark-spark': sequence(102, [69], [phase('level-lens', 0, 23), phase('dark-bisection', 24, 68), phase('level-halve', 69, 85), phase('decay', 86, 101)]),
  phoenix: sequence(148, [92], [phase('rebirth-crystal', 0, 33), phase('flame-wings', 34, 91), phase('enemy-flare-ally-rise', 92, 121), phase('decay', 122, 147)], { placement: 'centroid', sceneSpace: 'stage' }),
  sylph: sequence(118, [78], [phase('wind-soul-seal', 0, 27), phase('enemy-life-draw', 28, 77), phase('ally-feather-return', 78, 98), phase('decay', 99, 117)], { placement: 'centroid', sceneSpace: 'stage' }),
  odin: sequence(146, [96], [phase('war-crystal-seal', 0, 32), phase('outcome-judgment', 33, 95), phase('blade-or-spear', 96, 120), phase('decay', 121, 145)], { placement: 'centroid', sceneSpace: 'stage' }),
  golem: sequence(132, [88], [phase('earth-soul-seal', 0, 29), phase('slab-assemble', 30, 87), phase('party-barrier-lock', 88, 108), phase('decay', 109, 131)], { placement: 'centroid', sceneSpace: 'party-field' }),
  carbuncle: sequence(134, [90], [phase('jewel-soul-seal', 0, 30), phase('prism-mirrors', 31, 89), phase('party-reflect-lock', 90, 111), phase('decay', 112, 133)], { placement: 'centroid', sceneSpace: 'party-field' }),
  quick: sequence(120, [81], [phase('double-clock', 0, 27), phase('time-split', 28, 80), phase('two-actions-lock', 81, 100), phase('decay', 101, 119)]),
  mute: sequence(108, [72], [phase('shared-header-seed', 0, 24), phase('shared-header-motion', 25, 71), phase('shared-header-lock', 72, 90), phase('decay', 91, 107)], { placement: 'centroid', sceneSpace: 'stage', originalEffectHeader: '00 10 A9 00 02', sharedOriginalFamily: 'sfc-header-00-10-a9-00-02' }),
  banish: sequence(112, [76], [phase('void-iris', 0, 25), phase('space-fold', 26, 75), phase('target-erase', 76, 94), phase('decay', 95, 111)]),
  drain: sequence(108, [72], [phase('life-mark', 0, 24), phase('hp-draw', 25, 71), phase('red-return', 72, 91), phase('decay', 92, 107)], { placement: 'centroid', sceneSpace: 'stage' }),
  osmose: sequence(112, [75], [phase('mana-mark', 0, 25), phase('mp-unweave', 26, 74), phase('double-blue-return', 75, 94), phase('decay', 95, 111)], { placement: 'centroid', sceneSpace: 'stage' }),
  mini: sequence(94, [64], [phase('scale-frame', 0, 21), phase('silhouette-shrink', 22, 63), phase('tiny-lock', 64, 79), phase('decay', 80, 93)]),
  toad: sequence(104, [70], [phase('script-0f-seed', 0, 24), phase('script-0f-motion', 25, 69), phase('status-lock', 70, 87), phase('decay', 88, 103)], { sharedOriginalFamily: 'status-script-0f' }),
  break: sequence(112, [75], [phase('stone-lattice', 0, 25), phase('silhouette-facet', 26, 74), phase('petrify-lock', 75, 94), phase('decay', 95, 111)]),
  death: sequence(120, [81], [phase('death-gate', 0, 28), phase('soul-separate', 29, 80), phase('gate-sever', 81, 100), phase('decay', 101, 119)]),
  arise: sequence(132, [89], [phase('soul-fragments', 0, 30), phase('spirit-reassemble', 31, 88), phase('full-revival', 89, 110), phase('decay', 111, 131)]),
  blink: sequence(102, [69], [phase('mirror-trace', 0, 23), phase('afterimage-split', 24, 68), phase('double-decoy-lock', 69, 85), phase('decay', 86, 101)]),
  berserk: sequence(102, [69], [phase('rage-heartbeat', 0, 23), phase('aura-overrun', 24, 68), phase('berserk-lock', 69, 85), phase('decay', 86, 101)]),
  dispel: sequence(110, [74], [phase('buff-orbits', 0, 25), phase('seal-unweave', 26, 73), phase('layer-strip', 74, 92), phase('decay', 93, 109)]),
  esuna: sequence(116, [78], [phase('status-knots', 0, 27), phase('prism-diagnosis', 28, 77), phase('multi-cleanse', 78, 97), phase('decay', 98, 115)]),
  confuse: sequence(100, [67], [phase('compass-mark', 0, 22), phase('silhouette-orbit', 23, 66), phase('direction-scramble', 67, 83), phase('decay', 84, 99)]),
  libra: sequence(108, [73], [phase('scan-frame', 0, 25), phase('data-sweep', 26, 72), phase('analysis-resolve', 73, 90), phase('decay', 91, 107)], { originalEffectHeader: '0F 1B 14 00 14' }),
  poisona: sequence(102, [69], [phase('toxin-locate', 0, 23), phase('single-poison-extract', 24, 68), phase('antidote-seal', 69, 85), phase('decay', 86, 101)], { originalEffectHeader: '23 11 0B 00 0F' }),
  silence: sequence(98, [66], [phase('voice-source', 0, 22), phase('sound-contract', 23, 65), phase('single-mute-lock', 66, 82), phase('decay', 83, 97)], { originalEffectHeader: '28 1E 0C 31 7B' }),
  poison: sequence(104, [70], [phase('script-0f-seed', 0, 24), phase('script-0f-motion', 25, 69), phase('status-lock', 70, 87), phase('decay', 88, 103)], { originalEffectHeader: '21 18 0F 00 0F', sharedOriginalFamily: 'status-script-0f' }),
  sleep: sequence(104, [70], [phase('script-0f-seed', 0, 24), phase('script-0f-motion', 25, 69), phase('status-lock', 70, 87), phase('decay', 88, 103)], { originalEffectHeader: '21 19 0F 00 0F', sharedOriginalFamily: 'status-script-0f' }),
  bio: sequence(116, [78], [phase('cell-lattice', 0, 27), phase('helix-collapse', 28, 77), phase('sap-breakdown', 78, 97), phase('decay', 98, 115)], { originalEffectHeader: '11 15 20 00 10' }),
  speed: sequence(108, [72], [phase('shared-header-seed', 0, 24), phase('shared-header-motion', 25, 71), phase('shared-header-lock', 72, 90), phase('decay', 91, 107)], { originalEffectHeader: '00 10 A9 00 02', sharedOriginalFamily: 'sfc-header-00-10-a9-00-02' }),
  regen: sequence(114, [76], [phase('pulse-seed', 0, 25), phase('heartbeat-cycle', 26, 75), phase('renewal-lock', 76, 95), phase('decay', 96, 113)], { originalEffectHeader: '20 12 A4 00 13' }),
  float: sequence(108, [73], [phase('ground-mark', 0, 24), phase('target-liftoff', 25, 72), phase('air-cushion-lock', 73, 90), phase('decay', 91, 107)], { originalEffectHeader: '24 20 43 80 24' }),
  old: sequence(104, [70], [phase('script-0f-seed', 0, 24), phase('script-0f-motion', 25, 69), phase('status-lock', 70, 87), phase('decay', 88, 103)], { originalEffectHeader: '21 26 0F 00 0F', sharedOriginalFamily: 'status-script-0f' }),
  slowga: sequence(76, [52], [phase('clock', 0, 20), phase('drag', 21, 51), phase('latch', 52, 64), phase('decay', 65, 75)], { originalEffectHeader: '2A 19 2C 8F 39', sharedOriginalFamily: 'slow-header-2a-19-2c-8f-39' }),
  hastega: sequence(72, [49], [phase('clock', 0, 20), phase('accelerate', 21, 48), phase('latch', 49, 60), phase('decay', 61, 71)], { originalEffectHeader: '2A 10 2D 00 6B', sharedOriginalFamily: 'haste-header-2a-10-2d-00-6b' }),
  remora: sequence(106, [71], [phase('chain-soul-crystal', 0, 24), phase('hook-converge', 25, 70), phase('chain-lock', 71, 89), phase('decay', 90, 105)], { originalEffectHeader: '1C 2C 25 99 7C' }),
  catoblepas: sequence(118, [80], [phase('gaze-soul-crystal', 0, 27), phase('facet-scan', 28, 79), phase('petrify-gaze-lock', 80, 99), phase('decay', 100, 117)], { originalEffectHeader: '42 10 A5 00 14' }),
  chocobo: sequence(116, [78], [phase('feather-soul-crystal', 0, 26), phase('diagonal-charge', 27, 77), phase('comet-stamp', 78, 97), phase('decay', 98, 115)], { originalEffectHeader: '76 68 DD 00 29', originalVariantHeaders: { fat: '00 10 98 C0 2E' } }),
  ramuh: sequence(134, [90], [phase('thunder-soul-crystal', 0, 30), phase('staff-judgment', 31, 89), phase('sky-arc-impact', 90, 111), phase('decay', 112, 133)], { placement: 'centroid', sceneSpace: 'stage', originalEffectHeader: '07 11 80 78 44' }),
  titan: sequence(138, [92], [phase('earth-soul-crystal', 0, 31), phase('fault-pressure', 32, 91), phase('continental-break', 92, 114), phase('decay', 115, 137)], { placement: 'centroid', sceneSpace: 'stage', originalEffectHeader: '00 00 82 F8 74' }),
  syldra: sequence(136, [91], [phase('wind-soul-crystal', 0, 30), phase('serpentine-current', 31, 90), phase('wind-tide-impact', 91, 113), phase('decay', 114, 135)], { placement: 'centroid', sceneSpace: 'stage', originalEffectHeader: '07 12 9D 5B 78' }),
  leviathan: sequence(144, [96], [phase('abyss-soul-crystal', 0, 32), phase('tidal-wall-rise', 33, 95), phase('tsunami-impact', 96, 119), phase('decay', 120, 143)], { placement: 'centroid', sceneSpace: 'stage', originalEffectHeader: '35 2F 37 54 4A' }),
  teleport: sequence(116, [78], [phase('space-aperture', 0, 27), phase('target-fold', 28, 77), phase('iris-translation', 78, 97), phase('decay', 98, 115)], { placement: 'centroid', sceneSpace: 'stage', originalEffectHeader: '00 00 79 00 40' }),
});

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const easeOut = (value) => 1 - ((1 - clamp(value)) ** 3);
const easeInOut = (value) => {
  const t = clamp(value);
  return t < .5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
};
const segment = (frame, from, to) => clamp((frame - from) / Math.max(1, to - from));
const fade = (frame, fadeInEnd, fadeOutStart, end) => Math.min(segment(frame, 0, fadeInEnd), 1 - segment(frame, fadeOutStart, end));
const snap = (value) => Math.round(value) + .5;

function setup(ctx, width = LOGICAL_SIZE, height = LOGICAL_SIZE) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'square';
}

function line(ctx, x1, y1, x2, y2, color, width = 2, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(snap(x1), snap(y1));
  ctx.lineTo(snap(x2), snap(y2));
  ctx.stroke();
  ctx.restore();
}

function poly(ctx, points, fill, alpha = 1, stroke = null, width = 1) {
  if (!points.length) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
  points.slice(1).forEach(([x, y]) => ctx.lineTo(Math.round(x), Math.round(y)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  ctx.restore();
}

function ring(ctx, x, y, radius, color, width = 2, alpha = 1, start = 0, end = Math.PI * 2) {
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), Math.max(.5, Math.round(radius)), start, end);
  ctx.stroke();
  ctx.restore();
}

function diamond(ctx, x, y, size, fill, alpha = 1, stroke = null) {
  poly(ctx, [[x, y - size], [x + size, y], [x, y + size], [x - size, y]], fill, alpha, stroke, 2);
}

function burst(ctx, x, y, radius, rays, color, alpha = 1, offset = 0) {
  for (let i = 0; i < rays; i += 1) {
    const angle = offset + (Math.PI * 2 * i) / rays;
    const inner = radius * .28;
    line(ctx, x + Math.cos(angle) * inner, y + Math.sin(angle) * inner, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, color, i % 2 ? 2 : 3, alpha);
  }
}

function motes(ctx, count, frame, color, mode = 'orbit', radius = 72, alpha = 1) {
  for (let i = 0; i < count; i += 1) {
    const seed = (i * 47 + 19) % 101;
    const angle = i * 2.399 + frame * .035 * (i % 2 ? 1 : -1);
    const progress = (frame * .017 + seed / 101) % 1;
    let x = 96 + Math.cos(angle) * radius * (.4 + progress * .6);
    let y = 96 + Math.sin(angle) * radius * (.4 + progress * .6);
    if (mode === 'rise') { x = 46 + ((seed * 13) % 100); y = 170 - progress * 145; }
    if (mode === 'fall') { x = 35 + ((seed * 17) % 125); y = 8 + progress * 160; }
    if (mode === 'converge') { x = 96 + Math.cos(angle) * radius * (1 - progress); y = 96 + Math.sin(angle) * radius * (1 - progress); }
    ctx.globalAlpha = clamp(alpha * (1 - progress * .55));
    ctx.fillStyle = color;
    const size = i % 3 === 0 ? 3 : 2;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }
  ctx.globalAlpha = 1;
}

function flame(ctx, x, baseY, height, width, color, alpha = 1, lean = 0) {
  poly(ctx, [[x, baseY - height], [x + width * .24 + lean, baseY - height * .55], [x + width * .5, baseY - height * .15], [x + width * .16, baseY], [x - width * .45, baseY - height * .13], [x - width * .28 + lean, baseY - height * .58]], color, alpha);
}

function iceShard(ctx, x, y, height, width, color, alpha = 1, angle = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  poly(ctx, [[0, -height], [width, -height * .16], [0, height], [-width, -height * .16]], color, alpha, '#efffff', 1);
  ctx.restore();
}

function lightning(ctx, x, top, bottom, branches, color, alpha = 1, width = 3) {
  const points = [[x, top]];
  const steps = 7;
  for (let i = 1; i <= steps; i += 1) points.push([x + (i % 2 ? -1 : 1) * (7 + branches * 2), top + ((bottom - top) * i) / steps]);
  for (let i = 0; i < points.length - 1; i += 1) line(ctx, ...points[i], ...points[i + 1], color, width, alpha);
  for (let i = 1; i <= branches; i += 1) {
    const at = points[2 + i];
    line(ctx, at[0], at[1], at[0] + (i % 2 ? -1 : 1) * (18 + i * 4), at[1] + 14, color, 2, alpha * .85);
  }
}

function clock(ctx, frame, mode, alpha) {
  ring(ctx, 96, 96, 49, mode === 'stop' ? '#d9f8ff' : '#ffe89b', 3, alpha);
  ring(ctx, 96, 96, 42, '#7dcfff', 1, alpha * .8);
  for (let i = 0; i < 12; i += 1) {
    const a = -Math.PI / 2 + i * Math.PI / 6;
    line(ctx, 96 + Math.cos(a) * 35, 96 + Math.sin(a) * 35, 96 + Math.cos(a) * 42, 96 + Math.sin(a) * 42, '#f7ffff', i % 3 ? 1 : 2, alpha);
  }
  const speed = mode === 'haste' ? .18 : mode === 'slow' ? .018 : 0;
  const a = -Math.PI / 2 + frame * speed;
  line(ctx, 96, 96, 96 + Math.cos(a) * 31, 96 + Math.sin(a) * 31, '#fff', 3, alpha);
  line(ctx, 96, 96, 96 + Math.cos(a * .23 - 1.2) * 21, 96 + Math.sin(a * .23 - 1.2) * 21, '#7dcfff', 2, alpha);
  diamond(ctx, 96, 96, 4, '#fff', alpha);
}

function drawFire(ctx, frame, tier) {
  const total = tier === 1 ? 64 : tier === 2 ? 78 : 92;
  const alpha = fade(frame, 8, total - 14, total);
  const rise = easeOut(segment(frame, 10, total * .66));
  if (tier === 1) {
    motes(ctx, 9, frame, '#ffb44b', 'rise', 60, alpha);
    for (let i = 0; i < 4; i += 1) flame(ctx, 72 + i * 16, 145 - rise * 18, 28 + (i % 2) * 13, 15, i % 2 ? '#ffcc62' : '#f05a2a', alpha, (i - 1.5) * 2);
    if (frame > 42) burst(ctx, 96, 112, 18 + segment(frame, 42, 58) * 38, 8, '#ffe7a0', alpha);
  } else if (tier === 2) {
    const coil = easeInOut(segment(frame, 8, 54));
    ring(ctx, 96, 112, 14 + coil * 48, '#ff7b32', 4, alpha, -.4, Math.PI * 1.65);
    ring(ctx, 96, 112, 8 + coil * 35, '#ffd16a', 3, alpha, Math.PI, Math.PI * 2.8);
    for (let i = 0; i < 6; i += 1) {
      const a = i * Math.PI / 3 + frame * .08;
      flame(ctx, 96 + Math.cos(a) * (18 + coil * 33), 112 + Math.sin(a) * (12 + coil * 28), 25, 12, i % 2 ? '#ffcf66' : '#e53b25', alpha, Math.cos(a) * 5);
    }
    if (frame > 53) burst(ctx, 96, 112, 25 + segment(frame, 53, 70) * 54, 12, '#fff0a8', alpha, Math.PI / 4);
  } else {
    const gate = easeOut(segment(frame, 0, 25));
    ring(ctx, 96, 145, 18 + gate * 57, '#ff552b', 5, alpha);
    ring(ctx, 96, 145, 10 + gate * 42, '#ffd96d', 2, alpha);
    const pillar = easeOut(segment(frame, 22, 62));
    for (let i = 0; i < 7; i += 1) flame(ctx, 55 + i * 14, 150, (55 + (i % 3) * 18) * pillar, 17, i % 2 ? '#ff8c34' : '#ffd35f', alpha, (i - 3) * 2);
    if (frame > 61) { burst(ctx, 96, 103, 28 + segment(frame, 61, 78) * 68, 16, '#fff0a0', alpha, frame * .03); motes(ctx, 16, frame, '#ff5b2c', 'rise', 74, alpha); }
  }
}

function drawIce(ctx, frame, tier) {
  const total = tier === 1 ? 66 : tier === 2 ? 80 : 96;
  const alpha = fade(frame, 8, total - 15, total);
  if (tier === 1) {
    motes(ctx, 10, frame, '#d8fbff', 'fall', 70, alpha * .85);
    const drop = easeOut(segment(frame, 14, 44));
    for (let i = 0; i < 5; i += 1) iceShard(ctx, 57 + i * 20, 28 + drop * (82 + (i % 2) * 16), 18 + (i % 3) * 4, 7, '#7edcff', alpha, (i - 2) * .12);
    if (frame > 43) burst(ctx, 96, 126, 18 + segment(frame, 43, 58) * 48, 10, '#edffff', alpha, Math.PI / 8);
  } else if (tier === 2) {
    const freeze = easeOut(segment(frame, 0, 22));
    ring(ctx, 96, 143, 12 + freeze * 54, '#8be7ff', 3, alpha);
    for (let i = 0; i < 6; i += 1) {
      const growth = easeOut(segment(frame, 18 + i * 2, 54 + i));
      iceShard(ctx, 52 + i * 18, 142 - growth * (28 + (i % 2) * 12), 18 + growth * 32, 9, i % 2 ? '#bff6ff' : '#61b9ee', alpha, (i - 2.5) * .08);
    }
    if (frame > 54) motes(ctx, 18, frame, '#efffff', 'orbit', 76, alpha);
  } else {
    motes(ctx, 18, frame, '#b7f5ff', 'fall', 84, alpha);
    const crown = easeOut(segment(frame, 20, 64));
    for (let i = 0; i < 7; i += 1) {
      const a = -Math.PI * .92 + i * Math.PI * .14;
      iceShard(ctx, 96 + Math.cos(a) * 60 * crown, 116 + Math.sin(a) * 42 * crown, 30 + (i % 3) * 10, 10, i % 2 ? '#e8ffff' : '#5fb8ee', alpha, a + Math.PI / 2);
    }
    if (frame > 64) { burst(ctx, 96, 112, 30 + segment(frame, 64, 81) * 70, 14, '#f5ffff', alpha); for (let i = 0; i < 7; i += 1) iceShard(ctx, 48 + i * 16, 92 + ((frame + i * 7) % 38), 12, 5, '#9deaff', alpha, i * .25); }
  }
}

function drawThunder(ctx, frame, tier) {
  const total = tier === 1 ? 58 : tier === 2 ? 74 : 88;
  const alpha = fade(frame, 5, total - 13, total);
  const mark = easeOut(segment(frame, 0, tier === 1 ? 15 : 22));
  ring(ctx, 96, 45, 8 + mark * (tier * 6 + 10), '#f9f2a3', 2 + tier, alpha);
  if (tier > 1) ring(ctx, 96, 45, 5 + mark * (tier * 10 + 17), '#967dff', 2, alpha, frame * .04, frame * .04 + Math.PI * 1.5);
  const strikeAt = tier === 1 ? 16 : 20;
  if (frame >= strikeAt) lightning(ctx, 96, 24, 144, tier, tier === 3 ? '#fffbd0' : '#d8c9ff', alpha, tier + 2);
  if (tier >= 2 && frame > 34) {
    lightning(ctx, 66, 53, 139, tier - 1, '#8f7aff', alpha * .82, 2);
    lightning(ctx, 126, 51, 141, tier - 1, '#b9aaff', alpha * .82, 2);
  }
  if (tier === 3 && frame > 55) {
    ring(ctx, 96, 139, 14 + segment(frame, 55, 75) * 63, '#f9f4a8', 3, alpha);
    burst(ctx, 96, 139, 26 + segment(frame, 55, 73) * 52, 16, '#a98fff', alpha, frame * .08);
  } else if (frame > (tier === 1 ? 36 : 47)) burst(ctx, 96, 139, 18 + segment(frame, tier === 1 ? 36 : 47, total - 8) * 42, 8 + tier * 2, '#fffac2', alpha);
}

function drawCure(ctx, frame, tier) {
  const total = tier === 1 ? 70 : tier === 2 ? 82 : 96;
  const alpha = fade(frame, 10, total - 14, total);
  const grow = easeOut(segment(frame, 0, tier === 1 ? 28 : 36));
  if (tier === 1) {
    motes(ctx, 9, frame, '#92ffc9', 'rise', 62, alpha);
    ring(ctx, 96, 112, 8 + grow * 38, '#65e9ad', 3, alpha);
  } else if (tier === 2) {
    ring(ctx, 96, 111, 10 + grow * 31, '#7dffd0', 3, alpha);
    ring(ctx, 96, 111, 20 + grow * 46, '#dffff2', 2, alpha * .8, frame * .035, frame * .035 + Math.PI * 1.5);
    for (let i = 0; i < 6; i += 1) { const a = i * Math.PI / 3 + frame * .025; diamond(ctx, 96 + Math.cos(a) * 48, 111 + Math.sin(a) * 35, 5, '#9dffd6', alpha); }
  } else {
    ring(ctx, 96, 116, 20 + grow * 57, '#e9fff4', 4, alpha);
    ring(ctx, 96, 116, 8 + grow * 43, '#59f2a7', 3, alpha);
    for (let i = 0; i < 6; i += 1) line(ctx, 55 + i * 16, 148, 72 + i * 10, 45, i % 2 ? '#effff7' : '#72ffc1', 3, alpha * grow);
    motes(ctx, 18, frame, '#b8ffe1', 'rise', 78, alpha);
  }
  const impactAt = tier === 1 ? 47 : tier === 2 ? 55 : 63;
  if (frame > impactAt) {
    const p = easeOut(segment(frame, impactAt, impactAt + 13));
    if (tier === 1) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#f3fff8';
      ctx.fillRect(91, 88 - p * 4, 10, 50 + p * 8); ctx.fillRect(72 - p * 5, 108, 48 + p * 10, 10); ctx.restore();
    } else if (tier === 2) {
      ring(ctx, 96, 111, 22 + p * 43, '#effff7', 4, alpha);
      for (let i = 0; i < 8; i += 1) {
        const a = Math.PI / 8 + i * Math.PI / 4;
        diamond(ctx, 96 + Math.cos(a) * (27 + p * 25), 111 + Math.sin(a) * (21 + p * 18), 7, i % 2 ? '#f7fff9' : '#75ffc1', alpha);
      }
    } else {
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#f3fff8';
      ctx.fillRect(89, 64 - p * 8, 14, 91 + p * 15); ctx.fillRect(48 - p * 8, 105, 96 + p * 16, 14); ctx.restore();
      burst(ctx, 96, 112, 36 + p * 66, 16, '#90ffd0', alpha, Math.PI / 16);
    }
  }
}

function drawRaise(ctx, frame) {
  const alpha = fade(frame, 8, 82, 96);
  const seal = easeOut(segment(frame, 0, 25));
  ring(ctx, 96, 126, 10 + seal * 46, '#ffd978', 3, alpha);
  for (let i = 0; i < 4; i += 1) {
    const y = 154 - segment(frame, 15 + i * 5, 58 + i * 4) * 96;
    diamond(ctx, 69 + i * 18, y, 4 + i % 2, i % 2 ? '#fff8c8' : '#ffae72', alpha);
  }
  const soul = easeInOut(segment(frame, 24, 66));
  poly(ctx, [[96, 148 - soul * 69], [82, 128 - soul * 51], [87, 104 - soul * 30], [96, 94 - soul * 22], [105, 104 - soul * 30], [110, 128 - soul * 51]], '#fffce8', alpha * soul, '#ffc96b', 2);
  if (frame >= 66) {
    const p = easeOut(segment(frame, 66, 82));
    ring(ctx, 96, 88, 12 + p * 53, '#fff7bd', 4, alpha);
    burst(ctx, 96, 104, 18 + p * 58, 12, '#ffdb7d', alpha, Math.PI / 12);
  }
}

function drawProtect(ctx, frame) {
  const alpha = fade(frame, 7, 70, 84);
  const form = easeOut(segment(frame, 0, 48));
  const points = [[96, 35], [143, 62], [143, 121], [96, 153], [49, 121], [49, 62]];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]; const b = points[(i + 1) % points.length];
    line(ctx, a[0], a[1], a[0] + (b[0] - a[0]) * form, a[1] + (b[1] - a[1]) * form, i % 2 ? '#a9d9ff' : '#f2fbff', 4, alpha);
  }
  if (frame > 24) {
    const lattice = easeOut(segment(frame, 24, 58));
    line(ctx, 96, 35, 96, 153, '#6ab7ff', 2, alpha * lattice);
    line(ctx, 49, 62, 143, 121, '#6ab7ff', 2, alpha * lattice);
    line(ctx, 143, 62, 49, 121, '#6ab7ff', 2, alpha * lattice);
    diamond(ctx, 96, 94, 15 + lattice * 8, 'rgba(126,194,255,.7)', alpha, '#ffffff');
  }
  if (frame >= 58) {
    const p = easeOut(segment(frame, 58, 70));
    ring(ctx, 96, 96, 22 + p * 55, '#dff4ff', 4, alpha);
  }
}

function drawShell(ctx, frame) {
  const alpha = fade(frame, 7, 75, 88);
  const weave = easeOut(segment(frame, 0, 60));
  const facets = [
    [[96, 34], [139, 58], [123, 96], [96, 82]],
    [[139, 58], [147, 119], [112, 151], [123, 96]],
    [[112, 151], [80, 151], [69, 96], [123, 96]],
    [[80, 151], [45, 119], [53, 58], [69, 96]],
    [[53, 58], [96, 34], [96, 82], [69, 96]],
  ];
  facets.forEach((points, index) => poly(ctx, points, index % 2 ? 'rgba(113,225,214,.28)' : 'rgba(139,160,255,.32)', alpha * weave, index % 2 ? '#b6fff4' : '#d9d7ff', 2));
  ring(ctx, 96, 96, 14 + weave * 43, '#96f2e8', 3, alpha);
  if (frame >= 60) {
    const p = easeOut(segment(frame, 60, 75));
    diamond(ctx, 96, 96, 18 + p * 17, '#eaffff', alpha * .6, '#ffffff');
    ring(ctx, 96, 96, 30 + p * 39, '#c8fff7', 4, alpha);
  }
}

function drawReflect(ctx, frame) {
  const alpha = fade(frame, 7, 83, 96);
  const assemble = easeInOut(segment(frame, 0, 68));
  const shards = [[96, 36], [139, 61], [142, 116], [96, 153], [50, 116], [53, 61]];
  shards.forEach(([x, y], index) => {
    const angle = index * Math.PI / 3 + frame * .015;
    const px = 96 + (x - 96) * assemble; const py = 96 + (y - 96) * assemble;
    poly(ctx, [[px, py - 13], [px + 9, py], [px, py + 13], [px - 9, py]], index % 2 ? 'rgba(130,229,255,.45)' : 'rgba(214,176,255,.45)', alpha, '#ffffff', 2);
    line(ctx, px, py, 96 + Math.cos(angle) * 18, 96 + Math.sin(angle) * 18, '#a9efff', 2, alpha * assemble);
  });
  if (frame >= 68) {
    const p = easeOut(segment(frame, 68, 83));
    poly(ctx, [[96, 43], [137, 67], [137, 124], [96, 149], [55, 124], [55, 67]], 'rgba(173,222,255,.36)', alpha * p, '#ffffff', 4);
    line(ctx, 71, 119, 121, 70, '#f1ffff', 5, alpha);
    line(ctx, 82, 133, 132, 84, '#a990ff', 3, alpha);
  }
}

function drawHoly(ctx, frame) {
  const alpha = fade(frame, 8, 99, 118);
  const stars = easeOut(segment(frame, 0, 30));
  for (let i = 0; i < 7; i += 1) {
    const x = 38 + i * 19; const y = 28 + ((i * 23) % 38);
    diamond(ctx, x, y, 4 + (i % 3), i % 2 ? '#fff8a8' : '#ffffff', alpha * stars);
  }
  if (frame > 26) {
    const descend = easeInOut(segment(frame, 26, 78));
    for (let i = 0; i < 5; i += 1) {
      const x = 62 + i * 17;
      line(ctx, x, 24, x + (i - 2) * 4, 61 + descend * 92, i % 2 ? '#fff5a5' : '#ffffff', i === 2 ? 7 : 4, alpha * descend);
    }
    ring(ctx, 96, 133, 8 + descend * 45, '#ffd95d', 3, alpha);
  }
  if (frame >= 78) {
    const p = easeOut(segment(frame, 78, 98));
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#fffde6';
    ctx.fillRect(90, 42 - p * 7, 12, 114 + p * 12); ctx.fillRect(55 - p * 8, 81, 82 + p * 16, 12); ctx.restore();
    burst(ctx, 96, 118, 28 + p * 68, 16, '#ffe676', alpha, Math.PI / 16);
  }
}

function drawSteal(ctx, frame) {
  const alpha = fade(frame, 5, 58, 70);
  const reach = easeInOut(segment(frame, 12, 45));
  for (let i = 0; i < 5; i += 1) {
    const x = 44 + reach * 70 - i * 9; const y = 122 - reach * 38 + i * 3;
    line(ctx, x - 13, y + 13, x, y, i % 2 ? '#8cead4' : '#eafffb', 3, alpha * (1 - i * .12));
  }
  poly(ctx, [[111, 79], [137, 71], [150, 84], [137, 96], [122, 92], [115, 106], [101, 99]], '#274d65', alpha * reach, '#9ff4df', 3);
  if (frame >= 45) {
    const snapBack = easeOut(segment(frame, 45, 59));
    diamond(ctx, 110 - snapBack * 37, 91 + snapBack * 17, 8, '#fff2a7', alpha, '#70d8c5');
    line(ctx, 144, 63, 134, 53, '#ffffff', 2, alpha); line(ctx, 153, 78, 167, 75, '#ffffff', 2, alpha);
  }
}

function drawJump(ctx, frame) {
  const alpha = fade(frame, 6, 77, 92);
  if (frame < 34) {
    const up = easeInOut(segment(frame, 0, 28));
    line(ctx, 96, 154, 96, 154 - up * 105, '#b9edff', 4, alpha);
    for (let i = 0; i < 4; i += 1) line(ctx, 76 + i * 13, 145, 86 + i * 8, 126 - up * 36, '#5574bf', 2, alpha * up);
  } else {
    const down = easeInOut(segment(frame, 34, 61));
    line(ctx, 126 - down * 30, 23 + down * 107, 99 - down * 3, 66 + down * 98, '#f7ffff', 5, alpha);
    poly(ctx, [[126 - down * 30, 20 + down * 107], [138 - down * 30, 42 + down * 107], [116 - down * 30, 37 + down * 107]], '#8bd8ff', alpha, '#ffffff', 2);
  }
  if (frame >= 61) {
    const p = easeOut(segment(frame, 61, 76));
    burst(ctx, 96, 154, 17 + p * 55, 12, '#effcff', alpha, Math.PI / 12);
    ring(ctx, 96, 157, 9 + p * 48, '#5aa7e8', 4, alpha);
  }
}

function drawRapidFire(ctx, frame) {
  const alpha = fade(frame, 7, 84, 100);
  const aim = easeOut(segment(frame, 0, 31));
  ring(ctx, 96, 98, 42 - aim * 20, '#ffd967', 2, alpha);
  line(ctx, 96, 52, 96, 76, '#fff8c8', 2, alpha * aim); line(ctx, 52, 98, 76, 98, '#fff8c8', 2, alpha * aim);
  const impacts = [48, 58, 68, 78];
  impacts.forEach((at, index) => {
    if (frame < at - 7 || frame > at + 12) return;
    const p = easeOut(segment(frame, at - 7, at + 5));
    const angle = [-.7, .45, -.2, .85][index];
    line(ctx, 25 + index * 8, 38 + index * 17, 103 + Math.cos(angle) * 40, 98 + Math.sin(angle) * 38, index % 2 ? '#ff7b55' : '#fff0a2', 5, alpha);
    burst(ctx, 96, 98, 13 + p * 36, 8, index % 2 ? '#ff8b62' : '#fff4af', alpha, angle);
  });
}

function drawZeninage(ctx, frame) {
  const alpha = fade(frame, 7, 79, 92);
  for (let i = 0; i < 14; i += 1) {
    const fall = segment(frame, 8 + (i % 5) * 5, 52 + (i % 4) * 4);
    if (fall <= 0 || fall >= 1) continue;
    const x = 31 + ((i * 37) % 132); const y = 15 + fall * 126;
    ring(ctx, x, y, 5 + (i % 3), i % 2 ? '#ffd35c' : '#fff1a3', 3, alpha);
    line(ctx, x - 3, y, x + 3, y, '#9d5f22', 2, alpha);
  }
  if (frame >= 64) {
    const p = easeOut(segment(frame, 64, 79));
    ring(ctx, 96, 139, 16 + p * 58, '#ffe06c', 5, alpha);
    burst(ctx, 96, 131, 20 + p * 50, 14, '#fff4be', alpha);
  }
}

function drawMix(ctx, frame) {
  const alpha = fade(frame, 6, 77, 90);
  const orbit = easeInOut(segment(frame, 0, 43));
  const a = frame * .07;
  [[-1, '#72f0be'], [1, '#a78cff']].forEach(([side, color], index) => {
    const x = 96 + Math.cos(a + index * Math.PI) * (58 - orbit * 36);
    const y = 87 + Math.sin(a + index * Math.PI) * (35 - orbit * 18);
    poly(ctx, [[x - 8, y - 14], [x + 8, y - 14], [x + 11, y + 10], [x, y + 17], [x - 11, y + 10]], color, alpha, '#ffffff', 2);
  });
  if (frame > 42) {
    const combine = easeOut(segment(frame, 42, 62));
    ring(ctx, 96, 95, 9 + combine * 38, '#d7fff2', 4, alpha);
    for (let i = 0; i < 8; i += 1) diamond(ctx, 96 + Math.cos(i * Math.PI / 4) * (18 + combine * 39), 95 + Math.sin(i * Math.PI / 4) * (14 + combine * 28), 4, i % 2 ? '#ffdc75' : '#82f1dd', alpha);
  }
  if (frame >= 62) burst(ctx, 96, 96, 24 + easeOut(segment(frame, 62, 77)) * 54, 12, '#f5fff9', alpha);
}

function drawAtomicRay(ctx, frame) {
  const alpha = fade(frame, 6, 81, 96);
  const charge = easeOut(segment(frame, 0, 38));
  ring(ctx, 96, 96, 52 - charge * 31, '#ff7049', 3, alpha);
  for (let i = 0; i < 6; i += 1) {
    const angle = i * Math.PI / 3 + frame * .025;
    diamond(ctx, 96 + Math.cos(angle) * 54, 96 + Math.sin(angle) * 54, 5, i % 2 ? '#ffdc75' : '#ff5d45', alpha * charge);
  }
  if (frame > 37) {
    const ray = easeInOut(segment(frame, 37, 65));
    for (let i = 0; i < 5; i += 1) line(ctx, 34, 50 + i * 21, 55 + ray * 104, 58 + i * 16, i % 2 ? '#fff2a5' : '#ff6b48', 3 + (i === 2 ? 2 : 0), alpha * ray);
  }
  if (frame >= 65) burst(ctx, 123, 96, 20 + easeOut(segment(frame, 65, 80)) * 56, 18, '#fff1bd', alpha);
}

function drawWaveCannon(ctx, frame) {
  const alpha = fade(frame, 7, 95, 112);
  const charge = easeOut(segment(frame, 0, 48));
  for (let i = 0; i < 7; i += 1) {
    const y = 43 + i * 18;
    line(ctx, 25 + charge * 45, y, 167 - charge * 45, y, i % 2 ? '#69e5ff' : '#e6ffff', 2, alpha * charge);
  }
  ring(ctx, 96, 97, 48 - charge * 39, '#ffffff', 4, alpha);
  if (frame > 47) {
    const compress = easeInOut(segment(frame, 47, 76));
    poly(ctx, [[21, 81], [96, 91 - compress * 7], [171, 81], [171, 113], [96, 103 + compress * 7], [21, 113]], '#69dff0', alpha * compress, '#efffff', 3);
  }
  if (frame >= 76) {
    const release = easeOut(segment(frame, 76, 95));
    for (let i = 0; i < 5; i += 1) line(ctx, 18, 75 + i * 12, 174, 64 + i * 18, i % 2 ? '#ffffff' : '#4fc5e7', 7 - (i % 2) * 3, alpha * (1 - release * .18));
  }
}

function drawBlaster(ctx, frame) {
  const alpha = fade(frame, 6, 74, 88);
  const lock = easeOut(segment(frame, 0, 42));
  ring(ctx, 96, 96, 61 - lock * 31, '#ffe26b', 3, alpha);
  line(ctx, 96, 31, 96, 61, '#fff7c2', 3, alpha * lock); line(ctx, 31, 96, 61, 96, '#fff7c2', 3, alpha * lock);
  if (frame > 22) {
    const split = easeOut(segment(frame, 22, 59));
    poly(ctx, [[96, 49], [128, 96], [96, 143], [64, 96]], 'rgba(40,20,70,.72)', alpha * split, '#e1a0ff', 3);
    line(ctx, 67, 64, 125, 128, '#ff6b8c', 5, alpha * split);
    line(ctx, 125, 64, 67, 128, '#8eeaff', 5, alpha * split);
  }
  if (frame >= 59) {
    const p = easeOut(segment(frame, 59, 73));
    ring(ctx, 96, 96, 12 + p * 58, '#ffffff', 5, alpha);
    burst(ctx, 96, 96, 19 + p * 44, 8, '#ff6b8c', alpha, Math.PI / 8);
  }
}

function drawMaelstrom(ctx, frame) {
  const alpha = fade(frame, 6, 91, 108);
  const pull = easeInOut(segment(frame, 0, 72));
  for (let ringIndex = 0; ringIndex < 6; ringIndex += 1) {
    const radius = 76 - ringIndex * 11 - pull * (ringIndex % 2 ? 15 : 7);
    ring(ctx, 96, 96, Math.max(7, radius), ringIndex % 2 ? '#82d8ff' : '#5363bd', 2 + ringIndex % 2, alpha, frame * .035 + ringIndex * .45, frame * .035 + ringIndex * .45 + Math.PI * 1.3);
  }
  motes(ctx, 19, frame, '#dff8ff', 'converge', 81, alpha);
  if (frame >= 72) {
    const p = easeOut(segment(frame, 72, 91));
    ring(ctx, 96, 96, 15 + p * 62, '#ff6579', 4, alpha);
    line(ctx, 50, 134, 142, 134, '#ff4e64', 5, alpha);
    line(ctx, 61, 142, 131, 142, '#55102c', 4, alpha);
  }
}

function drawDeltaAttack(ctx, frame) {
  const alpha = fade(frame, 7, 84, 100);
  const bind = easeOut(segment(frame, 0, 52));
  const points = [[96, 30], [154, 130], [38, 130]];
  points.forEach(([x, y], index) => {
    diamond(ctx, x, y, 8 + bind * 5, index === 0 ? '#fff3a4' : index === 1 ? '#8deaff' : '#d49bff', alpha * bind, '#ffffff');
    const next = points[(index + 1) % 3];
    line(ctx, x, y, x + (next[0] - x) * bind, y + (next[1] - y) * bind, '#e8fbff', 3, alpha);
  });
  if (frame > 42) {
    const prison = easeOut(segment(frame, 42, 68));
    poly(ctx, [[96, 49], [132, 72], [126, 128], [96, 147], [66, 128], [60, 72]], 'rgba(143,160,190,.5)', alpha * prison, '#ffffff', 3);
    for (let i = 0; i < 4; i += 1) line(ctx, 69 + i * 18, 67, 63 + i * 22, 132, '#8ca2b9', 2, alpha * prison);
  }
  if (frame >= 68) {
    const p = easeOut(segment(frame, 68, 84));
    burst(ctx, 96, 98, 20 + p * 51, 12, '#e9f2ff', alpha);
    ctx.save(); ctx.globalAlpha = alpha * p; ctx.fillStyle = '#9ca8b7'; ctx.fillRect(83, 73, 26, 54); ctx.restore();
  }
}

function draw1000Needles(ctx, frame) {
  const alpha = fade(frame, 6, 81, 96);
  const count = easeOut(segment(frame, 0, 30));
  for (let digit = 0; digit < 4; digit += 1) {
    const x = 61 + digit * 23;
    if (digit === 0) line(ctx, x, 53, x, 75, '#fff2a0', 4, alpha * count);
    else ring(ctx, x, 64, 7, '#fff2a0', 3, alpha * count);
  }
  if (frame > 22) {
    const fan = easeInOut(segment(frame, 22, 66));
    for (let i = 0; i < 20; i += 1) {
      const row = Math.floor(i / 5); const column = i % 5;
      const endX = 47 + column * 25 + (row % 2) * 6;
      const endY = 86 + row * 18;
      line(ctx, 96 + (column - 2) * 3, 96 + row * 2, 96 + (endX - 96) * fan, 96 + (endY - 96) * fan, i % 3 ? '#d8ffff' : '#ffe37e', 2, alpha * fan);
    }
  }
  if (frame >= 66) {
    const p = easeOut(segment(frame, 66, 81));
    burst(ctx, 96, 112, 24 + p * 60, 20, '#efffff', alpha);
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ffdf61'; ctx.fillRect(67, 104, 58, 8); ctx.restore();
  }
}

function drawWhiteWind(ctx, frame) {
  const alpha = fade(frame, 7, 88, 104);
  const sweep = easeInOut(segment(frame, 0, 72));
  for (let i = 0; i < 13; i += 1) {
    const phaseOffset = (i * 17) % 61;
    const x = 25 + ((frame * 2 + phaseOffset * 3) % 143);
    const y = 153 - ((frame + phaseOffset) % 83);
    poly(ctx, [[x, y - 7], [x + 9, y], [x, y + 4], [x - 5, y]], i % 2 ? '#ffffff' : '#b8ffe6', alpha * sweep, '#dffff5', 1);
  }
  for (let i = 0; i < 4; i += 1) ring(ctx, 96, 103, 18 + i * 15 + sweep * 13, i % 2 ? '#dffff6' : '#85eac7', 2, alpha, Math.PI * .1, Math.PI * 1.55);
  if (frame >= 72) {
    const p = easeOut(segment(frame, 72, 88));
    ring(ctx, 96, 105, 17 + p * 58, '#ffffff', 4, alpha);
    burst(ctx, 96, 109, 19 + p * 46, 12, '#a2ffd8', alpha);
  }
}

function drawAquaBreath(ctx, frame) {
  const alpha = fade(frame, 7, 97, 116);
  const orb = easeOut(segment(frame, 0, 28));
  ring(ctx, 48, 91, 8 + orb * 24, '#a4f2ff', 4, alpha);
  for (let i = 0; i < 6; i += 1) diamond(ctx, 48 + Math.cos(i * Math.PI / 3) * (14 + orb * 21), 91 + Math.sin(i * Math.PI / 3) * (12 + orb * 17), 4, '#dfffff', alpha * orb);
  if (frame > 25) {
    const surge = easeInOut(segment(frame, 25, 78));
    for (let band = 0; band < 7; band += 1) {
      const y = 55 + band * 15;
      const endX = 58 + surge * (111 - band * 2);
      line(ctx, 48, y + Math.sin(frame * .08 + band) * 8, endX, y + Math.sin(frame * .08 + band + 1) * 13, band % 2 ? '#4fd0ef' : '#d7ffff', 5, alpha * surge);
    }
  }
  if (frame >= 78) {
    const p = easeOut(segment(frame, 78, 97));
    ring(ctx, 130, 101, 15 + p * 51, '#efffff', 5, alpha);
    burst(ctx, 130, 101, 19 + p * 48, 14, '#59dbf2', alpha, Math.PI / 14);
  }
}

function drawMightyGuard(ctx, frame) {
  const alpha = fade(frame, 8, 99, 118);
  const build = easeOut(segment(frame, 0, 80));
  const colors = ['#75c8ff', '#93f4d1', '#ffe681'];
  for (let layer = 0; layer < 3; layer += 1) {
    const radius = 25 + layer * 20;
    poly(ctx, [[96, 96 - radius], [96 + radius * .87, 96 - radius * .5], [96 + radius * .87, 96 + radius * .5], [96, 96 + radius], [96 - radius * .87, 96 + radius * .5], [96 - radius * .87, 96 - radius * .5]], `rgba(${layer === 0 ? '80,130,255' : layer === 1 ? '75,220,180' : '255,215,90'},.16)`, alpha * build, colors[layer], 3);
  }
  if (frame > 28) {
    const seals = easeOut(segment(frame, 28, 80));
    diamond(ctx, 96, 65, 8, '#8bcfff', alpha * seals, '#ffffff');
    diamond(ctx, 69, 116, 8, '#8ff2c9', alpha * seals, '#ffffff');
    diamond(ctx, 123, 116, 8, '#ffe486', alpha * seals, '#ffffff');
    line(ctx, 96, 65, 69, 116, '#efffff', 2, alpha * seals); line(ctx, 69, 116, 123, 116, '#efffff', 2, alpha * seals); line(ctx, 123, 116, 96, 65, '#efffff', 2, alpha * seals);
  }
  if (frame >= 80) {
    const p = easeOut(segment(frame, 80, 99));
    ring(ctx, 96, 97, 28 + p * 64, '#ffffff', 5, alpha);
    burst(ctx, 96, 97, 22 + p * 57, 12, '#c9fff0', alpha);
  }
}

function drawGoblinPunch(ctx, frame) {
  const alpha = fade(frame, 6, 66, 78);
  const rush = easeInOut(segment(frame, 17, 52));
  const fistX = 28 + rush * 72;
  const fistY = 116 - Math.sin(rush * Math.PI) * 22;
  ring(ctx, 118, 102, 13 + easeOut(segment(frame, 0, 18)) * 24, '#9aff77', 2, alpha, -.4, Math.PI * 1.35);
  poly(ctx, [[fistX - 24, fistY - 9], [fistX - 8, fistY - 18], [fistX + 6, fistY - 15], [fistX + 18, fistY - 5], [fistX + 16, fistY + 12], [fistX + 4, fistY + 22], [fistX - 10, fistY + 17], [fistX - 25, fistY + 7]], '#6cbc52', alpha, '#e8ffd7', 3);
  for (let i = 0; i < 3; i += 1) line(ctx, fistX - 4 + i * 8, fistY - 15, fistX + 2 + i * 8, fistY + 2, '#315f38', 2, alpha);
  if (frame >= 52) {
    const p = easeOut(segment(frame, 52, 67));
    burst(ctx, 119, 103, 16 + p * 56, 10, '#fff5a8', alpha, Math.PI / 10);
    poly(ctx, [[88, 91], [96, 76], [107, 80], [113, 72], [123, 80], [132, 76], [142, 91], [138, 111], [124, 126], [103, 123], [88, 108]], '#5ca94d', alpha, '#f2ffe2', 4);
    for (let i = 0; i < 4; i += 1) {
      const knuckleX = 97 + i * 11;
      line(ctx, knuckleX, 82 - (i % 2) * 4, knuckleX + 5, 99, '#244d30', 3, alpha);
    }
    line(ctx, 101, 113, 127, 105, '#fff0a5', 4, alpha);
  }
}

function drawMagicHammer(ctx, frame) {
  const alpha = fade(frame, 7, 80, 94);
  const gather = easeOut(segment(frame, 0, 23));
  for (let i = 0; i < 6; i += 1) {
    const a = i * Math.PI / 3 - frame * .045;
    diamond(ctx, 96 + Math.cos(a) * (54 - gather * 20), 103 + Math.sin(a) * (39 - gather * 13), 4, i % 2 ? '#7ae7ff' : '#bb8cff', alpha * gather, '#f4ffff');
  }
  if (frame >= 22) {
    const swing = easeInOut(segment(frame, 22, 64));
    const angle = -2.4 + swing * 2.05;
    ctx.save(); ctx.translate(88, 113); ctx.rotate(angle);
    poly(ctx, [[-7, -66], [25, -66], [31, -43], [19, -30], [-18, -30], [-23, -52]], '#7389d6', alpha, '#e8f7ff', 3);
    line(ctx, 4, -30, 4, 34, '#d8b178', 8, alpha); line(ctx, 7, -29, 7, 34, '#fff0b6', 2, alpha);
    ctx.restore();
  }
  if (frame >= 64) {
    const p = easeOut(segment(frame, 64, 80));
    ring(ctx, 117, 125, 12 + p * 52, '#68dfff', 5, alpha);
    for (let i = 0; i < 8; i += 1) {
      const a = i * Math.PI / 4 + .2;
      line(ctx, 117 + Math.cos(a) * 9, 125 + Math.sin(a) * 9, 117 + Math.cos(a) * (24 + p * 42), 125 + Math.sin(a) * (24 + p * 42), i % 2 ? '#c797ff' : '#dffcff', 3, alpha);
    }
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#08183e'; ctx.fillRect(78, 116, 78, 18); ctx.fillStyle = '#92ecff'; ctx.fillRect(83, 121, Math.max(0, Math.round(66 * (1 - p))), 8); ctx.restore();
  }
}

function drawAero(ctx, frame, tier) {
  const total = tier === 1 ? 72 : tier === 2 ? 88 : 108;
  const impactAt = tier === 1 ? 48 : tier === 2 ? 58 : 72;
  const alpha = fade(frame, 6, total - 15, total);
  if (tier === 1) {
    const flight = easeInOut(segment(frame, 14, 49));
    const x = 31 + flight * 104;
    ring(ctx, x, 103, 22, '#c9fff0', 6, alpha, -1.1, 1.05);
    line(ctx, x - 20, 84, x + 16, 117, '#77dfcf', 3, alpha);
    for (let i = 0; i < 4; i += 1) line(ctx, x - 50 - i * 8, 82 + i * 12, x - 23, 82 + i * 12, '#8ae9df', 2, alpha * (1 - i * .13));
  } else if (tier === 2) {
    const tunnel = easeOut(segment(frame, 0, 23));
    for (let i = 0; i < 4; i += 1) ring(ctx, 96, 101, 16 + i * 13 + tunnel * 5, i % 2 ? '#77d9c8' : '#d8fff4', 2, alpha, frame * .035 + i, frame * .035 + i + Math.PI * 1.3);
    const cross = easeInOut(segment(frame, 21, 59));
    line(ctx, 44 + cross * 30, 49, 147 - cross * 22, 150, '#e9fff7', 6, alpha * cross);
    line(ctx, 147 - cross * 30, 49, 44 + cross * 22, 150, '#72dbc9', 6, alpha * cross);
  } else {
    const grow = easeOut(segment(frame, 0, 72));
    const top = 133 - grow * 92;
    for (let i = 0; i < 8; i += 1) {
      const y = 142 - i * 13 * grow;
      const width = (54 - i * 5) * grow;
      ring(ctx, 96, y, Math.max(4, width), i % 2 ? '#83e5d8' : '#e1fff8', 3, alpha, frame * .055 + i * .55, frame * .055 + i * .55 + Math.PI * 1.35);
    }
    poly(ctx, [[96, top], [117, 142], [75, 142]], 'rgba(78,208,190,.22)', alpha * grow, '#b9fff1', 2);
    motes(ctx, 18, frame, '#d9fff7', 'orbit', 78, alpha * grow);
  }
  if (frame >= impactAt) {
    const p = easeOut(segment(frame, impactAt, impactAt + 16));
    burst(ctx, 112, 105, 16 + p * (tier === 3 ? 67 : 48), 8 + tier * 3, '#eefff9', alpha, frame * .04);
    if (tier >= 2) ring(ctx, 112, 105, 10 + p * 54, '#61d5c5', 4, alpha);
  }
}

function drawFlameThrower(ctx, frame) {
  const alpha = fade(frame, 6, 81, 96);
  const ignite = easeOut(segment(frame, 0, 20));
  poly(ctx, [[25, 91], [50, 84], [64, 94], [64, 112], [49, 122], [25, 115]], '#5b6478', alpha * ignite, '#e7f5ff', 3);
  line(ctx, 31, 102, 57, 102, '#95a8bd', 5, alpha * ignite);
  if (frame >= 18) {
    const sweep = easeOut(segment(frame, 18, 64));
    const tip = 65 + sweep * 91;
    poly(ctx, [[60, 95], [tip, 65 + Math.sin(frame * .18) * 7], [142, 101], [tip, 137 + Math.cos(frame * .16) * 7], [60, 110]], '#f04c26', alpha, '#ffcf67', 2);
    poly(ctx, [[66, 98], [tip - 18, 81], [132, 102], [tip - 20, 120], [66, 107]], '#ffd45d', alpha, '#fff1a0', 1);
    for (let i = 0; i < 8; i += 1) flame(ctx, 82 + i * 10, 129 + (i % 2) * 7, 18 + ((frame + i * 9) % 21), 10, i % 2 ? '#ff792e' : '#ffc84e', alpha, 5);
  }
  if (frame >= 64) {
    const p = easeOut(segment(frame, 64, 81));
    for (let i = 0; i < 6; i += 1) flame(ctx, 84 + i * 14, 148, 31 + p * (20 + i % 3 * 8), 15, i % 2 ? '#f43d25' : '#ffca51', alpha, i - 2);
    line(ctx, 72, 147, 160, 147, '#fff0a1', 5, alpha * p);
  }
}

function drawTimeSlip(ctx, frame) {
  const alpha = fade(frame, 8, 91, 108);
  const dream = easeOut(segment(frame, 0, 24));
  ring(ctx, 96, 93, 49, '#8ec9ff', 3, alpha * dream);
  for (let i = 0; i < 6; i += 1) {
    const a = i * Math.PI / 3 + frame * .018;
    ring(ctx, 96 + Math.cos(a) * 55, 93 + Math.sin(a) * 42, 3 + i % 3, '#e7d6ff', 2, alpha * dream);
  }
  const slip = easeInOut(segment(frame, 23, 73));
  poly(ctx, [[72, 45], [120, 45], [107, 83], [85, 83]], 'rgba(132,186,255,.2)', alpha * slip, '#e8f8ff', 2);
  poly(ctx, [[85, 103], [107, 103], [120, 141], [72, 141]], 'rgba(190,130,255,.2)', alpha * slip, '#eddcff', 2);
  for (let i = 0; i < 9; i += 1) {
    const y = 55 + ((i * 17 + frame * 2) % 76);
    line(ctx, 58, y, 134, y - 6, i % 2 ? '#a1d8ff' : '#b594e5', 2, alpha * slip);
  }
  if (frame >= 73) {
    const p = easeOut(segment(frame, 73, 91));
    poly(ctx, [[54, 75], [67, 61], [76, 75], [67, 89]], '#d7efff', alpha * p, '#ffffff', 2);
    poly(ctx, [[116, 96], [127, 83], [138, 96], [127, 109]], '#7a629d', alpha * p, '#e3c7ff', 2);
    for (let i = 0; i < 4; i += 1) line(ctx, 75 + i * 14, 119 + i % 2 * 8, 83 + i * 14, 141 + i % 2 * 8, '#8e75b0', 3, alpha * p);
  }
}

function drawDeathClaw(ctx, frame) {
  const alpha = fade(frame, 7, 83, 98);
  const form = easeOut(segment(frame, 0, 23));
  poly(ctx, [[49, 137], [56, 74], [72, 42], [81, 73], [92, 32], [99, 74], [116, 39], [114, 83], [141, 65], [127, 106], [110, 133], [80, 151]], '#24112f', alpha * form, '#b6568e', 3);
  const rake = easeInOut(segment(frame, 21, 66));
  for (let i = 0; i < 4; i += 1) {
    const x = 42 + i * 27;
    line(ctx, x - 25 + rake * 45, 38, x + 30 + rake * 30, 151, i % 2 ? '#ff6a94' : '#d16bb5', 5, alpha * rake);
  }
  if (frame >= 66) {
    const p = easeOut(segment(frame, 66, 83));
    ring(ctx, 99, 104, 15 + p * 54, '#e54879', 5, alpha);
    poly(ctx, [[99, 55 - p * 9], [119 + p * 13, 90], [151 + p * 6, 104], [119 + p * 13, 118], [99, 153 + p * 8], [79 - p * 13, 118], [47 - p * 6, 104], [79 - p * 13, 90]], null, alpha, '#ffb1c6', 3);
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ff5f87'; ctx.fillRect(91, 96, 16, 16); ctx.restore();
  }
}

function drawMindBlast(ctx, frame) {
  const alpha = fade(frame, 7, 86, 102);
  const eye = easeOut(segment(frame, 0, 24));
  poly(ctx, [[36, 96], [66, 69 - eye * 10], [96, 59 - eye * 12], [126, 69 - eye * 10], [156, 96], [126, 123 + eye * 10], [96, 133 + eye * 12], [66, 123 + eye * 10]], 'rgba(75,42,117,.45)', alpha * eye, '#d7a7ff', 3);
  ring(ctx, 96, 96, 11 + eye * 19, '#8ee9ff', 4, alpha);
  diamond(ctx, 96, 96, 10 + eye * 5, '#e7ffff', alpha, '#9c74db');
  if (frame >= 23) {
    const focus = easeOut(segment(frame, 23, 68));
    for (let i = 0; i < 10; i += 1) {
      const a = i * Math.PI / 5 + frame * .03;
      const r = 72 - focus * 38;
      line(ctx, 96 + Math.cos(a) * r, 96 + Math.sin(a) * r, 96 + Math.cos(a + .48) * (r - 20), 96 + Math.sin(a + .48) * (r - 20), i % 2 ? '#6ddbf1' : '#c17bea', 3, alpha * focus);
    }
  }
  if (frame >= 68) {
    const p = easeOut(segment(frame, 68, 86));
    for (let i = 0; i < 5; i += 1) ring(ctx, 96, 96, 17 + p * (18 + i * 9), i % 2 ? '#75e5ff' : '#c27bff', 3, alpha * (1 - i * .1));
    line(ctx, 35, 96, 157, 96, '#ffffff', 5, alpha * p);
  }
}

function drawFlash(ctx, frame) {
  const alpha = fade(frame, 5, 71, 84);
  const aperture = easeOut(segment(frame, 0, 20));
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4 + frame * .02;
    poly(ctx, [[96 + Math.cos(a) * 10, 96 + Math.sin(a) * 10], [96 + Math.cos(a - .24) * (20 + aperture * 46), 96 + Math.sin(a - .24) * (20 + aperture * 46)], [96 + Math.cos(a + .24) * (20 + aperture * 46), 96 + Math.sin(a + .24) * (20 + aperture * 46)]], i % 2 ? '#e2faff' : '#fff0a8', alpha * aperture, '#ffffff', 1);
  }
  ring(ctx, 96, 96, 8 + aperture * 28, '#ffffff', 5, alpha);
  if (frame >= 55) {
    const p = easeOut(segment(frame, 55, 70));
    for (let i = 0; i < 16; i += 1) {
      const angle = i * Math.PI / 8;
      line(ctx, 96 + Math.cos(angle) * 18, 96 + Math.sin(angle) * 18, 96 + Math.cos(angle) * (65 + p * 27), 96 + Math.sin(angle) * (65 + p * 27), i % 2 ? '#fff5ad' : '#ffffff', 5, alpha);
    }
    ring(ctx, 96, 96, 20 + p * 62, '#ffffff', 7, alpha);
    line(ctx, 28, 96, 164, 96, '#fff9ca', 7, alpha);
    poly(ctx, [[48, 96], [70, 82], [96, 77], [122, 82], [144, 96], [122, 110], [96, 115], [70, 110]], '#07132a', alpha * p, '#8cd6e8', 3);
    diamond(ctx, 96, 96, 11, '#f7ffff', alpha * p);
  }
}

function drawDigit(ctx, digit, x, y, scale, color, alpha = 1) {
  const segments = {
    0: ['a', 'b', 'c', 'd', 'e', 'f'], 1: ['b', 'c'], 2: ['a', 'b', 'g', 'e', 'd'],
    3: ['a', 'b', 'g', 'c', 'd'], 4: ['f', 'g', 'b', 'c'], 5: ['a', 'f', 'g', 'c', 'd'],
    6: ['a', 'f', 'g', 'e', 'c', 'd'], 7: ['a', 'b', 'c'], 8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    9: ['a', 'b', 'c', 'd', 'f', 'g'],
  };
  const bars = {
    a: [1, 0, 5, 1], b: [5, 1, 1, 5], c: [5, 7, 1, 5], d: [1, 12, 5, 1],
    e: [0, 7, 1, 5], f: [0, 1, 1, 5], g: [1, 6, 5, 1],
  };
  ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.fillStyle = color;
  (segments[digit] ?? []).forEach((name) => {
    const [bx, by, bw, bh] = bars[name];
    ctx.fillRect(Math.round(x + bx * scale), Math.round(y + by * scale), Math.round(bw * scale), Math.round(bh * scale));
  });
  ctx.restore();
}

function scenePercentPoint(sceneContext, point, fallback) {
  const xPercent = clamp(Number.isFinite(Number(point?.x)) ? Number(point.x) : fallback.x, 0, 100);
  const yPercent = clamp(Number.isFinite(Number(point?.y)) ? Number(point.y) : fallback.y, 0, 100);
  const mapping = sceneContext?.stageMapping;
  if (mapping) {
    return {
      x: ((xPercent / 100 * mapping.width) - mapping.drawX) / mapping.drawWidth * LOGICAL_SIZE,
      y: ((yPercent / 100 * mapping.height) - mapping.drawY) / mapping.drawHeight * LOGICAL_SIZE,
    };
  }
  return { x: xPercent / 100 * LOGICAL_SIZE, y: yPercent / 100 * LOGICAL_SIZE };
}

function scenePoint(sceneContext, role, fallback) {
  return scenePercentPoint(sceneContext, {
    x: sceneContext?.[`${role}X`],
    y: sceneContext?.[`${role}Y`],
  }, fallback);
}

function sceneGroupPoint(sceneContext, key, fallback) {
  const points = Array.isArray(sceneContext?.[key]) ? sceneContext[key] : [];
  if (!points.length) return scenePercentPoint(sceneContext, null, fallback);
  return scenePercentPoint(sceneContext, {
    x: points.reduce((sum, point) => sum + Number(point.x ?? fallback.x), 0) / points.length,
    y: points.reduce((sum, point) => sum + Number(point.y ?? fallback.y), 0) / points.length,
  }, fallback);
}

function sceneTargetBand(sceneContext, fallback = { x: 68, y: 50 }) {
  const hostile = Array.isArray(sceneContext?.hostileTargets) ? sceneContext.hostileTargets : [];
  const supplied = hostile.length ? hostile : (Array.isArray(sceneContext?.targets) ? sceneContext.targets : []);
  const points = supplied.length
    ? supplied.map((point) => scenePercentPoint(sceneContext, point, fallback))
    : [scenePoint(sceneContext, 'target', fallback)];
  const xs = points.map((point) => point.x); const ys = points.map((point) => point.y);
  return {
    points,
    center: {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    },
    minX: Math.max(18, Math.min(...xs) - 24),
    maxX: Math.min(174, Math.max(...xs) + 24),
    minY: Math.max(24, Math.min(...ys) - 28),
    maxY: Math.min(166, Math.max(...ys) + 28),
  };
}

function drawRoulette(ctx, frame, sceneContext) {
  const alpha = fade(frame, 8, 97, 116);
  const provided = Array.isArray(sceneContext?.targets) ? sceneContext.targets : [];
  const candidates = provided.length > 1
    ? provided.map((point) => ({ x: clamp(Number(point.x ?? 50), 0, 100) / 100 * LOGICAL_SIZE, y: clamp(Number(point.y ?? 50), 0, 100) / 100 * LOGICAL_SIZE }))
    : [{ x: 51, y: 55 }, { x: 137, y: 59 }, { x: 139, y: 133 }, { x: 53, y: 137 }];
  const scan = easeOut(segment(frame, 0, 32));
  candidates.forEach((point, index) => {
    diamond(ctx, point.x, point.y, 7, index % 2 ? '#76538f' : '#476b8c', alpha * scan, '#d9efff');
    ring(ctx, point.x, point.y, 11, '#9abbd3', 2, alpha * scan);
  });
  const spin = easeInOut(segment(frame, 24, 80));
  ring(ctx, 96, 96, 52, '#d45180', 4, alpha);
  ring(ctx, 96, 96, 39, '#4e274e', 3, alpha, frame * .12, frame * .12 + Math.PI * 1.55);
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    line(ctx, 96 + Math.cos(a) * 17, 96 + Math.sin(a) * 17, 96 + Math.cos(a) * 47, 96 + Math.sin(a) * 47, i % 2 ? '#e9c4dd' : '#8c5578', 2, alpha * spin);
  }
  const pointer = -Math.PI / 2 + spin * Math.PI * 9;
  line(ctx, 96, 96, 96 + Math.cos(pointer) * 35, 96 + Math.sin(pointer) * 35, '#fff3ba', 5, alpha);
  diamond(ctx, 96, 96, 6, '#ffffff', alpha, '#e9537f');
  if (frame >= 80) {
    const p = easeOut(segment(frame, 80, 97));
    const target = scenePoint(sceneContext, 'target', { x: 70, y: 50 });
    line(ctx, 96, 96, target.x, target.y, '#ff668f', 5, alpha * p);
    ring(ctx, target.x, target.y, 10 + p * 27, '#ff94ae', 4, alpha);
    for (let i = 0; i < 6; i += 1) line(ctx, target.x - 20 + i * 8, target.y - 28, target.x - 5 + i * 8, target.y + 29, '#5c1639', 3, alpha * p);
  }
}

function drawSelfDestruct(ctx, frame) {
  const alpha = fade(frame, 7, 93, 110);
  const heat = easeOut(segment(frame, 0, 25));
  ring(ctx, 96, 101, 13 + heat * 33, '#ffb34b', 5, alpha);
  diamond(ctx, 96, 101, 9 + heat * 16, '#fff4b0', alpha, '#ef542d');
  if (frame >= 24) {
    const crack = easeOut(segment(frame, 24, 74));
    for (let i = 0; i < 9; i += 1) {
      const a = i * Math.PI * 2 / 9 + .13;
      const bendX = 96 + Math.cos(a + .23) * (27 + crack * 20);
      const bendY = 101 + Math.sin(a + .23) * (27 + crack * 20);
      line(ctx, 96 + Math.cos(a) * 14, 101 + Math.sin(a) * 14, bendX, bendY, i % 2 ? '#ff7634' : '#fff0a4', 3, alpha * crack);
      line(ctx, bendX, bendY, 96 + Math.cos(a) * (49 + crack * 31), 101 + Math.sin(a) * (49 + crack * 31), '#ec342b', 2, alpha * crack);
    }
  }
  if (frame >= 74) {
    const p = easeOut(segment(frame, 74, 93));
    burst(ctx, 96, 101, 24 + p * 76, 20, '#fff0a4', alpha, frame * .04);
    ring(ctx, 96, 101, 15 + p * 71, '#ff4e2b', 7, alpha);
    ring(ctx, 96, 101, 8 + p * 44, '#ffffff', 9, alpha * Math.max(.25, 1 - p * .72));
    diamond(ctx, 96, 101, 15 + p * 29, '#ffdc72', alpha * Math.max(.2, 1 - p * .75), '#ffffff');
  }
}

function drawVampire(ctx, frame, sceneContext) {
  const alpha = fade(frame, 7, 91, 106);
  const target = scenePoint(sceneContext, 'target', { x: 69, y: 49 });
  const caster = scenePoint(sceneContext, 'caster', { x: 31, y: 55 });
  const mark = easeOut(segment(frame, 0, 24));
  poly(ctx, [[target.x - 18, target.y - 10], [target.x - 7, target.y - 20], [target.x, target.y - 7], [target.x + 7, target.y - 20], [target.x + 18, target.y - 10], [target.x + 9, target.y + 15], [target.x, target.y + 7], [target.x - 9, target.y + 15]], '#3a1029', alpha * mark, '#df5b83', 3);
  if (frame >= 23) {
    const draw = easeInOut(segment(frame, 23, 70));
    for (let i = 0; i < 5; i += 1) {
      const t = clamp(draw - i * .08);
      const x = target.x + (caster.x - target.x) * t;
      const y = target.y + (caster.y - target.y) * t - Math.sin(t * Math.PI) * (20 + i * 3);
      diamond(ctx, x, y, 4 + i % 2, i % 2 ? '#e95f77' : '#9a214d', alpha * t, '#ffc2ca');
    }
    line(ctx, target.x, target.y, caster.x, caster.y, '#7c1b49', 3, alpha * draw);
  }
  if (frame >= 70) {
    const p = easeOut(segment(frame, 70, 91));
    ring(ctx, caster.x, caster.y, 10 + p * 31, '#e85a7b', 4, alpha);
    burst(ctx, caster.x, caster.y, 12 + p * 35, 8, '#ffd8dc', alpha, Math.PI / 8);
    poly(ctx, [[caster.x, caster.y - 15 - p * 5], [caster.x + 8, caster.y], [caster.x, caster.y + 16 + p * 5], [caster.x - 8, caster.y]], '#ff8295', alpha, '#fff2ef', 2);
  }
}

function drawQuestionMarks(ctx, frame) {
  const alpha = fade(frame, 6, 74, 88);
  const glitch = easeOut(segment(frame, 0, 21));
  const offsets = [[-36, -12], [0, -27], [35, -6]];
  offsets.forEach(([ox, oy], index) => {
    const jitter = Math.round(Math.sin(frame * .8 + index * 2) * 5);
    const x = 85 + ox + jitter; const y = 65 + oy;
    line(ctx, x, y, x + 20, y - 8, index % 2 ? '#8de5ff' : '#df8bff', 6, alpha * glitch);
    line(ctx, x + 20, y - 8, x + 27, y + 8, '#eefcff', 6, alpha * glitch);
    line(ctx, x + 27, y + 8, x + 12, y + 22, '#a178cf', 6, alpha * glitch);
    ctx.save(); ctx.globalAlpha = alpha * glitch; ctx.fillStyle = '#f4ffff'; ctx.fillRect(Math.round(x + 8), Math.round(y + 32), 7, 7); ctx.restore();
  });
  if (frame >= 20) {
    const stutter = easeOut(segment(frame, 20, 59));
    for (let i = 0; i < 8; i += 1) {
      const y = 50 + ((i * 19 + frame * 5) % 91);
      line(ctx, 43 + (i % 3) * 9, y, 145 - (i % 4) * 8, y, i % 2 ? '#6a5b97' : '#a9eaff', 2, alpha * stutter);
    }
  }
  if (frame >= 59) {
    const p = easeOut(segment(frame, 59, 74));
    poly(ctx, [[37, 94], [55, 56], [96, 39], [139, 58], [158, 96], [137, 135], [96, 151], [54, 134]], null, alpha, '#f5c2ff', 4);
    burst(ctx, 96, 98, 15 + p * 54, 7, '#b4edff', alpha, .22);
  }
}

function drawMoonFlute(ctx, frame) {
  const alpha = fade(frame, 8, 93, 110);
  const rise = easeOut(segment(frame, 0, 26));
  ring(ctx, 94, 78, 34, '#fff0a6', 8, alpha * rise, -.8, Math.PI * 1.35);
  ring(ctx, 107, 68, 31, '#0b173c', 10, alpha * rise, -.8, Math.PI * 1.35);
  if (frame >= 25) {
    const song = easeOut(segment(frame, 25, 74));
    for (let i = 0; i < 7; i += 1) {
      const a = Math.PI + i * Math.PI / 6 + frame * .018;
      ring(ctx, 96, 93, 20 + i * 10 * song, i % 2 ? '#de7e9e' : '#f0d28f', 2, alpha * song, a, a + Math.PI * .8);
      diamond(ctx, 58 + i * 13, 123 + Math.sin(frame * .08 + i) * 13, 4, '#ffdc87', alpha * song, '#ffffff');
    }
  }
  if (frame >= 74) {
    const p = easeOut(segment(frame, 74, 93));
    burst(ctx, 96, 98, 19 + p * 68, 14, '#ff7a85', alpha, frame * .03);
    for (let i = 0; i < 4; i += 1) ring(ctx, 96, 98, 28 + i * 13 + p * 11, '#d84867', 3, alpha * (1 - i * .13));
  }
}

function drawLilliputianLyric(ctx, frame) {
  const alpha = fade(frame, 7, 81, 96);
  const song = easeOut(segment(frame, 0, 22));
  for (let i = 0; i < 5; i += 1) line(ctx, 45, 55 + i * 17, 148, 55 + i * 17, '#7cb3ce', 2, alpha * song);
  const shrink = 1 - easeInOut(segment(frame, 21, 65)) * .76;
  const cx = 96; const cy = 98;
  ring(ctx, cx, cy, 36 * shrink, '#f3da8d', 4, alpha);
  line(ctx, cx + 24 * shrink, cy - 43 * shrink, cx + 24 * shrink, cy + 19 * shrink, '#fff1b6', Math.max(2, 6 * shrink), alpha);
  diamond(ctx, cx - 8 * shrink, cy + 22 * shrink, 13 * shrink, '#e7c262', alpha, '#ffffff');
  for (let i = 0; i < 4; i += 1) {
    const t = easeOut(segment(frame, 22 + i * 6, 65));
    diamond(ctx, 54 + i * 28, 64 + Math.sin(frame * .07 + i) * 18, 5 - t * 2, '#a9e8ff', alpha * t);
  }
  if (frame >= 65) {
    const p = easeOut(segment(frame, 65, 81));
    poly(ctx, [[96, 82], [102, 91], [101, 112], [110, 127], [82, 127], [91, 112], [90, 91]], '#efca82', alpha * p, '#fff9dc', 2);
    ring(ctx, 96, 104, 10 + p * 29, '#a2dbef', 2, alpha);
  }
}

function drawPondsChorus(ctx, frame) {
  const alpha = fade(frame, 7, 83, 98);
  const ripple = easeOut(segment(frame, 0, 22));
  for (let i = 0; i < 4; i += 1) ring(ctx, 96, 133, 17 + i * 14 * ripple, i % 2 ? '#71d3d0' : '#b5fff0', 3, alpha * ripple, 0, Math.PI);
  const hop = easeInOut(segment(frame, 21, 66));
  const frogY = 121 - Math.sin(hop * Math.PI * 2) * 34;
  ring(ctx, 96, frogY, 25, '#6ecf78', 5, alpha);
  ring(ctx, 82, frogY - 19, 9, '#9ded91', 4, alpha); ring(ctx, 110, frogY - 19, 9, '#9ded91', 4, alpha);
  diamond(ctx, 82, frogY - 20, 3, '#102635', alpha); diamond(ctx, 110, frogY - 20, 3, '#102635', alpha);
  line(ctx, 82, frogY + 9, 110, frogY + 9, '#255b4e', 3, alpha);
  for (let i = 0; i < 5; i += 1) diamond(ctx, 59 + i * 19, 55 + Math.sin(frame * .1 + i) * 13, 4, '#e4ffb2', alpha * hop, '#ffffff');
  if (frame >= 66) {
    const p = easeOut(segment(frame, 66, 83));
    ring(ctx, 96, 104, 17 + p * 55, '#80ef91', 5, alpha);
    poly(ctx, [[64, 135], [78, 112], [96, 125], [114, 112], [128, 135]], '#5aa767', alpha * p, '#ccffbe', 3);
  }
}

function drawLevel4Graviga(ctx, frame) {
  const alpha = fade(frame, 8, 95, 112);
  const scan = easeOut(segment(frame, 0, 28));
  drawDigit(ctx, 4, 79, 42, 5, '#edc7ff', alpha * scan);
  ring(ctx, 96, 76, 31, '#8e6ad3', 3, alpha * scan);
  if (frame >= 27) {
    const collapse = easeOut(segment(frame, 27, 76));
    [[55, 118], [83, 137], [109, 137], [137, 118]].forEach(([x, y], index) => {
      ring(ctx, x + (96 - x) * collapse * .38, y + (96 - y) * collapse * .38, 13 + collapse * 9, index % 2 ? '#c37aff' : '#7652b7', 4, alpha * collapse);
      diamond(ctx, x + (96 - x) * collapse * .38, y + (96 - y) * collapse * .38, 6, '#090414', alpha, '#f0d2ff');
    });
  }
  if (frame >= 76) {
    const p = easeOut(segment(frame, 76, 95));
    burst(ctx, 96, 105, 20 + p * 65, 16, '#cf9dff', alpha, Math.PI / 8);
    drawDigit(ctx, 4, 75, 73, 7, '#ffffff', alpha);
  }
}

function drawDoom(ctx, frame) {
  const alpha = fade(frame, 7, 91, 108);
  const clockIn = easeOut(segment(frame, 0, 27));
  ring(ctx, 96, 97, 54, '#c94766', 5, alpha * clockIn);
  ring(ctx, 96, 97, 44, '#3e1534', 3, alpha * clockIn);
  const countdown = frame < 42 ? 3 : frame < 58 ? 2 : 1;
  drawDigit(ctx, countdown, 78, 60, 6, countdown === 1 ? '#ff5b72' : '#f3ccd7', alpha);
  const hand = -Math.PI / 2 + easeInOut(segment(frame, 26, 73)) * Math.PI * 2;
  line(ctx, 96, 97, 96 + Math.cos(hand) * 38, 97 + Math.sin(hand) * 38, '#fff1af', 4, alpha);
  for (let i = 0; i < 6; i += 1) {
    const a = i * Math.PI / 3;
    diamond(ctx, 96 + Math.cos(a) * 62, 97 + Math.sin(a) * 52, 4, '#6d254c', alpha * clockIn, '#e8819b');
  }
  if (frame >= 73) {
    const p = easeOut(segment(frame, 73, 91));
    poly(ctx, [[96, 39 - p * 8], [115, 71], [142 + p * 12, 89], [121, 110], [131, 150 + p * 7], [96, 127], [61, 150 + p * 7], [71, 110], [50 - p * 12, 89], [77, 71]], '#170718', alpha * p, '#ed5478', 4);
    line(ctx, 50, 142, 142, 50, '#fff0b3', 6, alpha * p);
  }
}

function drawLevel2Old(ctx, frame) {
  const alpha = fade(frame, 8, 93, 110);
  const scan = easeOut(segment(frame, 0, 28));
  drawDigit(ctx, 2, 79, 43, 5, '#d9c195', alpha * scan);
  ring(ctx, 96, 78, 31, '#92775d', 3, alpha * scan);
  if (frame >= 27) {
    const age = easeOut(segment(frame, 27, 75));
    [[72, 111], [120, 111]].forEach(([x, y], index) => {
      poly(ctx, [[x - 14, y - 30], [x + 14, y - 30], [x + 5, y], [x + 14, y + 30], [x - 14, y + 30], [x - 5, y]], 'rgba(112,78,50,.28)', alpha * age, index ? '#d1b983' : '#aa8b68', 2);
    });
    motes(ctx, 18, frame * 2, '#c5ad7c', 'fall', 72, alpha * age);
  }
  if (frame >= 75) {
    const p = easeOut(segment(frame, 75, 93));
    for (let i = 0; i < 7; i += 1) line(ctx, 48 + i * 16, 83, 61 + i * 12, 146 + i % 2 * 8, i % 2 ? '#77604b' : '#c9ae78', 3, alpha * p);
    drawDigit(ctx, 2, 75, 70, 7, '#fff0c4', alpha);
  }
}

function drawTransfusion(ctx, frame, sceneContext) {
  const alpha = fade(frame, 8, 108, 122);
  const caster = scenePoint(sceneContext, 'caster', { x: 29, y: 56 });
  const target = scenePoint(sceneContext, 'target', { x: 70, y: 49 });
  const link = easeOut(segment(frame, 0, 28));
  ring(ctx, caster.x, caster.y, 12 + link * 22, '#f07d9e', 4, alpha * link);
  ring(ctx, target.x, target.y, 12 + link * 22, '#76e8c4', 4, alpha * link);
  line(ctx, caster.x, caster.y, target.x, target.y, '#b8efff', 2, alpha * link);
  if (frame >= 27) {
    const transfer = easeInOut(segment(frame, 27, 82));
    const dx = target.x - caster.x; const dy = target.y - caster.y;
    for (let i = 0; i < 10; i += 1) {
      const t = (transfer + i * .11) % 1;
      const arc = Math.sin(t * Math.PI) * (i % 2 ? 18 : -18);
      const length = Math.max(1, Math.hypot(dx, dy));
      const x = caster.x + dx * t - dy / length * arc;
      const y = caster.y + dy * t + dx / length * arc;
      diamond(ctx, x, y, i % 3 === 0 ? 5 : 3, i % 2 ? '#73e8d0' : '#f59ab1', alpha, '#ffffff');
    }
    poly(ctx, [[caster.x, caster.y - 14], [caster.x + 8, caster.y], [caster.x, caster.y + 15], [caster.x - 8, caster.y]], '#d8567e', alpha * (1 - transfer * .78), '#ffdce4', 2);
  }
  if (frame >= 82) {
    const restore = easeOut(segment(frame, 82, 102));
    ring(ctx, target.x, target.y, 15 + restore * 44, '#8affd5', 5, alpha);
    burst(ctx, target.x, target.y, 14 + restore * 48, 12, '#efffff', alpha, Math.PI / 12);
    line(ctx, target.x - 28, target.y, target.x + 28, target.y, '#ffffff', 7, alpha * restore);
    line(ctx, target.x, target.y - 28, target.x, target.y + 28, '#ffffff', 7, alpha * restore);
    if (frame >= 101) {
      const fadeCaster = easeOut(segment(frame, 101, 121));
      for (let i = 0; i < 7; i += 1) line(ctx, caster.x - 20, caster.y - 24 + i * 8, caster.x + 20 - fadeCaster * 35, caster.y - 24 + i * 8, '#592c4f', 3, alpha * (1 - fadeCaster * .7));
    }
  }
}

function drawLevel3Flare(ctx, frame) {
  const alpha = fade(frame, 8, 105, 124);
  const scan = easeOut(segment(frame, 0, 30));
  drawDigit(ctx, 3, 79, 38, 5, '#d8f8ff', alpha * scan);
  ring(ctx, 96, 72, 33, '#8b9aff', 3, alpha * scan);
  const cores = [[96, 62], [59, 125], [133, 125]];
  if (frame >= 29) {
    const charge = easeOut(segment(frame, 29, 84));
    cores.forEach(([x, y], index) => {
      ring(ctx, x, y, 7 + charge * 16, index === 0 ? '#ffffff' : index === 1 ? '#7deaff' : '#caa0ff', 4, alpha);
      diamond(ctx, x, y, 5 + charge * 6, '#f7ffff', alpha, '#6e82da');
      const next = cores[(index + 1) % cores.length];
      line(ctx, x, y, x + (next[0] - x) * charge, y + (next[1] - y) * charge, '#bfeaff', 2, alpha * charge);
    });
    motes(ctx, 21, frame, '#abdfff', 'converge', 82 - charge * 42, alpha * charge);
  }
  if (frame >= 84) {
    const p = easeOut(segment(frame, 84, 105));
    cores.forEach(([x, y], index) => burst(ctx, x, y, 14 + p * 44, 9 + index * 2, index === 1 ? '#7be9ff' : '#ead8ff', alpha, index * .18));
    ring(ctx, 96, 103, 17 + p * 78, '#e8ffff', 6, alpha);
    drawDigit(ctx, 3, 72, 65, 8, '#ffffff', alpha);
  }
}

function drawOffGuard(ctx, frame) {
  const alpha = fade(frame, 7, 81, 96);
  const grid = easeOut(segment(frame, 0, 23));
  const columns = 5; const rows = 5;
  for (let row = 0; row <= rows; row += 1) line(ctx, 51, 54 + row * 18, 141, 54 + row * 18, '#8ec3df', 2, alpha * grid);
  for (let col = 0; col <= columns; col += 1) line(ctx, 51 + col * 18, 54, 51 + col * 18, 144, '#8ec3df', 2, alpha * grid);
  poly(ctx, [[96, 39], [142, 60], [142, 116], [96, 151], [50, 116], [50, 60]], 'rgba(65,117,148,.2)', alpha * grid, '#d8f3ff', 3);
  if (frame >= 22) {
    const fracture = easeOut(segment(frame, 22, 65));
    const cracks = [[96, 39, 87, 77], [87, 77, 112, 96], [112, 96, 91, 120], [91, 120, 96, 151], [112, 96, 141, 73], [87, 77, 56, 63]];
    cracks.forEach(([x1, y1, x2, y2], index) => line(ctx, x1, y1, x1 + (x2 - x1) * fracture, y1 + (y2 - y1) * fracture, index % 2 ? '#ffcf78' : '#ffffff', 5, alpha * fracture));
  }
  if (frame >= 65) {
    const p = easeOut(segment(frame, 65, 81));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if ((row + col) % 2) continue;
        const x = 54 + col * 18 + (col - 2) * p * 11;
        const y = 57 + row * 18 + p * (25 + row * 6);
        poly(ctx, [[x, y], [x + 13, y + 2], [x + 11, y + 13], [x - 2, y + 10]], '#426c85', alpha * (1 - p * .35), '#c9ecfa', 2);
      }
    }
    line(ctx, 42, 96, 150, 96, '#ffbd65', 7, alpha * p);
  }
}

function drawDarkSpark(ctx, frame) {
  const alpha = fade(frame, 7, 86, 102);
  const lens = easeOut(segment(frame, 0, 24));
  ring(ctx, 96, 82, 17 + lens * 35, '#8861c2', 4, alpha * lens);
  ring(ctx, 96, 82, 9 + lens * 20, '#261232', 7, alpha * lens);
  diamond(ctx, 96, 82, 7 + lens * 7, '#08050d', alpha, '#d7adff');
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#251535'; ctx.fillRect(48, 126, 96, 16); ctx.fillStyle = '#b28be8'; ctx.fillRect(53, 131, 86, 6); ctx.restore();
  if (frame >= 23) {
    const cut = easeOut(segment(frame, 23, 69));
    line(ctx, 42, 45, 150, 151, '#d592ff', 6, alpha * cut);
    line(ctx, 47, 39, 155, 145, '#2c123e', 2, alpha * cut);
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#090611'; ctx.fillRect(Math.round(96 + cut * 43), 126, Math.round(43 * cut), 16); ctx.restore();
  }
  if (frame >= 69) {
    const p = easeOut(segment(frame, 69, 86));
    drawDigit(ctx, 1, 58, 54, 5, '#efdcff', alpha);
    line(ctx, 84, 52, 105, 117, '#d48aff', 4, alpha * p);
    drawDigit(ctx, 2, 111, 54, 5, '#efdcff', alpha);
    ring(ctx, 96, 99, 17 + p * 56, '#7f4ba3', 5, alpha);
    for (let i = 0; i < 8; i += 1) line(ctx, 96, 99, 96 + Math.cos(i * Math.PI / 4) * (25 + p * 45), 99 + Math.sin(i * Math.PI / 4) * (25 + p * 45), '#39204c', 3, alpha * p);
  }
}

function drawPhoenix(ctx, frame, sceneContext) {
  const alpha = fade(frame, 10, 122, 148);
  const enemyField = sceneGroupPoint(sceneContext, 'hostileTargets', { x: 28, y: 49 });
  const revivedAlly = sceneGroupPoint(sceneContext, 'alliedTargets', { x: 72, y: 53 });
  const seal = easeOut(segment(frame, 0, 34));
  ring(ctx, 96, 91, 15 + seal * 56, '#ff7a38', 4, alpha * seal);
  diamond(ctx, 96, 91, 9 + seal * 16, '#fff1b2', alpha, '#ff5c35');
  poly(ctx, [[96, 91], [52, 52 - seal * 8], [61, 91], [37, 112 + seal * 9], [83, 111], [96, 143], [109, 111], [155, 112 + seal * 9], [131, 91], [140, 52 - seal * 8]], 'rgba(221,55,30,.4)', alpha * seal, '#ffc65c', 3);
  if (frame >= 33) {
    const wings = easeOut(segment(frame, 33, 92));
    for (let i = 0; i < 6; i += 1) {
      flame(ctx, 48 + i * 19, 135 - Math.sin(i * .7) * 25, 28 + wings * (17 + i % 3 * 9), 13, i % 2 ? '#ffce5b' : '#ef4a2b', alpha, i - 3);
    }
  }
  if (frame >= 92) {
    const p = easeOut(segment(frame, 92, 122));
    burst(ctx, enemyField.x, enemyField.y, 18 + p * 66, 15, '#ff9b43', alpha, .1);
    ring(ctx, enemyField.x, enemyField.y, 15 + p * 54, '#ff4b30', 6, alpha);
    ring(ctx, revivedAlly.x, revivedAlly.y, 12 + p * 43, '#fff1af', 5, alpha);
    line(ctx, revivedAlly.x, revivedAlly.y + 30, revivedAlly.x, revivedAlly.y - 31 - p * 24, '#fffce2', 8, alpha * p);
    for (let i = 0; i < 7; i += 1) diamond(ctx, revivedAlly.x - 27 + i * 9, revivedAlly.y + 24 - p * (30 + i % 2 * 15), 4, '#ffdf7a', alpha * p, '#ffffff');
  }
}

function drawSylph(ctx, frame, sceneContext) {
  const alpha = fade(frame, 8, 99, 118);
  const enemyField = sceneGroupPoint(sceneContext, 'hostileTargets', { x: 29, y: 48 });
  const partyField = sceneGroupPoint(sceneContext, 'alliedTargets', { x: 70, y: 55 });
  const seal = easeOut(segment(frame, 0, 28));
  diamond(ctx, 96, 76, 17 + seal * 8, '#b9ffe4', alpha * seal, '#72d7b5');
  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2 + frame * .025;
    poly(ctx, [[96 + Math.cos(a) * 16, 76 + Math.sin(a) * 16], [96 + Math.cos(a - .22) * (35 + seal * 25), 76 + Math.sin(a - .22) * (28 + seal * 18)], [96 + Math.cos(a + .22) * (35 + seal * 25), 76 + Math.sin(a + .22) * (28 + seal * 18)]], '#7ee0bd', alpha * seal, '#edfff9', 2);
  }
  if (frame >= 27) {
    const draw = easeInOut(segment(frame, 27, 78));
    for (let i = 0; i < 9; i += 1) {
      const t = (draw + i * .085) % 1;
      const x = enemyField.x + (partyField.x - enemyField.x) * t;
      const y = enemyField.y + (partyField.y - enemyField.y) * t - Math.sin(t * Math.PI) * (18 + i % 3 * 6);
      poly(ctx, [[x, y - 7], [x + 4, y], [x, y + 7], [x - 11, y]], '#bfffe8', alpha, '#65cda7', 1);
    }
    ring(ctx, enemyField.x, enemyField.y, 13 + draw * 29, '#5cc89d', 3, alpha * draw);
  }
  if (frame >= 78) {
    const p = easeOut(segment(frame, 78, 99));
    ring(ctx, partyField.x, partyField.y, 13 + p * 39, '#8ff3cb', 5, alpha);
    for (let i = 0; i < 8; i += 1) {
      const a = i * Math.PI / 4;
      poly(ctx, [[partyField.x + Math.cos(a) * 11, partyField.y + Math.sin(a) * 11], [partyField.x + Math.cos(a - .2) * (26 + p * 32), partyField.y + Math.sin(a - .2) * (22 + p * 26)], [partyField.x + Math.cos(a + .2) * (26 + p * 32), partyField.y + Math.sin(a + .2) * (22 + p * 26)]], '#dffff4', alpha * p, '#71dab6', 1);
    }
  }
}

function drawOdin(ctx, frame, sceneContext) {
  const alpha = fade(frame, 9, 121, 146);
  const seal = easeOut(segment(frame, 0, 33));
  ring(ctx, 96, 93, 18 + seal * 52, '#bf9aef', 4, alpha * seal);
  poly(ctx, [[96, 29], [113, 68], [150, 93], [113, 118], [96, 157], [79, 118], [42, 93], [79, 68]], 'rgba(56,34,92,.45)', alpha * seal, '#dfc8ff', 3);
  diamond(ctx, 96, 93, 15 + seal * 8, '#6e4f99', alpha, '#f7efff');
  if (frame >= 32) {
    const judge = easeOut(segment(frame, 32, 96));
    line(ctx, 45, 139, 146, 48, '#f7e8ff', 5, alpha * judge);
    line(ctx, 43, 151, 156, 38, '#7554a6', 2, alpha * judge);
    poly(ctx, [[55, 44], [70, 54], [130, 132], [119, 143]], '#b894de', alpha * judge, '#ffffff', 2);
  }
  if (frame >= 96) {
    const p = easeOut(segment(frame, 96, 121));
    const outcome = String(sceneContext?.odinOutcome ?? sceneContext?.outcome ?? sceneContext?.resultType ?? 'blade').toLowerCase();
    const spear = outcome.includes('spear') || outcome.includes('gungnir') || outcome.includes('lance') || outcome === 'mixed';
    const blade = !spear || outcome === 'mixed';
    if (spear) {
      poly(ctx, [[28 - p * 12, 145], [119 + p * 28, 52], [108, 43], [145 + p * 16, 35], [137, 73], [128, 61]], '#e8dcff', alpha, '#8d69bd', 3);
      burst(ctx, 134, 57, 14 + p * 54, 12, '#f7efff', alpha, Math.PI / 12);
    }
    if (blade) {
      line(ctx, 29 - p * 14, 146 + p * 10, 158 + p * 10, 34 - p * 12, '#ffffff', 9, alpha);
      line(ctx, 38 - p * 10, 155, 166, 43 - p * 8, '#a776dd', 5, alpha);
      for (let i = 0; i < 7; i += 1) line(ctx, 52 + i * 14, 42, 35 + i * 18, 153, i % 2 ? '#482557' : '#c898eb', 3, alpha * p);
    }
  }
}

function drawGolem(ctx, frame) {
  const alpha = fade(frame, 9, 109, 132);
  const seal = easeOut(segment(frame, 0, 30));
  diamond(ctx, 96, 74, 19 + seal * 10, '#aa8d64', alpha * seal, '#f1dfbd');
  ring(ctx, 96, 74, 28 + seal * 36, '#8c7255', 4, alpha * seal);
  if (frame >= 29) {
    const build = easeOut(segment(frame, 29, 88));
    const slabs = [[39, 59, 34, 91], [66, 46, 39, 108], [98, 42, 39, 112], [130, 58, 27, 92]];
    slabs.forEach(([x, y, width, height], index) => {
      const lift = (1 - build) * (55 + index * 8);
      poly(ctx, [[x, y + lift], [x + width, y + 7 + lift], [x + width - 5, y + height + lift], [x + 4, y + height - 4 + lift]], index % 2 ? '#675b4d' : '#81705b', alpha * build, '#d5c39f', 3);
      for (let rune = 0; rune < 3; rune += 1) line(ctx, x + 8, y + 25 + rune * 18 + lift, x + width - 9, y + 20 + rune * 18 + lift, '#bca77c', 2, alpha * build);
    });
  }
  if (frame >= 88) {
    const p = easeOut(segment(frame, 88, 109));
    poly(ctx, [[29, 157], [37 - p * 8, 45], [96, 21 - p * 8], [155 + p * 8, 45], [163, 157]], 'rgba(109,92,68,.3)', alpha * p, '#f0ddb0', 6);
    for (let i = 0; i < 5; i += 1) line(ctx, 45 + i * 25, 54, 37 + i * 30, 148, '#bba77e', 3, alpha * p);
  }
}

function drawCarbuncle(ctx, frame) {
  const alpha = fade(frame, 9, 112, 134);
  const seal = easeOut(segment(frame, 0, 31));
  diamond(ctx, 96, 72, 17 + seal * 20, '#f18dce', alpha * seal, '#fff2ff');
  diamond(ctx, 96, 72, 8 + seal * 9, '#c7f7ff', alpha, '#ffffff');
  for (let i = 0; i < 6; i += 1) {
    const a = i * Math.PI / 3 + frame * .02;
    diamond(ctx, 96 + Math.cos(a) * (31 + seal * 25), 72 + Math.sin(a) * (24 + seal * 18), 6, i % 2 ? '#8adcf2' : '#e78bc8', alpha * seal, '#ffffff');
  }
  if (frame >= 30) {
    const mirrors = easeOut(segment(frame, 30, 90));
    for (let i = 0; i < 5; i += 1) {
      const x = 48 + i * 24; const y = 102 + (i % 2) * 20;
      poly(ctx, [[x, y - 19], [x + 12, y], [x, y + 19], [x - 12, y]], 'rgba(114,210,239,.35)', alpha * mirrors, i % 2 ? '#ffb4e2' : '#b9f5ff', 3);
      line(ctx, x - 7, y + 8, x + 8, y - 9, '#ffffff', 2, alpha * mirrors);
    }
  }
  if (frame >= 90) {
    const p = easeOut(segment(frame, 90, 112));
    poly(ctx, [[96, 25 - p * 6], [157 + p * 7, 61], [157 + p * 7, 132], [96, 166 + p * 6], [35 - p * 7, 132], [35 - p * 7, 61]], 'rgba(130,215,244,.18)', alpha * p, '#f1c5ff', 5);
    for (let i = 0; i < 8; i += 1) {
      const a = i * Math.PI / 4;
      line(ctx, 96, 96, 96 + Math.cos(a) * (45 + p * 38), 96 + Math.sin(a) * (45 + p * 38), i % 2 ? '#ffb9e5' : '#bff6ff', 3, alpha * p);
    }
  }
}

function drawQuick(ctx, frame) {
  const alpha = fade(frame, 8, 101, 120);
  const form = easeOut(segment(frame, 0, 28));
  [-32, 32].forEach((offset, index) => {
    ring(ctx, 96 + offset, 86, 27, index ? '#9de9ff' : '#ffe08b', 3, alpha * form);
    for (let tick = 0; tick < 8; tick += 1) {
      const a = tick * Math.PI / 4;
      line(ctx, 96 + offset + Math.cos(a) * 19, 86 + Math.sin(a) * 19, 96 + offset + Math.cos(a) * 25, 86 + Math.sin(a) * 25, '#ffffff', 2, alpha * form);
    }
    const hand = -Math.PI / 2 + frame * (index ? .23 : .18);
    line(ctx, 96 + offset, 86, 96 + offset + Math.cos(hand) * 18, 86 + Math.sin(hand) * 18, index ? '#b9f4ff' : '#fff4b1', 3, alpha);
  });
  if (frame >= 27) {
    const split = easeOut(segment(frame, 27, 81));
    poly(ctx, [[44, 124], [82, 111], [82, 153], [44, 166]], 'rgba(247,198,79,.25)', alpha * split, '#ffe7a2', 3);
    poly(ctx, [[110, 111], [148, 124], [148, 166], [110, 153]], 'rgba(92,203,235,.25)', alpha * split, '#bff5ff', 3);
    line(ctx, 96, 43, 96, 164, '#ffffff', 3, alpha * split);
  }
  if (frame >= 81) {
    const p = easeOut(segment(frame, 81, 101));
    drawDigit(ctx, 1, 53, 116, 4, '#fff4ba', alpha);
    drawDigit(ctx, 2, 119, 116, 4, '#d7faff', alpha);
    burst(ctx, 96, 96, 17 + p * 62, 16, '#ffffff', alpha, Math.PI / 16);
  }
}

function drawMute(ctx, frame) {
  const alpha = fade(frame, 8, 91, 108);
  const field = easeOut(segment(frame, 0, 25));
  for (let i = 0; i < 5; i += 1) ring(ctx, 96, 96, 17 + i * 15 * field, '#7db3d5', 3, alpha * field, -.8, .8);
  poly(ctx, [[58, 84], [77, 84], [96, 66], [96, 126], [77, 108], [58, 108]], '#9edcf0', alpha * field, '#f1ffff', 3);
  if (frame >= 24) {
    const cancel = easeOut(segment(frame, 24, 72));
    for (let i = 0; i < 6; i += 1) {
      const y = 51 + i * 18;
      line(ctx, 45, y, 148, y + (i % 2 ? 8 : -8), '#2d4665', 5, alpha * cancel);
      line(ctx, 46, y + (i % 2 ? 9 : -7), 149, y, '#a7dcf0', 2, alpha * cancel);
    }
  }
  if (frame >= 72) {
    const p = easeOut(segment(frame, 72, 91));
    ring(ctx, 96, 96, 19 + p * 61, '#d9f7ff', 5, alpha);
    line(ctx, 48 - p * 8, 49 - p * 8, 144 + p * 8, 143 + p * 8, '#eafcff', 9, alpha);
    line(ctx, 144 + p * 8, 49 - p * 8, 48 - p * 8, 143 + p * 8, '#45627d', 5, alpha);
  }
}

function drawBanish(ctx, frame, sceneContext) {
  const alpha = fade(frame, 8, 95, 112);
  const outcome = String(sceneContext?.banishOutcome ?? sceneContext?.outcome ?? sceneContext?.resultType ?? 'removed').toLowerCase();
  const blocked = outcome.includes('block') || outcome.includes('resist');
  const iris = easeOut(segment(frame, 0, 26));
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4 + frame * .025;
    poly(ctx, [[96 + Math.cos(a) * 13, 96 + Math.sin(a) * 13], [96 + Math.cos(a - .3) * (28 + iris * 42), 96 + Math.sin(a - .3) * (28 + iris * 42)], [96 + Math.cos(a + .3) * (28 + iris * 42), 96 + Math.sin(a + .3) * (28 + iris * 42)]], i % 2 ? '#533871' : '#181326', alpha * iris, '#ad87d1', 2);
  }
  ring(ctx, 96, 96, 10 + iris * 28, '#090611', 8, alpha);
  if (frame >= 25) {
    const fold = easeInOut(segment(frame, 25, 76));
    for (let i = 0; i < 7; i += 1) {
      const radius = blocked ? 72 - fold * (17 + i) : 72 - fold * (38 + i * 3);
      ring(ctx, 96, 96, Math.max(4, radius), i % 2 ? '#8a63ad' : '#2c1a3e', 3, alpha, frame * .04 + i, frame * .04 + i + Math.PI * 1.3);
    }
    if (!blocked) poly(ctx, [[76 + fold * 17, 49 + fold * 42], [116 - fold * 17, 49 + fold * 42], [128 - fold * 28, 139 - fold * 42], [64 + fold * 28, 139 - fold * 42]], '#a692b9', alpha * (1 - fold * .75), '#f4efff', 2);
    else poly(ctx, [[96, 42], [142, 66], [142, 126], [96, 151], [50, 126], [50, 66]], 'rgba(176,205,226,.24)', alpha * fold, '#e8f6ff', 4);
  }
  if (frame >= 76) {
    const p = easeOut(segment(frame, 76, 95));
    if (blocked) {
      ring(ctx, 96, 96, 25 + p * 58, '#dff7ff', 6, alpha);
      line(ctx, 51 - p * 8, 51 - p * 8, 141 + p * 8, 141 + p * 8, '#f5ffff', 8, alpha);
      line(ctx, 141 + p * 8, 51 - p * 8, 51 - p * 8, 141 + p * 8, '#8ea8c2', 5, alpha);
      burst(ctx, 96, 96, 18 + p * 55, 10, '#bfe9ff', alpha, Math.PI / 10);
    } else {
      ring(ctx, 96, 96, 27 - p * 24, '#ffffff', 5, alpha);
      diamond(ctx, 96, 96, 18 - p * 15, '#050308', alpha, '#a47bc5');
      for (let i = 0; i < 10; i += 1) line(ctx, 38 + i * 13, 48, 96 + (i - 5) * (1 - p), 96, '#473052', 2, alpha * p);
    }
  }
}

function drawDrain(ctx, frame, sceneContext) {
  const alpha = fade(frame, 8, 92, 108);
  const target = sceneGroupPoint(sceneContext, 'hostileTargets', { x: 70, y: 49 });
  const caster = scenePoint(sceneContext, 'caster', { x: 29, y: 55 });
  const mark = easeOut(segment(frame, 0, 25));
  ring(ctx, target.x, target.y, 13 + mark * 28, '#c63f5f', 4, alpha * mark);
  poly(ctx, [[target.x, target.y - 19], [target.x + 11, target.y], [target.x, target.y + 21], [target.x - 11, target.y]], '#f05f78', alpha * mark, '#ffd7dc', 2);
  if (frame >= 24) {
    const draw = easeInOut(segment(frame, 24, 72));
    for (let i = 0; i < 8; i += 1) {
      const t = clamp(draw - i * .07);
      const x = target.x + (caster.x - target.x) * t;
      const y = target.y + (caster.y - target.y) * t - Math.sin(t * Math.PI) * 19;
      poly(ctx, [[x, y - 7], [x + 5, y], [x, y + 9], [x - 5, y]], i % 2 ? '#f17387' : '#9d294f', alpha * t, '#ffd6db', 1);
    }
  }
  if (frame >= 72) {
    const p = easeOut(segment(frame, 72, 92));
    ring(ctx, caster.x, caster.y, 12 + p * 38, '#ed7187', 5, alpha);
    line(ctx, caster.x - 25, caster.y, caster.x + 25, caster.y, '#ffe4df', 6, alpha * p);
    line(ctx, caster.x, caster.y - 25, caster.x, caster.y + 25, '#ffe4df', 6, alpha * p);
  }
}

function drawOsmose(ctx, frame, sceneContext) {
  const alpha = fade(frame, 8, 95, 112);
  const target = sceneGroupPoint(sceneContext, 'hostileTargets', { x: 70, y: 49 });
  const caster = scenePoint(sceneContext, 'caster', { x: 29, y: 55 });
  const mark = easeOut(segment(frame, 0, 26));
  diamond(ctx, target.x, target.y, 16 + mark * 12, '#658edf', alpha * mark, '#d9f4ff');
  ring(ctx, target.x, target.y, 20 + mark * 22, '#77c8ed', 3, alpha * mark);
  if (frame >= 25) {
    const draw = easeInOut(segment(frame, 25, 75));
    [-1, 1].forEach((side, lane) => {
      for (let i = 0; i < 6; i += 1) {
        const t = clamp(draw - i * .085);
        const x = target.x + (caster.x - target.x) * t;
        const y = target.y + (caster.y - target.y) * t + side * Math.sin(t * Math.PI) * 22;
        diamond(ctx, x, y, lane ? 4 : 5, lane ? '#8be8ff' : '#8d8ff0', alpha * t, '#efffff');
      }
    });
    line(ctx, target.x, target.y - 10, caster.x, caster.y - 10, '#6bc9ed', 2, alpha * draw);
    line(ctx, target.x, target.y + 10, caster.x, caster.y + 10, '#8f7cdf', 2, alpha * draw);
  }
  if (frame >= 75) {
    const p = easeOut(segment(frame, 75, 95));
    ring(ctx, caster.x, caster.y, 11 + p * 42, '#75dafa', 5, alpha);
    ring(ctx, caster.x, caster.y, 18 + p * 51, '#9f8cf2', 3, alpha);
    for (let i = 0; i < 6; i += 1) diamond(ctx, caster.x - 25 + i * 10, caster.y - 17 + (i % 2) * 34, 4, '#d8f8ff', alpha * p);
  }
}

function figureGlyph(ctx, x, y, scale, fill, alpha = 1, stroke = '#ffffff') {
  ring(ctx, x, y - 28 * scale, 8 * scale, stroke, Math.max(1, 3 * scale), alpha);
  poly(ctx, [[x, y - 18 * scale], [x + 11 * scale, y + 5 * scale], [x + 7 * scale, y + 22 * scale], [x + 18 * scale, y + 42 * scale], [x + 8 * scale, y + 46 * scale], [x, y + 29 * scale], [x - 8 * scale, y + 46 * scale], [x - 18 * scale, y + 42 * scale], [x - 7 * scale, y + 22 * scale], [x - 11 * scale, y + 5 * scale]], fill, alpha, stroke, Math.max(1, 2 * scale));
  line(ctx, x - 10 * scale, y - 3 * scale, x - 25 * scale, y + 14 * scale, stroke, Math.max(1, 3 * scale), alpha);
  line(ctx, x + 10 * scale, y - 3 * scale, x + 25 * scale, y + 14 * scale, stroke, Math.max(1, 3 * scale), alpha);
}

function drawMini(ctx, frame) {
  const alpha = fade(frame, 7, 80, 94);
  const frameIn = easeOut(segment(frame, 0, 22));
  poly(ctx, [[47, 39], [145, 39], [145, 151], [47, 151]], null, alpha * frameIn, '#cbe9ff', 3);
  for (let i = 0; i < 7; i += 1) {
    const y = 48 + i * 16;
    line(ctx, i % 2 ? 47 : 40, y, 56, y, '#8bb6d5', i % 2 ? 2 : 3, alpha * frameIn);
    line(ctx, i % 2 ? 145 : 152, y, 136, y, '#8bb6d5', i % 2 ? 2 : 3, alpha * frameIn);
  }
  const shrink = 1 - easeInOut(segment(frame, 21, 64)) * .76;
  figureGlyph(ctx, 96, 92 + (1 - shrink) * 31, shrink, '#7ba3c7', alpha, '#f1ffff');
  if (frame >= 64) {
    const p = easeOut(segment(frame, 64, 80));
    ring(ctx, 96, 123, 9 + p * 35, '#9bd8f0', 3, alpha);
    for (let i = 0; i < 8; i += 1) line(ctx, 54 + i * 12, 52, 86 + i * 3, 119, '#dff8ff', 2, alpha * p);
    diamond(ctx, 96, 123, 5, '#ffffff', alpha, '#6faac7');
  }
}

const SCRIPT_0F_PALETTES = Object.freeze({
  poison: Object.freeze(['#667844', '#a0b56a', '#47394f', '#e4efbd']),
  sleep: Object.freeze(['#607ca7', '#b8cbed', '#4b446d', '#eef4ff']),
  old: Object.freeze(['#8a765a', '#cab48a', '#51483f', '#f1e2bf']),
  toad: Object.freeze(['#5e9568', '#9bd49a', '#3d5f55', '#e5ffd9']),
});

function drawScript0FStatus(ctx, frame, variant) {
  const colors = SCRIPT_0F_PALETTES[variant] ?? SCRIPT_0F_PALETTES.poison;
  const alpha = fade(frame, 8, 88, 104);
  const seed = easeOut(segment(frame, 0, 25));
  ring(ctx, 96, 96, 16 + seed * 46, colors[1], 4, alpha * seed, -.35, Math.PI * 1.65);
  ring(ctx, 96, 96, 9 + seed * 31, colors[2], 3, alpha * seed, Math.PI * .65, Math.PI * 2.45);
  for (let i = 0; i < 6; i += 1) {
    const a = i * Math.PI / 3 + frame * .035;
    diamond(ctx, 96 + Math.cos(a) * (26 + seed * 31), 96 + Math.sin(a) * (21 + seed * 25), 5, i % 2 ? colors[0] : colors[1], alpha * seed, colors[3]);
  }
  if (frame >= 24) {
    const motion = easeInOut(segment(frame, 24, 70));
    for (let i = 0; i < 10; i += 1) {
      const a = i * Math.PI / 5 + motion * Math.PI * 1.4;
      const radius = 70 - motion * (36 + i % 3 * 6);
      const x = 96 + Math.cos(a) * radius;
      const y = 96 + Math.sin(a) * radius * .78;
      poly(ctx, [[x, y - 6], [x + 6, y], [x, y + 6], [x - 6, y]], i % 2 ? colors[0] : colors[2], alpha * motion, colors[3], 1);
    }
    poly(ctx, [[96, 45 + motion * 33], [122 - motion * 13, 96], [96, 147 - motion * 33], [70 + motion * 13, 96]], colors[2], alpha * motion, colors[3], 3);
  }
  if (frame >= 70) {
    const p = easeOut(segment(frame, 70, 88));
    ring(ctx, 96, 96, 13 + p * 59, colors[1], 5, alpha);
    burst(ctx, 96, 96, 17 + p * 57, 12, colors[3], alpha, Math.PI / 12);
    for (let i = 0; i < 4; i += 1) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      diamond(ctx, 96 + Math.cos(a) * (19 + p * 39), 96 + Math.sin(a) * (19 + p * 39), 7, colors[i % 2], alpha, colors[3]);
    }
  }
}

function drawToad(ctx, frame) {
  return drawScript0FStatus(ctx, frame, 'toad');
}

function drawBreak(ctx, frame) {
  const alpha = fade(frame, 8, 95, 112);
  const lattice = easeOut(segment(frame, 0, 26));
  for (let i = 0; i < 6; i += 1) {
    const a = i * Math.PI / 3;
    line(ctx, 96 + Math.cos(a) * 19, 96 + Math.sin(a) * 19, 96 + Math.cos(a) * (42 + lattice * 31), 96 + Math.sin(a) * (42 + lattice * 31), '#ab9e8b', 3, alpha * lattice);
  }
  figureGlyph(ctx, 96, 84, 1, '#7b7a78', alpha, '#d8d2c8');
  if (frame >= 25) {
    const stone = easeOut(segment(frame, 25, 75));
    const facets = [[96, 55, 76, 86, 95, 94], [96, 55, 117, 84, 95, 94], [76, 86, 95, 94, 82, 124], [117, 84, 95, 94, 111, 124], [82, 124, 95, 94, 111, 124], [82, 124, 96, 143, 111, 124]];
    facets.forEach((points, index) => poly(ctx, [[points[0], points[1]], [points[2], points[3]], [points[4], points[5]]], index % 2 ? '#77736c' : '#9c968b', alpha * stone, '#d9d1c2', 2));
  }
  if (frame >= 75) {
    const p = easeOut(segment(frame, 75, 95));
    poly(ctx, [[96, 29 - p * 6], [137 + p * 14, 55], [153 + p * 9, 112], [118, 158 + p * 5], [74, 158 + p * 5], [39 - p * 9, 112], [55 - p * 14, 55]], 'rgba(95,91,84,.32)', alpha * p, '#e2ddd4', 5);
    for (let i = 0; i < 5; i += 1) line(ctx, 58 + i * 19, 45, 71 + i * 13, 151, '#605b55', 3, alpha * p);
  }
}

function drawDeath(ctx, frame) {
  const alpha = fade(frame, 8, 101, 120);
  const gate = easeOut(segment(frame, 0, 29));
  poly(ctx, [[43, 151], [51, 61 + (1 - gate) * 55], [96, 28 + (1 - gate) * 83], [141, 61 + (1 - gate) * 55], [149, 151]], 'rgba(21,5,25,.7)', alpha * gate, '#bd496c', 4);
  figureGlyph(ctx, 96, 85, 1, '#3d253e', alpha, '#b783a5');
  if (frame >= 28) {
    const soul = easeInOut(segment(frame, 28, 81));
    figureGlyph(ctx, 96 + Math.sin(soul * Math.PI * 2) * 13, 84 - soul * 78, .58, '#d9e9ff', alpha * soul, '#ffffff');
    for (let i = 0; i < 8; i += 1) diamond(ctx, 71 + i * 7, 119 - soul * (41 + i * 4), 3, '#d7c7e8', alpha * soul);
  }
  if (frame >= 81) {
    const p = easeOut(segment(frame, 81, 101));
    line(ctx, 35 - p * 8, 65, 157 + p * 8, 123, '#ee6685', 8, alpha);
    line(ctx, 42 - p * 8, 52, 150 + p * 8, 137, '#3a102e', 5, alpha);
    ring(ctx, 96, 96, 19 + p * 65, '#a52e55', 5, alpha);
    diamond(ctx, 96, 96, 13 - p * 9, '#070308', alpha, '#e67995');
  }
}

function drawArise(ctx, frame) {
  const alpha = fade(frame, 9, 111, 132);
  const gather = easeOut(segment(frame, 0, 31));
  const fragments = [[48, 128], [66, 61], [95, 37], [127, 59], [145, 126], [105, 147], [75, 145]];
  fragments.forEach(([x, y], index) => {
    const a = index * Math.PI * 2 / fragments.length + frame * .02;
    diamond(ctx, x + Math.cos(a) * (1 - gather) * 20, y + Math.sin(a) * (1 - gather) * 20, 5 + index % 3, index % 2 ? '#bceaff' : '#fff0a8', alpha * gather, '#ffffff');
  });
  if (frame >= 30) {
    const assemble = easeOut(segment(frame, 30, 89));
    const y = 120 - assemble * 34;
    figureGlyph(ctx, 96, y, .55 + assemble * .45, '#b5e8ed', alpha * assemble, '#ffffff');
    poly(ctx, [[96, y], [48 - assemble * 14, y - 28], [67, y + 6], [43 - assemble * 17, y + 34], [84, y + 24]], 'rgba(171,238,255,.25)', alpha * assemble, '#dffaff', 3);
    poly(ctx, [[96, y], [144 + assemble * 14, y - 28], [125, y + 6], [149 + assemble * 17, y + 34], [108, y + 24]], 'rgba(255,230,151,.25)', alpha * assemble, '#fff2bd', 3);
  }
  if (frame >= 89) {
    const p = easeOut(segment(frame, 89, 111));
    ring(ctx, 96, 97, 15 + p * 74, '#ffffff', 6, alpha);
    burst(ctx, 96, 97, 18 + p * 69, 18, '#dffff7', alpha, Math.PI / 18);
    line(ctx, 96, 143 + p * 8, 96, 43 - p * 20, '#fffbe1', 9, alpha * p);
  }
}

function drawBlink(ctx, frame) {
  const alpha = fade(frame, 7, 86, 102);
  const mirror = easeOut(segment(frame, 0, 24));
  poly(ctx, [[96, 33], [140, 55], [151, 112], [96, 158], [41, 112], [52, 55]], 'rgba(100,190,220,.15)', alpha * mirror, '#b7edff', 3);
  figureGlyph(ctx, 96, 82, 1, '#77a8bf', alpha, '#efffff');
  if (frame >= 23) {
    const split = easeOut(segment(frame, 23, 69));
    figureGlyph(ctx, 96 - split * 42, 82, .92, '#6fc6df', alpha * split * .72, '#d8f8ff');
    figureGlyph(ctx, 96 + split * 42, 82, .92, '#988ad2', alpha * split * .72, '#f0eaff');
    for (let i = 0; i < 6; i += 1) line(ctx, 96, 46 + i * 17, 96 + (i % 2 ? 1 : -1) * split * 58, 46 + i * 17, '#cdefff', 2, alpha * split);
  }
  if (frame >= 69) {
    const p = easeOut(segment(frame, 69, 86));
    ring(ctx, 54, 101, 12 + p * 30, '#8fe5f2', 4, alpha);
    ring(ctx, 138, 101, 12 + p * 30, '#b9a8ed', 4, alpha);
    diamond(ctx, 54, 101, 7, '#eaffff', alpha); diamond(ctx, 138, 101, 7, '#f6efff', alpha);
  }
}

function drawBerserk(ctx, frame) {
  const alpha = fade(frame, 7, 86, 102);
  const pulse = easeOut(segment(frame, 0, 24));
  for (let i = 0; i < 4; i += 1) ring(ctx, 96, 98, 17 + i * 15 + Math.sin(frame * .22 + i) * 5, i % 2 ? '#8d273b' : '#f16a45', 4, alpha * pulse);
  figureGlyph(ctx, 96, 85, 1, '#622536', alpha, '#ffad87');
  if (frame >= 23) {
    const overrun = easeOut(segment(frame, 23, 69));
    for (let i = 0; i < 12; i += 1) {
      const a = i * Math.PI / 6;
      const inner = 26 + (i % 3) * 8;
      const outer = inner + overrun * (34 + i % 2 * 14);
      poly(ctx, [[96 + Math.cos(a - .11) * inner, 95 + Math.sin(a - .11) * inner], [96 + Math.cos(a) * outer, 95 + Math.sin(a) * outer], [96 + Math.cos(a + .11) * inner, 95 + Math.sin(a + .11) * inner]], i % 2 ? '#ec492f' : '#7f1d38', alpha * overrun, '#ffc176', 1);
    }
  }
  if (frame >= 69) {
    const p = easeOut(segment(frame, 69, 86));
    poly(ctx, [[96, 24 - p * 7], [112, 57], [151 + p * 10, 45], [132, 86], [165 + p * 8, 107], [124, 114], [135, 160 + p * 7], [96, 132], [57, 160 + p * 7], [68, 114], [27 - p * 8, 107], [60, 86], [41 - p * 10, 45], [80, 57]], null, alpha, '#ff714a', 5);
    burst(ctx, 96, 98, 19 + p * 67, 14, '#ffbd6a', alpha, frame * .04);
  }
}

function drawDispel(ctx, frame) {
  const alpha = fade(frame, 8, 93, 110);
  const orbits = easeOut(segment(frame, 0, 26));
  const colors = ['#7ee8ff', '#ffe781', '#a0f0b3', '#dc9aff'];
  colors.forEach((color, index) => ring(ctx, 96, 96, 22 + index * 14, color, 3, alpha * orbits, frame * .025 + index, frame * .025 + index + Math.PI * 1.55));
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4 + frame * .018;
    diamond(ctx, 96 + Math.cos(a) * 61, 96 + Math.sin(a) * 49, 5, colors[i % colors.length], alpha * orbits, '#ffffff');
  }
  if (frame >= 25) {
    const peel = easeOut(segment(frame, 25, 74));
    colors.forEach((color, index) => {
      const a = index * Math.PI / 2 + peel * Math.PI * .7;
      line(ctx, 96 + Math.cos(a) * 18, 96 + Math.sin(a) * 18, 96 + Math.cos(a) * (34 + peel * 66), 96 + Math.sin(a) * (34 + peel * 66), color, 5, alpha * peel);
    });
  }
  if (frame >= 74) {
    const p = easeOut(segment(frame, 74, 93));
    for (let i = 0; i < 12; i += 1) {
      const a = i * Math.PI / 6;
      const x = 96 + Math.cos(a) * (26 + p * 67); const y = 96 + Math.sin(a) * (21 + p * 55);
      poly(ctx, [[x - 5, y - 7], [x + 7, y - 3], [x + 3, y + 8], [x - 6, y + 4]], colors[i % colors.length], alpha * (1 - p * .38), '#ffffff', 1);
    }
    ring(ctx, 96, 96, 47 - p * 42, '#ffffff', 5, alpha);
  }
}

function drawEsuna(ctx, frame) {
  const alpha = fade(frame, 8, 98, 116);
  const diagnose = easeOut(segment(frame, 0, 28));
  const knots = [[62, 65], [96, 48], [132, 68], [130, 119], [96, 143], [60, 120]];
  const colors = ['#9d78cd', '#79c2df', '#d68b74', '#88b76f', '#d9c16e', '#8f7baf'];
  knots.forEach(([x, y], index) => {
    ring(ctx, x, y, 9 + index % 3 * 2, colors[index], 3, alpha * diagnose);
    line(ctx, x - 8, y - 8, x + 8, y + 8, '#4d3f63', 2, alpha * diagnose);
    line(ctx, x + 8, y - 8, x - 8, y + 8, '#4d3f63', 2, alpha * diagnose);
  });
  if (frame >= 27) {
    const prism = easeOut(segment(frame, 27, 78));
    poly(ctx, [[96, 28], [151, 64], [142, 132], [96, 162], [50, 132], [41, 64]], 'rgba(178,239,235,.18)', alpha * prism, '#eafff9', 4);
    knots.forEach(([x, y], index) => line(ctx, x, y, 96, 96, colors[index], 3, alpha * prism));
    diamond(ctx, 96, 96, 11 + prism * 10, '#f0ffff', alpha, '#8fe5d2');
  }
  if (frame >= 78) {
    const p = easeOut(segment(frame, 78, 98));
    knots.forEach(([x, y], index) => {
      const outX = x + (x - 96) * p; const outY = y + (y - 96) * p;
      burst(ctx, outX, outY, 7 + p * (15 + index), 4 + index, colors[index], alpha * (1 - p * .35), index * .1);
    });
    ring(ctx, 96, 96, 15 + p * 68, '#effff8', 6, alpha);
    line(ctx, 96, 66, 96, 126, '#ffffff', 8, alpha * p); line(ctx, 66, 96, 126, 96, '#ffffff', 8, alpha * p);
  }
}

function drawConfuse(ctx, frame) {
  const alpha = fade(frame, 7, 84, 100);
  const mark = easeOut(segment(frame, 0, 23));
  ring(ctx, 96, 96, 54, '#d0a2eb', 4, alpha * mark);
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const next = a + (i % 2 ? .85 : -.85);
    line(ctx, 96 + Math.cos(a) * 34, 96 + Math.sin(a) * 34, 96 + Math.cos(next) * 50, 96 + Math.sin(next) * 50, i % 2 ? '#79d3e5' : '#d890de', 3, alpha * mark);
  }
  if (frame >= 22) {
    const orbit = easeInOut(segment(frame, 22, 67));
    for (let i = 0; i < 3; i += 1) {
      const a = orbit * Math.PI * (4 + i) + i * Math.PI * 2 / 3;
      figureGlyph(ctx, 96 + Math.cos(a) * (20 + i * 15), 78 + Math.sin(a) * (15 + i * 10), .38 + i * .08, i % 2 ? '#8abbd1' : '#a17fba', alpha * orbit, '#efffff');
    }
    line(ctx, 96, 96, 96 + Math.cos(orbit * Math.PI * 5) * 43, 96 + Math.sin(orbit * Math.PI * 5) * 43, '#fff0a1', 5, alpha * orbit);
  }
  if (frame >= 67) {
    const p = easeOut(segment(frame, 67, 84));
    for (let i = 0; i < 9; i += 1) {
      const a = i * Math.PI * 2 / 9 + p * Math.PI;
      diamond(ctx, 96 + Math.cos(a) * (23 + p * 53), 96 + Math.sin(a) * (19 + p * 43), 5, i % 2 ? '#76d7e8' : '#d087dc', alpha, '#ffffff');
    }
    poly(ctx, [[96, 40], [112, 76], [151, 59], [126, 96], [151, 132], [111, 117], [96, 153], [81, 117], [41, 132], [66, 96], [41, 59], [80, 76]], null, alpha, '#f0c2ff', 4);
  }
}

function drawLibra(ctx, frame) {
  const alpha = fade(frame, 8, 91, 108);
  const frameIn = easeOut(segment(frame, 0, 26));
  poly(ctx, [[39, 40], [153, 40], [153, 153], [39, 153]], null, alpha * frameIn, '#9ee9ff', 3);
  for (let i = 0; i < 5; i += 1) {
    line(ctx, 47, 52 + i * 22, 145, 52 + i * 22, '#376b85', 1, alpha * frameIn);
    line(ctx, 52 + i * 22, 47, 52 + i * 22, 145, '#376b85', 1, alpha * frameIn);
  }
  figureGlyph(ctx, 96, 81, .85, '#4a7d92', alpha * frameIn, '#c8f5ff');
  if (frame >= 25) {
    const sweep = easeInOut(segment(frame, 25, 73));
    const y = 45 + sweep * 103;
    line(ctx, 40, y, 152, y, '#ffffff', 5, alpha);
    line(ctx, 43, y - 7, 149, y - 7, '#62dff5', 2, alpha * .8);
    for (let i = 0; i < 7; i += 1) {
      const width = 10 + ((i * 17) % 31);
      ctx.save(); ctx.globalAlpha = alpha * sweep; ctx.fillStyle = i % 2 ? '#6db7d0' : '#d8f8ff'; ctx.fillRect(43, 47 + i * 15, width, 4); ctx.fillRect(149 - width, 47 + i * 15, width, 4); ctx.restore();
    }
  }
  if (frame >= 73) {
    const p = easeOut(segment(frame, 73, 91));
    ring(ctx, 96, 96, 15 + p * 49, '#c9f8ff', 4, alpha);
    line(ctx, 96, 35, 96, 64, '#ffffff', 3, alpha * p); line(ctx, 96, 128, 96, 157, '#ffffff', 3, alpha * p);
    line(ctx, 35, 96, 64, 96, '#ffffff', 3, alpha * p); line(ctx, 128, 96, 157, 96, '#ffffff', 3, alpha * p);
    diamond(ctx, 96, 96, 8, '#eaffff', alpha, '#5bc5e5');
  }
}

function drawPoisona(ctx, frame) {
  const alpha = fade(frame, 7, 86, 102);
  const locate = easeOut(segment(frame, 0, 24));
  figureGlyph(ctx, 96, 82, .88, '#5c7b69', alpha * locate, '#d9f5e5');
  const toxinPoints = [[87, 75], [105, 86], [92, 111], [111, 121]];
  toxinPoints.forEach(([x, y], index) => poly(ctx, [[x, y - 7], [x + 5, y], [x, y + 9], [x - 5, y]], index % 2 ? '#6b7c49' : '#87654c', alpha * locate, '#cbd39e', 1));
  if (frame >= 23) {
    const extract = easeInOut(segment(frame, 23, 69));
    toxinPoints.forEach(([x, y], index) => {
      const targetX = 129 + (index % 2) * 8; const targetY = 48 + Math.floor(index / 2) * 5;
      const t = clamp(extract - index * .06);
      const px = x + (targetX - x) * t; const py = y + (targetY - y) * t - Math.sin(t * Math.PI) * 15;
      poly(ctx, [[px, py - 6], [px + 4, py], [px, py + 7], [px - 4, py]], '#70834e', alpha * t, '#efffc5', 1);
    });
    poly(ctx, [[122, 46], [144, 46], [140, 62], [145, 96], [121, 96], [126, 62]], 'rgba(124,148,80,.3)', alpha * extract, '#eaffd0', 2);
  }
  if (frame >= 69) {
    const p = easeOut(segment(frame, 69, 86));
    line(ctx, 118, 42, 148, 99, '#ffffff', 6, alpha * p);
    line(ctx, 149, 42, 118, 99, '#b3eeb6', 4, alpha * p);
    ring(ctx, 96, 103, 12 + p * 42, '#c8f5d7', 4, alpha);
    burst(ctx, 96, 103, 12 + p * 45, 9, '#effff5', alpha, .2);
  }
}

function drawSilence(ctx, frame) {
  const alpha = fade(frame, 7, 83, 98);
  const source = easeOut(segment(frame, 0, 23));
  poly(ctx, [[63, 81], [79, 72], [103, 72], [124, 84], [103, 101], [79, 101], [63, 92]], '#7d7292', alpha * source, '#e6ddf3', 3);
  for (let i = 0; i < 4; i += 1) ring(ctx, 112, 87, 13 + i * 12 * source, '#c5add8', 3, alpha * source, -.65, .65);
  if (frame >= 22) {
    const contract = easeOut(segment(frame, 22, 66));
    for (let i = 0; i < 5; i += 1) {
      const radius = (58 - i * 10) * (1 - contract * .72);
      ring(ctx, 96, 91, Math.max(7, radius), i % 2 ? '#756184' : '#d6c5e2', 2, alpha * contract, -.7, .7);
    }
    poly(ctx, [[96 - contract * 27, 60], [96 + contract * 27, 60], [103 + contract * 20, 111], [89 - contract * 20, 111]], 'rgba(78,54,91,.25)', alpha * contract, '#c6b1d2', 2);
  }
  if (frame >= 66) {
    const p = easeOut(segment(frame, 66, 83));
    ring(ctx, 96, 72, 17, '#f0e5f5', 5, alpha * p, Math.PI, Math.PI * 2);
    poly(ctx, [[73, 72], [119, 72], [119, 125], [73, 125]], '#493956', alpha * p, '#d9c9e2', 4);
    diamond(ctx, 96, 97, 8, '#dbcbe3', alpha * p, '#ffffff');
    line(ctx, 96, 104, 96, 118, '#f7eeff', 4, alpha * p);
  }
}

function drawPoison(ctx, frame) {
  return drawScript0FStatus(ctx, frame, 'poison');
}

function drawSleep(ctx, frame) {
  return drawScript0FStatus(ctx, frame, 'sleep');
}

function drawBio(ctx, frame) {
  const alpha = fade(frame, 8, 98, 116);
  const cells = easeOut(segment(frame, 0, 28));
  const cellPoints = [[61, 64], [95, 52], [130, 67], [65, 111], [101, 101], [135, 119], [93, 142]];
  cellPoints.forEach(([x, y], index) => {
    const radius = 11 + index % 3 * 3;
    poly(ctx, [[x, y - radius], [x + radius * .86, y - radius * .5], [x + radius * .86, y + radius * .5], [x, y + radius], [x - radius * .86, y + radius * .5], [x - radius * .86, y - radius * .5]], index % 2 ? '#60456f' : '#4a654e', alpha * cells, '#bca3c8', 2);
  });
  if (frame >= 27) {
    const collapse = easeOut(segment(frame, 27, 78));
    for (let i = 0; i < 10; i += 1) {
      const y = 42 + i * 11;
      const wave = Math.sin(i * .95 + frame * .08) * (24 - collapse * 11);
      diamond(ctx, 96 + wave, y, 4, i % 2 ? '#b67fc0' : '#7fa475', alpha * collapse, '#e8d6ed');
      diamond(ctx, 96 - wave, y, 4, i % 2 ? '#7fa475' : '#b67fc0', alpha * collapse, '#e8d6ed');
      if (i < 9) line(ctx, 96 + wave, y, 96 - wave, y, '#54455e', 2, alpha * collapse);
    }
  }
  if (frame >= 78) {
    const p = easeOut(segment(frame, 78, 98));
    cellPoints.forEach(([x, y], index) => {
      const dx = x - 96; const dy = y - 96;
      poly(ctx, [[x + dx * p, y + dy * p - 7], [x + dx * p + 8, y + dy * p], [x + dx * p, y + dy * p + 8], [x + dx * p - 8, y + dy * p]], '#382d3d', alpha * (1 - p * .35), '#9d789b', 2);
    });
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#211a2b'; ctx.fillRect(48, 145, 96, 11); ctx.fillStyle = '#9870a3'; ctx.fillRect(52, 148, Math.round(88 * (1 - p)), 5); ctx.restore();
    line(ctx, 96, 96, 96, 148, '#b17cb7', 5, alpha * p);
  }
}

function drawSpeed(ctx, frame) {
  return drawMute(ctx, frame);
}

function drawRegen(ctx, frame) {
  const alpha = fade(frame, 8, 96, 114);
  const seed = easeOut(segment(frame, 0, 26));
  diamond(ctx, 96, 88, 15 + seed * 9, '#8fe0b3', alpha * seed, '#ecfff4');
  ring(ctx, 96, 88, 24 + seed * 20, '#71cfa1', 3, alpha * seed);
  if (frame >= 25) {
    const pulse = easeOut(segment(frame, 25, 76));
    const baseline = 117;
    const points = [[38, baseline], [60, baseline], [70, baseline - 10], [78, baseline + 14], [90, baseline - 33], [102, baseline + 25], [114, baseline - 7], [126, baseline], [154, baseline]];
    for (let i = 0; i < points.length - 1; i += 1) {
      const local = clamp(pulse * (points.length - 1) - i);
      line(ctx, points[i][0], points[i][1], points[i][0] + (points[i + 1][0] - points[i][0]) * local, points[i][1] + (points[i + 1][1] - points[i][1]) * local, '#b9ffe0', 4, alpha * pulse);
    }
    for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
      const wave = (pulse + ringIndex * .29) % 1;
      ring(ctx, 96, 88, 17 + wave * 54, ringIndex % 2 ? '#dffff0' : '#71d49f', 3, alpha * (1 - wave));
    }
  }
  if (frame >= 76) {
    const p = easeOut(segment(frame, 76, 96));
    line(ctx, 96, 129, 96, 54 - p * 14, '#effff7', 8, alpha * p);
    line(ctx, 62 - p * 7, 88, 130 + p * 7, 88, '#effff7', 8, alpha * p);
    for (let i = 0; i < 10; i += 1) diamond(ctx, 55 + i * 9, 142 - p * (31 + i % 3 * 12), 3, '#91efbd', alpha * p);
  }
}

function drawFloat(ctx, frame) {
  const alpha = fade(frame, 8, 91, 108);
  const ground = easeOut(segment(frame, 0, 25));
  line(ctx, 35, 148, 157, 148, '#9a8b70', 5, alpha * ground);
  for (let i = 0; i < 7; i += 1) line(ctx, 48 + i * 15, 148, 39 + i * 18, 161, '#6c6559', 2, alpha * ground);
  const lift = easeOut(segment(frame, 24, 73));
  figureGlyph(ctx, 96, 88 - lift * 39, .82, '#8cb8c5', alpha, '#eaffff');
  ring(ctx, 96, 143, 25 - lift * 9, '#657680', 3, alpha * (1 - lift * .5), 0, Math.PI * 2);
  if (frame >= 24) {
    for (let i = 0; i < 7; i += 1) {
      const x = 55 + i * 14;
      line(ctx, x, 135 - lift * (8 + i % 3 * 7), x + (i % 2 ? 7 : -7), 112 - lift * (14 + i % 2 * 9), '#bceef2', 3, alpha * lift);
    }
  }
  if (frame >= 73) {
    const p = easeOut(segment(frame, 73, 91));
    poly(ctx, [[45, 120], [65, 104 - p * 13], [96, 113 - p * 22], [127, 104 - p * 13], [147, 120], [127, 136], [96, 128], [65, 136]], 'rgba(136,216,224,.2)', alpha * p, '#d9ffff', 4);
    ring(ctx, 96, 104 - p * 19, 18 + p * 49, '#b9f7ff', 3, alpha);
  }
}

function drawOld(ctx, frame) {
  return drawScript0FStatus(ctx, frame, 'old');
}

function drawRemora(ctx, frame) {
  const alpha = fade(frame, 8, 90, 106);
  const seal = easeOut(segment(frame, 0, 25));
  diamond(ctx, 96, 93, 16 + seal * 13, '#6b8b9b', alpha * seal, '#e8fbff');
  ring(ctx, 96, 93, 27 + seal * 32, '#8bb5c3', 4, alpha * seal, -.5, Math.PI * 1.6);
  if (frame >= 24) {
    const bind = easeOut(segment(frame, 24, 71));
    const anchors = [[38, 45], [154, 45], [164, 130], [28, 130]];
    anchors.forEach(([x, y], index) => {
      const links = 5;
      for (let linkIndex = 0; linkIndex < links; linkIndex += 1) {
        const t = (linkIndex + 1) / links * bind;
        const px = x + (96 - x) * t; const py = y + (96 - y) * t;
        ring(ctx, px, py, 7, index % 2 ? '#a8d2db' : '#637d89', 3, alpha * bind, index % 2 ? 0 : Math.PI / 2, index % 2 ? Math.PI * 2 : Math.PI * 2.5);
      }
      poly(ctx, [[x, y], [x + (index % 2 ? -12 : 12), y + 19], [x + (index % 2 ? 6 : -6), y + 27]], '#758f99', alpha * bind, '#e7f6f7', 2);
    });
  }
  if (frame >= 71) {
    const p = easeOut(segment(frame, 71, 90));
    poly(ctx, [[51 - p * 9, 54], [141 + p * 9, 54], [152 + p * 8, 100], [132, 145 + p * 7], [60, 145 + p * 7], [40 - p * 8, 100]], 'rgba(73,94,104,.3)', alpha * p, '#d9ecef', 5);
    for (let i = 0; i < 6; i += 1) line(ctx, 47, 62 + i * 16, 145, 72 + i * 12, '#657d86', 3, alpha * p);
  }
}

function drawCatoblepas(ctx, frame) {
  const alpha = fade(frame, 9, 100, 118);
  const seal = easeOut(segment(frame, 0, 28));
  diamond(ctx, 96, 68, 18 + seal * 15, '#8a718f', alpha * seal, '#f1e2f4');
  poly(ctx, [[35, 96], [65, 69], [96, 59], [127, 69], [157, 96], [127, 123], [96, 133], [65, 123]], 'rgba(94,73,102,.25)', alpha * seal, '#c9b6d2', 3);
  ring(ctx, 96, 96, 18 + seal * 14, '#d7c4db', 5, alpha);
  diamond(ctx, 96, 96, 8 + seal * 6, '#433747', alpha, '#ffffff');
  if (frame >= 27) {
    const scan = easeOut(segment(frame, 27, 80));
    poly(ctx, [[96, 96], [54 - scan * 22, 153], [138 + scan * 22, 153]], 'rgba(154,137,161,.28)', alpha * scan, '#e2d9e4', 3);
    for (let i = 0; i < 7; i += 1) line(ctx, 61 + i * 12, 107, 42 + i * 18, 151, i % 2 ? '#817783' : '#c2b7c5', 3, alpha * scan);
  }
  if (frame >= 80) {
    const p = easeOut(segment(frame, 80, 100));
    const shards = [[48, 134], [69, 112], [96, 122], [123, 111], [145, 135], [112, 153], [78, 153]];
    shards.forEach(([x, y], index) => diamond(ctx, x + (x - 96) * p * .35, y, 10 + index % 3 * 3, index % 2 ? '#817b78' : '#a19a93', alpha, '#ddd7d0'));
    ring(ctx, 96, 114, 17 + p * 60, '#bfb6c2', 5, alpha);
  }
}

function drawChocobo(ctx, frame, sceneContext) {
  const alpha = fade(frame, 8, 98, 116);
  const target = { x: 96, y: 96 };
  const caster = { x: sceneContext?.actorIsEnemy ? 31 : 161, y: 137 };
  const seal = easeOut(segment(frame, 0, 27));
  diamond(ctx, caster.x, caster.y - 38, 15 + seal * 13, '#e7b74f', alpha * seal, '#fff2bc');
  for (let i = 0; i < 7; i += 1) {
    const a = -1.3 + i * .43;
    poly(ctx, [[caster.x, caster.y - 38], [caster.x + Math.cos(a - .12) * (22 + seal * 42), caster.y - 38 + Math.sin(a - .12) * (17 + seal * 34)], [caster.x + Math.cos(a + .12) * (22 + seal * 42), caster.y - 38 + Math.sin(a + .12) * (17 + seal * 34)]], i % 2 ? '#f2cf67' : '#c78c3a', alpha * seal, '#fff6ca', 1);
  }
  if (frame >= 26) {
    const charge = easeInOut(segment(frame, 26, 78));
    const x = caster.x + (target.x - caster.x) * charge; const y = caster.y + (target.y - caster.y) * charge;
    const trailDirection = Math.sign(caster.x - target.x) || 1;
    for (let trail = 1; trail <= 7; trail += 1) line(ctx, x + trailDirection * trail * 13, y + trail * 5, x + trailDirection * trail * 4, y + trail * 2, trail % 2 ? '#ffe383' : '#d39736', 5 - Math.floor(trail / 3), alpha * (1 - trail * .1));
    diamond(ctx, x, y, 13, '#fff2a4', alpha, '#d69b35');
    for (let step = 0; step < 5; step += 1) diamond(ctx, caster.x + (target.x - caster.x) * step / 4, caster.y + (target.y - caster.y) * step / 4 + (step % 2 ? 7 : -4), 5, '#d8a849', alpha * charge, '#fff0ab');
  }
  if (frame >= 78) {
    const p = easeOut(segment(frame, 78, 98));
    const outcome = String(sceneContext?.chocoboOutcome ?? sceneContext?.outcome ?? sceneContext?.resultType ?? 'normal').toLowerCase();
    const fat = outcome.includes('fat') || outcome.includes('heavy') || outcome.includes('6e');
    if (fat) {
      poly(ctx, [[96, 22 - p * 17], [139 + p * 17, 43], [163 + p * 10, 97], [137, 153 + p * 8], [55, 153 + p * 8], [29 - p * 10, 97], [53 - p * 17, 43]], '#c99c47', alpha, '#fff0ad', 5);
      for (let i = 0; i < 12; i += 1) {
        const a = i * Math.PI / 6;
        line(ctx, 96 + Math.cos(a) * 23, 96 + Math.sin(a) * 23, 96 + Math.cos(a) * (39 + p * 53), 96 + Math.sin(a) * (39 + p * 53), i % 2 ? '#8d6939' : '#ffe696', 4, alpha * p);
      }
      ring(ctx, 96, 139, 17 + p * 73, '#e7bd62', 7, alpha);
    } else {
      burst(ctx, target.x, target.y, 16 + p * 59, 11, '#fff1a5', alpha, .12);
      poly(ctx, [[target.x, target.y - 30 - p * 8], [target.x + 13 + p * 19, target.y - 11], [target.x + 21 + p * 18, target.y + 9], [target.x - 1, target.y + 30 + p * 8], [target.x - 22 - p * 17, target.y + 9], [target.x - 15 - p * 14, target.y - 12]], '#eab94f', alpha * (1 - p * .35), '#fff7cd', 3);
    }
  }
}

function drawRamuh(ctx, frame, sceneContext) {
  const alpha = fade(frame, 9, 112, 134);
  const band = sceneTargetBand(sceneContext, { x: sceneContext?.actorIsEnemy ? 72 : 28, y: 50 });
  const cx = clamp(band.center.x, 35, 157); const cy = clamp(band.center.y, 58, 145);
  const seal = easeOut(segment(frame, 0, 31));
  diamond(ctx, cx, Math.max(27, cy - 54), 17 + seal * 13, '#9e91d8', alpha * seal, '#f4f1ff');
  line(ctx, cx, Math.max(35, cy - 47), cx, Math.min(161, cy + 49), '#d8d0f0', 7, alpha * seal);
  poly(ctx, [[cx, cy - 31], [cx - 35, cy - 56], [cx - 23, cy - 19], [cx, cy - 6], [cx + 23, cy - 19], [cx + 35, cy - 56]], null, alpha * seal, '#c5b9e8', 4);
  if (frame >= 30) {
    const judge = easeOut(segment(frame, 30, 90));
    ring(ctx, cx, Math.max(24, cy - 63), 14 + judge * 49, '#efeaaa', 4, alpha, frame * .04, frame * .04 + Math.PI * 1.55);
    band.points.forEach((point, index) => lightning(ctx, point.x, band.minY, Math.min(168, point.y + 31), 2 + index % 3, index % 2 ? '#b9a8ef' : '#fffbc7', alpha * judge, 3 + index % 2));
  }
  if (frame >= 90) {
    const p = easeOut(segment(frame, 90, 112));
    for (let i = 0; i < 9; i += 1) {
      const x = band.minX + (band.maxX - band.minX) * i / 8;
      lightning(ctx, x, Math.max(19, band.minY - 31 - i % 2 * 11), Math.min(170, band.maxY), 1 + i % 3, i % 2 ? '#fff6ad' : '#bca9ff', alpha * p, 2 + i % 2);
    }
    ring(ctx, cx, Math.min(168, band.maxY), 15 + p * Math.min(68, (band.maxX - band.minX) * .7 + 22), '#f8f3b5', 5, alpha);
  }
}

function drawTitan(ctx, frame, sceneContext) {
  const alpha = fade(frame, 9, 115, 138);
  const band = sceneTargetBand(sceneContext, { x: sceneContext?.actorIsEnemy ? 72 : 28, y: 50 });
  const cx = clamp(band.center.x, 42, 150); const groundY = clamp(band.maxY + 12, 112, 170);
  const seal = easeOut(segment(frame, 0, 32));
  diamond(ctx, cx, Math.max(29, groundY - 92), 20 + seal * 15, '#94704d', alpha * seal, '#eed7ad');
  poly(ctx, [[band.minX, groundY], [cx - 38, groundY - 55], [cx - 18, groundY - 32], [cx, groundY - 91], [cx + 21, groundY - 35], [cx + 43, groundY - 62], [band.maxX, groundY]], '#5f4a39', alpha * seal, '#c8ad82', 3);
  if (frame >= 31) {
    const pressure = easeOut(segment(frame, 31, 92));
    for (let i = 0; i < 9; i += 1) {
      const x = band.minX + (band.maxX - band.minX) * i / 8;
      const lift = pressure * (14 + i % 3 * 13);
      poly(ctx, [[x, groundY - lift], [x + 11, groundY - 5 - lift], [x + 15, groundY + 11], [x - 3, groundY + 11]], i % 2 ? '#74604b' : '#8b6d4e', alpha * pressure, '#d4bd94', 2);
    }
  }
  if (frame >= 92) {
    const p = easeOut(segment(frame, 92, 115));
    for (let index = 0; index < 5; index += 1) {
      const endX = band.minX + (band.maxX - band.minX) * index / 4;
      const midX = (cx + endX) / 2 + (index - 2) * 7;
      line(ctx, cx, groundY - 66, midX, groundY - 30, '#f5d18e', 6, alpha * p);
      line(ctx, midX, groundY - 30, endX + (endX - cx) * p * .2, groundY + 8, '#4a3428', 5, alpha * p);
    }
    for (let i = 0; i < 6; i += 1) {
      const x = band.minX + (band.maxX - band.minX) * (i + .5) / 6;
      diamond(ctx, x, groundY - p * (21 + i % 2 * 19), 8 + i % 3, '#9d7956', alpha, '#e3c493');
    }
  }
}

function drawSyldra(ctx, frame, sceneContext) {
  const alpha = fade(frame, 9, 114, 136);
  const band = sceneTargetBand(sceneContext, { x: sceneContext?.actorIsEnemy ? 72 : 28, y: 50 });
  const casterRaw = scenePoint(sceneContext, 'caster', { x: sceneContext?.actorIsEnemy ? 28 : 72, y: 44 });
  const caster = { x: clamp(casterRaw.x, 50, 142), y: clamp(casterRaw.y, 45, 135) };
  const cx = clamp(band.center.x, 38, 154); const cy = clamp(band.center.y, 48, 143);
  const seal = easeOut(segment(frame, 0, 31));
  diamond(ctx, caster.x, Math.max(27, caster.y - 27), 18 + seal * 14, '#67b9c0', alpha * seal, '#e3ffff');
  poly(ctx, [[caster.x, caster.y - 27], [caster.x - 47, caster.y - 51 - seal * 7], [caster.x - 29, caster.y - 18], [caster.x - 55, caster.y + 19 + seal * 8], [caster.x - 12, caster.y - 2]], 'rgba(91,192,195,.3)', alpha * seal, '#c9ffff', 3);
  poly(ctx, [[caster.x, caster.y - 27], [caster.x + 47, caster.y - 51 - seal * 7], [caster.x + 29, caster.y - 18], [caster.x + 55, caster.y + 19 + seal * 8], [caster.x + 12, caster.y - 2]], 'rgba(91,192,195,.3)', alpha * seal, '#c9ffff', 3);
  if (frame >= 30) {
    const current = easeOut(segment(frame, 30, 91));
    const dx = cx - caster.x; const dy = cy - caster.y;
    for (let i = 0; i < 10; i += 1) {
      const t = i / 9;
      const x = caster.x + dx * t;
      const y = caster.y + dy * t + Math.sin(t * Math.PI * 3 + frame * .08) * (17 + current * 11);
      diamond(ctx, x, y, 4 + i % 2, i % 2 ? '#8be4db' : '#e3fff8', alpha * current);
      if (i) line(ctx, caster.x + dx * (t - 1 / 9), caster.y + dy * (t - 1 / 9) + Math.sin((t - 1 / 9) * Math.PI * 3 + frame * .08) * (17 + current * 11), x, y, i % 2 ? '#78d7d4' : '#d8fff5', 3, alpha * current);
    }
    band.points.forEach((point, index) => ring(ctx, point.x, point.y, 14 + current * (22 + index * 3), index % 2 ? '#78d7d4' : '#d8fff5', 3, alpha * current, frame * .035 + index, frame * .035 + index + Math.PI * 1.35));
  }
  if (frame >= 91) {
    const p = easeOut(segment(frame, 91, 114));
    for (let i = 0; i < 11; i += 1) {
      const y = band.minY + (band.maxY - band.minY) * i / 10;
      line(ctx, caster.x - i * 4, caster.y + (y - cy) * .45, band.maxX + p * (19 + i), y - 13 + i % 3 * 7, i % 2 ? '#6dc9ca' : '#d9fff6', 3 + i % 2, alpha * p);
    }
    ring(ctx, cx, cy, 18 + p * Math.min(67, Math.max(34, band.maxY - band.minY)), '#bcfff0', 5, alpha);
  }
}

function drawLeviathan(ctx, frame, sceneContext) {
  const alpha = fade(frame, 9, 120, 144);
  const band = sceneTargetBand(sceneContext, { x: sceneContext?.actorIsEnemy ? 72 : 28, y: 50 });
  const cx = clamp(band.center.x, 42, 150); const floorY = clamp(band.maxY + 16, 123, 172);
  const seal = easeOut(segment(frame, 0, 33));
  diamond(ctx, cx, Math.max(27, band.minY - 23), 20 + seal * 15, '#466fa5', alpha * seal, '#d9f5ff');
  for (let i = 0; i < 5; i += 1) ring(ctx, cx, Math.max(39, band.minY - 8), 20 + i * 12 * seal, i % 2 ? '#5f9ed0' : '#afdff0', 3, alpha * seal, Math.PI, Math.PI * 2);
  if (frame >= 32) {
    const rise = easeOut(segment(frame, 32, 96));
    for (let layer = 0; layer < 7; layer += 1) {
      const y = floorY - layer * Math.max(8, (floorY - band.minY) / 7) * rise;
      const crest = 10 + layer * 4;
      const q1 = band.minX + (band.maxX - band.minX) * .25; const q2 = band.minX + (band.maxX - band.minX) * .5; const q3 = band.minX + (band.maxX - band.minX) * .75;
      poly(ctx, [[band.minX, y], [q1, y - crest], [q2, y], [q2 + (q3 - q2) * .25, y - crest * 1.4], [q3, y], [band.maxX, y - crest], [band.maxX, floorY + 8], [band.minX, floorY + 8]], layer % 2 ? '#326c9c' : '#4d90bd', alpha * rise * (1 - layer * .06), '#b8ebf4', 2);
    }
  }
  if (frame >= 96) {
    const p = easeOut(segment(frame, 96, 120));
    const q1 = band.minX + (band.maxX - band.minX) * .25; const q2 = band.center.x; const q3 = band.minX + (band.maxX - band.minX) * .75;
    poly(ctx, [[band.minX - p * 18, floorY], [q1, band.minY + 23 - p * 28], [q2 - 25, band.center.y], [q2, band.minY - p * 25], [q2 + 31, band.center.y - 5], [q3, band.minY + 14 - p * 21], [band.maxX + p * 18, floorY]], '#438bb8', alpha, '#d4f8ff', 5);
    for (let i = 0; i < 13; i += 1) {
      const x = band.minX + (band.maxX - band.minX) * i / 12;
      line(ctx, x, band.minY - 8, x + (i - 6) * 2, floorY + 7, i % 2 ? '#89d3eb' : '#d8f9ff', 3, alpha * p);
    }
    burst(ctx, cx, band.center.y + 18, 23 + p * Math.min(78, (band.maxX - band.minX) * .72 + 24), 20, '#e3ffff', alpha, .05);
  }
}

function drawTeleport(ctx, frame, sceneContext) {
  const alpha = fade(frame, 8, 98, 116);
  const allies = Array.isArray(sceneContext?.alliedTargets) && sceneContext.alliedTargets.length
    ? sceneContext.alliedTargets
    : (Array.isArray(sceneContext?.targets) ? sceneContext.targets : []);
  const positions = allies.length
    ? allies.slice(0, 4).map((point) => scenePercentPoint(sceneContext, point, { x: 76, y: 50 }))
    : [scenePercentPoint(sceneContext, null, { x: 76, y: 50 })];
  const aperture = easeOut(segment(frame, 0, 28));
  positions.forEach((position, unitIndex) => {
    for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
      const radiusX = 11 + ringIndex * 6 * aperture;
      const radiusY = 21 - ringIndex * 2 + aperture * 4;
      const rotation = frame * .018 + ringIndex * .25 + unitIndex * .13;
      const points = Array.from({ length: 12 }, (_, pointIndex) => {
        const a = pointIndex * Math.PI / 6;
        const ex = Math.cos(a) * radiusX; const ey = Math.sin(a) * Math.max(7, radiusY);
        return [position.x + ex * Math.cos(rotation) - ey * Math.sin(rotation), position.y + ex * Math.sin(rotation) + ey * Math.cos(rotation)];
      });
      poly(ctx, points, null, alpha * aperture, ringIndex % 2 ? '#9ecdf2' : '#c6a7ed', 2);
    }
    figureGlyph(ctx, position.x, position.y - 10, .38, '#8095ad', alpha * aperture, '#efffff');
  });
  if (frame >= 27) {
    const fold = easeInOut(segment(frame, 27, 78));
    positions.forEach((position, unitIndex) => {
      for (let lineIndex = 0; lineIndex < 5; lineIndex += 1) {
        const y = position.y - 24 + lineIndex * 12;
        line(ctx, position.x - 29 + fold * 28, y, position.x + 29 - fold * 28, y + (lineIndex % 2 ? 4 : -4), (lineIndex + unitIndex) % 2 ? '#bda8e9' : '#9cdcf5', 2, alpha * fold);
      }
      poly(ctx, [[position.x - 19 + fold * 17, position.y - 29], [position.x + 19 - fold * 17, position.y - 29], [position.x + 15 - fold * 13, position.y + 29], [position.x - 15 + fold * 13, position.y + 29]], '#303c5e', alpha * (1 - fold * .68), '#d9e9ff', 2);
    });
  }
  if (frame >= 78) {
    const p = easeOut(segment(frame, 78, 98));
    positions.forEach((position, unitIndex) => {
      ring(ctx, position.x, position.y, 18 - p * 15, '#ffffff', 4, alpha);
      line(ctx, position.x, position.y - 31 - p * 8, position.x, position.y + 31 + p * 8, unitIndex % 2 ? '#c7b4ec' : '#d6f4ff', 7 - p * 4, alpha);
      for (let i = 0; i < 6; i += 1) line(ctx, position.x - 29 + i * 12, position.y - 22, position.x + (i - 3) * (1 - p), position.y, '#75649a', 2, alpha * p);
    });
  }
}

function drawTime(ctx, frame, mode) {
  const total = mode === 'haste' ? 72 : mode === 'slow' ? 76 : 84;
  const alpha = fade(frame, 9, total - 14, total);
  clock(ctx, frame, mode, alpha);
  if (mode === 'haste') {
    const p = easeOut(segment(frame, 20, 54));
    for (let i = 0; i < 7; i += 1) line(ctx, 35 - i * 3 + p * 36, 55 + i * 14, 76 + p * 28, 55 + i * 14, i % 2 ? '#70d8ff' : '#fff09b', 2, alpha * p);
  } else if (mode === 'slow') {
    const p = easeOut(segment(frame, 20, 55));
    for (let i = 0; i < 4; i += 1) diamond(ctx, 71 + i * 17, 49 + p * 92, 6 + i, '#7766a8', alpha * p, '#d8c8ff');
  } else {
    const p = easeOut(segment(frame, 24, 58));
    poly(ctx, [[49, 50], [143, 50], [153, 96], [143, 142], [49, 142], [39, 96]], 'rgba(183,242,255,.16)', alpha * p, '#e8ffff', 3);
    for (let i = 0; i < 5; i += 1) line(ctx, 53 + i * 19, 56, 44 + i * 24, 137, '#8cddff', 2, alpha * p);
  }
}

function drawGravity(ctx, frame, tier) {
  const total = tier === 1 ? 86 : 104;
  const impactAt = tier === 1 ? 58 : 70;
  const alpha = fade(frame, 7, total - 14, total);
  const collapse = 1 - easeInOut(segment(frame, 0, impactAt));
  motes(ctx, tier === 1 ? 16 : 25, frame, tier === 1 ? '#a991e8' : '#d08cff', 'converge', 83 * collapse + 12, alpha);
  for (let i = 0; i < (tier === 1 ? 3 : 5); i += 1) {
    const radius = 64 - i * 10 - (1 - collapse) * (tier === 1 ? 14 : 22);
    ring(ctx, 96, 96, Math.max(5, radius), i % 2 ? '#5d3a92' : '#bea0ff', 3, alpha, frame * .025 + i * .5, frame * .025 + i * .5 + Math.PI * 1.45);
  }
  if (tier === 2) {
    const bind = easeOut(segment(frame, 24, 70));
    const wells = [[96, 43], [145, 126], [47, 126]];
    wells.forEach(([x, y], index) => {
      ring(ctx, x, y, 7 + bind * 10, index === 0 ? '#ffd1ff' : '#9e7bff', 3, alpha * bind);
      diamond(ctx, x, y, 5 + bind * 4, '#080512', alpha * bind, '#f1d6ff');
      const next = wells[(index + 1) % wells.length];
      line(ctx, x, y, x + (next[0] - x) * bind, y + (next[1] - y) * bind, '#b88cff', 2, alpha * bind);
    });
  }
  if (frame >= impactAt) {
    const p = easeOut(segment(frame, impactAt, impactAt + 15));
    ring(ctx, 96, 96, 8 + p * (tier === 1 ? 42 : 61), '#e3c7ff', tier === 1 ? 4 : 6, alpha);
    diamond(ctx, 96, 96, 15 - p * 7, '#090717', alpha, '#e9d8ff');
    const bars = tier === 1 ? 2 : 3;
    for (let i = 0; i < bars; i += 1) line(ctx, 56, 126 + i * 8, 136, 126 + i * 8, i === bars - 1 ? '#ff76a5' : '#6a497f', 4, alpha);
    if (tier === 2) {
      line(ctx, 37, 43, 150, 148, '#f0b4ff', 4, alpha * p);
      line(ctx, 155, 43, 42, 148, '#8665dc', 4, alpha * p);
    }
  }
}

function drawReturn(ctx, frame) {
  const alpha = fade(frame, 8, 102, 122);
  const form = easeOut(segment(frame, 0, 29));
  poly(ctx, [[62, 38], [130, 38], [112, 79], [80, 79]], 'rgba(202,153,255,.24)', alpha * form, '#f4d9ff', 3);
  poly(ctx, [[80, 111], [112, 111], [130, 153], [62, 153]], 'rgba(112,205,255,.24)', alpha * form, '#d8f6ff', 3);
  line(ctx, 80, 79, 112, 111, '#ffffff', 3, alpha * form); line(ctx, 112, 79, 80, 111, '#ffffff', 3, alpha * form);
  if (frame > 28) {
    const rewind = easeInOut(segment(frame, 28, 84));
    for (let i = 0; i < 5; i += 1) {
      const radius = 24 + i * 12;
      ring(ctx, 96, 96, radius, i % 2 ? '#80dfff' : '#d79cff', 2, alpha, Math.PI * (1.85 - rewind * 1.7), Math.PI * 1.95);
    }
    for (let i = 0; i < 12; i += 1) {
      const y = 48 + ((i * 13 + Math.round(rewind * 94)) % 96);
      line(ctx, 53, y, 139, y, i % 2 ? '#6e79d8' : '#d7bcff', 2, alpha * .7);
    }
  }
  if (frame >= 84) {
    const p = easeOut(segment(frame, 84, 102));
    burst(ctx, 96, 96, 18 + p * 77, 16, '#f6ffff', alpha, Math.PI / 16);
    ring(ctx, 96, 96, 10 + p * 66, '#a7efff', 4, alpha);
  }
}

function drawComet(ctx, frame, meteor = false) {
  const total = meteor ? 118 : 78;
  const alpha = fade(frame, 6, total - 15, total);
  if (meteor && frame < 30) {
    const p = easeOut(segment(frame, 0, 28));
    line(ctx, 35, 33, 157, 33, '#9781ff', 3, alpha * p);
    line(ctx, 57, 25, 135, 41, '#e4dcff', 2, alpha * p);
  }
  const count = meteor ? 5 : 1;
  for (let i = 0; i < count; i += 1) {
    const local = meteor ? segment(frame, 27 + i * 10, 62 + i * 10) : segment(frame, 18, 53);
    if (local <= 0 || local >= 1) continue;
    const x = 28 + local * (122 - i * 7) + i * 14;
    const y = 22 + local * (124 + (i % 2) * 18);
    for (let trail = 1; trail <= 4; trail += 1) line(ctx, x - trail * 9, y - trail * 8, x - trail * 3, y - trail * 2, trail % 2 ? '#ff9c55' : '#ffe2a3', 4 - Math.floor(trail / 2), alpha * (1 - trail * .14));
    diamond(ctx, x, y, meteor ? 10 + (i % 2) * 3 : 12, '#fff1bd', alpha, '#ff713a');
  }
  const impactAt = meteor ? 61 : 52;
  if (frame > impactAt) {
    const p = easeOut(segment(frame, impactAt, impactAt + 18));
    ring(ctx, 105, 145, 10 + p * (meteor ? 72 : 49), '#ff9850', 4, alpha);
    poly(ctx, [[31, 151], [65, 132], [96, 144], [126, 129], [163, 151]], '#5f2930', alpha * p, '#ffcb6e', 2);
    burst(ctx, 105, 137, 18 + p * 51, meteor ? 14 : 9, '#fff0a7', alpha);
  }
}

function drawMissile(ctx, frame) {
  const alpha = fade(frame, 7, 73, 86);
  const scan = easeOut(segment(frame, 0, 27));
  ring(ctx, 111, 94, 13 + scan * 30, '#7df6ff', 2, alpha, frame * .03, frame * .03 + Math.PI * 1.7);
  ring(ctx, 111, 94, 7 + scan * 18, '#fff5b8', 2, alpha);
  line(ctx, 111, 43, 111, 67, '#fff', 2, alpha * scan); line(ctx, 111, 121, 111, 145, '#fff', 2, alpha * scan);
  line(ctx, 60, 94, 84, 94, '#fff', 2, alpha * scan); line(ctx, 138, 94, 162, 94, '#fff', 2, alpha * scan);
  if (frame >= 42 && frame <= 66) {
    const p = easeInOut(segment(frame, 42, 59));
    const x = 23 + p * 88; const y = 143 - p * 49;
    poly(ctx, [[x + 15, y], [x - 4, y - 6], [x - 11, y], [x - 4, y + 6]], '#eafaff', alpha, '#69eaff', 2);
    for (let i = 1; i <= 4; i += 1) line(ctx, x - 7 - i * 8, y, x - i * 8, y, i % 2 ? '#ffbd55' : '#fff3ad', 3, alpha * (1 - i * .15));
  }
  if (frame >= 59) {
    const p = easeOut(segment(frame, 59, 74));
    burst(ctx, 111, 94, 14 + p * 49, 12, '#f5ffff', alpha, Math.PI / 12);
    for (let i = 0; i < 4; i += 1) { const a = Math.PI / 4 + i * Math.PI / 2; line(ctx, 111 + Math.cos(a) * 9, 94 + Math.sin(a) * 9, 111 + Math.cos(a) * (28 + p * 24), 94 + Math.sin(a) * (28 + p * 24), '#54dfea', 4, alpha); }
    if (frame <= 68) {
      poly(ctx, [[126, 94], [107, 86], [98, 94], [107, 102]], '#f4ffff', alpha, '#55ddea', 2);
      flame(ctx, 101, 99, 13, 9, '#ffb64e', alpha, -5);
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#052c42';
      ctx.fillRect(84, 74, 21, 14); ctx.fillRect(117, 74, 21, 14); ctx.fillRect(84, 101, 21, 14); ctx.fillRect(117, 101, 21, 14); ctx.restore();
    }
  }
}

function drawFlare(ctx, frame) {
  const alpha = fade(frame, 7, 88, 108);
  const collapse = 1 - easeInOut(segment(frame, 9, 61));
  motes(ctx, 24, frame, '#9ee9ff', 'converge', 83 * collapse + 10, alpha);
  const core = easeOut(segment(frame, 26, 62));
  ring(ctx, 96, 96, 7 + core * 18, '#80dfff', 3, alpha);
  ring(ctx, 96, 96, 3 + core * 9, '#fff', 4, alpha);
  if (frame > 61) {
    const nova = easeOut(segment(frame, 61, 78));
    const whiteout = frame >= 67 && frame <= 70 ? .78 : .16 * (1 - segment(frame, 78, 94) * .7);
    ctx.save(); ctx.globalAlpha = alpha * whiteout; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE); ctx.restore();
    burst(ctx, 96, 96, 20 + nova * 88, 20, '#d9f8ff', alpha, frame * .018);
    ring(ctx, 96, 96, 10 + nova * 77, '#7fdcff', 5, alpha);
    ring(ctx, 96, 96, 7 + nova * 54, '#ffffff', 3, alpha);
    ring(ctx, 96, 96, 5 + nova * 24, '#10143f', 6, alpha);
    diamond(ctx, 96, 96, 8 + nova * 5, '#ffffff', alpha, '#6fdfff');
  }
}

function drawLevel5Death(ctx, frame) {
  const alpha = fade(frame, 7, 94, 112);
  const scan = easeOut(segment(frame, 0, 30));
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + i * Math.PI * .4;
    const r = 28 + scan * 33;
    diamond(ctx, 96 + Math.cos(a) * r, 96 + Math.sin(a) * r, 5 + (i === 0 ? 2 : 0), i % 2 ? '#7a1c50' : '#db426e', alpha * scan, '#ffb4c8');
  }
  const select = easeOut(segment(frame, 29, 53));
  for (let i = 0; i < 5; i += 1) {
    const a1 = -Math.PI / 2 + i * Math.PI * .4;
    const a2 = -Math.PI / 2 + ((i + 2) % 5) * Math.PI * .4;
    line(ctx, 96 + Math.cos(a1) * 61, 96 + Math.sin(a1) * 61, 96 + Math.cos(a2) * 61, 96 + Math.sin(a2) * 61, '#e84874', 2, alpha * select);
  }
  if (frame > 52) {
    const gate = easeOut(segment(frame, 52, 76));
    poly(ctx, [[44, 149], [55, 49 + (1 - gate) * 70], [96, 25 + (1 - gate) * 90], [137, 49 + (1 - gate) * 70], [148, 149]], 'rgba(28,0,23,.78)', alpha * gate, '#ef557b', 4);
    ring(ctx, 96, 96, 20 + gate * 46, '#71103e', 5, alpha * gate, 0, Math.PI * 2);
  }
  if (frame > 75) {
    const cut = easeOut(segment(frame, 75, 93));
    for (let i = 0; i < 5; i += 1) line(ctx, 46 + i * 21, 47, 67 + i * 16, 151, i % 2 ? '#ff9ab2' : '#f03062', 4, alpha * cut);
    ctx.save(); ctx.globalAlpha = alpha * Math.max(.86, cut); ctx.fillStyle = '#14000f'; ctx.fillRect(64, 72, 64, 52); ctx.fillStyle = '#ffb0c2';
    // A persistent, pixel-readable five is the success/failure gate itself.
    ctx.fillRect(77, 78, 39, 7); ctx.fillRect(77, 85, 7, 14); ctx.fillRect(77, 98, 36, 7); ctx.fillRect(106, 104, 7, 13); ctx.fillRect(77, 116, 36, 7);
    ctx.restore();
  }
}

function drawSummon(ctx, frame, kind) {
  const total = kind === 'bahamut' ? 148 : kind === 'ifrit' ? 128 : 126;
  const alpha = fade(frame, 10, total - 20, total);
  const seal = easeOut(segment(frame, 0, kind === 'bahamut' ? 35 : 31));
  ring(ctx, 96, 111, 18 + seal * 61, kind === 'shiva' ? '#9cefff' : kind === 'ifrit' ? '#ff7a3c' : '#b595ff', 4, alpha);
  ring(ctx, 96, 111, 9 + seal * 43, '#fff', 2, alpha, frame * .025, frame * .025 + Math.PI * 1.55);
  if (kind === 'shiva') {
    for (let i = 0; i < 6; i += 1) { const a = i * Math.PI / 3; iceShard(ctx, 96 + Math.cos(a) * 50 * seal, 103 + Math.sin(a) * 40 * seal, 21, 7, i % 2 ? '#eaffff' : '#63c8ef', alpha, a); }
    if (frame > 66) { motes(ctx, 28, frame, '#eaffff', 'fall', 89, alpha); for (let i = 0; i < 8; i += 1) iceShard(ctx, 36 + i * 18, 145 - ((frame * 3 + i * 17) % 88), 12 + i % 3 * 5, 5, '#8de7ff', alpha, i * .13); }
  } else if (kind === 'ifrit') {
    const horn = easeOut(segment(frame, 16, 48));
    poly(ctx, [[96, 95], [57, 45 + horn * 21], [72, 99], [96, 126], [120, 99], [135, 45 + horn * 21]], 'rgba(74,10,20,.76)', alpha * horn, '#ffba55', 3);
    if (frame > 48) for (let i = 0; i < 8; i += 1) flame(ctx, 42 + i * 15, 154, 30 + ((frame + i * 9) % 55), 14, i % 2 ? '#ffd064' : '#f04b28', alpha, i - 4);
    if (frame > 87) { burst(ctx, 96, 118, 28 + segment(frame, 87, 107) * 73, 16, '#fff0a0', alpha); motes(ctx, 21, frame, '#ff682f', 'rise', 88, alpha); }
  } else {
    const charge = easeOut(segment(frame, 24, 78));
    poly(ctx, [[96, 37], [117, 65], [149, 70], [126, 91], [138, 126], [96, 106], [54, 126], [66, 91], [43, 70], [75, 65]], 'rgba(54,32,104,.7)', alpha * charge, '#c8b8ff', 3);
    ring(ctx, 96, 93, 5 + charge * 22, '#f8ffff', 4, alpha);
    if (frame > 77) {
      const beam = easeInOut(segment(frame, 77, 105));
      poly(ctx, [[96, 92], [83 - beam * 58, 173], [109 + beam * 58, 173]], '#e9ffff', alpha * beam, '#8ce7ff', 4);
      for (let i = 0; i < 6; i += 1) line(ctx, 96 + (i - 2.5) * 4, 97, 61 + i * 14, 173, i % 2 ? '#fff' : '#ad94ff', 3, alpha * beam);
      if (frame > 103) {
        const ground = easeOut(segment(frame, 103, 121));
        ring(ctx, 96, 150, 14 + ground * 38, '#d8ffff', 5, alpha);
        burst(ctx, 96, 147, 20 + ground * 42, 18, '#bda8ff', alpha, Math.PI / 18);
      }
    }
  }
}

function stageFill(ctx, width, height, color, alpha) {
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function stageTargets(sceneContext, fallback = [{ x: 78, y: 28 }, { x: 78, y: 44 }, { x: 78, y: 60 }, { x: 78, y: 76 }]) {
  if (Array.isArray(sceneContext?.alliedTargets) && sceneContext.alliedTargets.length) return sceneContext.alliedTargets;
  if (Array.isArray(sceneContext?.targets) && sceneContext.targets.length) return sceneContext.targets;
  return fallback;
}

function drawAlmagest(ctx, frame, sceneContext = {}) {
  const width = Number(sceneContext.stageWidth ?? STAGE_WIDTH);
  const height = Number(sceneContext.stageHeight ?? STAGE_HEIGHT);
  const pulse = (from, to) => Math.sin(segment(frame, from, to) * Math.PI);
  const telegraph = pulse(0, 12);
  stageFill(ctx, width, height, '#90c8d8', .09 + telegraph * .16);

  const flashes = [
    [12, 23, '#ffffff', .94],
    [24, 35, '#ffffff', .98],
    [36, 49, '#d8f8ff', .94],
    [50, 61, '#72b8e8', .78],
    [62, 73, '#3480c8', .72],
  ];
  flashes.forEach(([from, to, color, strength]) => {
    if (frame < from || frame > to) return;
    stageFill(ctx, width, height, color, .18 + pulse(from, to) * strength);
  });

  const bandAlpha = frame < 12 ? telegraph * .22 : frame < 84 ? .24 : .24 * (1 - segment(frame, 84, 96));
  for (let index = 0; index < 14; index += 1) {
    const y = ((index * 37 + frame * 9) % (height + 48)) - 24;
    const length = width * (.18 + (index % 5) * .07);
    const x = (index * 83 + frame * 7) % (width + length) - length;
    line(ctx, x, y, x + length, y, index % 3 ? '#d8f8ff' : '#ffffff', index % 4 ? 2 : 4, bandAlpha);
  }

  if (frame >= 62 && frame <= 88) {
    const impact = Math.sin(segment(frame, 62, 88) * Math.PI);
    stageTargets(sceneContext).forEach((target, index) => {
      const x = clamp(Number(target.x ?? 78), 0, 100) / 100 * width;
      const y = clamp(Number(target.y ?? (28 + index * 16)), 0, 100) / 100 * height;
      const radius = 5 + impact * (12 + index % 2 * 3);
      ring(ctx, x, y, radius, index % 2 ? '#ffffff' : '#a8e8ff', 3, impact);
      line(ctx, x - radius, y, x + radius, y, '#ffffff', 2, impact);
      line(ctx, x, y - radius, x, y + radius, '#d8f8ff', 2, impact);
    });
  }
}

function bounce01(value) {
  const wrapped = ((value % 2) + 2) % 2;
  return 1 - Math.abs(wrapped - 1);
}

const GRAND_CROSS_ORBS = Object.freeze([
  [0.03, 0.18, 1.18, .71, .36, 0], [0.72, 0.06, .82, 1.27, .42, 0],
  [0.14, 0.78, 1.34, .88, .48, 1], [0.83, 0.63, 1.09, 1.41, .54, 0],
  [0.42, 0.23, .77, 1.52, .61, 0], [0.63, 0.88, 1.46, .69, .67, 1],
  [0.26, 0.47, 1.61, 1.17, .75, 0], [0.91, 0.29, 1.28, .93, .82, 0],
  [0.51, 0.57, .94, 1.68, .91, 1], [0.06, 0.92, 1.73, .79, 1.02, 0],
  [0.78, 0.42, 1.37, 1.31, 1.12, 0], [0.35, 0.05, 1.06, 1.57, 1.24, 1],
]);

function drawGrandCrossOrb(ctx, x, y, radius, warm, alpha, phase) {
  const edge = warm ? '#ffe070' : '#a8f8ff';
  const body = warm ? '#7c170d' : '#075090';
  const core = warm ? '#32100b' : '#041d50';
  ring(ctx, x, y, radius + 2, edge, Math.max(2, radius * .18), alpha);
  ring(ctx, x, y, radius - 1, body, Math.max(4, radius * .58), alpha);
  ring(ctx, x, y, Math.max(2, radius * .24), core, Math.max(2, radius * .32), alpha);
  for (let petal = 0; petal < 3; petal += 1) {
    const angle = phase + petal * Math.PI * 2 / 3;
    const px = x + Math.cos(angle) * radius * .43;
    const py = y + Math.sin(angle) * radius * .43;
    ring(ctx, px, py, Math.max(2, radius * .29), core, Math.max(2, radius * .24), alpha, angle - .4, angle + Math.PI * 1.25);
    line(ctx, x, y, px, py, edge, Math.max(1, radius * .1), alpha * .9);
  }
}

function drawGrandCross(ctx, frame, sceneContext = {}) {
  const width = Number(sceneContext.stageWidth ?? STAGE_WIDTH);
  const height = Number(sceneContext.stageHeight ?? STAGE_HEIGHT);
  const fieldIn = easeOut(segment(frame, 0, 120));
  const fieldOut = 1 - segment(frame, 444, 516);
  stageFill(ctx, width, height, '#b8c8c8', .08 + fieldIn * fieldOut * .18);

  if (frame >= 39 && frame <= 119) {
    const crack = easeOut(segment(frame, 39, 82));
    const flash = Math.sin(segment(frame, 74, 119) * Math.PI);
    if (frame >= 74) stageFill(ctx, width, height, '#ffffff', flash * .9);
    const routes = [
      [-.08, .08, 1.08, .69], [1.08, .04, -.08, .63],
      [-.08, .86, 1.08, .26], [1.08, .95, -.08, .34],
      [-.08, .38, 1.08, .91], [1.08, .55, -.08, .12],
    ];
    for (let pathIndex = 0; pathIndex < 6; pathIndex += 1) {
      const [fromX, fromY, toX, toY] = routes[pathIndex];
      let x = fromX * width;
      let y = fromY * height;
      for (let step = 1; step <= 8; step += 1) {
        const t = step / 8 * crack;
        const baseX = (fromX + (toX - fromX) * t) * width;
        const baseY = (fromY + (toY - fromY) * t) * height;
        const offset = (step % 2 ? -1 : 1) * (8 + pathIndex * 1.5);
        const nextX = baseX + offset * (toY - fromY);
        const nextY = baseY - offset * (toX - fromX);
        line(ctx, x, y, nextX, nextY, pathIndex % 2 ? '#ff48d8' : '#42a8ff', pathIndex % 3 ? 3 : 5, crack * (1 - flash * .35));
        x = nextX; y = nextY;
      }
    }
  }

  if (frame >= 100 && frame <= 485) {
    const progress = segment(frame, 100, 485);
    const orbAlpha = Math.min(segment(frame, 100, 132), 1 - segment(frame, 444, 485));
    stageFill(ctx, width, height, '#eef4f0', .6 * orbAlpha);
    for (let streak = 0; streak < 24; streak += 1) {
      const y = (streak * 41 + frame * (streak % 3 + 2)) % height;
      const x = (streak * 73 + frame * 5) % width;
      line(ctx, x - 46, y, x + 52 + (streak % 4) * 19, y, streak % 3 ? '#ffffff' : '#a8b8c0', streak % 4 ? 2 : 4, .34 * orbAlpha);
    }

    const drawOrbLayer = (near) => GRAND_CROSS_ORBS.forEach((orb, index) => {
      const [seedX, seedY, speedX, speedY, depth, warm] = orb;
      if ((depth >= .72) !== near) return;
      const x = 12 + bounce01(seedX + progress * speedX * 2.7) * (width - 24);
      const y = 12 + bounce01(seedY + progress * speedY * 2.3) * (height - 24);
      const breathing = 1 + Math.sin(frame * .085 + index * 1.7) * .24;
      const radius = Math.max(4, (7 + depth * 18) * breathing);
      drawGrandCrossOrb(ctx, x, y, radius, Boolean(warm), orbAlpha * (.48 + depth * .48), frame * .028 + index);
    });
    drawOrbLayer(false);
    for (let mist = 0; mist < 7; mist += 1) {
      const y = (mist * 67 + frame * 1.4) % (height + 70) - 35;
      stageFill(ctx, width, 0, '#ffffff', 0);
      ctx.save(); ctx.globalAlpha = .12 * orbAlpha; ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, Math.round(y), width, 8 + (mist % 3) * 5); ctx.restore();
    }
    drawOrbLayer(true);
  }

  if (frame >= 444) {
    const latch = Math.min(segment(frame, 444, 455), 1 - segment(frame, 468, 516));
    stageFill(ctx, width, height, '#a8a848', .18 * latch);
    stageTargets(sceneContext).forEach((target, index) => {
      const x = clamp(Number(target.x ?? 78), 0, 100) / 100 * width;
      const y = clamp(Number(target.y ?? (28 + index * 16)), 0, 100) / 100 * height;
      const color = index % 2 ? '#ff70b8' : '#68d8ff';
      diamond(ctx, x, y, 5 + latch * 5, '#ffffff', latch, color);
      ring(ctx, x, y, 9 + latch * 13, color, 3, latch);
    });
  }
}

function renderScene(ctx, sceneId, frame, sceneContext = {}) {
  if (sceneId === 'fire') return drawFire(ctx, frame, 1);
  if (sceneId === 'fira') return drawFire(ctx, frame, 2);
  if (sceneId === 'firaga') return drawFire(ctx, frame, 3);
  if (sceneId === 'blizzard') return drawIce(ctx, frame, 1);
  if (sceneId === 'blizzara') return drawIce(ctx, frame, 2);
  if (sceneId === 'blizzaga') return drawIce(ctx, frame, 3);
  if (sceneId === 'thunder') return drawThunder(ctx, frame, 1);
  if (sceneId === 'thundara') return drawThunder(ctx, frame, 2);
  if (sceneId === 'thundaga') return drawThunder(ctx, frame, 3);
  if (sceneId === 'cure') return drawCure(ctx, frame, 1);
  if (sceneId === 'cura') return drawCure(ctx, frame, 2);
  if (sceneId === 'curaga') return drawCure(ctx, frame, 3);
  if (sceneId === 'raise') return drawRaise(ctx, frame);
  if (sceneId === 'protect') return drawProtect(ctx, frame);
  if (sceneId === 'holy') return drawHoly(ctx, frame);
  if (sceneId === 'shell') return drawShell(ctx, frame);
  if (sceneId === 'reflect') return drawReflect(ctx, frame);
  if (['haste', 'slow', 'stop'].includes(sceneId)) return drawTime(ctx, frame, sceneId);
  if (sceneId === 'comet') return drawComet(ctx, frame, false);
  if (sceneId === 'meteor') return drawComet(ctx, frame, true);
  if (sceneId === 'gravity') return drawGravity(ctx, frame, 1);
  if (sceneId === 'graviga') return drawGravity(ctx, frame, 2);
  if (sceneId === 'return') return drawReturn(ctx, frame);
  if (sceneId === 'missile') return drawMissile(ctx, frame);
  if (sceneId === 'flare') return drawFlare(ctx, frame);
  if (sceneId === 'level-5-death') return drawLevel5Death(ctx, frame);
  if (['shiva', 'ifrit', 'bahamut'].includes(sceneId)) return drawSummon(ctx, frame, sceneId);
  if (sceneId === 'steal') return drawSteal(ctx, frame);
  if (sceneId === 'jump') return drawJump(ctx, frame);
  if (sceneId === 'rapid-fire') return drawRapidFire(ctx, frame);
  if (sceneId === 'zeninage') return drawZeninage(ctx, frame);
  if (sceneId === 'mix') return drawMix(ctx, frame);
  if (sceneId === 'atomic-ray') return drawAtomicRay(ctx, frame);
  if (sceneId === 'wave-cannon') return drawWaveCannon(ctx, frame);
  if (sceneId === 'blaster') return drawBlaster(ctx, frame);
  if (sceneId === 'maelstrom') return drawMaelstrom(ctx, frame);
  if (sceneId === 'delta-attack') return drawDeltaAttack(ctx, frame);
  if (sceneId === 'almagest') return drawAlmagest(ctx, frame, sceneContext);
  if (sceneId === 'grand-cross') return drawGrandCross(ctx, frame, sceneContext);
  if (sceneId === '1000-needles') return draw1000Needles(ctx, frame);
  if (sceneId === 'white-wind') return drawWhiteWind(ctx, frame);
  if (sceneId === 'aqua-breath') return drawAquaBreath(ctx, frame);
  if (sceneId === 'mighty-guard') return drawMightyGuard(ctx, frame);
  if (sceneId === 'goblin-punch') return drawGoblinPunch(ctx, frame);
  if (sceneId === 'magic-hammer') return drawMagicHammer(ctx, frame);
  if (sceneId === 'aero') return drawAero(ctx, frame, 1);
  if (sceneId === 'aera') return drawAero(ctx, frame, 2);
  if (sceneId === 'aeroga') return drawAero(ctx, frame, 3);
  if (sceneId === 'flame-thrower') return drawFlameThrower(ctx, frame);
  if (sceneId === 'time-slip') return drawTimeSlip(ctx, frame);
  if (sceneId === 'death-claw') return drawDeathClaw(ctx, frame);
  if (sceneId === 'mind-blast') return drawMindBlast(ctx, frame);
  if (sceneId === 'flash') return drawFlash(ctx, frame);
  if (sceneId === 'roulette') return drawRoulette(ctx, frame, sceneContext);
  if (sceneId === 'self-destruct') return drawSelfDestruct(ctx, frame);
  if (sceneId === 'vampire') return drawVampire(ctx, frame, sceneContext);
  if (sceneId === 'question-marks') return drawQuestionMarks(ctx, frame);
  if (sceneId === 'moon-flute') return drawMoonFlute(ctx, frame);
  if (sceneId === 'lilliputian-lyric') return drawLilliputianLyric(ctx, frame);
  if (sceneId === 'ponds-chorus') return drawPondsChorus(ctx, frame);
  if (sceneId === 'level-4-graviga') return drawLevel4Graviga(ctx, frame);
  if (sceneId === 'doom') return drawDoom(ctx, frame);
  if (sceneId === 'level-2-old') return drawLevel2Old(ctx, frame);
  if (sceneId === 'transfusion') return drawTransfusion(ctx, frame, sceneContext);
  if (sceneId === 'level-3-flare') return drawLevel3Flare(ctx, frame);
  if (sceneId === 'off-guard') return drawOffGuard(ctx, frame);
  if (sceneId === 'dark-spark') return drawDarkSpark(ctx, frame);
  if (sceneId === 'phoenix') return drawPhoenix(ctx, frame, sceneContext);
  if (sceneId === 'sylph') return drawSylph(ctx, frame, sceneContext);
  if (sceneId === 'odin') return drawOdin(ctx, frame, sceneContext);
  if (sceneId === 'golem') return drawGolem(ctx, frame);
  if (sceneId === 'carbuncle') return drawCarbuncle(ctx, frame);
  if (sceneId === 'quick') return drawQuick(ctx, frame);
  if (sceneId === 'mute') return drawMute(ctx, frame);
  if (sceneId === 'banish') return drawBanish(ctx, frame, sceneContext);
  if (sceneId === 'drain') return drawDrain(ctx, frame, sceneContext);
  if (sceneId === 'osmose') return drawOsmose(ctx, frame, sceneContext);
  if (sceneId === 'mini') return drawMini(ctx, frame);
  if (sceneId === 'toad') return drawToad(ctx, frame);
  if (sceneId === 'break') return drawBreak(ctx, frame);
  if (sceneId === 'death') return drawDeath(ctx, frame);
  if (sceneId === 'arise') return drawArise(ctx, frame);
  if (sceneId === 'blink') return drawBlink(ctx, frame);
  if (sceneId === 'berserk') return drawBerserk(ctx, frame);
  if (sceneId === 'dispel') return drawDispel(ctx, frame);
  if (sceneId === 'esuna') return drawEsuna(ctx, frame);
  if (sceneId === 'confuse') return drawConfuse(ctx, frame);
  if (sceneId === 'libra') return drawLibra(ctx, frame);
  if (sceneId === 'poisona') return drawPoisona(ctx, frame);
  if (sceneId === 'silence') return drawSilence(ctx, frame);
  if (sceneId === 'poison') return drawPoison(ctx, frame);
  if (sceneId === 'sleep') return drawSleep(ctx, frame);
  if (sceneId === 'bio') return drawBio(ctx, frame);
  if (sceneId === 'speed') return drawSpeed(ctx, frame);
  if (sceneId === 'regen') return drawRegen(ctx, frame);
  if (sceneId === 'float') return drawFloat(ctx, frame);
  if (sceneId === 'old') return drawOld(ctx, frame);
  if (sceneId === 'slowga') return drawTime(ctx, frame, 'slow');
  if (sceneId === 'hastega') return drawTime(ctx, frame, 'haste');
  if (sceneId === 'remora') return drawRemora(ctx, frame);
  if (sceneId === 'catoblepas') return drawCatoblepas(ctx, frame);
  if (sceneId === 'chocobo') return drawChocobo(ctx, frame, sceneContext);
  if (sceneId === 'ramuh') return drawRamuh(ctx, frame, sceneContext);
  if (sceneId === 'titan') return drawTitan(ctx, frame, sceneContext);
  if (sceneId === 'syldra') return drawSyldra(ctx, frame, sceneContext);
  if (sceneId === 'leviathan') return drawLeviathan(ctx, frame, sceneContext);
  if (sceneId === 'teleport') return drawTeleport(ctx, frame, sceneContext);
  return undefined;
}

function createSpellCanvas(sceneId) {
  if (typeof document === 'undefined' || !SPELL_PIXEL_SEQUENCES[sceneId]) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'spell-pixel-canvas';
  canvas.width = STAGE_WIDTH;
  canvas.height = STAGE_HEIGHT;
  canvas.dataset.pixelSequence = sceneId;
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

function scratchFor(canvas) {
  let scratch = scratchByCanvas.get(canvas);
  if (scratch) return scratch;
  if (typeof document === 'undefined') return null;
  scratch = document.createElement('canvas');
  scratch.width = LOGICAL_SIZE;
  scratch.height = LOGICAL_SIZE;
  scratchByCanvas.set(canvas, scratch);
  return scratch;
}

function quantizePixelFrame(ctx) {
  const image = ctx.getImageData(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 72) {
      data[index + 3] = 0;
      continue;
    }
    data[index] = Math.min(255, Math.round(data[index] / 32) * 32);
    data[index + 1] = Math.min(255, Math.round(data[index + 1] / 32) * 32);
    data[index + 2] = Math.min(255, Math.round(data[index + 2] / 32) * 32);
    data[index + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

function renderSpellCanvasFrame(canvas, sceneId, frame, sceneContext = {}) {
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  const ctx = canvas?.getContext?.('2d', { alpha: true, desynchronized: true });
  if (!ctx || !spec) return false;
  if (spec.renderMode === 'stage-direct') {
    setup(ctx, canvas.width, canvas.height);
    renderScene(ctx, sceneId, Math.max(0, Math.min(spec.frameCount - 1, Math.floor(frame))), {
      ...sceneContext,
      stageWidth: canvas.width,
      stageHeight: canvas.height,
      stageMapping: {
        width: canvas.width,
        height: canvas.height,
        drawX: 0,
        drawY: 0,
        drawWidth: canvas.width,
        drawHeight: canvas.height,
      },
    });
    return true;
  }
  const scratch = scratchFor(canvas);
  const scratchCtx = scratch?.getContext?.('2d', { alpha: true, desynchronized: true, willReadFrequently: true });
  if (!scratchCtx) return false;
  setup(scratchCtx);
  const stageDrawWidth = Math.min(LOGICAL_SIZE, canvas.width);
  const stageDrawHeight = Math.min(LOGICAL_SIZE, canvas.height);
  const renderContext = spec.sceneSpace === 'stage' ? {
    ...sceneContext,
    stageMapping: {
      width: canvas.width,
      height: canvas.height,
      drawX: (canvas.width - stageDrawWidth) / 2,
      drawY: (canvas.height - stageDrawHeight) / 2,
      drawWidth: stageDrawWidth,
      drawHeight: stageDrawHeight,
    },
  } : sceneContext;
  renderScene(scratchCtx, sceneId, Math.max(0, Math.min(spec.frameCount - 1, Math.floor(frame))), renderContext);
  quantizePixelFrame(scratchCtx);
  setup(ctx, canvas.width, canvas.height);
  const suppliedTargets = Array.isArray(sceneContext.targets) ? sceneContext.targets : [];
  const fallbackPoint = { x: Number(sceneContext.targetX ?? 50), y: Number(sceneContext.targetY ?? 50) };
  const casterPoint = { x: Number(sceneContext.casterX ?? fallbackPoint.x), y: Number(sceneContext.casterY ?? fallbackPoint.y) };
  const groupCentroid = suppliedTargets.length ? {
    x: suppliedTargets.reduce((sum, point) => sum + Number(point.x ?? fallbackPoint.x), 0) / suppliedTargets.length,
    y: suppliedTargets.reduce((sum, point) => sum + Number(point.y ?? fallbackPoint.y), 0) / suppliedTargets.length,
  } : fallbackPoint;
  const targetPoints = spec.sceneSpace === 'stage'
    ? [{ x: 50, y: 50 }]
    : spec.sceneSpace === 'caster-local'
      ? [casterPoint]
    : spec.sceneSpace === 'party-field'
      ? [groupCentroid]
      : spec.placement === 'each-target' && ['multi', 'mixed'].includes(sceneContext.targetMode) && suppliedTargets.length
        ? suppliedTargets
        : [fallbackPoint];
  targetPoints.forEach((point) => {
    const targetX = clamp(Number(point.x ?? fallbackPoint.x), 0, 100) / 100 * canvas.width;
    const targetY = clamp(Number(point.y ?? fallbackPoint.y), 0, 100) / 100 * canvas.height;
    const horizontalFit = Math.max(1, Math.min(targetX, canvas.width - targetX) * 2);
    const verticalFit = Math.max(1, Math.min(targetY, canvas.height - targetY) * 2);
    const drawSize = Math.max(1, Math.min(LOGICAL_SIZE, horizontalFit, verticalFit));
    ctx.drawImage(
      scratch,
      0,
      0,
      LOGICAL_SIZE,
      LOGICAL_SIZE,
      Math.round(targetX - drawSize / 2),
      Math.round(targetY - drawSize / 2),
      Math.round(drawSize),
      Math.round(drawSize),
    );
  });
  return true;
}

function playSpellCanvas(layer, durationMs, onCue = null, sceneContext = {}) {
  const canvas = layer?.querySelector?.('.spell-pixel-canvas');
  const sceneId = canvas?.dataset.pixelSequence;
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  const stageRect = layer?.getBoundingClientRect?.();
  if (canvas && stageRect?.width > 0 && stageRect?.height > 0) {
    canvas.width = STAGE_WIDTH;
    canvas.height = Math.max(220, Math.min(560, Math.round(STAGE_WIDTH * stageRect.height / stageRect.width)));
  }
  const ctx = canvas?.getContext?.('2d', { alpha: true, desynchronized: true });
  if (!canvas || !ctx || !spec) return () => {};
  const duration = Math.max(300, Number(durationMs) || (spec.frameCount / spec.fps) * 1000);
  const startedAt = performance.now();
  const firedImpacts = new Set();
  const pendingImpacts = [];
  let lastPresentedFrame = -1;
  let rafId = 0;
  let cancelled = false;
  const draw = (now) => {
    if (cancelled || !canvas.isConnected) return;
    const progress = clamp((now - startedAt) / duration);
    const frame = Math.min(spec.frameCount - 1, Math.floor(progress * spec.frameCount));
    spec.impactFrames.forEach((impactFrame, impactIndex) => {
      if (impactFrame > lastPresentedFrame && frame >= impactFrame && !firedImpacts.has(impactFrame)) {
        firedImpacts.add(impactFrame);
        pendingImpacts.push({ impactFrame, impactIndex });
      }
    });
    if (pendingImpacts.length) {
      const cue = pendingImpacts.shift();
      renderSpellCanvasFrame(canvas, sceneId, cue.impactFrame, sceneContext);
      lastPresentedFrame = cue.impactFrame;
      onCue?.({ type: 'impact', sceneId, frame: cue.impactFrame, impactIndex: cue.impactIndex });
      rafId = requestAnimationFrame(draw);
      return;
    }
    renderSpellCanvasFrame(canvas, sceneId, frame, sceneContext);
    lastPresentedFrame = Math.max(lastPresentedFrame, frame);
    if (progress < 1) rafId = requestAnimationFrame(draw);
    else onCue?.({ type: 'end', sceneId, frame: spec.frameCount - 1 });
  };
  rafId = requestAnimationFrame(draw);
  return () => { cancelled = true; cancelAnimationFrame(rafId); };
}

return { SPELL_PIXEL_SEQUENCES, createSpellCanvas, renderSpellCanvasFrame, playSpellCanvas };
})();
