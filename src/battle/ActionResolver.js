/**
 * ActionResolver
 * Pure(ish) functions that turn an "action" declaration into concrete
 * HP/MP changes on the involved units. Kept separate from BattleManager so
 * the math can be unit-tested / tweaked independently of turn flow.
 */

import { CURABLE_STATUSES, POSITIVE_STATUSES, normalizeElement } from './StatusEngine.js';

const VARIANCE = 0.12; // readable tactical outcomes without feeling deterministic

function randomVariance(base) {
  const factor = 1 + (Math.random() * 2 - 1) * VARIANCE;
  return base * factor;
}

export function equipmentElementState(defender, element) {
  const effects = defender.equipmentEffects ?? {};
  if (!element) return 'normal';
  element = normalizeElement(element);
  if (effects.absorbs?.includes(element)) return 'absorb';
  if (effects.nullElements?.includes(element)) return 'null';
  if (effects.weaknesses?.includes(element) || defender.weakness === element) return 'weak';
  if (effects.resistances?.includes(element) || defender.resist === element) return 'resist';
  return 'normal';
}

/** Physical attack damage: ATK vs DEF, with weapon and armor effects. */
export function resolvePhysicalDamage(attacker, defender, action = {}) {
  if (attacker.weaponSpecial === 'always_1_damage') return 1;
  let multiplier = (action.power ?? 1) * (action.attackMultiplier ?? 1);
  if (attacker.row === 'back' && !action.ranged && !attacker.equipmentEffects?.backRowFullDamage) multiplier *= 0.55;
  if (defender.row === 'back' && !action.ranged) multiplier *= 0.55;
  if ((attacker.equipmentEffects?.killers ?? []).some((type) => defender.creatureTypes?.has(type))) multiplier *= 1.5;
  const raw = Math.max(1, attacker.atk * 2.2 * multiplier - defender.def * 1.1);
  let dmg = randomVariance(raw);
  const elementState = equipmentElementState(defender, attacker.weaponElement);
  if (elementState === 'weak') dmg *= 1.5;
  if (elementState === 'resist') dmg *= 0.5;
  if (elementState === 'null' || elementState === 'absorb') dmg = 0;
  if (attacker.weaponSpecial === 'critical' && Math.random() < 0.12) dmg *= 2;
  if (attacker.weaponSpecial === 'high_critical' && Math.random() < 0.25) dmg *= 2;
  if (defender.defending || defender.statuses?.has('protect')) dmg *= defender.defending ? 0.5 : 0.75;
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
  if (defender.defending) dmg *= 0.7;
  if (defender.statuses?.has('shell')) dmg *= 0.72;
  if (equipmentElementState(defender, spell.element) === 'null') return 0;
  return Math.max(0, Math.round(dmg));
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
    case 'damage.hp_ratio': return { ...common, kind: 'ratio-damage', ratio: operation.ratio, heavyImmune: operation.heavyImmune };
    case 'damage.mp_ratio': return { ...common, kind: 'mp-ratio-damage', ratio: operation.ratio };
    case 'drain.hp': return { ...common, kind: 'magic-attack', power: operation.power, drain: true };
    case 'drain.mp': return { ...common, kind: 'mp-drain', power: operation.power };
    case 'heal.hp': return { ...common, kind: 'heal', healAmount: operation.amount };
    case 'heal.caster_hp': return { ...common, kind: 'heal', healAmount: actor.hp };
    case 'heal.mp': return { ...common, kind: 'mp-heal-target', mpAmount: operation.amount };
    case 'restore.full': return { ...common, kind: 'full-restore' };
    case 'revive': return { ...common, kind: 'revive', hpRatio: operation.hpRatio };
    case 'inspect': return { ...common, kind: 'scan', fields: operation.fields };
    case 'status.apply': return { ...common, kind: 'status', statuses: operation.statuses, toggle: operation.toggle, imageHits: operation.imageHits, duration: operation.duration, statusChance: operation.statusChance };
    case 'status.remove': return { ...common, kind: 'cleanse', statuses: operation.statuses, mode: operation.mode };
    case 'status.dispel': return { ...common, kind: 'dispel' };
    case 'stat.modify': return { ...common, kind: 'stat-modify', stat: operation.stat, multiplier: operation.multiplier };
    case 'battle.speed': return { ...common, kind: 'field-speed', multiplier: operation.multiplier, duration: operation.duration };
    case 'battle.field_status': return { ...common, kind: 'field-status', status: operation.status, duration: operation.duration };
    case 'barrier.physical': return { ...common, kind: 'barrier-physical', amountFormula: operation.amountFormula, amount: operation.amount };
    case 'caster.sacrifice': return { ...common, kind: 'sacrifice' };
    case 'remove.from_battle': return { ...common, kind: 'remove-from-battle' };
    case 'turn.extra': return { ...common, kind: 'extra-turn', count: operation.count };
    default: return { ...common, kind: 'scripted', label: operation.handlerKey ?? operation.op };
  }
}

/**
 * Resolve a full action given the actor, the chosen action definition,
 * and the target(s). Returns a log-friendly result object.
 */
export function resolveAction({ actor, action, targets, battleUnits = targets }) {
  targets = (targets ?? []).filter(Boolean);
  if (action.disabledReason) return [{ type: 'unavailable', targetUid: actor.uid, reason: action.disabledReason }];
  if (targets.length === 0) return [{ type: 'invalid-target', targetUid: actor.uid }];
  const actionMpCost = Math.ceil((action.mpCost ?? 0) * (actor.mpCostMultiplier ?? 1));
  if (!action._compiledOperation && actionMpCost > actor.mp) {
    return [{ type: 'insufficient-mp', targetUid: actor.uid, required: actionMpCost }];
  }
  if (!action._compiledOperation && ['magic-attack', 'heal', 'status', 'cleanse', 'dispel', 'revive'].includes(action.kind) && !actor.canUseMagic?.()) {
    return [{ type: 'sealed', targetUid: actor.uid }];
  }
  if (action.operations?.length && !action._compiledOperation) {
    if (action.mpCost) actor.spendMp(Math.ceil(action.mpCost * (actor.mpCostMultiplier ?? 1)));
    return action.operations.flatMap((operation) => {
      const operationTargets = operation.targetSide
        ? (battleUnits ?? targets).filter((target) => operation.targetSide === 'enemy' ? target.isEnemy !== actor.isEnemy : target.isEnemy === actor.isEnemy)
        : targets;
      const livingTargets = operation.op === 'revive' ? operationTargets : operationTargets.filter((target) => target.isAlive());
      const eligibleTargets = operation.conditionalLevel
        ? livingTargets.filter((target) => target.level % operation.conditionalLevel === 0)
        : livingTargets;
      if (operation.conditionalLevel && eligibleTargets.length === 0) {
        return [{ type: 'miss', targetUid: operationTargets[0]?.uid ?? actor.uid, hits: 1 }];
      }
      return resolveAction({
        actor,
        action: { ...operationToAction(operation, actor), element: operation.element ?? action.element },
        targets: eligibleTargets.length ? eligibleTargets : [actor],
        battleUnits,
      });
    });
  }

  const results = [];

  switch (action.kind) {
    case 'physical-attack': {
      const target = targets[0];
      if (!target?.isAlive()) return [{ type: 'invalid-target', targetUid: target?.uid ?? actor.uid }];
      const hits = Math.max(1, action.hits ?? (actor.weaponSpecial === 'double_hit' ? 2 : 1));
      const attackMultiplier = actor.nextAttackMultiplier ?? 1;
      actor.nextAttackMultiplier = 1;
      let dealtTotal = 0;
      let missedHits = 0;
      let blockedHits = 0;
      for (let hit = 0; hit < hits; hit += 1) {
        const blockedByImage = !action.ignoreEvasion && target.imageHits > 0;
        if (blockedByImage) target.imageHits -= 1;
        const blindPenalty = actor.statuses?.has('blind') ? 35 : 0;
        const hitChance = Math.min(1, Math.max(0.08, ((actor.weaponAccuracy ?? 100) - blindPenalty - (action.ignoreEvasion ? 0 : target.evasion ?? 0)) / 100));
        if (blockedByImage || Math.random() > hitChance) {
          missedHits += 1;
          continue;
        }
        const sameLevelPower = action.sameLevelMultiplier && actor.level === target.level
          ? (action.power ?? 1) * action.sameLevelMultiplier
          : action.power;
        let damage = resolvePhysicalDamage(actor, target, { ...action, power: sameLevelPower, attackMultiplier });
        if (damage > 0 && target.physicalBarrier > 0) {
          const absorbed = Math.min(target.physicalBarrier, damage);
          target.physicalBarrier -= absorbed;
          damage -= absorbed;
          results.push({ type: 'barrier-absorb', targetUid: target.uid, amount: absorbed, remaining: target.physicalBarrier });
        }
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
      if (dealtTotal > 0) {
        (actor.equipmentEffects?.onHitStatuses ?? []).forEach(({ status, chance }) => {
          if (status === 'ko' && target.heavy) return;
          const applied = target.addStatus?.(status, { chance });
          results.push({ type: applied ? 'status' : 'status-resist', targetUid: target.uid, statuses: [status] });
        });
        const proc = actor.equipmentEffects?.onHitProc;
        if (proc && Math.random() < proc.chance) {
          const procDamage = target.applyDamage(resolveMagicDamage(actor, target, proc));
          results.push({ type: 'damage', targetUid: target.uid, amount: procDamage, element: proc.element, proc: true });
        }
      }
      break;
    }
    case 'magic-attack': {
      actor.spendMp(Math.ceil((action.mpCost ?? 0) * (actor.mpCostMultiplier ?? 1)));
      let drainedTotal = 0;
      targets.forEach((target) => {
        const magicEvasion = action.ignoreEvasion ? 0 : (target.equipmentEffects?.magicEvasion ?? 0);
        if (magicEvasion > 0 && Math.random() * 100 < magicEvasion) {
          results.push({ type: 'miss', targetUid: target.uid, hits: action.hits ?? 1 });
          return;
        }
        const elementState = equipmentElementState(target, action.element);
        const hits = Math.max(1, action.hits ?? 1);
        let dmg = 0;
        for (let hit = 0; hit < hits; hit += 1) dmg += resolveMagicDamage(actor, target, action);
        dmg = Math.round(dmg * (target.magicDamageMultiplier ?? 1));
        if (elementState === 'absorb') {
          const healed = target.applyHeal(dmg);
          results.push({ type: 'absorb', targetUid: target.uid, amount: healed });
        } else {
          const dealt = elementState === 'null' ? 0 : target.applyDamage(dmg);
          drainedTotal += dealt;
          results.push({ type: 'damage', targetUid: target.uid, amount: dealt, hits, element: action.element, weak: elementState === 'weak', resisted: elementState === 'resist', nullified: elementState === 'null' });
        }
      });
      if (action.drain && drainedTotal > 0) results.push({ type: 'heal', targetUid: actor.uid, amount: actor.applyHeal(drainedTotal) });
      break;
    }
    case 'heal': {
      if (action.mpCost) actor.spendMp(Math.ceil(action.mpCost * (actor.mpCostMultiplier ?? 1)));
      targets.forEach((target) => {
        if (target.statuses?.has('zombie') || target.isUndead) {
          const damaged = target.applyDamage(resolveHeal(action.healAmount));
          results.push({ type: 'damage', targetUid: target.uid, amount: damaged, reversed: true });
          return;
        }
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
      targets.forEach((target) => {
        if (action.heavyImmune && target.heavy) results.push({ type: 'blocked', targetUid: target.uid, hits: 1 });
        else results.push({ type: 'damage', targetUid: target.uid, amount: target.applyDamage(Math.floor(target.hp * (action.ratio ?? 0.5))) });
      });
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
        const amount = target.revive?.(action.hpRatio ?? 0.25) ?? 0;
        if (amount > 0) results.push({ type: 'revive', targetUid: target.uid, amount });
        else results.push({ type: 'invalid-target', targetUid: target.uid });
      });
      break;
    }
    case 'scan': {
      targets.forEach((target) => results.push({ type: 'scan', targetUid: target.uid, hp: target.hp, maxHp: target.maxHp, weakness: target.weakness }));
      break;
    }
    case 'status': {
      targets.forEach((target) => {
        const appliedStatuses = [];
        const resistedStatuses = [];
        (action.statuses ?? []).forEach((status) => {
          if (action.toggle && target.statuses.has(status)) target.removeStatus(status);
          else if (target.addStatus?.(status, { duration: action.duration, chance: action.statusChance ?? action.chance ?? 0.85 })) appliedStatuses.push(status);
          else resistedStatuses.push(status);
        });
        if (action.imageHits) target.imageHits = Math.max(target.imageHits, action.imageHits);
        if (appliedStatuses.length || action.imageHits) results.push({ type: 'status', targetUid: target.uid, statuses: appliedStatuses });
        if (resistedStatuses.length) results.push({ type: 'status-resist', targetUid: target.uid, statuses: resistedStatuses });
      });
      break;
    }
    case 'cleanse': {
      targets.forEach((target) => {
        const removed = action.mode === 'all_curable' ? [...target.statuses].filter((status) => CURABLE_STATUSES.includes(status)) : (action.statuses ?? []);
        removed.forEach((status) => target.removeStatus?.(status));
        results.push({ type: 'cleanse', targetUid: target.uid, statuses: removed });
      });
      break;
    }
    case 'dispel': {
      targets.forEach((target) => {
        POSITIVE_STATUSES.forEach((status) => target.removeStatus?.(status));
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
    case 'field-speed': {
      actor.addStatus?.('time_focus', { force: true, duration: action.duration ?? 4 });
      results.push({ type: 'field-status', targetUid: actor.uid, status: 'time_focus', multiplier: action.multiplier ?? 0.7 });
      break;
    }
    case 'field-status': {
      const status = action.status === 'mute' ? 'silence' : action.status;
      (battleUnits ?? targets).filter((unit) => unit.isAlive()).forEach((target) => {
        const applied = target.addStatus?.(status, { chance: 1, duration: action.duration ?? 4 });
        results.push({ type: applied ? 'status' : 'status-resist', targetUid: target.uid, statuses: [status] });
      });
      break;
    }
    case 'barrier-physical': {
      const total = action.amount ?? Math.max(400, actor.level * 60 + actor.magic * 10);
      targets.filter((target) => target.isAlive()).forEach((target) => {
        target.physicalBarrier = Math.max(target.physicalBarrier ?? 0, total);
        results.push({ type: 'barrier', targetUid: target.uid, amount: target.physicalBarrier });
      });
      break;
    }
    case 'sacrifice': {
      actor.applyDamage(actor.hp);
      results.push({ type: 'status', targetUid: actor.uid, statuses: ['ko'] });
      break;
    }
    case 'remove-from-battle': {
      targets.forEach((target) => {
        if (target.heavy) results.push({ type: 'blocked', targetUid: target.uid, hits: 1 });
        else {
          target.removedFromBattle = true;
          results.push({ type: 'removed', targetUid: target.uid });
        }
      });
      break;
    }
    case 'extra-turn': {
      actor.ctValue += 1000 * Math.max(1, action.count ?? 1);
      results.push({ type: 'extra-turn', targetUid: actor.uid, count: action.count ?? 1 });
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
      actor.addStatus?.('haste', { force: true, duration: action.duration });
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
