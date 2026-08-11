import { ff5Equipment } from '../database/ff5Database.js';

export const elementLabels = Object.freeze({
  fire: '炎', ice: '冷気', lightning: '雷', thunder: '雷', water: '水',
  wind: '風', earth: '地', holy: '聖', poison: '毒',
});

export const specialEffectDescriptions = Object.freeze({
  absorb_fire: '炎属性を吸収',
  absorb_fire_null_ice_weak_water: '炎吸収・冷気無効・水弱点',
  absorb_ice: '冷気属性を吸収',
  absorb_water_null_fire_weak_lightning: '水吸収・炎無効・雷弱点',
  aevis_killer: 'エイビス系へ特効',
  agi_plus_1: '素早さ+1', agi_plus_2: '素早さ+2',
  always_1_damage: '与えるダメージが1になる',
  auto_doom: '戦闘開始時に死の宣告',
  auto_haste_and_status_immunity: '常時ヘイスト・複数の状態異常を防ぐ',
  auto_image: '戦闘開始時に分身', auto_reflect: '常時リフレク',
  auto_regen_vit_plus_5: '常時リジェネ・体力+5',
  back_row_full_damage: '後列からでも威力が下がらない',
  barehanded_boost_str_plus_5: '格闘強化・力+5',
  berserk_on_hit: '攻撃時にバーサクを付与', blind: '攻撃時に暗闇を付与',
  blind_immunity: '暗闇を防ぐ', boost_and_break_cast: '対応属性を強化・使用すると魔法発動',
  boost_earth: '地属性を強化', boost_fire_ice_lightning: '炎・冷気・雷属性を強化',
  boost_holy_and_raise: '聖属性とレイズ系を強化', boost_wind: '風属性を強化',
  break_cast_holy: '使用すると聖属性魔法を発動', cast_dispel: '攻撃時にディスペルを発動',
  catch_boost: 'とらえる成功率上昇', confuse: '攻撃時に混乱を付与',
  confuse_immunity_and_dance_boost: '混乱を防ぎ、おどるを強化',
  confuse_mini_immunity: '混乱・小人を防ぐ', confuse_toad_immunity: '混乱・カエルを防ぐ',
  control_boost: 'あやつる成功率上昇', critical: 'クリティカルが発生する',
  dance_proc: '攻撃時に踊りが発動することがある', double_hit: '2回攻撃',
  dragon_and_undead_killer: '竜・アンデッド系へ特効', dragon_killer: '竜系へ特効',
  earthquake_proc: '攻撃時に地震が発動することがある', evasion_and_protect: '回避率上昇・プロテス発動',
  firaga_proc: '攻撃時にファイガが発動することがある', first_strike_and_haste: '先制行動・ヘイスト',
  giant_killer: '巨人系へ特効', half_mp_cost: '消費MP半減', heal_on_hit: '攻撃対象のHPを回復',
  high_critical: '高確率でクリティカル', hp_drain: '与えたダメージの一部を吸収',
  human_killer: '人間系へ特効', instant_death: '攻撃時に即死を付与することがある',
  mag_plus_1: '魔力+1', mag_plus_2: '魔力+2', mag_plus_3: '魔力+3', mag_plus_5: '魔力+5',
  magic_beast_killer: '魔獣系へ特効', magic_plus: '魔力+3',
  mini_immunity_stat_changes: '小人を防ぐ・能力値変化', most_status_immunity_and_all_stats_plus_5: '多くの状態異常を防ぎ、全能力+5',
  mp_critical: 'MPを消費してクリティカルが発生することがある', mp_drain: '攻撃時にMP吸収',
  multi_element_boost: '炎・冷気・雷・地・風属性を強化', old: '攻撃時に老化を付与',
  paralyze: '攻撃時に麻痺を付与', paralyze_mini_immunity: '麻痺・小人を防ぐ',
  paralyze_toad_immunity: '麻痺・カエルを防ぐ', petrify_immunity_and_magic_block: '石化を防ぎ、魔法を回避することがある',
  physical_evasion: '物理回避率上昇', poison: '攻撃時に毒を付与',
  poison_null_and_vit_plus_5: '毒属性無効・体力+5', power_changes_with_escapes: '逃走回数に応じて攻撃力が変化',
  rapid_fire_proc: '攻撃時にみだれうちが発動することがある', resist_lightning: '雷属性を半減',
  sap_sleep_immunity_mag_minus_5: 'スリップ・睡眠を防ぎ、魔力-5', silence: '攻撃時に沈黙を付与',
  silence_immunity: '沈黙を防ぐ', sleep: '攻撃時に睡眠を付与',
  spell_cycle_and_return: '魔法を順番に発動し、最後に初期状態へ戻す',
  steal_boost_agi_plus_1: 'ぬすむ成功率上昇・素早さ+1', steal_proc: '攻撃時にぬすむが発動することがある',
  str_agi_plus_1: '力+1・素早さ+1', str_plus_1: '力+1', str_plus_3: '力+3',
  throw_only: 'なげる専用', throwable: 'なげるで使用可能', thunder_proc: '攻撃時にサンダーが発動することがある',
  two_handed: '両手武器', undead_properties: '装備者がアンデッドの性質を持つ',
  vit_mag_plus_3: '体力+3・魔力+3', wind_slash: '攻撃時にかまいたちが発動することがある',
  zombie_old_immunity: 'ゾンビ・老化を防ぐ',
});

function normalizeElement(element) {
  return element === 'lightning' ? 'thunder' : element;
}

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

export function findEquipment(id) {
  return id ? ff5Equipment.find((item) => item.id === id) ?? null : null;
}

export function equipmentEffectText(item) {
  if (!item) return 'なし';
  return item.special ? specialEffectDescriptions[item.special] ?? item.special : '追加効果なし';
}

export function equipmentDetailText(item) {
  if (!item) return '装備なし';
  const parts = [];
  if (item.slot === 'weapon') {
    parts.push(`攻撃力 ${item.attack}`, `命中 ${item.accuracy ?? '-'}%`);
    if (item.element) parts.push(`${elementLabels[item.element] ?? item.element}属性`);
  } else {
    parts.push(`防御 ${item.defense}`, `魔防 ${item.magicDefense}`, `回避 ${item.evasion}%`);
  }
  parts.push(`追加効果: ${equipmentEffectText(item)}`);
  return parts.join(' / ');
}

export function calculateEquipmentBonuses(equipment = {}) {
  const items = Object.values(equipment).map(findEquipment).filter(Boolean);
  const weapon = findEquipment(equipment.weapon);
  const result = {
    attack: weapon?.attack ?? 0,
    defense: items.reduce((sum, item) => sum + (item.defense ?? 0), 0),
    magicDefense: items.reduce((sum, item) => sum + (item.magicDefense ?? 0), 0),
    evasion: items.reduce((sum, item) => sum + (item.evasion ?? 0), 0),
    magic: 0,
    agility: 0,
    weaponElement: normalizeElement(weapon?.element ?? null),
    weaponAccuracy: weapon?.accuracy ?? 100,
    weaponSpecial: weapon?.special ?? null,
    resistances: [], nullElements: [], absorbs: [], weaknesses: [], magicBoostElements: [],
    mpCostMultiplier: 1,
    physicalDamageMultiplier: 1,
    initialImageHits: 0,
  };

  items.forEach((item) => {
    const special = item.special ?? '';
    const statBonus = (pattern) => Number(special.match(pattern)?.[1] ?? 0);
    result.attack += statBonus(/^str_plus_(\d+)/) + statBonus(/^str_agi_plus_(\d+)/);
    result.magic += statBonus(/^mag_plus_(\d+)/) + statBonus(/^vit_mag_plus_(\d+)/);
    result.agility += statBonus(/^agi_plus_(\d+)/) + statBonus(/^str_agi_plus_(\d+)/);
    if (special === 'magic_plus') result.magic += 3;
    if (special === 'most_status_immunity_and_all_stats_plus_5') {
      result.attack += 5; result.defense += 5; result.magic += 5; result.agility += 5;
    }
    if (special === 'barehanded_boost_str_plus_5') result.attack += 5;
    if (special === 'steal_boost_agi_plus_1') result.agility += 1;
    if (special === 'sap_sleep_immunity_mag_minus_5') result.magic -= 5;
    if (special === 'physical_evasion') result.evasion += 25;
    if (special === 'evasion_and_protect') { result.evasion += 10; result.physicalDamageMultiplier *= 0.75; }
    if (special === 'auto_haste_and_status_immunity' || special === 'first_strike_and_haste') result.agility += 10;
    if (special === 'auto_image') result.initialImageHits = Math.max(result.initialImageHits, 1);
    if (special === 'half_mp_cost') result.mpCostMultiplier = 0.5;

    if (special === 'resist_lightning') addUnique(result.resistances, 'thunder');
    if (special.includes('absorb_fire')) addUnique(result.absorbs, 'fire');
    if (special.includes('absorb_ice')) addUnique(result.absorbs, 'ice');
    if (special.includes('absorb_water')) addUnique(result.absorbs, 'water');
    if (special.includes('null_ice')) addUnique(result.nullElements, 'ice');
    if (special.includes('null_fire')) addUnique(result.nullElements, 'fire');
    if (special.includes('poison_null')) addUnique(result.nullElements, 'poison');
    if (special.includes('weak_water')) addUnique(result.weaknesses, 'water');
    if (special.includes('weak_lightning')) addUnique(result.weaknesses, 'thunder');
    if (special === 'boost_earth') addUnique(result.magicBoostElements, 'earth');
    if (special === 'boost_wind') addUnique(result.magicBoostElements, 'wind');
    if (special.includes('boost_fire_ice_lightning') || special === 'multi_element_boost') {
      ['fire', 'ice', 'thunder'].forEach((element) => addUnique(result.magicBoostElements, element));
    }
    if (special === 'multi_element_boost') ['earth', 'wind'].forEach((element) => addUnique(result.magicBoostElements, element));
    if (special === 'boost_holy_and_raise') addUnique(result.magicBoostElements, 'holy');
    if (special === 'boost_and_break_cast' && item.element) addUnique(result.magicBoostElements, normalizeElement(item.element));
  });

  result.evasion = Math.min(80, result.evasion);
  return result;
}
