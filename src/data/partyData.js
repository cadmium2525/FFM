/**
 * Base stats for the four playable characters.
 * These are cloned into live Unit instances at battle start; HP/MP carry
 * over between bosses (persisted on GameState.partyRuntime) but reset to
 * full at the very start of a new run.
 */
export const partyData = [
  {
    id: 'p1',
    name: 'ポルツ',
    level: 50,
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
    spriteUrl: 'assets/images/characters/portz.webp',
    equipment: {
      weapon: 'equipment_weapon_broadsword',
      shield: 'equipment_shield_leather_shield',
      head: 'equipment_head_leather_cap',
      body: 'equipment_body_leather_armor',
      accessory: 'equipment_accessory_leather_shoes',
    },
    abilityId: 'ability_guard',
    crystalShardId: 'shard_ember',
  },
  {
    id: 'p2',
    name: 'タバサ',
    level: 50,
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
    spriteUrl: 'assets/images/characters/tabasa.webp',
    equipment: {
      weapon: 'equipment_weapon_staff',
      shield: null,
      head: 'equipment_head_plumed_hat',
      body: 'equipment_body_cotton_robe',
      accessory: 'equipment_accessory_silver_specs',
    },
    abilityId: 'ability_white_magic',
    crystalShardId: 'shard_azure',
  },
  {
    id: 'p3',
    name: 'ブラス',
    level: 50,
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
    spriteUrl: 'assets/images/characters/brass.webp',
    equipment: {
      weapon: 'equipment_weapon_battle_axe',
      shield: 'equipment_shield_bronze_shield',
      head: 'equipment_head_bronze_helm',
      body: 'equipment_body_bronze_armor',
      accessory: 'equipment_accessory_power_armlet',
    },
    abilityId: 'ability_focus',
    crystalShardId: 'shard_verdant',
  },
  {
    id: 'p4',
    name: 'ピーシィ',
    level: 50,
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
    spriteUrl: 'assets/images/characters/piecy.webp',
    equipment: {
      weapon: 'equipment_weapon_dagger',
      shield: null,
      head: 'equipment_head_green_beret',
      body: 'equipment_body_silver_plate',
      accessory: 'equipment_accessory_elven_mantle',
    },
    abilityId: 'ability_black_magic',
    crystalShardId: 'shard_storm',
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
