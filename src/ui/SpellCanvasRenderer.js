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
const sequence = (frameCount, impactFrames, phases, options = {}) => Object.freeze({
  referenceVersion: TARGET_VERSION,
  verification: 'provisional-needs-reference-capture',
  referenceCaptureId: null,
  reference: Object.freeze({
    sourceCitation: null,
    sourceMediaHash: null,
    captureId: null,
    region: 'JP',
    revision: 'SFC-1992-target-unverified',
    emulatorCore: null,
    sourceFps: null,
    captureResolution: null,
    crop: null,
    evidenceFrames: Object.freeze([]),
    goldenFrames: Object.freeze([]),
    reviewer: null,
    reviewedAt: null,
  }),
  portraitAdaptation: Object.freeze({ mode: 'target-anchored-portrait-stage', sourceAspectVerified: false }),
  resultPolicy: options.resultPolicy ?? 'final-impact',
  placement: options.placement ?? 'each-target',
  sceneSpace: options.sceneSpace ?? 'target-local',
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
  haste: sequence(72, [49], [phase('clock', 0, 20), phase('accelerate', 21, 48), phase('latch', 49, 60), phase('decay', 61, 71)]),
  slow: sequence(76, [52], [phase('clock', 0, 20), phase('drag', 21, 51), phase('latch', 52, 64), phase('decay', 65, 75)]),
  stop: sequence(84, [57], [phase('clock', 0, 23), phase('freeze', 24, 56), phase('latch', 57, 70), phase('decay', 71, 83)]),
  comet: sequence(78, [53], [phase('sky', 0, 18), phase('fall', 19, 52), phase('crater', 53, 66), phase('decay', 67, 77)]),
  meteor: sequence(118, [62, 72, 82, 91], [phase('rift', 0, 27), phase('fall', 28, 61), phase('barrage', 62, 98), phase('decay', 99, 117)], { resultPolicy: 'split-amount', placement: 'centroid', sceneSpace: 'stage' }),
  missile: sequence(86, [59], [phase('scan', 0, 26), phase('lock', 27, 42), phase('launch', 43, 58), phase('quarter', 59, 72), phase('decay', 73, 85)]),
  flare: sequence(108, [72], [phase('dust', 0, 26), phase('collapse', 27, 61), phase('whiteout', 62, 82), phase('decay', 83, 107)]),
  'level-5-death': sequence(112, [76], [phase('level-scan', 0, 29), phase('selection', 30, 52), phase('death-gate', 53, 75), phase('soul-cut', 76, 92), phase('decay', 93, 111)]),
  shiva: sequence(126, [87], [phase('seal', 0, 31), phase('curtain', 32, 67), phase('diamond-dust', 68, 101), phase('decay', 102, 125)], { placement: 'centroid', sceneSpace: 'stage' }),
  ifrit: sequence(128, [88], [phase('seal', 0, 30), phase('hellfire', 31, 70), phase('eruption', 71, 103), phase('decay', 104, 127)], { placement: 'centroid', sceneSpace: 'stage' }),
  bahamut: sequence(148, [104], [phase('seal', 0, 34), phase('charge', 35, 77), phase('mega-flare', 78, 119), phase('decay', 120, 147)], { placement: 'centroid', sceneSpace: 'stage' }),
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

function renderScene(ctx, sceneId, frame) {
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
  if (['haste', 'slow', 'stop'].includes(sceneId)) return drawTime(ctx, frame, sceneId);
  if (sceneId === 'comet') return drawComet(ctx, frame, false);
  if (sceneId === 'meteor') return drawComet(ctx, frame, true);
  if (sceneId === 'missile') return drawMissile(ctx, frame);
  if (sceneId === 'flare') return drawFlare(ctx, frame);
  if (sceneId === 'level-5-death') return drawLevel5Death(ctx, frame);
  if (['shiva', 'ifrit', 'bahamut'].includes(sceneId)) return drawSummon(ctx, frame, sceneId);
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
  const scratch = scratchFor(canvas);
  const scratchCtx = scratch?.getContext?.('2d', { alpha: true, desynchronized: true, willReadFrequently: true });
  if (!ctx || !scratchCtx || !spec) return false;
  setup(scratchCtx);
  renderScene(scratchCtx, sceneId, Math.max(0, Math.min(spec.frameCount - 1, Math.floor(frame))));
  quantizePixelFrame(scratchCtx);
  setup(ctx, canvas.width, canvas.height);
  const fallbackPoint = { x: Number(sceneContext.targetX ?? 50), y: Number(sceneContext.targetY ?? 50) };
  const targetPoints = spec.placement === 'each-target' && ['multi', 'mixed'].includes(sceneContext.targetMode) && Array.isArray(sceneContext.targets) && sceneContext.targets.length
    ? sceneContext.targets
    : [fallbackPoint];
  targetPoints.forEach((point) => {
    const targetX = clamp(Number(point.x ?? fallbackPoint.x), 0, 100) / 100 * canvas.width;
    const targetY = clamp(Number(point.y ?? fallbackPoint.y), 0, 100) / 100 * canvas.height;
    ctx.drawImage(scratch, Math.round(targetX - LOGICAL_SIZE / 2), Math.round(targetY - LOGICAL_SIZE / 2));
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
  let rafId = 0;
  let cancelled = false;
  const draw = (now) => {
    if (cancelled || !canvas.isConnected) return;
    const progress = clamp((now - startedAt) / duration);
    const frame = Math.min(spec.frameCount - 1, Math.floor(progress * spec.frameCount));
    renderSpellCanvasFrame(canvas, sceneId, frame, sceneContext);
    spec.impactFrames.forEach((impactFrame, impactIndex) => {
      if (frame >= impactFrame && !firedImpacts.has(impactFrame)) {
        firedImpacts.add(impactFrame);
        onCue?.({ type: 'impact', sceneId, frame: impactFrame, impactIndex });
      }
    });
    if (progress < 1) rafId = requestAnimationFrame(draw);
    else onCue?.({ type: 'end', sceneId, frame: spec.frameCount - 1 });
  };
  rafId = requestAnimationFrame(draw);
  return () => { cancelled = true; cancelAnimationFrame(rafId); };
}

return { SPELL_PIXEL_SEQUENCES, createSpellCanvas, renderSpellCanvasFrame, playSpellCanvas };
})();
