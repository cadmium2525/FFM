/**
 * ActionResolver
 * Pure(ish) functions that turn an "action" declaration into concrete
 * HP/MP changes on the involved units. Kept separate from BattleManager so
 * the math can be unit-tested / tweaked independently of turn flow.
 */

import { CURABLE_STATUSES, POSITIVE_STATUSES, normalizeElement } from './StatusEngine.js';
import { ff5MagicDamage, ff5MagicHeal, ff5MonsterDamage, ff5PhysicalDamage, ff5PhysicalHit, ff5ThrowDamage } from './FF5FormulaEngine.js';

export function equipmentElementState(defender, element) {
  const effects = defender.equipmentEffects ?? {};
  if (!element) return 'normal';
  element = normalizeElement(element);
  if (effects.absorbs?.includes(element)) return 'absorb';
  if (defender.temporaryNullElements?.has(element)) return 'null';
  if (effects.nullElements?.includes(element)) return 'null';
  if (effects.weaknesses?.includes(element) || defender.weakness === element) return 'weak';
  if (effects.resistances?.includes(element) || defender.resist === element) return 'resist';
  return 'normal';
}

/** Physical attack damage: ATK vs DEF, with weapon and armor effects. */
export function resolvePhysicalDamage(attacker, defender, action = {}) {
  const spellblade = attacker.weaponSpellblade;
  const formulaAction = spellblade?.effect === 'flare' ? { ...action, ignoreDefense: true } : action;
  let dmg = (attacker.isEnemy
    ? ff5MonsterDamage(attacker, defender, action)
    : ff5PhysicalDamage(attacker, defender, formulaAction)).damage;
  if ((attacker.equipmentEffects?.killers ?? []).some((type) => defender.creatureTypes?.has(type))) dmg *= 2;
  const attackElement = spellblade?.element ?? attacker.weaponElement;
  const elementState = equipmentElementState(defender, attackElement);
  if (elementState === 'weak') dmg *= Math.max(2, spellblade?.tier ?? 2);
  if (elementState === 'resist') dmg *= 0.5;
  if (elementState === 'null' || elementState === 'absorb') dmg = 0;
  return Math.max(0, Math.round(dmg));
}

/** Magic/elemental damage: MAGIC stat * spell power, weakness/resist modifiers. */
export function resolveMagicDamage(caster, defender, spell) {
  let dmg = ff5MagicDamage(caster, defender, spell).damage;

  if (spell.element) {
    const elementState = equipmentElementState(defender, spell.element);
    if (elementState === 'weak') dmg *= 2;
    if (elementState === 'resist') dmg *= 0.5;
    if (elementState === 'null') dmg = 0;
  }
  if (equipmentElementState(defender, spell.element) === 'null') return 0;
  return Math.max(0, Math.round(dmg));
}

/** Items are fixed; magic healing uses the same integer A×M structure as FFV. */
export function resolveHeal(amount, caster = null, action = {}) {
  if (action.formula === 'ff5_magic' || action.ff5Power) return ff5MagicHeal(caster, action);
  return Math.max(1, Math.round(amount));
}

function operationToAction(operation, actor) {
  const common = { _compiledOperation: true, mpCost: 0 };
  switch (operation.op) {
    case 'damage.magic': return { ...common, kind: 'magic-attack', power: operation.power, ff5Power: operation.ff5Power, formula: operation.formula, hits: operation.hits, element: operation.element };
    case 'damage.physical': return { ...common, kind: 'physical-attack', power: operation.power, sameLevelMultiplier: operation.sameLevelMultiplier, commandFormula: operation.commandFormula };
    case 'damage.fixed': return { ...common, kind: 'fixed-damage', fixedDamage: operation.amount };
    case 'damage.caster_hp': return { ...common, kind: 'fixed-damage', fixedDamage: actor.hp, sacrificeCaster: operation.sacrificeCaster };
    case 'damage.missing_hp': return { ...common, kind: 'fixed-damage', fixedDamage: actor.maxHp - actor.hp };
    case 'damage.hp_ratio': return { ...common, kind: 'ratio-damage', ratio: operation.ratio, heavyImmune: operation.heavyImmune };
    case 'damage.max_hp_ratio': return { ...common, kind: 'max-hp-ratio-damage', ratio: operation.ratio, heavyImmune: operation.heavyImmune };
    case 'damage.to_critical': return { ...common, kind: 'critical-damage', heavyImmune: operation.heavyImmune };
    case 'damage.mp_ratio': return { ...common, kind: 'mp-ratio-damage', ratio: operation.ratio };
    case 'drain.hp': return { ...common, kind: 'magic-attack', power: operation.power, drain: true };
    case 'drain.mp': return { ...common, kind: 'mp-drain', power: operation.power };
    case 'heal.hp': return { ...common, kind: 'heal', healAmount: operation.amount, ff5Power: operation.ff5Power, formula: operation.formula };
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
    case 'summon.odin': return { ...common, kind: 'summon-odin', ff5Power: operation.ff5Power ?? 180, formula: 'ff5_magic' };
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
  const sealedMagicAction = action.usesMagic !== false
    && !['ability', 'song'].includes(action.sourceType)
    && ['magic-attack', 'heal', 'status', 'status-choice', 'cleanse', 'dispel', 'revive'].includes(action.kind);
  if (!action._compiledOperation && sealedMagicAction && !actor.canUseMagic?.()) {
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
        if (blockedByImage || !ff5PhysicalHit({ attacker: actor, defender: target, action })) {
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
      const spellbladeEffect = actor.weaponSpellblade?.effect;
      if (dealtTotal > 0 && ['poison', 'silence', 'sleep', 'petrify'].includes(spellbladeEffect)) {
        const blocked = target.heavy && spellbladeEffect === 'petrify';
        const applied = !blocked && target.addStatus?.(spellbladeEffect, { chance: 1 });
        results.push({ type: applied ? 'status' : 'status-resist', targetUid: target.uid, statuses: [spellbladeEffect] });
      }
      if (dealtTotal > 0 && spellbladeEffect === 'drain') {
        const amount = actor.applyHeal(dealtTotal);
        if (amount) results.push({ type: 'heal', targetUid: actor.uid, amount });
      }
      if (dealtTotal > 0 && spellbladeEffect === 'osmose') {
        const amount = Math.min(target.mp, Math.max(1, Math.floor(dealtTotal / 8)));
        target.spendMp(amount);
        actor.mp = Math.min(actor.maxMp, actor.mp + amount);
        results.push({ type: 'mp-damage', targetUid: target.uid, amount }, { type: 'mp-heal', targetUid: actor.uid, amount });
      }
      if (dealtTotal > 0 && target.singing) {
        target.singing = null;
        results.push({ type: 'song-stopped', targetUid: target.uid });
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
        for (let hit = 0; hit < hits; hit += 1) dmg += resolveMagicDamage(actor, target, { ...action, multiTarget: targets.length > 1 });
        dmg = Math.round(dmg * (target.magicDamageMultiplier ?? 1));
        if (elementState === 'absorb') {
          const healed = target.applyHeal(dmg);
          results.push({ type: 'absorb', targetUid: target.uid, amount: healed });
        } else {
          const dealt = elementState === 'null' ? 0 : target.applyDamage(dmg);
          drainedTotal += dealt;
          results.push({ type: 'damage', targetUid: target.uid, amount: dealt, hits, element: action.element, weak: elementState === 'weak', resisted: elementState === 'resist', nullified: elementState === 'null' });
          if (dealt > 0 && target.singing) {
            target.singing = null;
            results.push({ type: 'song-stopped', targetUid: target.uid });
          }
        }
      });
      if (action.drain && drainedTotal > 0) results.push({ type: 'heal', targetUid: actor.uid, amount: actor.applyHeal(drainedTotal) });
      break;
    }
    case 'heal': {
      if (action.mpCost) actor.spendMp(Math.ceil(action.mpCost * (actor.mpCostMultiplier ?? 1)));
      targets.forEach((target) => {
        if (target.statuses?.has('zombie') || target.isUndead) {
          const damaged = target.applyDamage(resolveHeal(action.healAmount, actor, { ...action, multiTarget: targets.length > 1 }));
          results.push({ type: 'damage', targetUid: target.uid, amount: damaged, reversed: true });
          return;
        }
        const healed = target.applyHeal(resolveHeal(action.healAmount, actor, { ...action, multiTarget: targets.length > 1 }));
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
    case 'max-hp-ratio-damage': {
      // Percentage-of-MAX-HP damage (e.g. Omega's Wave Cannon: 1/2 of target's max HP,
      // regardless of current HP) -- distinct from 'ratio-damage', which uses current HP.
      targets.forEach((target) => {
        if (action.heavyImmune && target.heavy) results.push({ type: 'blocked', targetUid: target.uid, hits: 1 });
        else results.push({ type: 'damage', targetUid: target.uid, amount: target.applyDamage(Math.floor(target.maxHp * (action.ratio ?? 0.5))) });
      });
      break;
    }
    case 'critical-damage': {
      // Brings each target down to a random single-digit HP value (1-9),
      // i.e. "HPを1桁にする" — never finishes a target off outright,
      // matching the source move's described effect (e.g. Maelstrom).
      targets.forEach((target) => {
        if (action.heavyImmune && target.heavy) { results.push({ type: 'blocked', targetUid: target.uid, hits: 1 }); return; }
        if (!target.isAlive()) return;
        const finalHp = Math.min(target.hp, 1 + Math.floor(Math.random() * 9));
        const amount = target.applyDamage(target.hp - finalHp);
        results.push({ type: 'damage', targetUid: target.uid, amount });
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
      targets.forEach((target) => results.push({
        type: 'scan',
        targetUid: target.uid,
        hp: target.hp,
        maxHp: target.maxHp,
        mp: target.mp,
        maxMp: target.maxMp,
        level: target.level,
        weakness: target.weakness,
        statuses: [...(target.statuses ?? [])],
      }));
      break;
    }
    case 'throw-damage': {
      targets.forEach((target) => {
        const amount = ff5ThrowDamage(actor, target, action.throwPower ?? 1);
        results.push({ type: 'damage', targetUid: target.uid, amount: target.applyDamage(amount), element: action.element });
      });
      break;
    }
    case 'status':
    case 'status-choice': {
      // status-choice (e.g. Omega's ブラスター: 即死 or マヒ) rolls ONE of its
      // options up front, then applies exactly like a normal 'status' action —
      // never both effects at once.
      const resolvedAction = action.kind === 'status-choice'
        ? { ...action, ...action.options[Math.floor(Math.random() * action.options.length)] }
        : action;
      targets.forEach((target) => {
        const appliedStatuses = [];
        const resistedStatuses = [];
        // Some effects are delivered through an element/category the target
        // is explicitly weak to (e.g. Omega and 音波/sound-based Sing
        // techniques such as Romeo's Ballad). A weakness to the delivery
        // element guarantees the status lands, bypassing normal chance and
        // status resistance, just like FF5's own accuracy formula.
        const guaranteedByWeakness = resolvedAction.element && equipmentElementState(target, resolvedAction.element) === 'weak';
        (resolvedAction.statuses ?? []).forEach((status) => {
          if (status === 'ko' && resolvedAction.heavyImmune && target.heavy) {
            resistedStatuses.push(status);
            return;
          }
          const guaranteedBuff = target.isEnemy === actor.isEnemy && POSITIVE_STATUSES.includes(status);
          if (resolvedAction.toggle && target.statuses.has(status)) target.removeStatus(status);
          else if (target.addStatus?.(status, {
            duration: resolvedAction.duration,
            chance: guaranteedByWeakness || guaranteedBuff ? 1 : (resolvedAction.statusChance ?? resolvedAction.chance ?? 0.85),
            guaranteed: guaranteedByWeakness || guaranteedBuff,
          })) appliedStatuses.push(status);
          else resistedStatuses.push(status);
        });
        if (resolvedAction.imageHits) target.imageHits = Math.max(target.imageHits, resolvedAction.imageHits);
        if (appliedStatuses.length || resolvedAction.imageHits) results.push({ type: 'status', targetUid: target.uid, statuses: appliedStatuses });
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
    case 'summon-odin': {
      targets.forEach((target) => {
        if (!target.heavy && !target.statusImmunities?.has('ko')) {
          const applied = target.addStatus?.('ko', { chance: 1, guaranteed: true });
          results.push({ type: applied ? 'status' : 'status-resist', targetUid: target.uid, statuses: ['ko'] });
          return;
        }
        const amount = target.applyDamage(resolveMagicDamage(actor, target, action));
        results.push({ type: 'damage', targetUid: target.uid, amount, element: null, odinFallback: 'gungnir' });
      });
      break;
    }
    case 'special-command': {
      results.push({ type: 'effect', targetUid: targets[0]?.uid ?? actor.uid, label: action.name ?? action.specialCommand });
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
      actor.weaponSpellblade = { element: action.element ?? null, tier: action.spellbladeTier ?? 1, effect: action.spellbladeEffect ?? null, name: action.name };
      results.push({ type: 'buff', targetUid: actor.uid, label: `${action.name ?? '魔法剣'}を付与` });
      break;
    }
    default:
      break;
  }

  return results;
}
