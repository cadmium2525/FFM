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

// Magic lists keyed by the ability-set a character has equipped.
export const magicSets = {
  '白魔法': [
    { id: 'cure', name: 'ケアル', ctbCost: 1.0, mpCost: 20, healAmount: 500, element: null, target: 'single-ally' },
    { id: 'cura', name: 'ケアルラ', ctbCost: 1.4, mpCost: 45, healAmount: 1100, element: null, target: 'single-ally' },
    { id: 'esuna', name: 'エスナ', ctbCost: 0.9, mpCost: 15, healAmount: 0, element: null, target: 'single-ally' },
  ],
  '黒魔法': [
    { id: 'fire', name: 'ファイア', ctbCost: 1.1, mpCost: 15, power: 2.0, element: 'fire', target: 'single-enemy' },
    { id: 'blizzard', name: 'ブリザド', ctbCost: 1.1, mpCost: 15, power: 2.0, element: 'ice', target: 'single-enemy' },
    { id: 'thunder', name: 'サンダー', ctbCost: 1.1, mpCost: 15, power: 2.0, element: 'thunder', target: 'single-enemy' },
    { id: 'water', name: 'ウォータ', ctbCost: 1.1, mpCost: 15, power: 2.0, element: 'water', target: 'single-enemy' },
    { id: 'firaga', name: 'ファイガ', ctbCost: 1.8, mpCost: 40, power: 3.6, element: 'fire', target: 'single-enemy' },
  ],
  '召喚魔法': [
    { id: 'shiva', name: 'シヴァ', ctbCost: 1.6, mpCost: 35, power: 2.6, element: 'ice', target: 'single-enemy' },
    { id: 'ifrit', name: 'イフリート', ctbCost: 1.6, mpCost: 35, power: 2.6, element: 'fire', target: 'single-enemy' },
    { id: 'leviathan', name: 'リヴァイアサン', ctbCost: 1.9, mpCost: 50, power: 3.2, element: 'water', target: 'single-enemy' },
  ],
  'たたかう型': [
    // Melee-focused characters get a light support spell instead of a full list.
    { id: 'cure', name: 'ケアル', ctbCost: 1.0, mpCost: 20, healAmount: 400, element: null, target: 'single-ally' },
  ],
};

export const abilityMenu = {
  id: 'ability_review',
  note: 'アビリティ枠はプロトタイプでは「まほう」に統合されています。',
};
