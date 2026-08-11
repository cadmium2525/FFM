import assert from 'node:assert/strict';
import {
  crystalShards,
  ff5DatabaseMeta,
  ff5Equipment,
  ff5Items,
  ff5JobAbilities,
  ff5Magic,
  ff5Shops,
  ff5Songs,
} from '../src/database/ff5Database.js';
import { partyData } from '../src/data/partyData.js';

const expected = ff5DatabaseMeta.expectedCounts;
const weapons = ff5Equipment.filter((record) => record.slot === 'weapon');
const armor = ff5Equipment.filter((record) => record.slot !== 'weapon');

assert.equal(weapons.length, expected.weapons, 'weapon count');
assert.equal(armor.length, expected.armor, 'armor count');
for (const school of ['white', 'black', 'time', 'summon', 'blue']) {
  const key = `${school}Magic`;
  assert.equal(ff5Magic.filter((record) => record.school === school).length, expected[key], `${school} magic count`);
}
assert.equal(ff5Songs.length, expected.songs, 'song count');
assert.equal(ff5Shops.length, 14, 'shop count');
assert.ok(ff5Items.some((item) => item.shopAvailable), 'shop item catalog must not be empty');
assert.ok(ff5JobAbilities.some((ability) => ability.id === 'ability_sing'), 'Sing command');

const allRecords = [
  ...ff5Equipment,
  ...ff5Magic,
  ...ff5Items,
  ...ff5JobAbilities,
  ...ff5Songs,
  ...ff5Shops,
  ...crystalShards,
];
const ids = allRecords.map((record) => record.id);
assert.equal(new Set(ids).size, ids.length, 'database IDs must be globally unique');

const equipmentIds = new Set(ff5Equipment.map((record) => record.id));
const abilityIds = new Set(ff5JobAbilities.map((record) => record.id));
const shardIds = new Set(crystalShards.map((record) => record.id));
const requiredSlots = ['weapon', 'shield', 'head', 'body', 'accessory'];

for (const character of partyData) {
  assert.deepEqual(Object.keys(character.equipment), requiredSlots, `${character.id} equipment slots`);
  for (const [slot, equipmentId] of Object.entries(character.equipment)) {
    if (equipmentId == null) continue;
    assert.ok(equipmentIds.has(equipmentId), `${character.id}.${slot} reference`);
    assert.equal(ff5Equipment.find((record) => record.id === equipmentId).slot, slot, `${character.id}.${slot} type`);
  }
  assert.ok(abilityIds.has(character.abilityId), `${character.id} ability reference`);
  assert.ok(shardIds.has(character.crystalShardId), `${character.id} shard reference`);
}

console.log(JSON.stringify({
  weapons: weapons.length,
  armor: armor.length,
  magic: ff5Magic.length,
  abilities: ff5JobAbilities.length,
  songs: ff5Songs.length,
  items: ff5Items.length,
  shops: ff5Shops.length,
  crystalShards: crystalShards.length,
  formationCharacters: partyData.length,
}, null, 2));
