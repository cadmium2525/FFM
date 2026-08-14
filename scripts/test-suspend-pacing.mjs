import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Unit } from '../src/battle/Unit.js';
import { BattleManager } from '../src/battle/BattleManager.js';
import { getAbilityListPosition, saveAbilityListPosition } from '../src/core/AbilityPosition.js';
import { MESSAGE_SPEED_PRESETS } from '../src/core/Settings.js';
import { clearSuspendSave, readSuspendSave, writeSuspendSave } from '../src/core/SuspendSave.js';
import { MessageWindow } from '../src/ui/MessageWindow.js';
import { eventBus } from '../src/core/EventBus.js';

assert.deepEqual(MESSAGE_SPEED_PRESETS.normal, {
  label: 'ふつう', holdMs: 1700, fastHoldMs: 1100, betweenMs: 140,
});
assert.ok(MESSAGE_SPEED_PRESETS.slow.holdMs > MESSAGE_SPEED_PRESETS.normal.holdMs);
assert.ok(MESSAGE_SPEED_PRESETS.fast.holdMs < MESSAGE_SPEED_PRESETS.normal.holdMs);

const classList = { add() {}, remove() {} };
const messageWindow = new MessageWindow({ classList }, { textContent: '' });
const originalAnimationFrame = globalThis.requestAnimationFrame;
globalThis.requestAnimationFrame = (callback) => { callback(); return 1; };
try {
  messageWindow.show('行動メッセージ');
  const pendingMs = messageWindow.show('結果メッセージ');
  assert.ok(pendingMs >= 3400, `queued messages should gate the next turn (${pendingMs}ms)`);
} finally {
  messageWindow.reset();
  globalThis.requestAnimationFrame = originalAnimationFrame;
}

const hero = new Unit({
  id: 'hero', name: 'Hero', maxHp: 1200, hp: 777, maxMp: 300, mp: 211,
  atk: 60, def: 30, magic: 25, agility: 28, ctValue: 1040,
});
hero.addStatus('poison', { force: true, duration: 3 });
const omega = new Unit({
  id: 'omega', name: 'オメガ', spriteUrl: 'assets/images/bosses/omega.webp', isEnemy: true,
  maxHp: 55530, hp: 43210, maxMp: 60700, atk: 115, def: 190, magic: 199,
  agility: 76, ctValue: 680, counterOnHit: { chance: 1, times: 2 },
});
const manager = new BattleManager([hero], omega);
manager.currentActor = hero;
manager.awaitingPlayerInput = true;
manager.pendingEnemyActions.set(omega.uid, { id: 'omega-wave', name: 'はどうほう', kind: 'magic-attack' });

const restored = BattleManager.fromSnapshot(manager.createSnapshot());
assert.equal(restored.party[0].hp, 777);
assert.equal(restored.party[0].mp, 211);
assert.equal(restored.party[0].ctValue, 1040);
assert.equal(restored.party[0].statuses.has('poison'), true);
assert.equal(restored.party[0].statusDurations.get('poison'), 3);
assert.equal(restored.boss.hp, 43210);
assert.equal(restored.boss.spriteUrl, 'assets/images/bosses/omega.webp');
assert.equal(restored.currentActor, restored.party[0]);
assert.equal(restored.awaitingPlayerInput, true);
assert.equal(restored.pendingEnemyActions.get(restored.boss.uid)?.id, 'omega-wave');

const tickingHero = new Unit({ id: 'ticking-hero', name: 'Ticking Hero', maxHp: 800, hp: 600, agility: 20, ctValue: 1000 });
tickingHero.addStatus('poison', { force: true, duration: 2 });
const tickBoss = new Unit({ id: 'tick-boss', name: 'Tick Boss', isEnemy: true, maxHp: 9000, hp: 9000, agility: 1, ctValue: 0 });
const tickManager = new BattleManager([tickingHero], tickBoss);
let actorTurnStarted = false;
let statusGateDelay = 0;
tickManager.beginActorTurn = () => { actorTurnStarted = true; };
const removeLogGate = eventBus.on('battle:log', () => tickManager.deferNextTurnFor(1700));
const originalTimeout = globalThis.setTimeout;
globalThis.setTimeout = (_callback, delay) => {
  statusGateDelay = Math.max(statusGateDelay, delay);
  return 1;
};
try {
  tickManager.advanceTurn();
} finally {
  globalThis.setTimeout = originalTimeout;
  removeLogGate();
}
assert.equal(actorTurnStarted, false, 'status messages must finish before command/action begins');
assert.ok(statusGateDelay >= 1650, `status-message gate was too short (${statusGateDelay}ms)`);

const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};
assert.equal(writeSuspendSave({ screen: 'battle', bossIndex: 0, livingParty: [{}], battle: manager.createSnapshot() }, storage), true);
assert.equal(readSuspendSave(storage)?.battle?.units?.[1]?.id, 'omega');
assert.equal(clearSuspendSave(storage), true);
assert.equal(readSuspendSave(storage), null);

saveAbilityListPosition('hero-a', 'formation', 480);
saveAbilityListPosition('hero-b', 'formation', 120);
assert.equal(getAbilityListPosition('hero-a', 'formation'), 480);
assert.equal(getAbilityListPosition('hero-b', 'formation'), 120);

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const bossEndHandler = mainSource.match(/const onEnd = \(\{ result \}\) => \{[\s\S]*?\n  \};/)?.[0] ?? '';
assert.match(bossEndHandler, /deleteSuspendData\(\)/, 'battle end must clear the consumed suspend snapshot');
assert.match(mainSource, /restart-button-lose[\s\S]*?deleteSuspendData\(\)/, 'game-over exit must clear suspend data');

const uiCss = await readFile(new URL('../css/ff5-ui.css', import.meta.url), 'utf8');
assert.match(uiCss, /boss\.unit-omega[\s\S]*?width:\s*clamp\(100px,\s*16\.667vw,\s*147px\)/, 'Omega must render at two-thirds size');

console.log(JSON.stringify({
  normalHoldMs: MESSAGE_SPEED_PRESETS.normal.holdMs,
  restoredHp: restored.party[0].hp,
  omegaSprite: restored.boss.spriteUrl,
  perCharacterAbilityPosition: true,
  gameOverClearsSuspend: true,
  omegaWidthPx: 147,
  statusMessageGateMs: statusGateDelay,
  status: 'ok',
}, null, 2));
