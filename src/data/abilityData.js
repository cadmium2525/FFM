import { magicActionsForSchool } from '../database/battleCatalog.js';

/**
 * ctbCost is a multiplier applied to the CTB threshold when an action is
 * consumed: >1.0 delays the unit's next turn (slow/heavy actions),
 * <1.0 brings the next turn sooner (quick actions like Defend).
 */

export const basicCommands = [
  { id: 'attack', label: 'たたかう' },
  { id: 'magic', label: 'まほう' },
  { id: 'ability', label: 'アビリティ' },
  { id: 'item', label: 'アイテム' },
  { id: 'defend', label: 'ぼうぎょ' },
];

export const attackAction = {
  id: 'attack',
  name: 'こうげき',
  ctbCost: 1.0,
  power: 1.0,
  element: null,
  target: 'single-enemy',
};

export const defendAction = {
  id: 'defend',
  name: 'ぼうぎょ',
  ctbCost: 0.55,
  power: 0,
  element: null,
  target: 'self',
  damageTakenMultiplier: 0.5,
};

export const itemActions = [
  {
    id: 'potion',
    name: 'ポーション',
    ctbCost: 0.8,
    healAmount: 400,
    target: 'single-ally',
  },
  {
    id: 'hi-potion',
    name: 'ハイポーション',
    ctbCost: 0.9,
    healAmount: 900,
    target: 'single-ally',
  },
];

// Battle menus are generated directly from the reference database. Adding or
// correcting a spell record therefore updates every command that consumes it.
export const magicSets = {
  '白魔法': magicActionsForSchool('white'),
  '黒魔法': magicActionsForSchool('black'),
  '召喚魔法': magicActionsForSchool('summon'),
  '時空魔法': magicActionsForSchool('time'),
  '青魔法': magicActionsForSchool('blue'),
  '赤魔法': [
    ...magicActionsForSchool('white', { maxLevel: 3 }),
    ...magicActionsForSchool('black', { maxLevel: 3 }),
  ],
  // Characters without a magic command keep a single basic recovery option.
  'たたかう型': magicActionsForSchool('white').filter((spell) => spell.sourceId === 'magic_cure'),
};

const directAbilityActions = Object.freeze({
  ability_guard: [{ id: 'guard', name: 'まもり', actionKind: 'guard', ctbCost: 0.7, target: 'self' }],
  ability_focus: [{ id: 'focus', name: 'ためる', actionKind: 'focus', ctbCost: 0.8, target: 'self' }],
  ability_chakra: [{ id: 'chakra', name: 'チャクラ', actionKind: 'heal', healAmount: 450, ctbCost: 0.9, target: 'self' }],
  ability_image: [{ id: 'image', name: 'ぶんしん', actionKind: 'image', imageHits: 2, ctbCost: 0.9, target: 'self' }],
  ability_aim: [{ id: 'aim', name: 'ねらう', actionKind: 'physical-attack', power: 1.2, ignoreEvasion: true, ctbCost: 1.0, target: 'single-enemy' }],
  ability_rapid_fire: [{ id: 'rapid-fire', name: 'みだれうち', actionKind: 'physical-attack', power: 0.6, hits: 4, ignoreEvasion: true, ctbCost: 1.5, target: 'single-enemy' }],
  ability_jump: [{ id: 'jump', name: 'ジャンプ', actionKind: 'physical-attack', power: 1.8, ctbCost: 1.4, target: 'single-enemy' }],
  ability_lance: [{ id: 'lance', name: 'りゅうけん', actionKind: 'physical-attack', power: 0.8, drain: true, mpDrain: 12, ctbCost: 1.1, target: 'single-enemy' }],
  ability_mug: [{ id: 'mug', name: 'ぶんどる', actionKind: 'physical-attack', power: 1.0, ctbCost: 1.1, target: 'single-enemy' }],
  ability_gaia: [{ id: 'gaia', name: 'ちけい', actionKind: 'magic-attack', power: 2.5, element: 'earth', ctbCost: 1.1, target: 'single-enemy' }],
  ability_throw: [{ id: 'throw', name: 'なげる', actionKind: 'fixed-damage', fixedDamage: 750, ctbCost: 1.2, target: 'single-enemy' }],
  ability_mineuchi: [{ id: 'mineuchi', name: 'みねうち', actionKind: 'physical-attack', power: 0.9, ctbCost: 0.9, target: 'single-enemy' }],
  ability_zeninage: [{ id: 'zeninage', name: 'ぜになげ', actionKind: 'fixed-damage', fixedDamage: 900, ctbCost: 1.3, target: 'single-enemy' }],
  ability_iainuki: [{ id: 'iainuki', name: 'いあいぬき', actionKind: 'physical-attack', power: 1.6, ctbCost: 1.4, target: 'single-enemy' }],
  ability_dance: [{ id: 'dance', name: 'おどる', actionKind: 'physical-attack', power: 1.7, ctbCost: 1.1, target: 'single-enemy' }],
  ability_mix: [{ id: 'mix', name: 'ちょうごう', actionKind: 'heal', healAmount: 1000, ctbCost: 1.2, target: 'single-ally' }],
  ability_drink: [{ id: 'drink', name: 'のむ', actionKind: 'focus', ctbCost: 0.8, target: 'self' }],
});

const abilityMagicSet = Object.freeze({
  ability_white_magic: '白魔法', ability_black_magic: '黒魔法', ability_summon: '召喚魔法',
  ability_time_magic: '時空魔法', ability_red_magic: '赤魔法', ability_blue_magic: '青魔法',
});

export function getAbilityActions(abilityId) {
  if (abilityMagicSet[abilityId]) return magicSets[abilityMagicSet[abilityId]];
  if (abilityId === 'ability_dualcast') {
    return magicSets['赤魔法'].map((spell) => ({ ...spell, id: `dual-${spell.id}`, name: `${spell.name}×2`, power: spell.power ? spell.power * 1.7 : spell.power, healAmount: spell.healAmount ? Math.round(spell.healAmount * 1.7) : spell.healAmount, mpCost: (spell.mpCost ?? 0) * 2 }));
  }
  if (abilityId === 'ability_spellblade') {
    return [
      { id: 'spellblade-fire', name: 'ファイア剣', actionKind: 'imbue', element: 'fire', mpCost: 5, ctbCost: 0.8, target: 'self' },
      { id: 'spellblade-ice', name: 'ブリザド剣', actionKind: 'imbue', element: 'ice', mpCost: 5, ctbCost: 0.8, target: 'self' },
      { id: 'spellblade-thunder', name: 'サンダー剣', actionKind: 'imbue', element: 'thunder', mpCost: 5, ctbCost: 0.8, target: 'self' },
    ];
  }
  if (abilityId === 'ability_call') return magicSets['召喚魔法'].map((spell) => ({ ...spell, id: `call-${spell.id}`, mpCost: 0 }));
  if (abilityId === 'ability_sing') {
    return [
      { id: 'mighty-march', name: 'たいりょくのうた', actionKind: 'heal', healAmount: 500, ctbCost: 1.0, target: 'single-ally' },
      { id: 'sinewy-etude', name: 'ちからのうた', actionKind: 'focus', ctbCost: 0.9, target: 'self' },
      { id: 'requiem', name: 'レクイエム', actionKind: 'magic-attack', power: 2.2, element: 'holy', ctbCost: 1.1, target: 'single-enemy' },
    ];
  }
  return directAbilityActions[abilityId] ?? [];
}

export function isAbilityImplemented(abilityId) {
  return getAbilityActions(abilityId).length > 0;
}

export const abilityMenu = {
  id: 'ability_review',
  note: 'アビリティ枠はプロトタイプでは「まほう」に統合されています。',
};
