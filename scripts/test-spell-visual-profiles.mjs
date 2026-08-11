import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spellVisualProfile } from '../src/ui/BattleUI.js';
import { battleReadyMagic, magicRecordToAction } from '../src/database/battleCatalog.js';

const actionFor = (id) => magicRecordToAction(battleReadyMagic.find((record) => record.id === id));
const cases = [
  ['magic_missile', 'missile', 'TARGET LOCK'],
  ['magic_flare', 'flare', 'STELLAR CORE'],
  ['magic_level_5_death', 'level-death', 'LEVEL JUDGMENT'],
];

const profiles = cases.map(([id, expectedKind, expectedLabel]) => {
  const profile = spellVisualProfile(actionFor(id));
  assert.equal(profile.kind, expectedKind, `${id} must use its own visual structure`);
  assert.match(profile.eyebrow, new RegExp(expectedLabel));
  assert.ok(profile.duration >= 1100, `${id} cinematic is too short to read`);
  return profile;
});

assert.equal(new Set(profiles.map((profile) => profile.kind)).size, cases.length);
assert.equal(new Set(profiles.map((profile) => profile.glyph)).size, cases.length);

const css = await readFile(new URL('../css/style.css', import.meta.url), 'utf8');
for (const selector of ['.missile-lock', '.signature-flare', '.signature-level-death']) {
  assert.ok(css.includes(selector), `${selector} must have dedicated presentation rules`);
}

console.log(JSON.stringify({ auditedSpells: cases.map(([id]) => id), visualKinds: profiles.map((profile) => profile.kind), status: 'ok' }, null, 2));
