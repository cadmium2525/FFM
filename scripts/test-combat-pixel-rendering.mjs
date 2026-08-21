import assert from 'node:assert/strict';
import { SPELL_PIXEL_SEQUENCES, createSpellCanvas, renderSpellCanvasFrame, playSpellCanvas } from '../src/ui/SpellCanvasRenderer.js';

const canvases = [];

class FakeContext2D {
  constructor() {
    this.paintOps = 0;
    this.opCounts = {};
    this.drawCalls = [];
    this.arcs = [];
    this.pathPoints = [];
  }

  count(name) { this.paintOps += 1; this.opCounts[name] = (this.opCounts[name] ?? 0) + 1; }

  setTransform() {}
  clearRect() {}
  save() {}
  restore() {}
  beginPath() {}
  moveTo(...args) { this.pathPoints.push(['moveTo', ...args]); }
  lineTo(...args) { this.pathPoints.push(['lineTo', ...args]); }
  closePath() {}
  translate() {}
  rotate() {}
  arc(...args) { this.count('arc'); this.arcs.push(args); }
  fill() { this.count('fill'); }
  stroke() { this.count('stroke'); }
  fillRect() { this.count('fillRect'); }
  drawImage(...args) { this.count('drawImage'); this.drawCalls.push(args); }
  getImageData() { return { data: new Uint8ClampedArray(192 * 192 * 4) }; }
  putImageData() {}
}

class FakeCanvas {
  constructor() {
    this.width = 320;
    this.height = 400;
    this.className = '';
    this.dataset = {};
    this.isConnected = true;
    this.context = new FakeContext2D();
    canvases.push(this);
  }

  getContext() { return this.context; }
  setAttribute() {}
}

globalThis.document = { createElement: (tag) => {
  assert.equal(tag, 'canvas');
  return new FakeCanvas();
} };

const frameAudit = {};
for (const [sceneId, spec] of Object.entries(SPELL_PIXEL_SEQUENCES)) {
  const before = canvases.length;
  const canvas = createSpellCanvas(sceneId);
  assert.ok(canvas, `${sceneId}: renderer did not create a canvas`);
  const frames = [...new Set([0, ...spec.impactFrames, spec.frameCount - 1])];
  let previousPaintOps = 0;
  let previousCounts = {};
  frameAudit[sceneId] = [];
  for (const frame of frames) {
    const rendered = renderSpellCanvasFrame(canvas, sceneId, frame, {
      casterX: 78,
      casterY: 44,
      targetX: 25,
      targetY: 46,
      targets: [{ x: 22, y: 39 }, { x: 28, y: 53 }],
      targetMode: 'multi',
      actorIsEnemy: false,
    });
    assert.equal(rendered, true, `${sceneId}@${frame}: render failed`);
    const sceneCanvases = canvases.slice(before);
    const paintOps = sceneCanvases.reduce((sum, entry) => sum + entry.context.paintOps, 0);
    const delta = paintOps - previousPaintOps;
    previousPaintOps = paintOps;
    assert.ok(delta > 0, `${sceneId}@${frame}: frame produced no drawing operations`);
    const totals = sceneCanvases.reduce((summary, entry) => {
      Object.entries(entry.context.opCounts).forEach(([name, count]) => { summary[name] = (summary[name] ?? 0) + count; });
      return summary;
    }, {});
    const opCounts = Object.fromEntries(Object.entries(totals).map(([name, count]) => [name, count - (previousCounts[name] ?? 0)]));
    previousCounts = totals;
    frameAudit[sceneId].push({ frame, paintOps: delta, opCounts });
  }
  const stageCanvas = canvases[before];
  stageCanvas.context.drawCalls.forEach((args) => {
    const [, , , , , x, y, width, height] = args;
    assert.ok(x >= 0 && y >= 0, `${sceneId}: effect was clipped at the stage origin`);
    assert.ok(x + width <= stageCanvas.width && y + height <= stageCanvas.height, `${sceneId}: effect exceeded the stage bounds`);
  });
}

const priorityScenes = [
  'raise', 'protect', 'holy', 'steal', 'jump', 'rapid-fire', 'zeninage', 'mix',
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
  'libra', 'poisona', 'silence', 'poison', 'sleep',
  'bio', 'speed', 'regen', 'float', 'old',
  'slowga', 'hastega', 'remora', 'catoblepas', 'chocobo',
  'ramuh', 'titan', 'syldra', 'leviathan', 'teleport',
];
const impactSignatures = priorityScenes.map((sceneId) => {
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  const audit = frameAudit[sceneId].find((entry) => entry.frame === spec.impactFrames[0]);
  return { sceneId, spec, value: JSON.stringify(audit.opCounts) };
});
const signatureOwners = new Map();
for (const signature of impactSignatures) {
  const previous = signatureOwners.get(signature.value);
  if (previous) {
    assert.ok(signature.spec.sharedOriginalFamily, `${signature.sceneId}: duplicate render signature is not backed by an original shared family`);
    assert.equal(signature.spec.sharedOriginalFamily, previous.spec.sharedOriginalFamily, `${signature.sceneId}: duplicate render signature crossed original effect families`);
  } else {
    signatureOwners.set(signature.value, signature);
  }
}

for (const sceneId of ['white-wind', 'mighty-guard']) {
  const canvas = createSpellCanvas(sceneId);
  renderSpellCanvasFrame(canvas, sceneId, SPELL_PIXEL_SEQUENCES[sceneId].impactFrames[0], {
    targetX: 78,
    targetY: 50,
    targets: [{ x: 78, y: 25 }, { x: 78, y: 42 }, { x: 78, y: 59 }, { x: 78, y: 76 }],
    targetMode: 'multi',
  });
  assert.equal(canvas.context.drawCalls.length, 1, `${sceneId}: party-wide field must render once, not once per unit`);
}

const crossSideContext = {
  casterX: 78,
  casterY: 42,
  targetX: 52,
  targetY: 50,
  targets: [{ x: 24, y: 48 }, { x: 81, y: 60 }],
  hostileTargets: [{ x: 24, y: 48 }],
  alliedTargets: [{ x: 81, y: 60 }],
  targetMode: 'mixed',
};
const stageArcCenters = (sceneId) => {
  const before = canvases.length;
  const canvas = createSpellCanvas(sceneId);
  renderSpellCanvasFrame(canvas, sceneId, SPELL_PIXEL_SEQUENCES[sceneId].impactFrames[0], crossSideContext);
  const scratchCanvas = canvases[before + 1];
  const [, , , , , drawX, drawY, drawWidth, drawHeight] = canvas.context.drawCalls[0];
  return scratchCanvas.context.arcs.map(([x, y]) => ({
    x: drawX + x / 192 * drawWidth,
    y: drawY + y / 192 * drawHeight,
  }));
};
const hasArcAt = (centers, expected) => centers.some((point) => Math.abs(point.x - expected.x) <= 2 && Math.abs(point.y - expected.y) <= 2);
const hostilePoint = { x: 320 * .24, y: 400 * .48 };
const alliedPoint = { x: 320 * .81, y: 400 * .60 };
const casterPoint = { x: 320 * .78, y: 400 * .42 };
for (const sceneId of ['phoenix', 'sylph']) {
  const centers = stageArcCenters(sceneId);
  assert.ok(hasArcAt(centers, hostilePoint), `${sceneId}: hostile-side effect missed the enemy anchor`);
  assert.ok(hasArcAt(centers, alliedPoint), `${sceneId}: ally-side effect missed the party/revival anchor`);
}
for (const sceneId of ['drain', 'osmose']) {
  const centers = stageArcCenters(sceneId);
  assert.ok(hasArcAt(centers, hostilePoint), `${sceneId}: drain origin missed the enemy anchor`);
  assert.ok(hasArcAt(centers, casterPoint), `${sceneId}: drain return missed the caster anchor`);
}

const impactSignatureFor = (sceneId, sceneContext) => {
  const before = canvases.length;
  const canvas = createSpellCanvas(sceneId);
  renderSpellCanvasFrame(canvas, sceneId, SPELL_PIXEL_SEQUENCES[sceneId].impactFrames[0], sceneContext);
  return canvases.slice(before).reduce((summary, entry) => {
    Object.entries(entry.context.opCounts).forEach(([name, count]) => { summary[name] = (summary[name] ?? 0) + count; });
    return summary;
  }, {});
};
assert.notDeepEqual(
  impactSignatureFor('odin', { odinOutcome: 'blade' }),
  impactSignatureFor('odin', { odinOutcome: 'gungnir' }),
  'Odin blade and Gungnir outcomes must render different impact choreography',
);
assert.notDeepEqual(
  impactSignatureFor('banish', { banishOutcome: 'removed' }),
  impactSignatureFor('banish', { banishOutcome: 'blocked' }),
  'Banish success and blocked outcomes must render different impact choreography',
);
assert.notDeepEqual(
  impactSignatureFor('chocobo', { chocoboOutcome: 'kick' }),
  impactSignatureFor('chocobo', { chocoboOutcome: 'fat' }),
  'Chocobo Kick and Fat Chocobo must render different impact choreography',
);

const geometryTraceFor = (sceneId, sceneContext) => {
  const before = canvases.length;
  const canvas = createSpellCanvas(sceneId);
  renderSpellCanvasFrame(canvas, sceneId, SPELL_PIXEL_SEQUENCES[sceneId].impactFrames[0], sceneContext);
  const scratchContext = canvases[before + 1].context;
  return { arcs: scratchContext.arcs, pathPoints: scratchContext.pathPoints };
};
const leftHostileContext = { casterX: 78, casterY: 44, targetX: 24, targetY: 48, targets: [{ x: 24, y: 48 }], hostileTargets: [{ x: 24, y: 48 }], alliedTargets: [{ x: 78, y: 44 }], actorIsEnemy: false };
const rightHostileContext = { casterX: 22, casterY: 44, targetX: 76, targetY: 48, targets: [{ x: 76, y: 48 }], hostileTargets: [{ x: 76, y: 48 }], alliedTargets: [{ x: 22, y: 44 }], actorIsEnemy: true };
for (const sceneId of ['ramuh', 'titan', 'syldra', 'leviathan']) {
  assert.notDeepEqual(geometryTraceFor(sceneId, leftHostileContext), geometryTraceFor(sceneId, rightHostileContext), `${sceneId}: stage attack ignored the hostile-side anchor`);
}
const teleportLeft = geometryTraceFor('teleport', { targets: [{ x: 24, y: 40 }], alliedTargets: [{ x: 24, y: 40 }], hostileTargets: [{ x: 80, y: 50 }] });
const teleportRight = geometryTraceFor('teleport', { targets: [{ x: 76, y: 40 }], alliedTargets: [{ x: 76, y: 40 }], hostileTargets: [{ x: 80, y: 50 }] });
const teleportHostileMoved = geometryTraceFor('teleport', { targets: [{ x: 24, y: 40 }], alliedTargets: [{ x: 24, y: 40 }], hostileTargets: [{ x: 20, y: 70 }] });
assert.notDeepEqual(teleportLeft, teleportRight, 'Teleport ignored the allied-side anchor');
assert.deepEqual(teleportLeft, teleportHostileMoved, 'Teleport must not draw a removal effect on hostile targets');

const queuedRafs = [];
globalThis.requestAnimationFrame = (callback) => { queuedRafs.push(callback); return queuedRafs.length; };
globalThis.cancelAnimationFrame = () => {};
const meteorCanvas = createSpellCanvas('meteor');
const cueTicks = [];
let activeTick = 0;
playSpellCanvas({
  querySelector: () => meteorCanvas,
  getBoundingClientRect: () => ({ width: 320, height: 400 }),
}, 300, (cue) => { if (cue.type === 'impact') cueTicks.push(activeTick); });
const lateFrameTime = performance.now() + 1000;
while (queuedRafs.length && cueTicks.length < SPELL_PIXEL_SEQUENCES.meteor.impactFrames.length) {
  activeTick += 1;
  queuedRafs.shift()(lateFrameTime + activeTick * 17);
}
assert.deepEqual(cueTicks, [1, 2, 3, 4], 'multi-impact cues must occupy separate rendered animation frames');

console.log(JSON.stringify({
  renderedSequences: Object.keys(frameAudit).length,
  auditedPriorityScenes: priorityScenes.length,
  sampledFrames: Object.values(frameAudit).reduce((sum, frames) => sum + frames.length, 0),
  edgeClipping: false,
  partyFieldDraws: 1,
  crossSideAnchors: 8,
  resultBranches: 6,
  finalMagicAnchorCases: 7,
  multiImpactCueFrames: cueTicks.length,
  status: 'ok',
}, null, 2));
