/**
 * Integer battle formulas modelled after the SFC Final Fantasy V battle code.
 *
 * The original engine first derives attack (A), defense (D), and a stat/level
 * multiplier (M), then applies: max(0, A - D) * M.  Weapon families are not
 * interchangeable: axes roll a wide attack range, knives split Strength and
 * Agility, and spears only double M while landing from Jump.
 *
 * Reference implementation used while deriving these rules:
 * https://github.com/everything8215/ff5/blob/main/src/battle/battle-main.asm
 */

const DAMAGE_CAP = 9999;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const stat = (value) => clamp(Math.floor(Number(value) || 0), 0, 99);
const level = (unit) => clamp(Math.floor(Number(unit.level) || 1), 1, 99);

function randomInt(maxInclusive, random = Math.random) {
  const max = Math.max(0, Math.floor(maxInclusive));
  return Math.floor(clamp(random(), 0, 0.999999999) * (max + 1));
}

export function ff5FinalDamage(attack, defense, multiplier) {
  return clamp(Math.max(0, Math.floor(attack) - Math.floor(defense)) * Math.max(0, Math.floor(multiplier)), 0, DAMAGE_CAP);
}

export function ff5PhysicalHit({ attacker, defender, action = {}, random = Math.random }) {
  if (action.ignoreEvasion || action.commandFormula === 'aim' || action.commandFormula === 'rapid-fire' || action.commandFormula === 'jump') return true;
  if ((defender.imageHits ?? 0) > 0) return false;
  let accuracy = Math.floor(action.accuracy ?? attacker.weaponAccuracy ?? 100);
  if (attacker.statuses?.has('blind')) accuracy = Math.max(1, Math.floor(accuracy / 4));
  let evasion = Math.floor(defender.evasion ?? 0);
  if (defender.statuses?.has('toad')) evasion = 0;
  if (defender.statuses?.has('mini')) evasion = Math.min(99, evasion * 2);
  if (randomInt(99, random) >= accuracy) return false;
  if (['sleep', 'confuse', 'paralyze', 'stop'].some((status) => defender.statuses?.has(status))) return true;
  return randomInt(99, random) >= evasion;
}

function basePhysicalParameters(attacker, defender, action, random) {
  const configuredWeaponPower = Number(attacker.equipmentEffects?.weaponAttack ?? attacker.weaponAttack ?? 0);
  const weaponPower = Math.max(0, Math.floor(configuredWeaponPower > 0 ? configuredWeaponPower : attacker.atk));
  const strength = stat(attacker.strength ?? attacker.baseAtk ?? attacker.atk);
  const agility = stat(attacker.agility);
  const attackerLevel = level(attacker);
  const weaponType = action.weaponType ?? attacker.equipmentEffects?.weaponType ?? attacker.weaponType ?? (weaponPower > 0 ? 'sword' : 'fist');
  let attack;
  let multiplier;

  switch (weaponType) {
    case 'axe':
    case 'hammer':
    case 'flail':
      attack = Math.floor(weaponPower / 2) + randomInt(weaponPower, random);
      multiplier = Math.floor(attackerLevel * strength / 128) + 2;
      break;
    case 'knife':
    case 'ninja_blade':
    case 'whip':
    case 'bow':
    case 'throwing':
      attack = weaponPower + randomInt(3, random);
      multiplier = Math.floor(attackerLevel * strength / 128) + Math.floor(attackerLevel * agility / 128) + 2;
      break;
    case 'bell':
      attack = Math.floor(weaponPower / 2) + randomInt(Math.floor(weaponPower / 2), random);
      multiplier = Math.floor(attackerLevel * stat(attacker.magic) / 128) + Math.floor(attackerLevel * agility / 128) + 2;
      break;
    case 'rod':
      attack = randomInt(weaponPower, random) * 2;
      multiplier = Math.floor(attackerLevel * stat(attacker.magic) / 256) + 2;
      break;
    case 'fist':
      if (attacker.hasBrawl || attacker.abilityId === 'ability_barehanded') {
        attack = weaponPower + attackerLevel * 2 + randomInt(Math.floor(attackerLevel / 4), random)
          + (attacker.equipmentEffects?.improvedBrawl ? 50 : 0);
        multiplier = Math.floor(attackerLevel * strength / 256) + 2;
      } else {
        attack = weaponPower + randomInt(Math.floor(attackerLevel / 4), random);
        multiplier = 2;
      }
      break;
    default:
      attack = weaponPower + randomInt(Math.floor(weaponPower / 8), random);
      multiplier = Math.floor(attackerLevel * strength / 128) + 2;
      break;
  }

  let defense = Math.max(0, Math.floor(defender.def ?? 0));
  if (['axe', 'hammer', 'flail'].includes(weaponType)) defense = Math.floor(defense / 4);
  if (['bell', 'rod'].includes(weaponType)) defense = Math.max(0, Math.floor(defender.magicDef ?? 0));
  let postMultiplier = Number(action.power ?? 1) * Number(action.attackMultiplier ?? 1);

  if (action.commandFormula === 'rapid-fire') {
    defense = 0;
    postMultiplier *= 0.5;
  }
  if (action.commandFormula === 'focus') postMultiplier *= 2;
  if (action.commandFormula === 'sword-dance') postMultiplier *= 4;
  if (action.commandFormula === 'jump' && ['spear', 'lance'].includes(weaponType)) multiplier *= 2;
  if (action.ignoreDefense) defense = 0;

  const isRanged = action.ranged || ['bow', 'whip'].includes(weaponType) || action.commandFormula === 'jump' || action.commandFormula === 'throw';
  if (!isRanged && attacker.row === 'back' && !attacker.equipmentEffects?.backRowFullDamage) multiplier = Math.floor(multiplier / 2);
  if (!isRanged && defender.row === 'back') multiplier = Math.floor(multiplier / 2);
  if (defender.statuses?.has('protect')) multiplier = Math.floor(multiplier / 2);
  if (defender.defending) multiplier = Math.floor(multiplier / 2);
  if (attacker.statuses?.has('berserk')) attack = Math.floor(attack * 1.5);
  if (attacker.statuses?.has('toad') || attacker.statuses?.has('mini')) attack = 3;
  if (defender.statuses?.has('toad') || defender.statuses?.has('mini')) defense = 0;

  const critical = Boolean(action.forceCritical)
    || (['katana'].includes(weaponType) && random() < (attacker.weaponSpecial === 'high_critical' ? 0.25 : 0.125));
  if (critical) {
    defense = 0;
    multiplier *= 2;
  }

  return { attack, defense, multiplier, postMultiplier, weaponType, critical };
}

export function ff5PhysicalDamage(attacker, defender, action = {}, random = Math.random) {
  if (attacker.weaponSpecial === 'always_1_damage' && action.commandFormula !== 'throw') return { damage: 1, critical: false };
  const params = basePhysicalParameters(attacker, defender, action, random);
  let damage = Math.floor(ff5FinalDamage(params.attack, params.defense, params.multiplier) * params.postMultiplier);
  damage = clamp(Math.floor(damage * (defender.physicalDamageMultiplier ?? 1)), 0, DAMAGE_CAP);
  return { damage, critical: params.critical, formula: params };
}

/**
 * SFC monster attacks do not reuse a character's sword formula.
 * A = MonsterAttack + 0..MonsterAttack/8, M = MonsterM, D = Defense.
 */
export function ff5MonsterDamage(attacker, defender, action = {}, random = Math.random) {
  let attack = Math.max(0, Math.floor(attacker.atk ?? 0));
  attack += randomInt(Math.floor(attack / 8), random);
  let defense = Math.max(0, Math.floor(defender.def ?? 0));
  let multiplier = Math.max(1, Math.floor(attacker.monsterM ?? 1));
  if (action.commandFormula === 'rapid-fire') defense = 0;
  if (action.ignoreDefense) defense = 0;
  if (defender.statuses?.has('protect')) multiplier = Math.floor(multiplier / 2);
  if (defender.defending) multiplier = Math.floor(multiplier / 2);
  let damage = ff5FinalDamage(attack, defense, multiplier);
  damage = Math.floor(damage * Number(action.power ?? 1) * Number(action.attackMultiplier ?? 1));
  damage = Math.floor(damage * (defender.physicalDamageMultiplier ?? 1));
  return { damage: clamp(damage, 0, DAMAGE_CAP), formula: { attack, defense, multiplier, weaponType: 'monster' } };
}

export function ff5MagicDamage(caster, defender, spell = {}, random = Math.random) {
  const power = Math.max(0, Math.floor(spell.ff5Power ?? spell.magicPower ?? Math.max(1, Number(spell.power ?? 1) * 40)));
  const casterLevel = level(caster);
  const magic = stat(caster.magic);
  const flareFormula = spell.formula === 'ff5_flare' || spell.sourceId === 'magic_flare' || spell.id === 'magic_flare';
  let attack = power + randomInt(Math.floor(power / (flareFormula ? 32 : 8)), random);
  let defense = Math.max(0, Math.floor(defender.magicDef ?? 0));
  let multiplier = Math.floor(casterLevel * magic / 256) + 4;

  if (spell.multiTarget) attack = Math.floor(attack / 2);
  if (flareFormula) defense = Math.floor(defense / 32);
  if (defender.statuses?.has('shell')) multiplier = Math.floor(multiplier / 2);
  if (defender.defending) multiplier = Math.floor(multiplier / 2);
  const boosted = caster.equipmentEffects?.magicBoostElements?.includes(spell.element);
  if (boosted || caster.elementalPower) attack = Math.floor(attack * 1.5);

  return { damage: ff5FinalDamage(attack, defense, multiplier), formula: { attack, defense, multiplier, power } };
}

export function ff5MagicHeal(caster, spell = {}, random = Math.random) {
  const power = Math.max(1, Math.floor(spell.ff5Power ?? spell.magicPower ?? 10));
  const attack = power + randomInt(Math.floor(power / 8), random);
  let multiplier = Math.floor(level(caster) * stat(caster.magic) / 256) + 4;
  if (spell.multiTarget) multiplier = Math.max(1, Math.floor(multiplier / 2));
  return clamp(attack * multiplier, 1, DAMAGE_CAP);
}

export function ff5ThrowDamage(attacker, defender, throwPower, random = Math.random) {
  const attack = Math.max(0, Math.floor(throwPower)) + randomInt(Math.floor(throwPower / 8), random);
  const multiplier = (Math.floor(level(attacker) * stat(attacker.strength ?? attacker.baseAtk) / 128)
    + Math.floor(level(attacker) * stat(attacker.agility) / 128) + 2) * 2;
  return ff5FinalDamage(attack, defender.def ?? 0, multiplier);
}

export function ff5Zeninage(actor, targetCount = 1) {
  const attack = level(actor) + 10;
  const multiplier = 50;
  // Gil is paid once per command; hitting several enemies does not multiply
  // the price. Param1 and Param2 are both 50 in FFV's command data.
  const cost = level(actor) * 50;
  return { cost, attack, multiplier, targetCount: Math.max(1, targetCount) };
}
