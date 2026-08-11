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

function equipmentElementState(defender, element) {
  const effects = defender.equipmentEffects ?? {};
  if (!element) return 'normal';
  if (effects.absorbs?.includes(element)) return 'absorb';
  if (effects.nullElements?.includes(element)) return 'null';
  if (effects.weaknesses?.includes(element) || defender.weakness === element) return 'weak';
  if (effects.resistances?.includes(element) || defender.resist === element) return 'resist';
  return 'normal';
}

/** Physical attack damage: ATK vs DEF, with weapon and armor effects. */
export function resolvePhysicalDamage(attacker, defender, action = {}) {
  if (attacker.weaponSpecial === 'always_1_damage') return 1;
  const multiplier = (action.power ?? 1) * (action.attackMultiplier ?? 1);
  const raw = Math.max(1, attacker.atk * 2.2 * multiplier - defender.def * 1.1);
  let dmg = randomVariance(raw);
  const elementState = equipmentElementState(defender, attacker.weaponElement);
  if (elementState === 'weak') dmg *= 1.5;
  if (elementState === 'resist') dmg *= 0.5;
  if (elementState === 'null' || elementState === 'absorb') dmg = 0;
  if (attacker.weaponSpecial === 'critical' && Math.random() < 0.12) dmg *= 2;
  if (attacker.weaponSpecial === 'high_critical' && Math.random() < 0.25) dmg *= 2;
  if (defender.defending) dmg *= 0.5;
  dmg *= defender.physicalDamageMultiplier ?? 1;
  return Math.max(0, Math.round(dmg));
}

/** Magic/elemental damage: MAGIC stat * spell power, weakness/resist modifiers. */
export function resolveMagicDamage(caster, defender, spell) {
  const boost = caster.equipmentEffects?.magicBoostElements?.includes(spell.element) ? 1.25 : 1;
  const raw = Math.max(1, caster.magic * 2.6 * (spell.power ?? 1.0) * boost - defender.magicDef * 0.7);
  let dmg = randomVariance(raw);

  if (spell.element) {
    const elementState = equipmentElementState(defender, spell.element);
    if (elementState === 'weak') dmg *= 1.75;
    if (elementState === 'resist') dmg *= 0.4;
    if (elementState === 'null') dmg = 0;
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
      const hits = Math.max(1, action.hits ?? (actor.weaponSpecial === 'double_hit' ? 2 : 1));
      const attackMultiplier = actor.nextAttackMultiplier ?? 1;
      actor.nextAttackMultiplier = 1;
      let dealtTotal = 0;
      let missedHits = 0;
      let blockedHits = 0;
      for (let hit = 0; hit < hits; hit += 1) {
        const blockedByImage = !action.ignoreEvasion && target.imageHits > 0;
        if (blockedByImage) target.imageHits -= 1;
        const hitChance = Math.min(1, Math.max(0.2, ((actor.weaponAccuracy ?? 100) - (action.ignoreEvasion ? 0 : target.evasion ?? 0)) / 100));
        if (blockedByImage || Math.random() > hitChance) {
          missedHits += 1;
          continue;
        }
        const damage = resolvePhysicalDamage(actor, target, { ...action, attackMultiplier });
        if (damage <= 0) blockedHits += 1;
        else dealtTotal += target.applyDamage(damage);
      }
      if (dealtTotal > 0) results.push({ type: 'damage', targetUid: target.uid, amount: dealtTotal, hits });
      if (missedHits > 0) results.push({ type: 'miss', targetUid: target.uid, hits: missedHits });
      if (blockedHits > 0) results.push({ type: 'blocked', targetUid: target.uid, hits: blockedHits });
      if (action.drain || actor.weaponSpecial === 'hp_drain') {
        const healed = actor.applyHeal(Math.round(dealtTotal * 0.5));
        if (healed > 0) results.push({ type: 'heal', targetUid: actor.uid, amount: healed });
      }
      if (action.mpDrain || actor.weaponSpecial === 'mp_drain') {
        const restored = Math.min(actor.maxMp - actor.mp, action.mpDrain ?? 8);
        actor.mp += restored;
        if (restored > 0) results.push({ type: 'mp-heal', targetUid: actor.uid, amount: restored });
      }
      break;
    }
    case 'magic-attack': {
      const target = targets[0];
      actor.spendMp(Math.ceil((action.mpCost ?? 0) * (actor.mpCostMultiplier ?? 1)));
      const elementState = equipmentElementState(target, action.element);
      const dmg = resolveMagicDamage(actor, target, action);
      if (elementState === 'absorb') {
        const healed = target.applyHeal(dmg);
        results.push({ type: 'absorb', targetUid: target.uid, amount: healed });
      } else {
        const dealt = elementState === 'null' ? 0 : target.applyDamage(dmg);
        results.push({ type: 'damage', targetUid: target.uid, amount: dealt, weak: elementState === 'weak', nullified: elementState === 'null' });
      }
      break;
    }
    case 'heal': {
      const target = targets[0];
      if (action.mpCost) actor.spendMp(Math.ceil(action.mpCost * (actor.mpCostMultiplier ?? 1)));
      const healed = target.applyHeal(resolveHeal(action.healAmount));
      results.push({ type: 'heal', targetUid: target.uid, amount: healed });
      break;
    }
    case 'fixed-damage': {
      const target = targets[0];
      if (action.mpCost) actor.spendMp(Math.ceil(action.mpCost * (actor.mpCostMultiplier ?? 1)));
      const dealt = target.applyDamage(action.fixedDamage ?? 1);
      results.push({ type: 'damage', targetUid: target.uid, amount: dealt });
      break;
    }
    case 'defend': {
      actor.defending = true;
      results.push({ type: 'defend', targetUid: actor.uid });
      break;
    }
    case 'guard': {
      actor.defending = true;
      actor.physicalDamageMultiplier = 0;
      results.push({ type: 'buff', targetUid: actor.uid, label: '物理攻撃無効' });
      break;
    }
    case 'focus': {
      actor.nextAttackMultiplier = Math.max(actor.nextAttackMultiplier ?? 1, 2);
      results.push({ type: 'buff', targetUid: actor.uid, label: '次の物理攻撃強化' });
      break;
    }
    case 'image': {
      actor.imageHits = Math.max(actor.imageHits ?? 0, action.imageHits ?? 2);
      results.push({ type: 'buff', targetUid: actor.uid, label: `分身${actor.imageHits}回` });
      break;
    }
    case 'haste': {
      actor.spendMp(Math.ceil((action.mpCost ?? 0) * (actor.mpCostMultiplier ?? 1)));
      actor.agility += 8;
      results.push({ type: 'buff', targetUid: actor.uid, label: '素早さ上昇' });
      break;
    }
    case 'imbue': {
      actor.spendMp(Math.ceil((action.mpCost ?? 0) * (actor.mpCostMultiplier ?? 1)));
      actor.weaponElement = action.element;
      results.push({ type: 'buff', targetUid: actor.uid, label: `${action.element}属性付与` });
      break;
    }
    default:
      break;
  }

  return results;
}
