import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BattleManager } from '../src/battle/BattleManager.js';

const manager = Object.create(BattleManager.prototype);
manager.finished = false;
manager.presentationHoldUntil = 0;
manager.advanceTurn = () => {};

const originalSetTimeout = globalThis.setTimeout;
let scheduledDelay = 0;
globalThis.setTimeout = (_callback, delay) => {
  scheduledDelay = delay;
  return 1;
};
try {
  manager.deferNextTurnFor(920);
  manager.scheduleNextTurn(550);
} finally {
  globalThis.setTimeout = originalSetTimeout;
}
assert.ok(scheduledDelay >= 880, `presentation gate was ignored (${scheduledDelay}ms)`);

const uiSource = await readFile(new URL('../src/ui/BattleUI.js', import.meta.url), 'utf8');
assert.doesNotMatch(uiSource, /effectQueue\.splice/, 'queued effects must never be discarded');
assert.match(uiSource, /target-friendly/, 'friendly target routing missing');
assert.match(uiSource, /target-multi/, 'group target routing missing');
assert.match(uiSource, /result\.targetUid/, 'result target identities are not consumed');

console.log(JSON.stringify({ scheduledDelay, queueDiscard: false, targetRouting: true, status: 'ok' }, null, 2));
