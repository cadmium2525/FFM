import { resolveAction } from './ActionResolver.js';
import { ff5FinalDamage, ff5Zeninage } from './FF5FormulaEngine.js';
import { magicActionsForSchool } from '../database/battleCatalog.js';

const SUMMONS = magicActionsForSchool('summon');

const STEAL_TABLE = Object.freeze({
  omega: { common: 'item_elixir', rare: 'item_dragon_fang', commonName: 'エリクサー', rareName: 'りゅうのきば' },
  boss2: { common: 'item_hi_potion', rare: 'item_ether', commonName: 'ハイポーション', rareName: 'エーテル' },
  boss3: { common: 'item_dark_matter', rare: 'item_elixir', commonName: 'ダークマター', rareName: 'エリクサー' },
});

const GAIA_CRYSTAL_SANCTUM = Object.freeze([
  { id: 'gaia-wind-slash', name: 'かまいたち', kind: 'magic-attack', ff5Power: 90, element: 'wind', target: 'all_enemies' },
  { id: 'gaia-earthquake', name: 'じしん', kind: 'magic-attack', ff5Power: 110, element: 'earth', target: 'all_enemies' },
  { id: 'gaia-stalactite', name: 'しょうにゅうせき', kind: 'magic-attack', ff5Power: 75, element: null, target: 'single-enemy' },
  { id: 'gaia-cave-in', name: 'らくばん', kind: 'ratio-damage', ratio: 0.75, heavyImmune: true, target: 'single-enemy' },
]);

const ANIMALS = Object.freeze([
  { minLevel: 1, id: 'animal-mysidian-rabbit', name: 'ミシディアうさぎ', kind: 'heal', ff5Power: 10, formula: 'ff5_magic', target: 'all_allies' },
  { minLevel: 5, id: 'animal-squirrel', name: 'りす', kind: 'status', statuses: ['blind'], statusChance: 0.8, target: 'single-enemy' },
  { minLevel: 10, id: 'animal-bee-swarm', name: 'はちのむれ', kind: 'magic-attack', ff5Power: 45, element: 'poison', target: 'single-enemy' },
  { minLevel: 20, id: 'animal-nightingale', name: 'ナイチンゲール', kind: 'heal', ff5Power: 30, formula: 'ff5_magic', target: 'all_allies', cleanse: ['poison', 'blind'] },
  { minLevel: 30, id: 'animal-falcon', name: 'はやぶさ', kind: 'ratio-damage', ratio: 0.75, heavyImmune: true, target: 'single-enemy' },
  { minLevel: 40, id: 'animal-skunk', name: 'スカンク', kind: 'status', statuses: ['poison', 'blind'], statusChance: 0.8, target: 'all_enemies' },
  { minLevel: 50, id: 'animal-wild-boar', name: 'いのしし', kind: 'physical-attack', power: 2, ranged: true, target: 'single-enemy' },
  { minLevel: 60, id: 'animal-unicorn', name: 'ユニコーン', kind: 'heal', ff5Power: 120, formula: 'ff5_magic', target: 'all_allies' },
]);

const choose = (list, random = Math.random) => list[Math.floor(random() * list.length)];
const livingAllies = (manager, actor) => manager.units.filter((unit) => unit.isAlive() && !unit.removedFromBattle && unit.isEnemy === actor.isEnemy);
const livingEnemies = (manager, actor) => manager.units.filter((unit) => unit.isAlive() && !unit.removedFromBattle && !unit.hidden && unit.isEnemy !== actor.isEnemy);
const resultLabel = (actor, text) => ({ type: 'command-message', targetUid: actor.uid, label: text });

function commandTargets(manager, actor, action, fallback) {
  if (['all_enemies', 'enemy_group'].includes(action.target)) return livingEnemies(manager, actor);
  if (['all_allies', 'party'].includes(action.target)) return livingAllies(manager, actor);
  if (action.target === 'self') return [actor];
  return [fallback ?? livingEnemies(manager, actor)[0] ?? actor];
}

function steal(manager, actor, target) {
  if (!target || target.stolen) return [resultLabel(actor, '何も持っていない。')];
  const rate = actor.equipmentEffects?.stealRate ?? 0.4;
  if (Math.random() >= rate) return [resultLabel(actor, 'ぬすめなかった。')];
  const table = STEAL_TABLE[target.id] ?? { common: 'item_potion', rare: 'item_hi_potion', commonName: 'ポーション', rareName: 'ハイポーション' };
  const rare = Math.floor(Math.random() * 256) < 10;
  const itemId = rare ? table.rare : table.common;
  const itemName = rare ? table.rareName : table.commonName;
  target.stolen = true;
  manager.addItemStock?.(itemId, 1);
  return [{ type: 'steal', targetUid: target.uid, itemId, itemName, rare }];
}

function resolveMix(manager, actor, action, targets) {
  const needed = new Map();
  action.ingredients.forEach((id) => needed.set(id, (needed.get(id) ?? 0) + 1));
  for (const [id, amount] of needed) {
    if (manager.getItemStock(id) < amount) return { valid: false, reason: '調合素材が足りない。' };
  }
  for (const [id, amount] of needed) manager.consumeItemStock(id, amount);
  const results = [];
  const applyTo = targets.length ? targets : [actor];
  const heal = (unit, amount) => results.push({ type: 'heal', targetUid: unit.uid, amount: unit.applyHeal(amount) });
  const restoreMp = (unit, amount) => {
    const before = unit.mp;
    unit.mp = Math.min(unit.maxMp, unit.mp + amount);
    results.push({ type: 'mp-heal', targetUid: unit.uid, amount: unit.mp - before });
  };
  const damage = (unit, amount, element = null) => results.push({ type: 'damage', targetUid: unit.uid, amount: unit.applyDamage(amount), element });
  const status = (unit, statuses, duration = 12) => {
    const applied = statuses.filter((name) => unit.addStatus(name, { duration, chance: 1, guaranteed: true }));
    results.push({ type: applied.length ? 'status' : 'status-resist', targetUid: unit.uid, statuses: applied.length ? applied : statuses });
  };
  const cleanse = (unit, statuses) => {
    const removed = statuses.filter((name) => unit.removeStatus(name));
    results.push({ type: 'cleanse', targetUid: unit.uid, statuses: removed });
  };
  const revive = (unit, hpRatio, fullMp = false) => {
    const amount = unit.revive(hpRatio);
    if (fullMp) unit.mp = unit.maxMp;
    results.push({ type: 'revive', targetUid: unit.uid, amount });
  };

  switch (action.mixEffect) {
    case 'potion': applyTo.forEach((unit) => heal(unit, 90)); break;
    case 'hi-potion': applyTo.forEach((unit) => heal(unit, 900)); break;
    case 'lifewater': applyTo.forEach((unit) => status(unit, ['regen'])); break;
    case 'resurrection': applyTo.forEach((unit) => revive(unit, 0.25)); break;
    case 'reincarnate': applyTo.forEach((unit) => revive(unit, 1, true)); break;
    case 'phoenix-down': applyTo.forEach((unit) => revive(unit, 0.125)); break;
    case 'x-potion': applyTo.forEach((unit) => heal(unit, 9999)); break;
    case 'neutralizer': applyTo.forEach((unit) => { heal(unit, 90); cleanse(unit, ['poison']); }); break;
    case 'cure-blind': applyTo.forEach((unit) => { heal(unit, 90); cleanse(unit, ['blind']); }); break;
    case 'maiden-kiss': applyTo.forEach((unit) => { heal(unit, 90); cleanse(unit, ['toad']); }); break;
    case 'holy-water': applyTo.forEach((unit) => { heal(unit, 90); cleanse(unit, ['zombie']); }); break;
    case 'antidote': applyTo.forEach((unit) => cleanse(unit, ['poison'])); break;
    case 'remedy': applyTo.forEach((unit) => cleanse(unit, ['poison', 'blind', 'sleep', 'petrify', 'toad', 'mini', 'old', 'silence'])); break;
    case 'smelling-salts': applyTo.forEach((unit) => cleanse(unit, ['confuse', 'sleep', 'paralyze'])); break;
    case 'ether': applyTo.forEach((unit) => restoreMp(unit, 80)); break;
    case 'balm': applyTo.forEach((unit) => restoreMp(unit, 9999)); break;
    case 'elixir': applyTo.forEach((unit) => { heal(unit, 9999); restoreMp(unit, 9999); }); break;
    case 'dragon-power': applyTo.forEach((unit) => { unit.level = Math.min(255, unit.level + 20); results.push({ type: 'buff', targetUid: unit.uid, label: 'レベル+20' }); }); break;
    case 'samson-power': applyTo.forEach((unit) => { unit.level = Math.min(255, unit.level + 10); results.push({ type: 'buff', targetUid: unit.uid, label: 'レベル+10' }); }); break;
    case 'goliath': applyTo.forEach((unit) => { const gain = unit.maxHp; unit.maxHp = Math.min(9999, unit.maxHp * 2); unit.hp = Math.min(unit.maxHp, unit.hp + gain); results.push({ type: 'buff', targetUid: unit.uid, label: '最大HP2倍' }); }); break;
    case 'elemental-power': applyTo.forEach((unit) => { unit.elementalPower = true; results.push({ type: 'buff', targetUid: unit.uid, label: '全属性強化' }); }); break;
    case 'resist-fire': case 'resist-ice': case 'resist-thunder': {
      const element = action.mixEffect.replace('resist-', '');
      applyTo.forEach((unit) => { unit.temporaryNullElements.add(element); results.push({ type: 'buff', targetUid: unit.uid, label: `${element}無効` }); });
      break;
    }
    case 'dragon-shield': applyTo.forEach((unit) => { ['fire', 'ice', 'thunder'].forEach((element) => unit.temporaryNullElements.add(element)); results.push({ type: 'buff', targetUid: unit.uid, label: '炎・氷・雷無効' }); }); break;
    case 'dragon-defense': applyTo.forEach((unit) => status(unit, ['protect', 'shell', 'regen', 'reflect'])); break;
    case 'protect-potion': applyTo.forEach((unit) => status(unit, ['protect', 'shell'])); break;
    case 'levisalve': applyTo.forEach((unit) => status(unit, ['float'])); break;
    case 'hasty-ade': applyTo.forEach((unit) => status(unit, ['haste'])); break;
    case 'lifeshield': applyTo.forEach((unit) => { unit.statusImmunities.add('ko'); results.push({ type: 'buff', targetUid: unit.uid, label: '即死耐性' }); }); break;
    case 'dragon-kiss': applyTo.forEach((unit) => { unit.creatureTypes.add('dragon'); unit.heavy = true; results.push({ type: 'buff', targetUid: unit.uid, label: '竜・ボス特性' }); }); break;
    case 'blessed-kiss': applyTo.forEach((unit) => { status(unit, ['berserk', 'haste']); unit.imageHits = Math.max(unit.imageHits, 2); results.push({ type: 'buff', targetUid: unit.uid, label: '分身×2' }); }); break;
    case 'bacchus-cider': applyTo.forEach((unit) => status(unit, ['berserk'])); break;
    case 'lamia-kiss': applyTo.forEach((unit) => status(unit, ['confuse'])); break;
    case 'toad-kiss': applyTo.forEach((unit) => status(unit, ['toad'])); break;
    case 'poison': case 'dud-poison': applyTo.forEach((unit) => status(unit, ['poison'])); break;
    case 'dark-gas': applyTo.forEach((unit) => status(unit, ['blind'])); break;
    case 'dark-sigh': {
      const ailments = ['blind', 'old', 'confuse', 'sleep', 'toad', 'mini', 'silence'];
      applyTo.forEach((unit) => status(unit, [choose(ailments)]));
      break;
    }
    case 'death-potion': applyTo.forEach((unit) => status(unit, ['ko'])); break;
    case 'turtle-soup': applyTo.forEach((unit) => { unit.def = Math.floor(unit.def / 2); unit.magicDef = Math.floor(unit.magicDef / 2); results.push({ type: 'debuff', targetUid: unit.uid, label: '防御・魔法防御半減' }); }); break;
    case 'dark-ether': applyTo.forEach((unit) => { const amount = unit.mp - Math.floor(unit.mp / 4); unit.spendMp(amount); results.push({ type: 'mp-damage', targetUid: unit.uid, amount }); }); break;
    case 'lilith-kiss': applyTo.forEach((unit) => { const amount = Math.min(unit.mp, Math.max(1, actor.level)); unit.spendMp(amount); actor.mp = Math.min(actor.maxMp, actor.mp + amount); results.push({ type: 'mp-damage', targetUid: unit.uid, amount }, { type: 'mp-heal', targetUid: actor.uid, amount }); }); break;
    case 'succubus-kiss': applyTo.forEach((unit) => { const amount = unit.applyDamage(Math.max(1, actor.level * 8)); actor.applyHeal(amount); results.push({ type: 'damage', targetUid: unit.uid, amount }, { type: 'heal', targetUid: actor.uid, amount }); }); break;
    case 'devil-juice': applyTo.forEach((unit) => damage(unit, 666)); break;
    case 'holy-breath': applyTo.forEach((unit) => damage(unit, actor.hp, 'holy')); break;
    case 'dragon-breath': applyTo.forEach((unit) => damage(unit, actor.hp, 'fire')); break;
    case 'dark-breath': applyTo.forEach((unit) => damage(unit, Math.max(1, actor.maxHp - actor.hp))); break;
    case 'dud-gravity': applyTo.forEach((unit) => damage(unit, Math.floor(unit.hp / 4))); break;
    case 'antilixir': applyTo.forEach((unit) => { const amount = Math.max(0, unit.hp - 1); damage(unit, amount); const mpAmount = Math.max(0, unit.mp - 1); unit.spendMp(mpAmount); results.push({ type: 'mp-damage', targetUid: unit.uid, amount: mpAmount }); }); break;
    case 'poison-breath': {
      const derived = { ...action, kind: 'magic-attack', specialCommand: null, ff5Power: 60, formula: 'ff5_magic', element: 'poison', statuses: ['poison'], statusChance: 0.75 };
      results.push(...resolveAction({ actor, action: derived, targets: applyTo, battleUnits: manager.units }));
      break;
    }
    case 'shadowflare': {
      const derived = { ...action, kind: 'scripted', specialCommand: null, operations: [{ op: 'damage.magic', formula: 'ff5_flare', ff5Power: 200 }, { op: 'status.apply', statuses: ['sap'], statusChance: 0.75 }] };
      results.push(...resolveAction({ actor, action: derived, targets: applyTo, battleUnits: manager.units }));
      break;
    }
    case 'tnt': applyTo.forEach((unit) => damage(unit, Math.max(1, actor.maxHp), 'fire')); actor.applyDamage(actor.hp); results.push({ type: 'damage', targetUid: actor.uid, amount: actor.maxHp, element: 'fire' }); break;
    default: return { valid: false, reason: 'この組み合わせは調合できない。' };
  }
  return { valid: true, action: { ...action, kind: 'special-command' }, targets: applyTo, results };
}

function dualcastTargets(manager, actor, spell, storedUid, fallback) {
  if (['all_enemies', 'enemy_group'].includes(spell.target)) return livingEnemies(manager, actor);
  if (['all_allies', 'party'].includes(spell.target)) return livingAllies(manager, actor);
  if (spell.target === 'self') return [actor];
  const stored = manager.units.find((unit) => unit.uid === storedUid && unit.isAlive() && !unit.removedFromBattle);
  if (stored) return [stored];
  if (String(spell.target).includes('ally')) return [actor];
  return [fallback ?? livingEnemies(manager, actor)[0] ?? actor];
}

function applySongStep(manager, actor, action) {
  const allies = livingAllies(manager, actor);
  const id = action.id ?? '';
  const stats = id.includes('hero') ? ['level', 'strength', 'magic', 'agility']
    : id.includes('mana') ? ['magic']
      : id.includes('sinewy') ? ['strength']
        : ['agility'];
  const results = [];
  allies.forEach((unit) => {
    stats.forEach((statName) => {
      const current = Math.max(1, Math.floor(unit[statName] ?? (statName === 'strength' ? unit.atk : 1)));
      unit[statName] = Math.min(99, current + 1);
      if (statName === 'strength') unit.atk = Math.max(unit.atk, unit.strength);
    });
    results.push({ type: 'buff', targetUid: unit.uid, label: `${action.name}：${stats.join('・')}+1` });
  });
  return results;
}

/** Resolve commands whose behavior cannot be expressed as one generic action. */
export function resolveFF5SpecialCommand({ manager, actor, action, targets }) {
  const target = targets[0];
  switch (action.specialCommand) {
    case 'steal':
      return { valid: true, action, targets, results: steal(manager, actor, target) };
    case 'mug': {
      const attack = { ...action, kind: 'physical-attack', specialCommand: null, commandFormula: 'mug' };
      return { valid: true, action: attack, targets, results: [...resolveAction({ actor, action: attack, targets, battleUnits: manager.units }), ...steal(manager, actor, target)] };
    }
    case 'mimic': {
      const saved = manager.lastPartyAction;
      if (!saved?.action || saved.action.specialCommand === 'mimic') return { valid: false, reason: 'ものまねできる行動がない。' };
      const copied = { ...saved.action, mpCost: 0, _mimicked: true, name: saved.action.name ?? 'ものまね' };
      const copiedTargets = (saved.targetIds ?? []).map((uid) => manager.units.find((unit) => unit.uid === uid)).filter((unit) => unit?.isAlive());
      const finalTargets = copiedTargets.length ? copiedTargets : targets;
      return { valid: true, action: copied, targets: finalTargets, results: resolveAction({ actor, action: copied, targets: finalTargets, battleUnits: manager.units }), remember: false };
    }
    case 'dualcast': {
      const spells = action.dualSpells ?? [];
      if (spells.length !== 2) return { valid: false, reason: 'れんぞくまは2つの魔法を選ぶ。' };
      const totalCost = spells.reduce((sum, spell) => sum + Math.ceil((spell.mpCost ?? 0) * (actor.mpCostMultiplier ?? 1)), 0);
      if (actor.mp < totalCost) return { valid: false, reason: `MPが足りない（必要 ${totalCost}）。` };
      const results = [];
      spells.forEach((spell, index) => {
        const spellTargets = dualcastTargets(manager, actor, spell, action.dualTargetUids?.[index], target);
        results.push(...resolveAction({ actor, action: { ...spell, kind: spell.actionKind ?? 'magic-attack' }, targets: spellTargets, battleUnits: manager.units })
          .map((result) => ({ ...result, castIndex: index, visualAction: spell })));
      });
      return { valid: true, action, targets, results };
    }
    case 'jump':
      actor.pendingJump = { targetUid: target?.uid ?? null, action: { ...action, kind: 'physical-attack', specialCommand: null, commandFormula: 'jump', ignoreEvasion: true } };
      actor.hidden = true;
      return { valid: true, action, targets: [actor], results: [{ type: 'jump-start', targetUid: actor.uid }], remember: false };
    case 'gaia': {
      const derived = { ...choose(GAIA_CRYSTAL_SANCTUM), sourceId: action.sourceId, commandSourceId: action.sourceId, visualId: `ability_gaia_${Date.now()}` };
      const derivedTargets = commandTargets(manager, actor, derived, target);
      return { valid: true, action: derived, targets: derivedTargets, results: resolveAction({ actor, action: derived, targets: derivedTargets, battleUnits: manager.units }) };
    }
    case 'animals': {
      const eligible = ANIMALS.filter((animal) => actor.level >= animal.minLevel);
      const derived = { ...choose(eligible), sourceId: action.sourceId, commandSourceId: action.sourceId };
      const derivedTargets = commandTargets(manager, actor, derived, target);
      const results = resolveAction({ actor, action: derived, targets: derivedTargets, battleUnits: manager.units });
      if (derived.cleanse) derivedTargets.forEach((unit) => derived.cleanse.forEach((status) => unit.removeStatus(status)));
      return { valid: true, action: derived, targets: derivedTargets, results };
    }
    case 'dance': {
      const dances = [
        { id: 'tempting-tango', name: 'ゆうわくのタンゴ', kind: 'status', statuses: ['confuse'], statusChance: 1 },
        { id: 'mystery-waltz', name: 'ミステリーワルツ', kind: 'mp-drain', power: 2 },
        { id: 'jitterbug', name: '二人のジルバ', kind: 'physical-attack', drain: true },
        { id: 'sword-dance', name: 'つるぎのまい', kind: 'physical-attack', commandFormula: 'sword-dance', ignoreEvasion: true },
      ];
      let derived = actor.equipmentEffects?.danceBoost && Math.random() < 0.5 ? dances[3] : choose(dances);
      derived = { ...derived, sourceId: action.sourceId, commandSourceId: action.sourceId, target: 'single-enemy' };
      return { valid: true, action: derived, targets, results: resolveAction({ actor, action: derived, targets, battleUnits: manager.units }) };
    }
    case 'throw': {
      if (manager.getItemStock(action.requiredItemId) < 1) return { valid: false, reason: '投げるアイテムがない。' };
      manager.consumeItemStock(action.requiredItemId, 1);
      const derived = action.element
        ? { ...action, kind: 'magic-attack', specialCommand: null, ff5Power: action.throwPower, formula: 'ff5_magic', mpCost: 0 }
        : { ...action, kind: 'throw-damage', specialCommand: null };
      return { valid: true, action: derived, targets, results: resolveAction({ actor, action: derived, targets, battleUnits: manager.units }) };
    }
    case 'zeninage': {
      const spec = ff5Zeninage(actor, targets.length);
      if ((manager.getGil?.() ?? 0) < spec.cost) return { valid: false, reason: `ギルが足りない（必要 ${spec.cost}）。` };
      manager.spendGil?.(spec.cost);
      const results = targets.map((unit) => ({ type: 'damage', targetUid: unit.uid, amount: unit.applyDamage(ff5FinalDamage(spec.attack, unit.def ?? 0, spec.multiplier)) }));
      return { valid: true, action: { ...action, specialCommand: null }, targets, results };
    }
    case 'mix': return resolveMix(manager, actor, action, targets);
    case 'drink': {
      if (manager.getItemStock(action.requiredItemId) < 1) return { valid: false, reason: '薬がない。' };
      manager.consumeItemStock(action.requiredItemId, 1);
      let derived;
      if (action.drinkEffect === 'giant') derived = { ...action, kind: 'stat-modify', stat: 'maxHp', multiplier: 2 };
      else if (action.drinkEffect === 'power') derived = { ...action, kind: 'stat-modify', stat: 'atk', multiplier: 1.25 };
      else if (action.drinkEffect === 'speed') derived = { ...action, kind: 'status', statuses: ['haste'], duration: 12, statusChance: 1 };
      else if (action.drinkEffect === 'iron') derived = { ...action, kind: 'status', statuses: ['protect'], duration: 12, statusChance: 1 };
      else derived = { ...action, kind: 'stat-modify', stat: 'level', multiplier: 1.2 };
      return { valid: true, action: derived, targets: [actor], results: resolveAction({ actor, action: derived, targets: [actor], battleUnits: manager.units }) };
    }
    case 'call': {
      const summon = { ...choose(SUMMONS), mpCost: 0, id: `call-${Date.now()}`, commandSourceId: 'ability_call' };
      const summonTargets = commandTargets(manager, actor, summon, target);
      return { valid: true, action: summon, targets: summonTargets, results: resolveAction({ actor, action: summon, targets: summonTargets, battleUnits: manager.units }) };
    }
    case 'lance': {
      const hpAction = { ...action, kind: 'magic-attack', specialCommand: null, ff5Power: 35, drain: true, mpCost: 0 };
      const results = resolveAction({ actor, action: hpAction, targets, battleUnits: manager.units });
      const mpAmount = Math.min(target?.mp ?? 0, Math.max(1, Math.floor(actor.level * actor.magic / 128) + 1));
      if (target && mpAmount) { target.spendMp(mpAmount); actor.mp = Math.min(actor.maxMp, actor.mp + mpAmount); results.push({ type: 'mp-damage', targetUid: target.uid, amount: mpAmount }, { type: 'mp-heal', targetUid: actor.uid, amount: mpAmount }); }
      return { valid: true, action: hpAction, targets, results };
    }
    case 'chakra': {
      const amount = Math.max(1, Math.floor(actor.level * actor.level / 4) + actor.vitality);
      const healed = actor.applyHeal(amount);
      ['poison', 'blind'].forEach((status) => actor.removeStatus(status));
      return { valid: true, action, targets: [actor], results: [{ type: 'heal', targetUid: actor.uid, amount: healed }, { type: 'cleanse', targetUid: actor.uid, statuses: ['poison', 'blind'] }] };
    }
    case 'calm': {
      const calmable = target && !target.heavy && [...(target.creatureTypes ?? [])].some((type) => ['beast', 'magic_beast'].includes(type));
      if (!calmable) return { valid: true, action, targets, results: [resultLabel(actor, `${target?.name ?? '敵'}には なだめるが効かない！`)] };
      const derived = { ...action, kind: 'status', specialCommand: null, statuses: ['stop'], statusChance: 1 };
      return { valid: true, action: derived, targets, results: resolveAction({ actor, action: derived, targets, battleUnits: manager.units }) };
    }
    case 'control':
      if (target?.heavy || target?.statusImmunities?.has('confuse')) return { valid: true, action, targets, results: [resultLabel(actor, `${target.name}は あやつれない！`)] };
      return { valid: true, action, targets, results: resolveAction({ actor, action: { ...action, kind: 'status', statuses: ['confuse'], statusChance: actor.equipmentEffects?.controlBoost ? 0.8 : 0.4 }, targets, battleUnits: manager.units }) };
    case 'catch': {
      const threshold = actor.equipmentEffects?.catchBoost ? 0.5 : 0.125;
      if (!target || target.heavy || target.hpRatio() > threshold) return { valid: true, action, targets, results: [resultLabel(actor, `${target?.name ?? '敵'}は とらえられない！`)] };
      actor.capturedMonster = { id: target.id, name: target.name, level: target.level, atk: target.atk, magic: target.magic };
      target.removedFromBattle = true;
      return { valid: true, action, targets, results: [{ type: 'captured', targetUid: target.uid, label: `${target.name}を とらえた！` }] };
    }
    case 'release': {
      const captured = actor.capturedMonster;
      if (!captured) return { valid: false, reason: 'はなせるモンスターがいない。' };
      actor.capturedMonster = null;
      const derived = {
        ...action,
        id: `release-${captured.id}`,
        name: `${captured.name}を はなつ`,
        kind: 'magic-attack',
        specialCommand: null,
        ff5Power: Math.max(30, Math.min(180, (captured.atk ?? 20) + Math.floor((captured.level ?? 1) / 2))),
        formula: 'ff5_magic',
        mpCost: 0,
        target: 'all_enemies',
      };
      const releaseTargets = livingEnemies(manager, actor);
      return { valid: true, action: derived, targets: releaseTargets, results: resolveAction({ actor, action: derived, targets: releaseTargets, battleUnits: manager.units }) };
    }
    case 'sing': {
      actor.singing = { ...action };
      return { valid: true, action, targets: livingAllies(manager, actor), results: applySongStep(manager, actor, action), remember: false };
    }
    case 'hide':
      actor.hidden = !actor.hidden;
      return { valid: true, action: { ...action, name: actor.hidden ? 'かくれる' : 'あらわれる' }, targets: [actor], results: [{ type: actor.hidden ? 'hidden' : 'revealed', targetUid: actor.uid }] };
    default:
      return { valid: false, reason: '特殊コマンドの処理が見つからない。' };
  }
}
