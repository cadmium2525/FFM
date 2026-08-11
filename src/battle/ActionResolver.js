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

function operationToAction(operation, actor) {
  const common = { _compiledOperation: true, mpCost: 0 };
  switch (operation.op) {
    case 'damage.magic': return { ...common, kind: 'magic-attack', power: operation.power, hits: operation.hits, element: operation.element };
    case 'damage.physical': return { ...common, kind: 'physical-attack', power: operation.power, sameLevelMultiplier: operation.sameLevelMultiplier };
    case 'damage.fixed': return { ...common, kind: 'fixed-damage', fixedDamage: operation.amount };
    case 'damage.caster_hp': return { ...common, kind: 'fixed-damage', fixedDamage: actor.hp, sacrificeCaster: operation.sacrificeCaster };
    case 'damage.missing_hp': return { ...common, kind: 'fixed-damage', fixedDamage: actor.maxHp - actor.hp };
    case 'damage.hp_ratio': return { ...common, kind: 'ratio-damage', ratio: operation.ratio };
    case 'damage.mp_ratio': return { ...common, kind: 'mp-ratio-damage', ratio: operation.ratio };
    case 'drain.hp': return { ...common, kind: 'magic-attack', power: operation.power, drain: true };
    case 'drain.mp': return { ...common, kind: 'mp-drain', power: operation.power };
    case 'heal.hp': return { ...common, kind: 'heal', healAmount: operation.amount };
    case 'heal.caster_hp': return { ...common, kind: 'heal', healAmount: actor.hp };
    case 'heal.mp': return { ...common, kind: 'mp-heal-target', mpAmount: operation.amount };
    case 'restore.full': return { ...common, kind: 'full-restore' };
    case 'revive': return { ...common, kind: 'revive', hpRatio: operation.hpRatio };
    case 'inspect': return { ...common, kind: 'scan', fields: operation.fields };
    case 'status.apply': return { ...common, kind: 'status', statuses: operation.statuses, toggle: operation.toggle, imageHits: operation.imageHits };
    case 'status.remove': return { ...common, kind: 'cleanse', statuses: operation.statuses, mode: operation.mode };
    case 'status.dispel': return { ...common, kind: 'dispel' };
    case 'stat.modify': return { ...common, kind: 'stat-modify', stat: operation.stat, multiplier: operation.multiplier };
    case 'caster.sacrifice': return { ...common, kind: 'sacrifice' };
    default: return { ...common, kind: 'scripted', label: operation.handlerKey ?? operation.op };
  }
}

/**
 * Resolve a full action given the actor, the chosen action definition,
 * and the target(s). Returns a log-friendly result object.
 */
export function resolveAction({ actor, action, targets }) {
  if (action.operations?.length && !action._compiledOperation) {
    if (action.mpCost) actor.spendMp(Math.ceil(action.mpCost * (actor.mpCostMultiplier ?? 1)));
    return action.operations.flatMap((operation) => {
      const operationTargets = operation.targetSide
        ? targets.filter((target) => operation.targetSide === 'enemy' ? target.isEnemy : !target.isEnemy)
        : targets;
      const eligibleTargets = operation.conditionalLevel
        ? operationTargets.filter((target) => target.level % operation.conditionalLevel === 0)
        : operationTargets;
      if (operation.conditionalLevel && eligibleTargets.length === 0) {
        return [{ type: 'miss', targetUid: operationTargets[0]?.uid ?? actor.uid, hits: 1 }];
      }
      return resolveAction({
        actor,
        action: { ...operationToAction(operation, actor), element: operation.element ?? action.element },
        targets: eligibleTargets.length ? eligibleTargets : [actor],
      });
    });
  }

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
        const sameLevelPower = action.sameLevelMultiplier && actor.level === target.level
          ? (action.power ?? 1) * action.sameLevelMultiplier
          : action.power;
        const damage = resolvePhysicalDamage(actor, target, { ...action, power: sameLevelPower, attackMultiplier });
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
      actor.spendMp(Math.ceil((action.mpCost ?? 0) * (actor.mpCostMultiplier ?? 1)));
      let drainedTotal = 0;
      targets.forEach((target) => {
        const elementState = equipmentElementState(target, action.element);
        const dmg = resolveMagicDamage(actor, target, action) * (target.magicDamageMultiplier ?? 1);
        if (elementState === 'absorb') {
          const healed = target.applyHeal(dmg);
          results.push({ type: 'absorb', targetUid: target.uid, amount: healed });
        } else {
          const dealt = elementState === 'null' ? 0 : target.applyDamage(dmg);
          drainedTotal += dealt;
          results.push({ type: 'damage', targetUid: target.uid, amount: dealt, weak: elementState === 'weak', nullified: elementState === 'null' });
        }
      });
      if (action.drain && drainedTotal > 0) results.push({ type: 'heal', targetUid: actor.uid, amount: actor.applyHeal(drainedTotal) });
      break;
    }
    case 'heal': {
      if (action.mpCost) actor.spendMp(Math.ceil(action.mpCost * (actor.mpCostMultiplier ?? 1)));
      targets.forEach((target) => {
        const healed = target.applyHeal(resolveHeal(action.healAmount));
        results.push({ type: 'heal', targetUid: target.uid, amount: healed });
      });
      break;
    }
    case 'fixed-damage': {
      if (action.mpCost) actor.spendMp(Math.ceil(action.mpCost * (actor.mpCostMultiplier ?? 1)));
      targets.forEach((target) => results.push({ type: 'damage', targetUid: target.uid, amount: target.applyDamage(action.fixedDamage ?? 1) }));
      if (action.sacrificeCaster) actor.applyDamage(actor.hp);
      break;
    }
    case 'ratio-damage': {
      targets.forEach((target) => results.push({ type: 'damage', targetUid: target.uid, amount: target.applyDamage(Math.floor(target.hp * (action.ratio ?? 0.5))) }));
      break;
    }
    case 'mp-ratio-damage': {
      targets.forEach((target) => {
        const amount = Math.floor(target.mp * (action.ratio ?? 0.5));
        target.spendMp(amount);
        results.push({ type: 'mp-damage', targetUid: target.uid, amount });
      });
      break;
    }
    case 'mp-drain': {
      targets.forEach((target) => {
        const amount = Math.min(target.mp, Math.max(1, Math.round(actor.magic * (action.power ?? 1))));
        target.spendMp(amount);
        const restored = Math.min(actor.maxMp - actor.mp, amount);
        actor.mp += restored;
        results.push({ type: 'mp-damage', targetUid: target.uid, amount }, { type: 'mp-heal', targetUid: actor.uid, amount: restored });
      });
      break;
    }
    case 'mp-heal-target': {
      targets.forEach((target) => {
        const amount = Math.min(target.maxMp - target.mp, action.mpAmount ?? 0);
        target.mp += amount;
        results.push({ type: 'mp-heal', targetUid: target.uid, amount });
      });
      break;
    }
    case 'full-restore': {
      targets.forEach((target) => {
        const healed = target.applyHeal(target.maxHp);
        const mpAmount = target.maxMp - target.mp;
        target.mp = target.maxMp;
        results.push({ type: 'heal', targetUid: target.uid, amount: healed }, { type: 'mp-heal', targetUid: target.uid, amount: mpAmount });
      });
      break;
    }
    case 'revive': {
      targets.forEach((target) => {
        if (target.hp > 0) return;
        target.hp = Math.max(1, Math.round(target.maxHp * (action.hpRatio ?? 0.25)));
        results.push({ type: 'revive', targetUid: target.uid, amount: target.hp });
      });
      break;
    }
    case 'scan': {
      targets.forEach((target) => results.push({ type: 'scan', targetUid: target.uid, hp: target.hp, maxHp: target.maxHp, weakness: target.weakness }));
      break;
    }
    case 'status': {
      targets.forEach((target) => {
        (action.statuses ?? []).forEach((status) => {
          if (action.toggle && target.statuses.has(status)) target.statuses.delete(status);
          else target.statuses.add(status);
          if (status === 'protect') target.physicalDamageMultiplier *= 0.75;
          if (status === 'shell') target.magicDamageMultiplier *= 0.75;
          if (status === 'haste') target.agility = Math.round(target.agility * 1.25);
          if (status === 'slow') target.agility = Math.max(1, Math.round(target.agility * 0.75));
          if (status === 'ko') target.hp = 0;
        });
        if (action.imageHits) target.imageHits = Math.max(target.imageHits, action.imageHits);
        results.push({ type: 'status', targetUid: target.uid, statuses: action.statuses ?? [] });
      });
      break;
    }
    case 'cleanse': {
      targets.forEach((target) => {
        const removed = action.mode === 'all_curable' ? [...target.statuses] : (action.statuses ?? []);
        removed.forEach((status) => target.statuses.delete(status));
        results.push({ type: 'cleanse', targetUid: target.uid, statuses: removed });
      });
      break;
    }
    case 'dispel': {
      const positive = ['protect', 'shell', 'haste', 'regen', 'reflect', 'float'];
      targets.forEach((target) => {
        positive.forEach((status) => target.statuses.delete(status));
        results.push({ type: 'dispel', targetUid: target.uid });
      });
      break;
    }
    case 'stat-modify': {
      targets.forEach((target) => {
        if (typeof target[action.stat] === 'number') target[action.stat] = Math.max(1, Math.round(target[action.stat] * (action.multiplier ?? 1)));
        results.push({ type: 'buff', targetUid: target.uid, label: `${action.stat}変化` });
      });
      break;
    }
    case 'sacrifice': {
      actor.applyDamage(actor.hp);
      results.push({ type: 'status', targetUid: actor.uid, statuses: ['ko'] });
      break;
    }
    case 'scripted': {
      results.push({ type: 'effect', targetUid: targets[0]?.uid ?? actor.uid, label: action.label });
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
