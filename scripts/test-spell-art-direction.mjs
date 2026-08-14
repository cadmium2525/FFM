import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ff5Magic } from '../src/database/ff5Database.js';
import { SPELL_ART_BLUEPRINTS } from '../src/ui/SpellArtDirector.js';

const missing = ff5Magic.filter((spell) => !SPELL_ART_BLUEPRINTS[spell.id]);
assert.deepEqual(missing, [], 'every spell needs a hand-authored art blueprint');
assert.equal(Object.keys(SPELL_ART_BLUEPRINTS).length, ff5Magic.length, 'orphan spell blueprints found');

// Variant numbers and spell IDs are deliberately excluded: visible structure
// itself must remain different for all 99 spells.
const structuralSignatures = ff5Magic.map((spell) => {
  const { variant, ...visible } = SPELL_ART_BLUEPRINTS[spell.id];
  return JSON.stringify(visible);
});
assert.equal(new Set(structuralSignatures).size, ff5Magic.length, 'two spells share the same visible art direction');

const css = await readFile(new URL('../css/battle-effects.css', import.meta.url), 'utf8');
const motifs = new Set(Object.values(SPELL_ART_BLUEPRINTS).map((blueprint) => blueprint.motif));
const motions = new Set(Object.values(SPELL_ART_BLUEPRINTS).map((blueprint) => blueprint.motion));
for (const motif of motifs) assert.ok(css.includes(`.spell-motif-${motif}`), `missing rendered motif: ${motif}`);
for (const motion of motions) assert.ok(css.includes(`.spell-motion-${motion}`), `missing rendered motion: ${motion}`);

const namedAudit = {
  missile: SPELL_ART_BLUEPRINTS.magic_missile,
  flare: SPELL_ART_BLUEPRINTS.magic_flare,
  level5Death: SPELL_ART_BLUEPRINTS.magic_level_5_death,
};
assert.equal(namedAudit.missile.motif, 'target-reticle');
assert.equal(namedAudit.flare.motif, 'star-core');
assert.equal(namedAudit.level5Death.impact, 'level-five-death');

console.log(JSON.stringify({ spells: ff5Magic.length, structuralSignatures: new Set(structuralSignatures).size, motifs: motifs.size, motions: motions.size, namedAudit, status: 'ok' }, null, 2));
