import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPELL_PIXEL_SEQUENCES, createSpellCanvas, renderSpellCanvasFrame, playSpellCanvas } from '../src/ui/SpellCanvasRenderer.js';

const canvases = [];

class FakeContext2D {
  constructor() {
    this.paintOps = 0;
    this.opCounts = {};
    this.drawCalls = [];
    this.arcs = [];
    this.pathPoints = [];
    this.rects = [];
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
  fillRect(...args) { this.count('fillRect'); this.rects.push(args); }
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
  'fire', 'fira', 'firaga', 'blizzard', 'blizzara', 'blizzaga', 'thunder', 'thundara', 'thundaga',
  'cure', 'cura', 'curaga',
  'missile', 'flare', 'level-5-death',
  'raise', 'protect', 'holy', 'steal', 'jump', 'rapid-fire', 'zeninage', 'mix',
  'atomic-ray', 'wave-cannon', 'blaster', 'maelstrom', 'delta-attack',
  'almagest', 'grand-cross',
  'shell', 'reflect', 'haste', 'gravity', 'graviga', 'meteor', 'return',
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
  assert.equal(canvas.context.drawCalls.length, 0, `${sceneId}: reference-locked party field must paint directly once across the stage`);
}

const neoExdeathContext = {
  casterX: 24,
  casterY: 48,
  targetX: 78,
  targetY: 52,
  targets: [{ x: 78, y: 28 }, { x: 78, y: 44 }, { x: 78, y: 60 }, { x: 78, y: 76 }],
  alliedTargets: [{ x: 78, y: 28 }, { x: 78, y: 44 }, { x: 78, y: 60 }, { x: 78, y: 76 }],
  hostileTargets: [{ x: 24, y: 48 }],
  targetMode: 'multi',
  actorIsEnemy: true,
};
const almagestCanvas = createSpellCanvas('almagest');
renderSpellCanvasFrame(almagestCanvas, 'almagest', SPELL_PIXEL_SEQUENCES.almagest.impactFrames[0], neoExdeathContext);
assert.equal(almagestCanvas.context.drawCalls.length, 0, 'Almagest must paint directly across the full stage');
assert.ok(almagestCanvas.context.arcs.length >= 4, 'Almagest must mark all four party coordinates at the damage cue');
const grandCrossCanvas = createSpellCanvas('grand-cross');
renderSpellCanvasFrame(grandCrossCanvas, 'grand-cross', 300, neoExdeathContext);
assert.equal(grandCrossCanvas.context.drawCalls.length, 0, 'Grand Cross must paint directly across the full stage');
assert.ok(grandCrossCanvas.context.arcs.length >= 24, 'Grand Cross lost its layered radiation-orb field');

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
assert.notDeepEqual(
  impactSignatureFor('magic-hammer', { magicHammerApplied: true, magicHammerAmount: 100 }),
  impactSignatureFor('magic-hammer', { magicHammerApplied: false, magicHammerAmount: null }),
  'Magic Hammer must not present a successful MP-half latch without an mp-damage result',
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

const stageGeometryTraceAt = (sceneId, frame, sceneContext) => {
  const canvas = createSpellCanvas(sceneId);
  renderSpellCanvasFrame(canvas, sceneId, frame, sceneContext);
  return { arcs: canvas.context.arcs, pathPoints: canvas.context.pathPoints, rects: canvas.context.rects };
};
const stageGeometryTraceFor = (sceneId, sceneContext) => stageGeometryTraceAt(sceneId, SPELL_PIXEL_SEQUENCES[sceneId].impactFrames[0], sceneContext);
for (const sceneId of ['haste', 'gravity', 'meteor', 'return']) {
  assert.notDeepEqual(
    stageGeometryTraceFor(sceneId, leftHostileContext),
    stageGeometryTraceFor(sceneId, rightHostileContext),
    `${sceneId}: reference-locked time-magic effect ignored the actual target anchor`,
  );
}
for (const sceneId of ['1000-needles', 'aqua-breath', 'goblin-punch', 'magic-hammer', 'aero', 'aera', 'aeroga', 'flame-thrower']) {
  assert.notDeepEqual(
    stageGeometryTraceFor(sceneId, leftHostileContext),
    stageGeometryTraceFor(sceneId, rightHostileContext),
    `${sceneId}: reference-locked blue magic ignored the hostile target anchor`,
  );
}
const newBlueReferenceScenes = ['goblin-punch', 'magic-hammer', 'aero', 'aera', 'aeroga', 'flame-thrower'];
const casterMovedContext = { ...leftHostileContext, casterX: 62, casterY: 36 };
const targetMovedContext = {
  ...leftHostileContext,
  targetX: 36,
  targetY: 61,
  targets: [{ x: 36, y: 61 }],
  hostileTargets: [{ x: 36, y: 61 }],
};
for (const sceneId of newBlueReferenceScenes) {
  assert.notDeepEqual(
    stageGeometryTraceAt(sceneId, 10, leftHostileContext),
    stageGeometryTraceAt(sceneId, 10, casterMovedContext),
    `${sceneId}: observed blue-diamond cast ignored the actual caster anchor`,
  );
  assert.notDeepEqual(
    stageGeometryTraceFor(sceneId, leftHostileContext),
    stageGeometryTraceFor(sceneId, targetMovedContext),
    `${sceneId}: observed impact ignored the actual target anchor`,
  );
}

const rendererSource = readFileSync(new URL('../src/ui/SpellCanvasRenderer.js', import.meta.url), 'utf8');
const battleUiSource = readFileSync(new URL('../src/ui/BattleUI.js', import.meta.url), 'utf8');
const functionSource = (name, nextName) => rendererSource.slice(
  rendererSource.indexOf(`function ${name}`),
  rendererSource.indexOf(`function ${nextName}`),
);
assert.doesNotMatch(functionSource('drawGoblinPunch', 'drawMagicHammer'), /fist|knuckle|#eab94f/i, 'Goblin Punch restored the invented giant/comic fist');
assert.doesNotMatch(functionSource('drawMagicHammer', 'drawAero'), /mana|fillRect\(|gauge/i, 'Magic Hammer restored mana nails or the fake full-MP drain gauge');
assert.doesNotMatch(functionSource('drawAero', 'drawFlameThrower'), /crescent|stageFill\(|radial|ray\s*</i, 'Aero family restored green slashes or the edited-video radial blur');
assert.doesNotMatch(functionSource('drawFlameThrower', 'drawTimeSlip'), /nozzle|burn-line|jet-sweep/i, 'Flame Thrower restored the invented nozzle or burn line');
for (const field of ['magicHammerApplied', 'magicHammerAmount', 'magicHammerBeforeMp', 'magicHammerAfterMp']) {
  assert.ok(battleUiSource.includes(field), `BattleUI stopped forwarding ${field} into the Magic Hammer scene context`);
}
const leftPartyContext = {
  casterX: 78,
  casterY: 44,
  targetX: 24,
  targetY: 50,
  targets: [{ x: 24, y: 28 }, { x: 24, y: 44 }, { x: 24, y: 60 }, { x: 24, y: 76 }],
  alliedTargets: [{ x: 24, y: 28 }, { x: 24, y: 44 }, { x: 24, y: 60 }, { x: 24, y: 76 }],
};
const rightPartyContext = {
  casterX: 22,
  casterY: 44,
  targetX: 78,
  targetY: 50,
  targets: [{ x: 78, y: 28 }, { x: 78, y: 44 }, { x: 78, y: 60 }, { x: 78, y: 76 }],
  alliedTargets: [{ x: 78, y: 28 }, { x: 78, y: 44 }, { x: 78, y: 60 }, { x: 78, y: 76 }],
};
for (const sceneId of ['white-wind', 'mighty-guard']) {
  assert.notDeepEqual(
    stageGeometryTraceFor(sceneId, leftPartyContext),
    stageGeometryTraceFor(sceneId, rightPartyContext),
    `${sceneId}: reference-locked blue magic ignored the allied party anchors`,
  );
}

const referenceBlueContext = {
  casterX: 78,
  casterY: 44,
  targetX: 24,
  targetY: 48,
  targets: [{ x: 24, y: 48 }],
  hostileTargets: [{ x: 24, y: 48 }],
  alliedTargets: [{ x: 78, y: 28 }, { x: 78, y: 44 }, { x: 78, y: 60 }, { x: 78, y: 76 }],
  targetMode: 'mixed',
};
const referenceBlueTraces = Object.fromEntries(
  ['1000-needles', 'white-wind', 'aqua-breath', 'mighty-guard']
    .map((sceneId) => [sceneId, stageGeometryTraceFor(sceneId, referenceBlueContext)]),
);
for (const [sceneId, trace] of Object.entries(referenceBlueTraces)) {
  trace.pathPoints.forEach(([operation, x, y]) => {
    assert.ok(x >= 0 && x <= 320 && y >= 0 && y <= 400, `${sceneId}: ${operation} escaped the 320x400 stage at ${x},${y}`);
  });
  trace.rects.forEach(([x, y, width, height]) => {
    assert.ok(x >= 0 && y >= 0 && x + width <= 320 && y + height <= 400, `${sceneId}: fill rectangle escaped the 320x400 stage`);
  });
}
const hostileAnchor = { x: 320 * .24, y: 400 * .48 };
const pointNear = (point, expected) => Math.abs(point[1] - expected.x) <= 2 && Math.abs(point[2] - expected.y) <= 2;
const allTargetContext = {
  casterX: 24,
  casterY: 48,
  targetX: 76,
  targetY: 50,
  targets: [{ x: 76, y: 28 }, { x: 76, y: 44 }, { x: 76, y: 60 }, { x: 76, y: 76 }],
  hostileTargets: [{ x: 76, y: 28 }, { x: 76, y: 44 }, { x: 76, y: 60 }, { x: 76, y: 76 }],
  actorIsEnemy: true,
};
const flameAllTrace = stageGeometryTraceAt('flame-thrower', 72, allTargetContext);
const aerogaAllTrace = stageGeometryTraceAt('aeroga', 80, allTargetContext);
for (const target of allTargetContext.targets) {
  const expected = { x: 320 * target.x / 100, y: 400 * target.y / 100 };
  assert.ok(
    flameAllTrace.arcs.some(([x, y]) => Math.abs(x - expected.x) <= 2 && Math.abs(y - expected.y) <= 2),
    `Flame Thrower all-target impact missed ${target.x}%,${target.y}%`,
  );
  assert.ok(
    aerogaAllTrace.pathPoints.some(([, x, y]) => Math.abs(x - expected.x) <= 18 && Math.abs(y - expected.y) <= 18),
    `Aeroga all-target column missed ${target.x}%,${target.y}%`,
  );
}
assert.ok(
  referenceBlueTraces['1000-needles'].rects.some(([x, y, width, height]) => width <= 20 && height <= 4 && hostileAnchor.x >= x && hostileAnchor.x <= x + width && Math.abs(y - hostileAnchor.y) <= 2),
  '1000 Needles pin did not reach the hostile center within two logical pixels',
);
assert.ok(
  referenceBlueTraces['aqua-breath'].rects.some(([x, y, width, height]) => width === 22 && height === 48 && Math.abs(x + width / 2 - hostileAnchor.x) <= 2 && Math.abs(y + height / 2 - hostileAnchor.y) <= 2),
  'Aqua Breath refraction did not center on the hostile target within two logical pixels',
);
for (const sceneId of ['white-wind', 'mighty-guard']) {
  for (const ally of referenceBlueContext.alliedTargets) {
    const expected = { x: 320 * ally.x / 100, y: 400 * ally.y / 100 };
    assert.ok(
      referenceBlueTraces[sceneId].rects.some(([x, y, width, height]) => width <= 10 && height <= 4 && expected.x >= x && expected.x <= x + width && Math.abs(y - expected.y) <= 2),
      `${sceneId}: ally marker missed ${ally.x}%,${ally.y}% by more than two logical pixels`,
    );
  }
}
const mightyManifestCanvas = createSpellCanvas('mighty-guard');
renderSpellCanvasFrame(mightyManifestCanvas, 'mighty-guard', 30, referenceBlueContext);
assert.equal(
  mightyManifestCanvas.context.pathPoints.filter(([operation]) => operation === 'moveTo').length,
  8,
  'Mighty Guard must manifest exactly eight original blue diamonds before the ward latch',
);

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
  partyFieldStageDirect: 2,
  crossSideAnchors: 8,
  resultBranches: 7,
  finalMagicAnchorCases: 7,
  timeMagicAnchorCases: 4,
  blueMagicAnchorCases: 22,
  blueMagicStageBounds: 4,
  blueMagicAllTargetAnchors: allTargetContext.targets.length * 2,
  blueMagicLegacyMotifGuards: 4,
  magicHammerContextFields: 4,
  mightyGuardDiamondCount: 8,
  multiImpactCueFrames: cueTicks.length,
  status: 'ok',
}, null, 2));
