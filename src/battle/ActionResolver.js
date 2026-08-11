/**
 * ActionResolver
 * Pure(ish) functions that turn an "action" declaration into concrete
 * HP/MP changes on the involved units. Kept separate from BattleManager so
 * the math can be unit-tested / tweaked independently of turn flow.
 */

const VARIANCE = 0.15; // +/-15% randomness on damage

function randomVariance(base) {
  const factor = 1 + (Math.random() * 2 - 1) * VARIANCE;
  return base * factor;
}

/** Physical attack damage: ATK vs DEF, with a defend-state cut. */
export function resolvePhysicalDamage(attacker, defender) {
  const raw = Math.max(1, attacker.atk * 2.2 - defender.def * 1.1);
  let dmg = randomVariance(raw);
  if (attacker.weaponElement && defender.weakness === attacker.weaponElement) dmg *= 1.5;
  if (attacker.weaponElement && defender.resist === attacker.weaponElement) dmg *= 0.5;
  if (defender.defending) dmg *= 0.5;
  return Math.max(1, Math.round(dmg));
}

/** Magic/elemental damage: MAGIC stat * spell power, weakness/resist modifiers. */
export function resolveMagicDamage(caster, defender, spell) {
  const raw = Math.max(1, caster.magic * 2.6 * (spell.power ?? 1.0) - defender.def * 0.4);
  let dmg = randomVariance(raw);

  if (spell.element) {
    if (defender.weakness === spell.element) dmg *= 1.75;
    if (defender.resist === spell.element) dmg *= 0.4;
  }
  if (defender.defending) dmg *= 0.5;
  return Math.max(1, Math.round(dmg));
}

/** Heal amount, with light randomness. */
export function resolveHeal(amount) {
  return Math.max(1, Math.round(randomVariance(amount)));
}

/**
 * Resolve a full action given the actor, the chosen action definition,
 * and the target(s). Returns a log-friendly result object.
 */
export function resolveAction({ actor, action, targets }) {
  const results = [];

  switch (action.kind) {
    case 'physical-attack': {
      const target = targets[0];
      const dmg = resolvePhysicalDamage(actor, target);
      const dealt = target.applyDamage(dmg);
      results.push({ type: 'damage', targetUid: target.uid, amount: dealt });
      break;
    }
    case 'magic-attack': {
      const target = targets[0];
      actor.spendMp(action.mpCost ?? 0);
      const dmg = resolveMagicDamage(actor, target, action);
      const dealt = target.applyDamage(dmg);
      const isWeak = target.weakness === action.element;
      results.push({ type: 'damage', targetUid: target.uid, amount: dealt, weak: isWeak });
      break;
    }
    case 'heal': {
      const target = targets[0];
      if (action.mpCost) actor.spendMp(action.mpCost);
      const healed = target.applyHeal(resolveHeal(action.healAmount));
      results.push({ type: 'heal', targetUid: target.uid, amount: healed });
      break;
    }
    case 'defend': {
      actor.defending = true;
      results.push({ type: 'defend', targetUid: actor.uid });
      break;
    }
    default:
      break;
  }

  return results;
}
