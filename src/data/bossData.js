/**
 * Bosses fought in sequence. `size` only affects the placeholder sprite scale.
 * `ai` is a simple behaviour tag consumed by BattleManager's enemy AI step.
 */
export const bossData = [
  {
    id: 'omega',
    name: 'オメガ',
    spriteUrl: 'assets/images/bosses/omega.webp',
    // ---- FF5原作「オメガ」の完全再現 ----
    // 出典: src/database/ff5BossTechniques.js の 'bossref_omega_boss'
    // （ステータス・属性耐性・状態異常耐性は FF5ピクセルリマスター版の
    //   ボス個別攻略ページに準拠。LV119 / MP60700 / ATK115 / DEF190 /
    //   回避95 / 魔力199 / 魔法防御150）。
    maxHp: 55530,
    maxMp: 60700,
    atk: 115,
    def: 190,
    magic: 199,
    magicDef: 150,
    evasion: 95,
    // 原作は素早さステータス非公開だが、「オメガの攻撃頻度はとても高く、
    // あっという間に戦闘不能にされる恐れがある」（神ゲー攻略等の攻略情報）
    // という原作の評判を再現するため、CTBエンジン上の暫定値として、
    // パーティ平均（素早さ22〜32）のおよそ2倍前後の頻度で行動できるよう
    // 高めに設定している。
    agility: 76,
    weakness: 'thunder', // 雷のみ弱点。それ以外の属性はすべて吸収する
    resist: null,
    equipmentEffects: {
      // 雷以外の全属性を吸収（原作の属性耐性表: 炎/冷気/毒/聖/大地/風/水 = 吸）
      absorbs: ['fire', 'ice', 'poison', 'holy', 'earth', 'wind', 'water'],
      // 音波（うたう／おどるコマンド）カテゴリも弱点。あいのうた（ストップ）
      // ゆうわくのうた（こんらん）等は必中となる（原作の音波弱点を再現）。
      weaknesses: ['sound'],
    },
    // 原作の状態異常耐性表: 毒/暗闇/沈黙/老化/こびと/カエル/石化/即死/
    // バーサク/混乱/睡眠/マヒ = すべて無効。スロウ・ストップのみ有効。
    statusImmunities: [
      'poison', 'blind', 'silence', 'old', 'mini', 'toad', 'petrify', 'ko', 'doom',
      'berserk', 'confuse', 'sleep', 'paralyze',
    ],
    // 原作の反撃仕様: ダメージを受けると必ず2つの反撃技で報復してくる
    // （サークル/マスタードボム/ロケットパンチから選択）。
    // BossActionProfiles.js の counterPool と BattleManager.resolveCounterAttacks で再現。
    counterOnHit: { chance: 1, times: 2 },
    size: 1.4,
    ai: 'random',
  },
  {
    id: 'boss2',
    name: 'ガルーダ',
    maxHp: 4200,
    atk: 65,
    def: 20,
    magic: 15,
    agility: 34,
    weakness: 'ice',
    resist: 'wind',
    size: 1.1,
    ai: 'random', // attacks a random alive party member
  },
  {
    id: 'boss3',
    name: '邪竜バハムート',
    maxHp: 6000,
    atk: 80,
    def: 30,
    magic: 40,
    agility: 26,
    weakness: 'thunder',
    resist: null,
    size: 1.3,
    ai: 'lowestHp', // targets whoever has the lowest current HP
  },
];

export const elementNames = {
  fire: 'ほのお',
  ice: 'こおり',
  water: 'みず',
  thunder: 'いかずち',
  wind: 'かぜ',
  earth: 'つち',
  holy: 'せいれい',
  poison: 'どく',
};
