/**
 * Base stats for the four playable characters.
 * These are cloned into live Unit instances at battle start; HP/MP carry
 * over between bosses (persisted on GameState.partyRuntime) but reset to
 * full at the very start of a new run.
 */
export const partyData = [
  {
    id: 'p1',
    name: 'バッツ',
    role: '前衛',
    maxHp: 1200,
    maxMp: 300,
    atk: 45,
    def: 30,
    magic: 15,
    agility: 28,
    weakness: null,
    equippedAbilitySet: 'たたかう型',
    weapon: 'ブロードソード',
  },
  {
    id: 'p2',
    name: 'レナ',
    role: '後衛',
    maxHp: 950,
    maxMp: 450,
    atk: 25,
    def: 20,
    magic: 38,
    agility: 32,
    weakness: null,
    equippedAbilitySet: '白魔法',
    weapon: 'ロッド',
  },
  {
    id: 'p3',
    name: 'ガラフ',
    role: '前衛',
    maxHp: 1400,
    maxMp: 200,
    atk: 50,
    def: 35,
    magic: 20,
    agility: 22,
    weakness: null,
    equippedAbilitySet: 'たたかう型',
    weapon: 'オノ',
  },
  {
    id: 'p4',
    name: 'ファリス',
    role: '後衛',
    maxHp: 1000,
    maxMp: 350,
    atk: 40,
    def: 25,
    magic: 30,
    agility: 30,
    weakness: null,
    equippedAbilitySet: '黒魔法',
    weapon: 'レイピア',
  },
];

// Weapon options selectable in the intermission screen. A weapon can carry
// an elemental affinity that adds bonus damage against a boss's weakness.
export const weaponOptions = [
  { id: 'w_neutral', name: '無属性の剣', element: null, atkBonus: 0 },
  { id: 'w_fire', name: 'フレイムソード', element: 'fire', atkBonus: 5 },
  { id: 'w_ice', name: 'アイスブランド', element: 'ice', atkBonus: 5 },
  { id: 'w_water', name: 'ウォーターソード', element: 'water', atkBonus: 5 },
  { id: 'w_thunder', name: 'サンダーソード', element: 'thunder', atkBonus: 5 },
];

// Ability-set options selectable in intermission (which magic list a unit gets in battle).
export const abilitySetOptions = ['たたかう型', '白魔法', '黒魔法', '召喚魔法'];
