// Vocabulary lists mirrored from FFM.xlsx's ボススタジオ sheet, so the admin
// form's rows/columns match the spreadsheet the designer already works from.

export const ELEMENTS = [
  ['fire', '炎'], ['ice', '冷気'], ['thunder', '雷'], ['wind', '風'],
  ['water', '水'], ['earth', '大地'], ['poison', '毒'], ['holy', '聖'],
];

// Maps an element-table cell's Japanese value to where it lives in the
// existing battle engine's `equipmentEffects` arrays (see
// ActionResolver.js's equipmentElementState). '-' means "not listed" (omit
// from every array = normal damage).
export const ELEMENT_STATES = ['-', '弱点', '耐性', '吸収', '無効'];
export const ELEMENT_STATE_TO_ARRAY = {
  '弱点': 'weaknesses', '耐性': 'resistances', '吸収': 'absorbs', '無効': 'nullElements',
};
export const ARRAY_TO_ELEMENT_STATE = Object.fromEntries(
  Object.entries(ELEMENT_STATE_TO_ARRAY).map(([label, key]) => [key, label]),
);

export const CATEGORIES = [
  ['whiteMagic', '白魔法'], ['blackMagic', '黒魔法'], ['timeMagic', '時空魔法'], ['summonMagic', '召喚魔法'],
  ['enemySkill', '敵の技'], ['sound', '音波'], ['melee', '近接'], ['ranged', '遠隔'],
];
export const CATEGORY_STATES = ['-', '弱点'];

export const STATUS_ROWS = [
  ['blind', '暗闇'], ['zombie', 'ゾンビ'], ['poison', '猛毒'], ['mini', 'こびと'],
  ['toad', 'カエル'], ['petrify', '石化'], ['ko', '即死'], ['silence', '沈黙'],
  ['berserk', 'バーサク'], ['confuse', '混乱'], ['paralyze', 'マヒ'], ['sleep', '眠り'],
  ['old', '老化'], ['slow', 'スロウ'], ['stop', 'ストップ'], ['boss', 'ボス'],
];
export const STATUS_STATES = ['耐性', '有効'];

export const TECHNIQUE_KINDS = [
  ['physical-attack', '物理攻撃'],
  ['magic-attack', '魔法攻撃'],
  ['status', '状態異常付与'],
  ['status-choice', '状態異常(いずれか1つ)'],
  ['scripted', 'スクリプト(操作を直接記述)'],
  ['remove-from-battle', 'バトルから強制除外'],
];

export const TARGETS = [
  ['one_enemy', '単体'],
  ['all_enemies', '全体'],
  ['self', '自分自身'],
];

export const YES_NO = [['false', '不可'], ['true', '可']];

export function elementLabel(id) {
  return ELEMENTS.find((e) => e[0] === id)?.[1] ?? id ?? '-';
}
