import assert from 'node:assert/strict';
import { SPELL_PIXEL_SEQUENCES, createSpellCanvas, renderSpellCanvasFrame, playSpellCanvas } from '../src/ui/SpellCanvasRenderer.js';

const canvases = [];

class FakeContext2D {
  constructor() {
    this.paintOps = 0;
    this.opCounts = {};
    this.drawCalls = [];
  }

  count(name) { this.paintOps += 1; this.opCounts[name] = (this.opCounts[name] ?? 0) + 1; }

  setTransform() {}
  clearRect() {}
  save() {}
  restore() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
  translate() {}
  rotate() {}
  arc() { this.count('arc'); }
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
];
const impactSignatures = priorityScenes.map((sceneId) => {
  const spec = SPELL_PIXEL_SEQUENCES[sceneId];
  const audit = frameAudit[sceneId].find((entry) => entry.frame === spec.impactFrames[0]);
  return JSON.stringify(audit.opCounts);
});
assert.equal(new Set(impactSignatures).size, priorityScenes.length, 'priority scenes lost their dedicated render audit signature');

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
  multiImpactCueFrames: cueTicks.length,
  status: 'ok',
}, null, 2));
