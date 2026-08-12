import assert from 'node:assert/strict';
import { ff5BossTechniques, ff5BossTechniquesMeta, ff5BossTechniquesById } from '../src/database/ff5BossTechniques.js';

// This reference catalog is intentionally NOT part of ff5Database.js /
// battleCatalog.js (see the file header), so it gets its own lightweight
// integrity check rather than joining scripts/validate-database.mjs's
// strict "every record needs a battle adapter" assertion.

assert.ok(ff5BossTechniques.length > 0, 'catalog must not be empty');
assert.equal(ff5BossTechniques.length, ff5BossTechniquesMeta.bossCount, 'meta.bossCount must match actual entry count');

const bossIds = ff5BossTechniques.map((boss) => boss.id);
assert.equal(new Set(bossIds).size, bossIds.length, 'boss IDs must be globally unique');

const validPowers = new Set(['low', 'medium', 'high', 'extreme']);
const validConfidence = new Set(['high', 'medium', 'low']);
const validWorlds = new Set([1, 2, 3, 'ex']);
const allTechniqueIds = [];

for (const boss of ff5BossTechniques) {
  assert.ok(boss.id.startsWith('bossref_'), `${boss.id} id prefix`);
  assert.ok(boss.nameJa, `${boss.id} nameJa`);
  assert.equal(/[a-zA-Z]/.test(boss.nameJa), false, `${boss.id} nameJa must not contain Latin letters (was: ${boss.nameJa})`);
  assert.ok(validConfidence.has(boss.nameConfidence), `${boss.id} nameConfidence`);
  assert.ok(validWorlds.has(boss.world), `${boss.id} world`);
  assert.equal(boss.implemented, false, `${boss.id} implemented flag`);
  assert.equal(boss.runtimeReady, false, `${boss.id} runtimeReady flag`);
  assert.ok(boss.techniques.length > 0, `${boss.id} must list at least one technique`);

  for (const technique of boss.techniques) {
    allTechniqueIds.push(technique.id);
    assert.ok(technique.id.startsWith(`bosstech_${boss.id.replace('bossref_', '')}_`), `${technique.id} id namespaced to boss`);
    assert.ok(technique.nameJa, `${technique.id} nameJa`);
    assert.equal(/[a-zA-Z]/.test(technique.nameJa), false, `${technique.id} nameJa must not contain Latin letters (was: ${technique.nameJa})`);
    assert.ok(validPowers.has(technique.power), `${technique.id} power tier`);
    assert.ok(Array.isArray(technique.statuses), `${technique.id} statuses array`);
    assert.ok(technique.note && technique.note.length > 0, `${technique.id} note`);
    assert.equal(technique.implemented, false, `${technique.id} implemented flag`);
  }
}

assert.equal(new Set(allTechniqueIds).size, allTechniqueIds.length, 'technique IDs must be globally unique');
assert.ok(ff5BossTechniquesById['bossref_bahamut_boss'], 'lookup map is keyed by boss id');

console.log(JSON.stringify({
  bosses: ff5BossTechniques.length,
  techniques: allTechniqueIds.length,
  byWorld: {
    world1: ff5BossTechniques.filter((b) => b.world === 1).length,
    world2: ff5BossTechniques.filter((b) => b.world === 2).length,
    world3: ff5BossTechniques.filter((b) => b.world === 3).length,
    ex: ff5BossTechniques.filter((b) => b.world === 'ex').length,
  },
  byConfidence: {
    high: ff5BossTechniques.filter((b) => b.nameConfidence === 'high').length,
    medium: ff5BossTechniques.filter((b) => b.nameConfidence === 'medium').length,
  },
}, null, 2));
