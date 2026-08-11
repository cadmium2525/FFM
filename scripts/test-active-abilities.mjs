import assert from 'node:assert/strict';
import { Unit } from '../src/battle/Unit.js';
import { resolveAction } from '../src/battle/ActionResolver.js';
import { ff5JobAbilities, ff5Songs } from '../src/database/ff5Database.js';
import { getAbilityActions, isAbilityImplemented } from '../src/data/abilityData.js';

const commands = ff5JobAbilities.filter((ability) => ability.type === 'command');
const missing = commands.filter((ability) => !isAbilityImplemented(ability.id));
assert.deepEqual(missing, [], 'every command ability must be selectable in battle');

const actor = () => new Unit({ id: 'ability-user', name: 'Ability User', maxHp: 2200, maxMp: 999, atk: 90, def: 35, magic: 80, magicDef: 30, agility: 30, level: 20 });
const enemy = () => new Unit({ id: 'ability-target', name: 'Target', isEnemy: true, maxHp: 12000, maxMp: 500, atk: 50, def: 25, magicDef: 20, agility: 20, level: 20, heavy: false });

for (const ability of commands) {
  const actions = getAbilityActions(ability.id);
  assert.ok(actions.length > 0, `${ability.id} must expose at least one action`);
  for (const action of actions) {
    assert.ok(action.visualId || action.sourceId, `${ability.id}/${action.id} needs a stable visual identity`);
  }

  const action = actions.find((candidate) => !candidate.disabledReason);
  if (!action) continue;
  const user = actor();
  const foe = enemy();
  const fallenAlly = actor();
  fallenAlly.applyDamage(fallenAlly.hp);
  const targets = action.actionKind === 'revive'
    ? [fallenAlly]
    : String(action.target).includes('ally') || action.target === 'self'
      ? [user]
      : [foe];
  const results = resolveAction({
    actor: user,
    action: { kind: action.actionKind ?? 'scripted', ...action },
    targets,
    battleUnits: [user, fallenAlly, foe],
  });
  assert.ok(Array.isArray(results) && results.length > 0, `${ability.id} must resolve visibly`);
}

const songActions = getAbilityActions('ability_sing');
assert.equal(songActions.length, ff5Songs.length, 'every song must be available under Sing');
assert.equal(new Set(songActions.map((song) => song.visualId)).size, ff5Songs.length, 'songs need independent visual identities');

console.log(JSON.stringify({ commandAbilities: commands.length, songs: songActions.length, missing: missing.length, status: 'ok' }, null, 2));
