import assert from 'node:assert/strict';
import { SPELL_PIXEL_SEQUENCES } from '../src/ui/SpellCanvasRenderer.js';

// User-approved legacy exception: these 77 sequences existed before the
// reference-first production gate was introduced on 2026-08-22. They remain
// provisional and must never be counted as original-reference passes.
const GRANDFATHERED_PROVISIONAL_SCENES = new Set([
  'arise',
  'atomic-ray',
  'bahamut',
  'banish',
  'berserk',
  'bio',
  'blaster',
  'blink',
  'break',
  'carbuncle',
  'catoblepas',
  'chocobo',
  'comet',
  'confuse',
  'dark-spark',
  'death',
  'death-claw',
  'delta-attack',
  'dispel',
  'doom',
  'drain',
  'esuna',
  'flash',
  'float',
  'golem',
  'graviga',
  'hastega',
  'ifrit',
  'jump',
  'level-2-old',
  'level-3-flare',
  'level-4-graviga',
  'leviathan',
  'libra',
  'lilliputian-lyric',
  'maelstrom',
  'mind-blast',
  'mini',
  'mix',
  'moon-flute',
  'mute',
  'odin',
  'off-guard',
  'old',
  'osmose',
  'phoenix',
  'poison',
  'poisona',
  'ponds-chorus',
  'question-marks',
  'quick',
  'ramuh',
  'rapid-fire',
  'reflect',
  'regen',
  'remora',
  'roulette',
  'self-destruct',
  'shell',
  'shiva',
  'silence',
  'sleep',
  'slow',
  'slowga',
  'speed',
  'steal',
  'stop',
  'syldra',
  'sylph',
  'teleport',
  'time-slip',
  'titan',
  'toad',
  'transfusion',
  'vampire',
  'wave-cannon',
  'zeninage',
]);

assert.equal(GRANDFATHERED_PROVISIONAL_SCENES.size, 77, 'legacy VFX exception list changed');

const requiredReferenceFields = [
  'sourceCitation',
  'sourceMediaHash',
  'captureId',
  'emulatorCore',
  'sourceFps',
  'captureResolution',
  'crop',
  'reviewer',
  'reviewedAt',
];

let gatedNewScenes = 0;
for (const [sceneId, spec] of Object.entries(SPELL_PIXEL_SEQUENCES)) {
  if (GRANDFATHERED_PROVISIONAL_SCENES.has(sceneId)) continue;

  gatedNewScenes += 1;
  assert.ok(
    ['reference-locked', 'golden-pass'].includes(spec.verification),
    `${sceneId}: new VFX must be reference-locked before implementation`,
  );
  assert.ok(spec.referenceCaptureId, `${sceneId}: missing referenceCaptureId`);
  assert.equal(spec.referenceCaptureId, spec.reference?.captureId, `${sceneId}: capture IDs disagree`);
  for (const field of requiredReferenceFields) {
    assert.ok(spec.reference?.[field], `${sceneId}: missing reference.${field}`);
  }
  assert.ok(spec.reference.evidenceFrames.length >= 4, `${sceneId}: cast/development/impact/decay evidence required`);
  for (const evidence of spec.reference.evidenceFrames) {
    assert.match(evidence.sha256 ?? '', /^[a-f0-9]{64}$/, `${sceneId}: evidence frame is missing its SHA-256`);
  }
  if (spec.verification === 'golden-pass') {
    assert.ok(spec.reference.goldenFrames.length >= 4, `${sceneId}: four rendered golden frames required for golden-pass`);
  } else {
    assert.equal(spec.reference.goldenFrames.length, 0, `${sceneId}: reference evidence must not be mislabeled as rendered golden output`);
    assert.equal(spec.reference.goldenStatus, 'pending-render-diff', `${sceneId}: pending golden comparison must remain explicit`);
  }
  assert.equal(spec.portraitAdaptation?.sourceAspectVerified, true, `${sceneId}: portrait coordinate conversion is unverified`);
}

for (const sceneId of GRANDFATHERED_PROVISIONAL_SCENES) {
  assert.ok(SPELL_PIXEL_SEQUENCES[sceneId], `${sceneId}: grandfathered scene unexpectedly removed`);
}

console.log(JSON.stringify({
  status: 'ok',
  policy: 'reference-before-implementation',
  grandfatheredProvisionalScenes: GRANDFATHERED_PROVISIONAL_SCENES.size,
  gatedNewScenes,
}, null, 2));
