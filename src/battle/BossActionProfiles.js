// Resolves boss action patterns (src/data/bosses.json's `actionPattern`,
// referencing techniques by id from src/data/techniqueCatalog.json) into the
// runtime action objects ActionResolver/BattleManager consume. See the
// "Boss / stage data architecture" section in README.md for the full
// JSON → .js → bundle pipeline this depends on.
import { techniqueCatalogById } from '../data/techniqueCatalog.js';
import { bossRegistry } from '../data/bosses.js';

/** Converts one techniqueCatalog.json entry into the action-object shape
 * ActionResolver expects (id/name/kind/target/ctbCost + kind-specific
 * fields). `name` is always the bare technique name — never boss-prefixed —
 * so a technique reused on a different boss automatically attributes
 * correctly via the battle log's own "${actor.name} の ${action.name}！"
 * template, with no risk of leaking the technique's original owner. */
function techniqueToAction(id) {
  const t = techniqueCatalogById[id];
  if (!t) throw new Error(`Unknown technique id in actionPattern: ${id}`);
  const action = { id: t.id, name: t.baseName, kind: t.kind, target: t.target, ctbCost: t.ctbCost };
  if (t.power != null) action.power = t.power;
  if (t.ff5Power != null) action.ff5Power = t.ff5Power;
  if (t.formula) action.formula = t.formula;
  if ('element' in t) action.element = t.element;
  if (t.operations) action.operations = t.operations;
  if (t.statuses) action.statuses = t.statuses;
  if (t.statusChance != null) action.statusChance = t.statusChance;
  if (t.options) action.options = t.options;
  if (t.hits != null) action.hits = t.hits;
  if (t.telegraph) action.telegraph = t.telegraph;
  if (t.ignoreEvasion) action.ignoreEvasion = t.ignoreEvasion;
  if (t.reflectable) action.reflectable = t.reflectable;
  return action;
}

const randomChoice = (...choices) => Object.freeze({ choices: Object.freeze(choices) });
// A single CTB turn that fires two actions back-to-back (each may itself be
// a randomChoice). Faithful to Omega's turn-5 "2回攻撃".
const doubleAction = (...entries) => Object.freeze({ multi: Object.freeze(entries) });

/** Resolves one entry of a JSON actionPattern.sequence/counterSequence into
 * the runtime shape (a plain action, a randomChoice, or a doubleAction). */
function resolvePatternEntry(entry) {
  if (entry.multi) return doubleAction(...entry.multi.map(resolvePatternEntry));
  if (entry.choiceOf) return randomChoice(...entry.choiceOf.map(techniqueToAction));
  return techniqueToAction(entry.techniqueId);
}

function resolveActionPattern(actionPattern) {
  return {
    phases: actionPattern.phases.map((p) => ({
      maxHpRatio: p.maxHpRatio,
      sequence: p.sequence.map(resolvePatternEntry),
      actions: p.sequence.map(resolvePatternEntry),
    })),
    counterSequence: (actionPattern.counterSequence ?? []).map(resolvePatternEntry),
  };
}

const physical = (id, name, power, extra = {}) => ({ id, name, kind: 'physical-attack', power, ctbCost: 1, ...extra });
const magic = (id, name, ff5Power, element, extra = {}) => ({ id, name, kind: 'magic-attack', ff5Power, formula: 'ff5_magic', element, ctbCost: 1.15, ...extra });
const phase = (maxHpRatio, sequence) => ({ maxHpRatio, sequence, actions: sequence });

export const BOSS_ACTION_PROFILES = Object.freeze({
  // boss1 is a lightweight test/scaffold fixture only (see
  // scripts/test-battle-runtime.mjs) — it isn't a registered boss in
  // bosses.json and never appears in a real stage.
  boss1: Object.freeze({
    phases: [phase(1, [
      magic('granite-fall', '大陸落とし', 120, 'earth', { target: 'all_enemies', telegraph: '巨岩を天高く掲げた――次の行動で落下する！', ctbCost: 1.8 }),
      physical('granite-fist', '花崗岩の拳', 1.25),
      magic('fault-line', '断層波', 70, 'earth', { target: 'all_enemies' }),
    ])],
    counterSequence: [],
  }),
  ...Object.fromEntries(
    bossRegistry
      .filter((boss) => boss.actionPattern)
      .map((boss) => [boss.id, Object.freeze(resolveActionPattern(boss.actionPattern))]),
  ),
});

function activePhase(unit) {
  const profile = BOSS_ACTION_PROFILES[unit.id];
  if (!profile) return null;
  return profile.phases.filter((phase) => unit.hpRatio() <= phase.maxHpRatio).sort((a, b) => a.maxHpRatio - b.maxHpRatio)[0] ?? profile.phases[0];
}

export function bossActionsFor(unit) {
  return activePhase(unit)?.sequence ?? unit.aiActions ?? [];
}

function resolveChoiceIndex(entry, safeCursor, sequenceLength, depth) {
  const cycle = Math.floor(safeCursor / sequenceLength);
  const seed = Math.imul(cycle + 1 + depth * 7919, 1103515245) + safeCursor * 12345 + depth * 97;
  return (seed >>> 16) % entry.choices.length;
}

function resolveEntry(entry, safeCursor, sequenceLength) {
  let resolved = entry;
  let depth = 0;
  while (resolved?.choices?.length) {
    resolved = resolved.choices[resolveChoiceIndex(resolved, safeCursor, sequenceLength, depth)];
    depth += 1;
    if (depth > 5) break; // safety net against a misconfigured cyclic choice
  }
  return resolved;
}

/**
 * Returns either a single resolved action, or `{ multi: [actionA, actionB] }`
 * for turns that fire more than one action (e.g. Omega's turn-5 "2回攻撃").
 * Resolution is a deterministic hash of the cursor, so suspend/resume can't
 * reroll into a more convenient move.
 */
export function nextBossActionFor(unit, cursor = 0) {
  const sequence = bossActionsFor(unit);
  if (!sequence.length) return { id: 'enemy-attack', name: 'こうげき', kind: 'physical-attack', ctbCost: 1 };
  const safeCursor = Math.max(0, cursor);
  const entry = sequence[safeCursor % sequence.length];
  if (entry?.multi?.length) {
    return { multi: entry.multi.map((subEntry) => resolveEntry(subEntry, safeCursor, sequence.length)) };
  }
  return resolveEntry(entry, safeCursor, sequence.length);
}

export function bossPhaseIndex(unit) {
  const profile = BOSS_ACTION_PROFILES[unit.id];
  if (!profile) return 0;
  return Math.max(0, profile.phases.indexOf(activePhase(unit)));
}

export function counterSequenceFor(unit) {
  return BOSS_ACTION_PROFILES[unit.id]?.counterSequence ?? [];
}
