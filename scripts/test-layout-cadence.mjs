import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CTBEngine } from '../src/battle/CTBEngine.js';
import { Unit } from '../src/battle/Unit.js';
import { FF5_ENEMY_TURN_COST } from '../src/battle/BattleManager.js';
import { bossData } from '../src/data/bossData.js';

const css = await readFile(new URL('../css/style.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

const arenaLayoutBlock = css.match(/#battle-screen \.battle-layout \{\s*isolation:[\s\S]*?\n\}/)?.[0] ?? '';
assert.doesNotMatch(arenaLayoutBlock, /crystal-sanctum-pixel-v2/, 'arena art must not scale against the full battle screen');
assert.match(css, /#battle-screen \.battle-field \{[\s\S]*?crystal-sanctum-pixel-v2\.png[\s\S]*?\n\}/, 'arena art must be sized inside the battle-field frame');
assert.match(html, /<div class="battle-field[\s\S]*?<div class="battle-atmosphere"[\s\S]*?<div id="battle-effects"/, 'atmosphere layers must be clipped to the battle-field frame');
assert.match(css, /#gameover-screen\.active-screen[\s\S]*?display:\s*flex/, 'game over screen must use centered flex layout');
assert.match(css, /#gameover-screen \{[\s\S]*?align-items:\s*center[\s\S]*?justify-content:\s*center/, 'game over content must be centered on both axes');

const omega = bossData.find((boss) => boss.id === 'omega');
assert.equal(omega?.agility, 76, 'Omega Speed must remain the FFV value 76');
assert.equal(FF5_ENEMY_TURN_COST, 1, 'enemy techniques must not add a non-FFV recovery penalty');

const makeUnit = (id, agility, equipmentEffects = {}) => new Unit({
  id,
  name: id,
  maxHp: 1000,
  hp: 1000,
  agility,
  ctValue: 0,
  equipmentEffects,
});
const units = [
  makeUnit('p1', 28, { autoStatuses: ['haste'] }),
  makeUnit('p2', 32),
  makeUnit('p3', 22),
  makeUnit('p4', 30),
  makeUnit('omega', omega.agility),
];
units[4].isEnemy = true;

const ctb = new CTBEngine(units);
const sequence = [];
for (let turn = 0; turn < 32; turn += 1) {
  const actor = ctb.advanceToNextActor();
  sequence.push(actor.id);
  ctb.consumeTurn(actor, actor.isEnemy ? FF5_ENEMY_TURN_COST : 1);
}
const omegaTurns = sequence.filter((id) => id === 'omega').length;
assert.equal(omegaTurns, 12, 'Omega cadence regressed against the current party baseline');

console.log(JSON.stringify({
  backgroundScopedToField: true,
  gameOverCentered: true,
  omegaAgility: omega.agility,
  omegaTurnsPer32: omegaTurns,
  partyTurnsPer32: sequence.length - omegaTurns,
  enemyTurnCost: FF5_ENEMY_TURN_COST,
  status: 'ok',
}, null, 2));
