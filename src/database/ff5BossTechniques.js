/**
 * FF5 boss technique reference catalog.
 *
 * Purpose: collect the named attacks/techniques used by Final Fantasy V's
 * story and optional bosses so they are ready to wire into
 * `BossActionProfiles.js`-style kits when a boss encounter is implemented.
 * This file is a REFERENCE catalog, not yet connected to battle (see
 * `implemented:false` / `runtimeReady:false` below) and is intentionally
 * kept separate from `ff5Database.js` / `battleCatalog.js` so it does not
 * affect `scripts/validate-database.mjs`'s record-count assertions.
 *
 * Source & provenance
 * --------------------
 * Compiled from publicly documented boss movesets (numeric attack ranges,
 * elemental weaknesses, named techniques) cross-referenced across English
 * strategy-guide material for the SNES/GBA/Pixel Remaster releases. Move
 * names below are normalized to the most common English romanization,
 * because the original guide material is largely SNES-era fan translation.
 * `nameJa` is only filled in where the Japanese spell/technique name is
 * independently well established (e.g. series-standard spells like Fire3,
 * Holy, Meteor); everywhere else it is left `null`. `nameConfidence` on each
 * boss record flags how solid the naming is:
 *   - 'high'   : matches the standard/official localized boss name.
 *   - 'medium' : very likely correct, some localizations vary the spelling.
 *   - 'low'    : SNES-era fan romanization; reconcile with the Pixel
 *                Remaster script before shipping in an official-feeling UI.
 *
 * Numbers (HP, damage ranges) are the original SNES-release baseline and
 * are for relative tuning reference only -- FFM's own boss HP/ATK/etc.
 * (see `src/data/bossData.js` / `BossActionProfiles.js`) are original
 * values and are not meant to match 1:1.
 *
 * Record policy matches `ff5Database.js`: stable snake_case IDs, effects
 * are short original summaries (not copied guide text), and everything
 * defaults to not-yet-wired so design and implementation stay decoupled.
 */

const SOURCE_NOTE = 'Compiled from public FFV boss-encounter reference material (SNES/GBA baseline); not copied guide prose.';

const bossTechSlug = (value) => value
  .toLowerCase()
  .replaceAll('&', ' and ')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

/** Shorthand for one technique row. */
const T = (nameEn, nameJa, element, target, power, statuses, note) => ({
  nameEn,
  nameJa: nameJa ?? null,
  element: element ?? null,
  target, // reuses the same vocabulary as battleCatalog.js targetDescriptors, from the ACTOR's point of view (side:'enemy' = the party)
  power, // 'low' | 'medium' | 'high' | 'extreme' -- relative to that boss's own encounter, not cross-boss comparable
  statuses: statuses ?? [],
  note,
  implemented: false,
});

const bossRows = [
  // [id, nameEn, nameJa, location, world, hp, weaknessElement, statusWeakness, nameConfidence, techniques[]]

  ['wing_raptor', 'Wing Raptor', 'ウィングラプター', 'Wind Shrine', 1, 250, null, null, 'high', [
    T('Peck', null, null, 'one_enemy', 'low', [], '翼を広げている間の通常攻撃。'),
    T('Wing Blow', null, 'wind', 'all_enemies', 'medium', [], '翼を広げている間、全体に風属性ダメージ。'),
    T('Counter', null, null, 'one_enemy', 'medium', [], '翼を閉じている間に攻撃を受けると反撃で強打を返す。'),
  ]],

  ['karlabos', 'Karlabos', 'カーラボス', 'Torna Canal', 1, 650, 'lightning', null, 'high', [
    T('Claw', null, null, 'one_enemy', 'medium', [], '通常のはさみ攻撃。'),
    T('Hydro Pump', 'ハイドロポンプ', 'water', 'one_enemy', 'medium', ['paralyze'], '水流を放ち麻痺を狙う単体攻撃。'),
    T('Tail Screw', null, null, 'one_enemy', 'high', [], '対象のHPを大きく削る一撃必殺級の尾撃。'),
  ]],

  ['siren', 'Siren', 'サイレン', 'Ship Graveyard', 1, 900, 'holy', null, 'high', [
    T('Claw', null, null, 'one_enemy', 'medium', [], '通常形態での通常攻撃。'),
    T('Poison Claw', null, 'poison', 'one_enemy', 'high', ['poison'], '毒属性の強力な単体攻撃。'),
    T('Blizzard', null, 'ice', 'one_enemy', 'low', [], 'アンデッド形態限定の氷属性魔法。'),
    T('Libra', 'ライブラ', null, 'one_enemy', 'low', [], '対象の情報を調べる。'),
    T('Haste', 'ヘイスト', null, 'self', 'low', ['haste'], '自身の行動速度を上げる。'),
    T('Slow', 'スロウ', null, 'one_enemy', 'low', ['slow'], '対象の行動速度を下げる。'),
    T('Silence', 'サイレス', null, 'one_enemy', 'low', ['silence'], '対象を沈黙させる。'),
    T('Sleep', 'スリプル', null, 'one_enemy', 'low', ['sleep'], '対象を眠らせる。'),
    T('Cure', 'ケアル', null, 'self', 'low', [], 'アンデッド形態時に自身のHPを回復。'),
  ]],

  ['magissa_forza', 'Magissa & Forza', 'マギサ&フォルツァ', 'North Mountain', 1, 650, null, null, 'medium', [
    T('Claw', null, null, 'one_enemy', 'medium', [], 'マギサの通常攻撃。'),
    T('Drain', 'ドレイン', null, 'one_enemy', 'high', [], 'HPを吸収する強力な単体攻撃。'),
    T('Thunder', null, 'lightning', 'one_enemy', 'medium', [], '雷属性の単体魔法。'),
    T('Blizzard', null, 'ice', 'one_enemy', 'medium', [], '氷属性の単体魔法。'),
    T('Regen', 'リジェネ', null, 'self', 'low', ['regen'], '自身または味方に継続回復を付与。'),
    T('Call Forza', null, null, 'self', 'low', [], 'HPが低下すると恋人フォルツァを戦闘に呼ぶ。'),
    T('Claw (Forza)', null, null, 'one_enemy', 'medium', [], 'フォルツァの通常攻撃。'),
  ]],

  ['garula', 'Garula', 'ガルーラ', 'Walz Castle', 1, 1200, null, null, 'high', [
    T('Trample', null, null, 'one_enemy', 'high', [], '1ターンに2〜3回連続で行える強力な通常攻撃。'),
    T('Charge', null, null, 'one_enemy', 'medium', [], '突進して継続ダメージを与える。'),
  ]],

  ['shiva_boss', 'Shiva (with Ice Commanders)', 'シヴァ', 'Walz Castle', 1, null, 'fire', null, 'high', [
    T('Ice Blast', null, 'ice', 'all_enemies', 'medium', [], '氷属性の全体攻撃。氷属性を吸収する。'),
    T('Attack (Ice Commander)', null, null, 'one_enemy', 'high', [], '護衛アイスコマンダー(3体)の通常攻撃。'),
  ]],

  ['liquid_flame', 'Liquid Flame', 'リキッドフレイム', 'Fire-Powered Ship', 1, 3000, 'ice', null, 'high', [
    T('Flame', null, 'fire', 'all_enemies', 'high', [], '人型形態で全体に炎属性ダメージ。'),
    T('Fira (self)', null, 'fire', 'self', 'low', [], '竜巻形態で自身のHPを回復。'),
    T('Magnetize', null, null, 'all_enemies', 'low', [], '竜巻形態でパーティを前列に引き寄せる。'),
    T('Claw', null, null, 'one_enemy', 'medium', [], '腕形態での通常攻撃。'),
    T('Fira (self, hand)', null, 'fire', 'self', 'low', [], '腕形態でも自己回復を行い、氷属性を無効化する。'),
  ]],

  ['ironclaw', 'IronClaw', 'アイアンクロウ', 'Karnak Castle', 1, 3000, null, null, 'medium', [
    T('Attack (disguise)', null, null, 'one_enemy', 'medium', [], '衛兵に変装した状態での通常攻撃。'),
    T('Attack', null, null, 'one_enemy', 'medium', [], '正体を現した後の通常攻撃。'),
    T('Death Claw', 'デスクロー', null, 'one_enemy', 'high', ['paralyze'], '瀕死状態と麻痺を狙う爪撃。'),
  ]],

  ['ifrit_boss', 'Ifrit', 'イフリート', 'Library of the Ancients', 1, 3000, 'ice', null, 'high', [
    T('Claw', null, null, 'one_enemy', 'medium', ['paralyze'], '麻痺を狙う通常攻撃。炎属性を吸収する。'),
    T('Flame', null, 'fire', 'all_enemies', 'high', [], '全体への炎属性攻撃。'),
    T('Fira', null, 'fire', 'one_enemy', 'high', [], '単体への強力な炎属性魔法。'),
  ]],

  ['byblos', 'Byblos', 'ビブロス', 'Library of the Ancients', 1, 3600, 'fire', null, 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Gale Cut', null, 'wind', 'all_enemies', 'high', [], '風の刃で全体を攻撃。'),
    T('Magic Hammer', 'マジックハンマー', null, 'one_enemy', 'low', [], '対象のMPを半減させる。'),
    T('Sonic Wave', null, null, 'one_enemy', 'low', [], '対象のレベルを半減させる。'),
    T('Drain', 'ドレイン', null, 'one_enemy', 'high', [], 'HPを吸収する単体攻撃。'),
    T('Charm', null, null, 'one_enemy', 'low', ['confuse'], '対象を魅了し混乱させる。'),
    T('Toad', 'トード', null, 'one_enemy', 'low', ['toad'], '対象をカエルに変える。'),
    T('Thread', null, null, 'one_enemy', 'low', ['slow'], '対象の行動速度を下げる。'),
    T('Safe', 'セイフ', null, 'self', 'low', ['protect'], '自身の物理防御を上げる。'),
  ]],

  ['ramuh_boss', 'Ramuh', 'ラムウ', 'Forest near Regole', 1, 4000, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '通常攻撃。雷属性を吸収する。'),
    T('Judgment Bolt', null, 'lightning', 'one_enemy', 'medium', [], '雷属性の単体攻撃。'),
    T('Thundara', null, 'lightning', 'one_enemy', 'high', [], '強力な雷属性の単体魔法。'),
    T('Osmose', 'アスピル', null, 'one_enemy', 'low', [], '対象のMPを吸収する。'),
    T('Flash', null, null, 'all_enemies', 'low', ['blind'], '全体を暗闇状態にする。'),
  ]],

  ['sandworm', 'Sandworm', 'サンドウォーム', 'Rats Tail Desert', 1, 3000, 'water', null, 'high', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '地上に出た状態での通常攻撃。'),
    T('Quicksand', null, 'earth', 'all_enemies', 'medium', [], '全体に継続ダメージを与える砂の攻撃。'),
    T('Demi', 'デミ', null, 'one_enemy', 'high', [], '対象の現在HPを大きく削る。1ターンに複数回使用することがある。'),
  ]],

  ['craliclaw', 'Craliclaw', 'クレイクロウ', 'Airship (aerial ambush)', 1, 2000, 'lightning', null, 'medium', [
    T('Claw', null, null, 'one_enemy', 'high', [], '通常のはさみ攻撃。'),
    T('Tail Screw', null, null, 'one_enemy', 'high', [], '対象のHPを大きく削る尾撃。'),
    T('Mucus', null, null, 'one_enemy', 'medium', ['slow'], '継続ダメージと速度低下を与える粘液攻撃。'),
  ]],

  ['adamantoise_boss', 'Adamantoise', 'アダマンタイマイ', null, 1, 2000, 'ice', null, 'medium', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '通常攻撃。'),
    T('Charge', null, null, 'all_enemies', 'high', [], '対象1〜2体へ2回連続の突進攻撃。'),
  ]],

  ['soul_cannon', 'Soul Cannon (with Launchers)', 'ソウルキャノン', 'Ronka Ruins', 1, 22500, 'lightning', null, 'medium', [
    T('Surge Beam', null, null, 'all_enemies', 'extreme', [], '本体による全体への継続ダメージビーム。'),
    T('Missile', null, null, 'one_enemy', 'high', ['old'], '発射装置(x2)が使う、対象のHPを半減させ老化させる攻撃。'),
  ]],

  ['archeoaevis', 'Archeoaevis', 'アルケオエイビス', 'Ronka Ruins', 1, 6400, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '通常形態での通常攻撃。'),
    T('Fang', null, null, 'one_enemy', 'medium', [], '継続ダメージを与える噛みつき。'),
    T('Poison Fang', null, 'poison', 'one_enemy', 'medium', ['poison'], '毒を伴う噛みつき。'),
    T('Wing Blow', null, null, 'all_enemies', 'high', [], '全体攻撃。弱点属性は頻繁に変化する。'),
    T('Blaze', null, 'fire', 'all_enemies', 'high', [], '炎属性の全体攻撃、継続ダメージ付き。'),
    T('Paralyze Claw', null, null, 'one_enemy', 'low', ['paralyze'], '再生形態での麻痺攻撃。'),
    T('Charm Attack', null, null, 'one_enemy', 'medium', ['confuse'], '再生形態での混乱攻撃。'),
    T('Flame', null, 'fire', 'all_enemies', 'high', [], '再生形態の全体炎属性攻撃。'),
    T('Maelstrom', null, null, 'all_enemies', 'extreme', [], '再生形態が使う、対象のHPを瀕死にする全体攻撃。'),
  ]],

  ['titan_boss', 'Titan', 'タイタン', 'Karnak Crater', 1, 2500, 'fire', null, 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Earthquake', 'アースシェイカー', 'earth', 'all_enemies', 'extreme', [], '浮遊していない対象全体への大ダメージ地属性攻撃。'),
  ]],

  ['purobolos', 'Purobolos (x6)', 'プロボロス', 'Walz Crater', 1, 1500, null, null, 'medium', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '通常攻撃。'),
    T('Self-Destruct', 'じばく', null, 'one_enemy', 'extreme', [], '自爆による大ダメージの単体攻撃。'),
    T('Arise', 'アレイズ', null, 'one_ally', 'low', [], '倒れた仲間を蘇生させる。'),
    T('Cura', 'ケアルラ', null, 'self', 'medium', [], '自身のHPを回復する。'),
  ]],

  ['kimabrain', 'Kimabrain', 'キマブレイン', 'Gohn Crater', 1, 3300, null, null, 'low', [
    T('Blaze', null, 'fire', 'all_enemies', 'high', [], '全体への継続ダメージ炎属性攻撃。炎・氷属性を無効化する。'),
    T('Aqua Breath', null, 'water', 'all_enemies', 'high', [], '全体への水属性ブレス攻撃。'),
  ]],

  ['abductor', 'Abductor', 'アブダクター', 'Solitary Island / Val Castle', 2, 2500, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Bloodsuck', null, null, 'one_enemy', 'medium', [], 'HPを吸収する攻撃（再戦時）。'),
    T('Hurricane', null, 'wind', 'one_enemy', 'extreme', [], '対象のHPを瀕死にする風属性攻撃。'),
  ]],

  ['gilgamesh', 'Gilgamesh', 'ギルガメッシュ', 'Recurring rival across all 3 worlds', 2, null, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '通常攻撃。'),
    T('Goblin Punch', 'ゴブリンパンチ', null, 'one_enemy', 'high', [], '自分と同レベルの相手に大ダメージを与える一撃。'),
    T('Aera', null, 'wind', 'one_enemy', 'high', [], '風属性の単体魔法（後の戦いで使用）。'),
    T('Jump', 'ジャンプ', null, 'one_enemy', 'extreme', [], '空中に退避してから急降下する強力な一撃。'),
    T('Judgment Bolt', null, 'lightning', 'one_enemy', 'medium', [], '雷属性の単体攻撃。'),
    T('Gale Cut', null, 'wind', 'all_enemies', 'high', [], '風の刃による全体攻撃。'),
    T('Haste', 'ヘイスト', null, 'self', 'low', ['haste'], '自身の行動速度を上げる。'),
    T('Protect', 'プロテス', null, 'self', 'low', ['protect'], '自身の物理防御を上げる。'),
    T('Shell', 'シェル', null, 'self', 'low', ['shell'], '自身の魔法防御を上げる。'),
    T('Sonic Wave', null, null, 'one_enemy', 'low', [], '対象のレベルを半減させる。'),
    T('Flash', null, null, 'all_enemies', 'low', ['blind'], '全体を暗闇にする。'),
    T('Time Slip', null, null, 'one_enemy', 'medium', ['sleep', 'old'], '睡眠と急速な老化を与える。'),
    T('Frog Song', null, null, 'one_enemy', 'low', ['toad'], '対象をカエルに変える。'),
    T('Tiny Song', null, null, 'one_enemy', 'low', ['mini'], '対象を小人化させる。'),
    T('Rocket Punch', null, null, 'one_enemy', 'high', ['confuse'], '対象のHPを半減させ混乱させる。'),
    T('Strange Dance', null, null, 'one_enemy', 'low', ['sleep'], 'ランダムな相手を眠らせる。'),
    T('Missile', null, null, 'one_enemy', 'high', [], '対象のHPを半減させる。'),
    T('Death Claw', 'デスクロー', null, 'one_enemy', 'high', ['paralyze'], '瀕死状態と麻痺を狙う一撃。'),
    T('Escape', null, null, 'self', 'low', [], '劣勢になると戦闘から離脱する（初戦時）。'),
  ]],

  ['enkidu', 'Enkidu', 'エンキドゥ', "Gilgamesh's ally, Zeza's Airship", 2, 4000, null, null, 'high', [
    T('White Wind', 'ホワイトウインド', null, 'all_allies', 'medium', [], '使用者の現在HP相当を味方全体に回復。'),
    T('Windslash', null, 'wind', 'all_enemies', 'high', [], '風属性の全体攻撃。'),
    T('Missile', null, null, 'one_enemy', 'high', [], '対象のHPを半減させる。'),
    T('Bloodsuck', null, null, 'one_enemy', 'medium', [], 'HPを吸収する単体攻撃。'),
    T('Sonic Wave', null, null, 'one_enemy', 'low', [], '対象のレベルを半減させる。'),
    T('Thread', null, null, 'one_enemy', 'low', ['slow'], '対象の行動速度を下げる。'),
  ]],

  ['tyrannosaur', 'Tyrannosaur', 'ティラノサウルス', 'Underground River', 2, 5000, 'fire', null, 'medium', [
    T('Bite', null, null, 'one_enemy', 'high', [], '通常の噛みつき攻撃。'),
    T('Bone', null, null, 'one_enemy', 'medium', ['zombie'], '対象をゾンビ状態にする。'),
  ]],

  ['dragon_grass', 'Dragon Grass', 'ドラゴングラス', 'Valley of the Dragons', 2, 12000, null, null, 'low', [
    T('Curse Pollen', null, null, 'one_enemy', 'medium', ['paralyze'], '麻痺を伴う花粉攻撃。'),
    T('Graying Pollen', null, null, 'one_enemy', 'medium', ['old'], '老化を伴う花粉攻撃。'),
    T('Darkness Pollen', null, null, 'one_enemy', 'medium', ['blind'], '暗闇を伴う花粉攻撃。'),
    T('Poison Pollen', null, 'poison', 'one_enemy', 'medium', ['poison'], '毒を伴う花粉攻撃。'),
    T('Charm Pollen', null, null, 'one_enemy', 'medium', ['confuse'], '魅了・混乱を伴う花粉攻撃。'),
    T('Confuse Pollen', null, null, 'one_enemy', 'medium', ['confuse'], '混乱を伴う花粉攻撃。'),
    T('Zombie Pollen', null, null, 'one_enemy', 'medium', ['zombie'], 'ゾンビ化を伴う花粉攻撃。'),
  ]],

  ['atomos_boss', 'Atomos', 'アトモス', 'Barrier Tower', 2, 19997, null, null, 'high', [
    T('Comet', 'コメット', null, 'one_enemy', 'extreme', [], '開幕を含め繰り返し使う強力な単体無属性ダメージ。'),
    T('Demi', 'デミ', null, 'one_enemy', 'high', [], '対象の現在HPを半減させる。'),
    T('Quarter', 'クォーター', null, 'one_enemy', 'high', [], '対象の現在HPの3/4を奪う。'),
    T('Slowga', 'スロウガ', null, 'all_enemies', 'low', ['slow'], '全体の行動速度を下げる。'),
  ]],

  ['shoat_boss', 'Shoat', 'ショウート', 'Chocobo Forest', 2, 5000, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Devil\'s Eye', null, null, 'one_enemy', 'medium', ['petrify'], '1ターンに2回まで使用できる石化攻撃。'),
    T('Drain', 'ドレイン', null, 'one_enemy', 'extreme', [], 'HPを大きく吸収する単体攻撃。'),
  ]],

  ['tree_segments', 'Tree Segments (4 parts)', null, 'Moore Forest', 2, 7777, null, null, 'low', [
    T('Attack', null, null, 'one_enemy', 'high', [], '各部位共通の通常攻撃。'),
    T('Firaga (Top)', null, 'fire', 'all_enemies', 'extreme', [], '上部が使う全体炎属性攻撃。炎属性を吸収する。'),
    T('Earthquake (Bottom)', null, 'earth', 'all_enemies', 'extreme', [], '下部が使う全体地属性攻撃。地属性を吸収する。'),
    T('Aeroga (Left)', null, 'wind', 'all_enemies', 'extreme', [], '左部位が使う全体風属性攻撃。風属性を吸収する。'),
    T('Aqua Rake (Right)', null, 'water', 'all_enemies', 'extreme', [], '右部位が使う全体水属性攻撃。'),
  ]],

  ['carbuncle_boss', 'Carbuncle', 'カーバンクル', "Exdeath's Castle", 2, 15000, null, 'petrify', 'high', [
    T('Thundara', null, 'lightning', 'one_enemy', 'high', [], '常時リフレク状態で使用する雷属性魔法。'),
    T('Blizzara', null, 'ice', 'one_enemy', 'high', [], '氷属性魔法。'),
    T('Fira', null, 'fire', 'one_enemy', 'high', [], '炎属性魔法。'),
    T('Bio', 'バイオ', 'poison', 'one_enemy', 'extreme', ['poison'], '強力な毒属性魔法。'),
    T('Cura', 'ケアルラ', null, 'self', 'medium', [], '自身のHPを回復する。'),
    T('Charm', null, null, 'one_enemy', 'low', ['confuse'], '対象を魅了する。'),
    T('Stop', 'ストップ', null, 'one_enemy', 'low', ['stop'], '対象の時間を止める。'),
  ]],

  ['exdeath_castle', 'Exdeath (Castle, first battle)', 'エクスデス', "Exdeath's Castle", 2, 32768, 'holy', null, 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '1ターンに2回まで行える通常攻撃。'),
    T('Vacuum Wave', null, null, 'one_enemy', 'high', [], '強力な単体無属性攻撃。'),
    T('Dispel', 'ディスペル', null, 'all_enemies', 'low', [], '全体の有利な状態を解除する。'),
    T('Row Change', null, null, 'all_enemies', 'low', [], 'パーティの前衛・後衛を入れ替える。'),
    T('Gravity 100', null, null, 'all_enemies', 'low', ['float'], '浮遊状態を解除する。'),
    T('Condemn', 'コンデム', null, 'one_enemy', 'medium', ['doom'], '一定時間後の即死を宣告する。'),
    T('Demi', 'デミ', null, 'one_enemy', 'high', [], '対象のHPを大きく削る。'),
    T('Hurricane', null, 'wind', 'one_enemy', 'extreme', [], '対象を瀕死にする風属性攻撃。'),
    T('Bio', 'バイオ', 'poison', 'one_enemy', 'medium', ['poison'], '毒属性魔法。'),
    T('Fira', null, 'fire', 'one_enemy', 'high', [], '炎属性魔法。'),
    T('Thundara', null, 'lightning', 'one_enemy', 'high', [], '雷属性魔法。'),
    T('Blizzara', null, 'ice', 'one_enemy', 'high', [], '氷属性魔法。'),
    T('Earthquake', null, 'earth', 'all_enemies', 'high', [], '全体地属性攻撃。'),
    T('Flame', null, 'fire', 'all_enemies', 'high', [], '全体炎属性攻撃。'),
    T('Zombie Breath', null, null, 'all_enemies', 'high', ['zombie'], '全体をゾンビ化させるブレス。'),
    T('Flare Wave (Lv.3)', null, null, 'one_enemy', 'extreme', [], 'レベルが3の倍数の対象を即死させる。'),
  ]],

  ['antolyon', 'Antolyon', null, 'Death Valley', 3, null, null, null, 'low', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Sonic Wave', null, null, 'one_enemy', 'low', [], '対象のレベルを半減させる。'),
    T('Stomach Acid', null, null, 'one_enemy', 'medium', [], '継続ダメージを与える攻撃。'),
    T('Escape', null, null, 'self', 'low', [], '劣勢になると戦闘から逃走する。'),
  ]],

  ['gargoyle_pair', 'Gargoyle (pair, recurring encounter)', 'ガーゴイル', 'Pyramid / Solitary Island Temple / Great Sea Trench / Easterly Falls', 3, 5000, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Fusion', null, null, 'one_ally', 'low', [], '自身を犠牲にして相方のHPを全回復させる。相方は撃破しても復活する。'),
  ]],

  ['melusine', 'Melusine', 'メルシーヌ', 'Elder Tree', 3, 20000, null, null, 'medium', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '物理攻撃（ほぼ無効化される）。'),
    T('Firaga', null, 'fire', 'one_enemy', 'high', [], '結界の色に応じて切り替わる炎属性魔法。'),
    T('Blizzaga', null, 'ice', 'one_enemy', 'high', [], '結界の色に応じて切り替わる氷属性魔法。'),
    T('Thundaga', null, 'lightning', 'one_enemy', 'high', [], '結界の色に応じて切り替わる雷属性魔法。'),
    T('Barrier Change', null, null, 'self', 'low', [], '自身の弱点属性を周期的に切り替える。'),
  ]],

  ['odin_boss', 'Odin', 'オーディン', 'Encountered in the field (time-limited)', 3, 17000, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '通常攻撃。'),
    T('Zantetsuken', 'ザンテツケン', null, 'all_enemies', 'extreme', [], '戦闘開始時と瀕死時に使う強力な全体斬撃。'),
  ]],

  ['stoker', 'Stoker', null, 'Solitary Island Temple', 3, 20000, null, null, 'low', [
    T('Attack', null, null, 'one_enemy', 'high', [], '本体の通常攻撃（分身は無効）。'),
    T('Blaze', null, 'fire', 'all_enemies', 'medium', [], '全体攻撃で狙われた際、分身が反撃として使用。'),
    T('Mind Blast', null, null, 'one_enemy', 'medium', ['paralyze'], '継続ダメージと麻痺を与える。'),
    T('Hurricane', null, 'wind', 'one_enemy', 'extreme', [], '対象を瀕死にする風属性攻撃。'),
    T('Charm', null, null, 'one_enemy', 'low', ['confuse'], '対象を魅了する。'),
  ]],

  ['minotaur', 'Minotaur', 'ミノタウルス', null, 3, 19850, null, null, 'medium', [
    T('Attack', null, null, 'one_enemy', 'extreme', [], '強力な通常攻撃。'),
    T('Holy', 'ホーリー', 'holy', 'one_enemy', 'extreme', [], '聖属性の大ダメージ魔法。戦闘中は魔法コマンドが封じられる。'),
  ]],

  ['omniscient', 'Omniscient', null, null, 3, 16999, 'wind', null, 'low', [
    T('Bio', 'バイオ', 'poison', 'one_enemy', 'high', [], '毒属性魔法。'),
    T('Demi', 'デミ', null, 'one_enemy', 'high', [], 'HPを半減させる。'),
    T('Quarter', 'クォーター', null, 'one_enemy', 'high', [], 'HPの3/4を奪う。'),
    T('Drain', 'ドレイン', null, 'one_enemy', 'medium', [], 'HPを吸収する。'),
    T('Slow', 'スロウ', null, 'one_enemy', 'low', ['slow'], '行動速度を下げる。'),
    T('Stop', 'ストップ', null, 'one_enemy', 'low', ['stop'], '時間を止める。'),
    T('Silence', 'サイレス', null, 'one_enemy', 'low', ['silence'], '魔法を封じる。'),
    T('Mini', 'ミニマム', null, 'one_enemy', 'low', ['mini'], '小人化させる。'),
    T('Poison', 'ポイズン', 'poison', 'one_enemy', 'low', ['poison'], '毒を付与する。'),
    T('Toad', 'トード', null, 'one_enemy', 'low', ['toad'], 'カエル化させる。'),
    T('Charm', null, null, 'one_enemy', 'low', ['confuse'], '対象を魅了する。'),
    T('Cura', 'ケアルラ', null, 'self', 'medium', [], '自身のHPを回復する。'),
    T('Regen', 'リジェネ', null, 'self', 'low', ['regen'], '自身に継続回復を付与。'),
    T('Reflect', 'リフレク', null, 'self', 'low', ['reflect'], '魔法反射を付与する。'),
    T('Haste', 'ヘイスト', null, 'self', 'low', ['haste'], '自身の行動速度を上げる。'),
    T('Float', 'レビテト', null, 'self', 'low', ['float'], '地属性攻撃を回避する。'),
    T('Battle Reset', null, null, 'all_allies', 'low', [], '物理攻撃を受けると戦闘を最初からやり直させる。'),
  ]],

  ['gogo_boss', 'Gogo', 'ゴゴ', 'Sealed Tower of Walz', 3, null, null, null, 'high', [
    T('Mimic', null, null, 'self', 'low', [], 'パーティが直前に取った行動をそのまま真似する。'),
  ]],

  ['triton_trio', 'Triton, Nereid & Phobos', null, 'Great Sea Trench', 3, 13333, null, null, 'medium', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '各々共通の通常攻撃。'),
    T('Firaga (Triton)', null, 'fire', 'all_enemies', 'high', [], 'トリトンが使う全体炎属性攻撃。'),
    T('Emission', null, null, 'one_enemy', 'medium', [], 'トリトンが使う単体無属性攻撃。'),
    T('Bio (Nereid)', null, 'poison', 'all_enemies', 'medium', [], 'ネレイドが使う全体毒属性攻撃。'),
    T('Rainbow Wind', null, null, 'one_enemy', 'medium', ['blind', 'silence'], 'ネレイドが使う継続ダメージ・暗闇・沈黙の複合攻撃。'),
    T('Blizzaga (Phobos)', null, 'ice', 'all_enemies', 'high', [], 'フォボスが使う全体氷属性攻撃。'),
    T('Snowstorm', null, 'ice', 'all_enemies', 'high', [], 'フォボスが使う全体氷属性攻撃。'),
    T('Delta Attack', null, null, 'one_enemy', 'high', ['petrify', 'silence'], '3体そろっている間だけ使える合体攻撃。'),
  ]],

  ['bahamut_boss', 'Bahamut', 'バハムート', 'North Mountain (World 3)', 3, 40000, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Flame', null, 'fire', 'all_enemies', 'extreme', [], '全体炎属性攻撃。'),
    T('Blaze', null, 'fire', 'all_enemies', 'extreme', [], '全体炎属性攻撃。'),
    T('Aqua Rake', null, 'water', 'all_enemies', 'extreme', [], '全体水属性攻撃。'),
    T('Atomic Ray', null, null, 'all_enemies', 'extreme', [], '全体無属性攻撃。'),
    T('Maelstrom', null, null, 'all_enemies', 'extreme', [], '対象をランダムに瀕死にする全体攻撃。'),
    T('Poison Breath', null, 'poison', 'all_enemies', 'high', ['poison'], '全体に毒を付与するブレス。'),
    T('Zombie Breath', null, null, 'all_enemies', 'high', ['zombie'], '全体をゾンビ化させるブレス。'),
    T('Mega Flare', 'メガフレア', null, 'all_enemies', 'extreme', [], '瀕死になると使う切り札級の全体無属性大ダメージ。'),
  ]],

  ['leviathan_boss', 'Leviathan', 'リヴァイアサン', 'Easterly Village Falls', 3, 40000, 'lightning', null, 'high', [
    T('Attack', null, null, 'one_enemy', 'extreme', [], '強力な通常攻撃。炎属性を無効化する。'),
    T('Aqua Rake', null, 'water', 'all_enemies', 'medium', [], '全体水属性攻撃。'),
    T('Tail', null, null, 'one_enemy', 'extreme', [], '継続ダメージを伴う強力な尾撃。'),
    T('Tidal Wave', null, 'water', 'all_enemies', 'extreme', [], '1ターンに2回まで使用できる全体水属性大ダメージ。'),
    T('Entangle', null, null, 'one_enemy', 'medium', ['paralyze'], '対象を麻痺させる。'),
  ]],

  ['wood_sprite', 'Wood Sprite', null, null, 3, 18000, null, null, 'low', [
    T('Bio', 'バイオ', 'poison', 'one_enemy', 'extreme', ['poison'], '強力な毒属性魔法。'),
    T('Drain', 'ドレイン', null, 'one_enemy', 'medium', [], 'HPを吸収する単体攻撃。'),
    T('Stop', 'ストップ', null, 'one_enemy', 'low', ['stop'], '対象の時間を止める。'),
    T('Poison', 'ポイズン', 'poison', 'one_enemy', 'low', ['poison'], '毒を付与する。'),
    T('Old', 'オールド', null, 'one_enemy', 'low', ['old'], '対象を急速に老化させる。'),
    T('Protect', 'プロテス', null, 'self', 'low', ['protect'], '自身の物理防御を上げる。'),
    T('Shell', 'シェル', null, 'self', 'low', ['shell'], '自身の魔法防御を上げる。'),
    T('Reflect', 'リフレク', null, 'self', 'low', ['reflect'], '魔法反射を付与する。'),
    T('Cura', 'ケアルラ', null, 'self', 'medium', [], '自身のHPを回復する。'),
    T('Regen', 'リジェネ', null, 'self', 'low', ['regen'], '自身に継続回復を付与する。'),
    T('Esuna', 'エスナ', null, 'self', 'low', [], '自身の不利な状態を治療する。'),
  ]],

  ['omega_boss', 'Omega', 'オメガ', 'Optional superboss', 3, 55530, null, null, 'high', [
    T('Mustard Bomb', null, null, 'one_enemy', 'extreme', [], '継続ダメージを伴う通常攻撃相当の主力技。'),
    T('Surge Beam', null, null, 'all_enemies', 'extreme', [], '全体無属性大ダメージ。'),
    T('Atomic Ray', null, 'fire', 'all_enemies', 'extreme', [], '全体炎属性大ダメージ。'),
    T('Emission', null, 'fire', 'one_enemy', 'extreme', [], '単体炎属性大ダメージ。'),
    T('Earthquake', null, 'earth', 'all_enemies', 'extreme', [], '全体地属性大ダメージ。'),
    T('Maelstrom', null, null, 'all_enemies', 'extreme', [], 'ランダムな対象を瀕死にする全体攻撃。'),
    T('Blast', null, null, 'one_enemy', 'extreme', [], '即死または瀕死を狙う単体攻撃。'),
    T('Rocket Punch', null, null, 'one_enemy', 'high', ['confuse'], 'ランダムな対象のHPを半減させ混乱させる。1ターンに最大3回。'),
    T('Delta Attack', null, null, 'one_enemy', 'medium', ['petrify'], '石化を狙う単体攻撃。'),
    T('Rainbow Beam', null, null, 'all_enemies', 'low', ['silence'], '全体の魔法コマンドを封じる。'),
    T('Circle', null, null, 'one_enemy', 'low', [], '対象を戦闘から強制的に除外する。'),
  ]],

  ['apanda', 'Apanda', 'アパンダ', 'Optional / postgame', 3, 22200, 'fire', null, 'medium', [
    T('Windslash', null, 'wind', 'all_enemies', 'high', [], '全体風属性攻撃。'),
    T('Drain', 'ドレイン', null, 'one_enemy', 'medium', [], 'HPを吸収する単体攻撃。'),
    T('Thread', null, null, 'one_enemy', 'low', ['slow'], '対象の行動速度を下げる。'),
    T('Magic Hammer', 'マジックハンマー', null, 'one_enemy', 'low', [], '対象のMPを半減させる。'),
    T('Sonic Wave', null, null, 'one_enemy', 'low', [], '対象のレベルを半減させる。'),
    T('Toad', 'トード', null, 'one_enemy', 'low', ['toad'], '対象をカエルに変える。'),
    T('Protect (self)', 'プロテス', null, 'self', 'low', ['protect'], '自身の物理防御を上げる。'),
  ]],

  ['azulmagia', 'Azulmagia', 'アズルマギア', 'N-Zone Prison', 3, 27900, 'poison', null, 'high', [
    T('Attack', null, null, 'one_enemy', 'extreme', [], '習得した青魔法をランダムに使用する主力技。'),
    T('Circle', null, null, 'one_enemy', 'low', [], '対象を戦闘から強制的に除外する。'),
    T('Condemn', 'コンデム', null, 'one_enemy', 'medium', ['doom'], '一定時間後の即死を宣告する。'),
    T('Roulette', 'ルーレット', null, 'one_enemy', 'extreme', [], 'ランダムな対象に即死を狙う。'),
    T('Level 5 Doom', null, null, 'all_enemies', 'extreme', [], 'レベルが5の倍数の対象を即死させる。'),
    T('Level 4 Quarter', null, null, 'all_enemies', 'high', [], 'レベルが4の倍数の対象のHPの3/4を奪う。'),
    T('Level 2 Old', null, null, 'all_enemies', 'low', ['old'], 'レベルが2の倍数の対象を老化させる。'),
    T('Tiny Song', null, null, 'one_enemy', 'low', ['mini'], '対象を小人化させる。'),
    T('Flash', null, null, 'all_enemies', 'low', ['blind'], '全体を暗闇にする。'),
    T('Time Slip', null, null, 'one_enemy', 'medium', ['sleep', 'old'], '睡眠と急速な老化を与える。'),
    T('Death Claw', 'デスクロー', null, 'one_enemy', 'high', ['paralyze'], '瀕死状態と麻痺を狙う一撃。'),
    T('Dark Shock', null, null, 'one_enemy', 'medium', [], '対象のレベルを半減させる。'),
    T('Mind Blast', null, null, 'one_enemy', 'high', ['paralyze'], '継続ダメージと麻痺を与える。'),
    T('Guardian', null, null, 'self', 'low', ['protect', 'shell', 'float'], '自身にプロテス・シェル・レビテトを同時付与する。'),
    T('White Wind', 'ホワイトウインド', null, 'self', 'medium', [], '自身の現在HP相当を回復する。'),
    T('Missile', null, null, 'one_enemy', 'high', [], '対象のHPを半減させる。'),
    T('Aqua Rake', null, 'water', 'all_enemies', 'high', [], 'HP低下後に習得する全体水属性攻撃。'),
    T('Level 3 Flare', null, null, 'all_enemies', 'extreme', [], 'HP低下後に習得する、レベルが3の倍数の対象への大ダメージ。'),
    T('Aeroga', null, 'wind', 'one_enemy', 'high', [], 'HP低下後に習得する単体風属性大ダメージ。'),
    T('Bloodsuck', null, null, 'one_enemy', 'medium', [], 'HP低下後に習得するHP吸収攻撃。'),
    T('Self-Destruct', 'じばく', null, 'all_enemies', 'extreme', [], 'HP低下後に習得する自爆による全体大ダメージ。'),
  ]],

  ['alte_roite_jura_avis', 'Alte Roite / Jura Avis', null, 'N-Zone Prison', 3, 15000, null, null, 'low', [
    T('Attack (Alte Roite)', null, null, 'one_enemy', 'medium', [], '第一形態(x6体)の通常攻撃。'),
    T('Circle', null, null, 'one_enemy', 'low', [], '対象を戦闘から強制的に除外する。'),
    T('Attack (Jura Avis)', null, null, 'one_enemy', 'high', [], '第二形態（真の姿）の通常攻撃。'),
    T('Wing Blow', null, null, 'all_enemies', 'extreme', [], '第二形態が使う全体攻撃。'),
    T('Maelstrom', null, null, 'all_enemies', 'extreme', [], 'ランダムな対象を瀕死にする全体攻撃。'),
    T('Entangle', null, null, 'one_enemy', 'medium', ['paralyze'], '対象を一時的に麻痺させる。'),
  ]],

  ['catastrophe', 'Catastrophe', 'カタストロフィ', 'Optional / postgame', 3, 19997, null, 'float_denial', 'medium', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Earthquake', 'アースシェイカー', 'earth', 'all_enemies', 'extreme', [], '浮遊していない対象全体への大ダメージ地属性攻撃。'),
    T('Gravity 100', null, null, 'all_enemies', 'low', ['float'], '浮遊状態を強制解除する。浮遊者がいる限り優先して使用する。'),
    T('Evil Eye', null, null, 'one_enemy', 'medium', ['petrify'], '対象を石化させる。'),
  ]],

  ['halicarnassus', 'Halicarnassus', null, 'Optional / postgame', 3, 33333, null, null, 'low', [
    T('Attack', null, null, 'one_enemy', 'medium', [], '通常攻撃。'),
    T('Holy', 'ホーリー', 'holy', 'one_enemy', 'extreme', [], '単体に大ダメージを与える聖属性魔法。'),
    T('Toad Curse', null, null, 'all_enemies', 'low', ['toad'], '戦闘開始時、パーティ全体をカエルに変える。'),
    T('Row Change', null, null, 'all_enemies', 'low', [], 'パーティの前衛・後衛を入れ替える。'),
    T('Dispel', 'ディスペル', null, 'one_enemy', 'low', [], '対象の有利な状態を解除する。'),
    T('Haste', 'ヘイスト', null, 'self', 'low', ['haste'], '自身の行動速度を上げる。'),
    T('Shell', 'シェル', null, 'self', 'low', ['shell'], '自身の魔法防御を上げる。'),
    T('Protect', 'プロテス', null, 'self', 'low', ['protect'], '自身の物理防御を上げる。'),
  ]],

  ['twintania', 'Twintania', 'ツインタニア', 'N-Zone Bridge', 3, 50000, 'holy', 'water', 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Snowstorm', null, 'ice', 'all_enemies', 'extreme', [], '全体氷属性攻撃。'),
    T('Atomic Ray', null, null, 'all_enemies', 'high', [], '全体無属性攻撃。'),
    T('Mind Blast', null, null, 'one_enemy', 'medium', ['paralyze'], '継続ダメージと麻痺を与える。'),
    T('Wind Slash', null, 'wind', 'all_enemies', 'medium', [], '全体風属性攻撃。'),
    T('Tidal Wave', null, 'water', 'all_enemies', 'extreme', [], '全体水属性大ダメージ。'),
    T('Mega Flare', 'メガフレア', null, 'all_enemies', 'extreme', [], '全体無属性大ダメージ。'),
    T('Giga Flare', 'ギガフレア', null, 'all_enemies', 'extreme', [], 'チャージ後に放つ切り札級の全体大ダメージ。'),
  ]],

  ['shinryu', 'Shinryu', '神竜', 'N-Zone final area, optional superboss', 3, 55500, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'extreme', [], '1ターンに2回まで行える強力な通常攻撃。'),
    T('Tidal Wave', null, 'water', 'all_enemies', 'extreme', [], '戦闘開始時から使う全体水属性大ダメージ。'),
    T('Judgment Bolt', null, 'lightning', 'all_enemies', 'high', [], '全体雷属性攻撃。'),
    T('Snowstorm', null, 'ice', 'all_enemies', 'extreme', [], '全体氷属性大ダメージ。'),
    T('Poison Breath', null, 'poison', 'all_enemies', 'medium', ['poison'], '全体に毒を付与するブレス。'),
    T('Maelstrom', null, null, 'all_enemies', 'extreme', [], 'ランダムな対象を瀕死にする全体攻撃。'),
    T('Atomic Ray', null, null, 'all_enemies', 'high', [], '全体無属性攻撃。'),
    T('Evil Eye', null, null, 'one_enemy', 'medium', ['petrify'], '対象を石化させる。'),
    T('Roulette', 'ルーレット', null, 'all_enemies', 'extreme', [], 'ランダムな対象に即死を狙う。'),
    T('Level 2 Old', null, null, 'all_enemies', 'low', ['old'], 'レベルが2の倍数の対象を老化させる。'),
    T('Level 3 Flare', null, null, 'all_enemies', 'extreme', [], 'レベルが3の倍数の対象へ大ダメージ。'),
    T('Guardian', null, null, 'self', 'low', ['protect', 'shell', 'float'], '自身にプロテス・シェル・レビテトを同時付与する。'),
  ]],

  ['necrophobe_barrier', 'Necrophobe (with 4 Barriers)', 'ネクロフォビア', 'N-Zone final area', 3, 44044, null, 'physical_break_barriers', 'medium', [
    T('Attack', null, null, 'one_enemy', 'high', ['doom'], '本体の通常攻撃。稀に即死宣告を伴う。'),
    T('Vacuum Wave', null, null, 'one_enemy', 'extreme', [], '本体が使う継続ダメージの単体無属性攻撃。'),
    T('Flash', null, null, 'one_enemy', 'low', ['blind'], '本体が使う暗闇付与攻撃。'),
    T('Maelstrom', null, null, 'all_enemies', 'extreme', [], '本体が使う、対象をランダムに瀕死にする全体攻撃。'),
    T('Flare (Barrier)', null, null, 'one_enemy', 'extreme', [], '結界(4体)が使う単体無属性大ダメージ。'),
    T('Holy (Barrier)', 'ホーリー', 'holy', 'one_enemy', 'extreme', [], '結界が使う単体聖属性大ダメージ。'),
    T('Firaga/Blizzaga/Thundaga (Barrier)', null, null, 'all_enemies', 'high', [], '結界が使う全属性の全体・単体魔法攻撃。'),
  ]],

  ['exdeath_final', 'Exdeath (final battle, first phase)', 'エクスデス', 'The Rift / N-Zone', 3, 49001, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('Holy', 'ホーリー', 'holy', 'one_enemy', 'extreme', [], '聖属性の大ダメージ魔法。'),
    T('Flare', 'フレア', null, 'one_enemy', 'extreme', [], '防御を無視する無属性の大ダメージ魔法。'),
    T('Meteor', 'メテオ', null, 'all_enemies', 'extreme', [], '複数回のランダムダメージを与える全体魔法。'),
    T('White Hole', null, null, 'one_enemy', 'extreme', ['petrify'], '即死または石化を狙う一撃。'),
    T('Condemn', 'コンデム', null, 'one_enemy', 'medium', ['doom'], '一定時間後の即死を宣告する。'),
  ]],

  ['neo_exdeath', 'Neo Exdeath (4-part final form)', 'ネオエクスデス', 'The Rift', 3, null, null, null, 'high', [
    T('Attack', null, null, 'one_enemy', 'high', [], '各パーツ共通の通常攻撃。'),
    T('Vacuum Wave', null, null, 'one_enemy', 'extreme', [], '継続ダメージを伴う無属性攻撃。複数パーツが使用。'),
    T('Comet', 'コメット', null, 'one_enemy', 'high', [], '前方パーツが使う単体無属性攻撃。'),
    T('Holy', 'ホーリー', 'holy', 'one_enemy', 'extreme', [], '前方パーツが使う聖属性大ダメージ。'),
    T('Flare', 'フレア', null, 'one_enemy', 'extreme', [], '前方パーツが使う無属性大ダメージ。'),
    T('Meteor', 'メテオ', null, 'all_enemies', 'extreme', [], '複数パーツが使う全体ランダムダメージ。'),
    T('Dispel', 'ディスペル', null, 'one_enemy', 'low', [], '中央下部パーツが使う、有利な状態の解除。'),
    T('Firaga/Blizzaga/Thundaga/Aeroga', null, null, 'one_enemy', 'high', [], '中央上部パーツが使う各属性の単体大ダメージ。'),
    T('Almagest', null, null, 'all_enemies', 'extreme', [], '後方パーツなどが使う全体継続ダメージ攻撃。'),
    T('Grand Cross', null, null, 'all_enemies', 'extreme', ['poison', 'blind', 'silence', 'confuse', 'paralyze', 'sleep', 'toad', 'mini'], '中央上部パーツが使う、複数の状態異常をランダムに付与する全体攻撃。'),
    T('Delta Attack', null, null, 'one_enemy', 'high', ['petrify'], '3パーツが揃っている間だけ使える合体攻撃。'),
  ]],
];

export const ff5BossTechniquesMeta = Object.freeze({
  id: 'ff5_boss_techniques_v1',
  version: 1,
  sourceVersion: 'Final Fantasy V (SNES/GBA baseline, cross-referenced)',
  sourceNote: SOURCE_NOTE,
  locale: 'ja-JP',
  updatedAt: '2026-08-12',
  bossCount: bossRows.length,
  policy: 'FFVの原作ボスが使用する技を正規化して収集した「実装準備用」の参照データ。まだ戦闘には接続されていない（implemented:false）。',
});

export const ff5BossTechniques = Object.freeze(
  bossRows.map(([id, nameEn, nameJa, location, world, hp, weaknessElement, statusWeakness, nameConfidence, techniques]) => Object.freeze({
    id: `bossref_${id}`,
    nameEn,
    nameJa,
    nameConfidence, // 'high' | 'medium' | 'low' -- see file header
    location,
    world, // 1 | 2 | 3 (which world map the encounter is first available in; null for repeating/optional encounters)
    referenceHp: hp, // original-release baseline HP, for relative tuning only
    weaknessElement,
    statusWeakness, // free-text note for non-elemental "weaknesses" (e.g. petrify-vulnerable, float-denial pattern)
    techniques: Object.freeze(techniques.map((technique) => Object.freeze({
      ...technique,
      id: `bosstech_${id}_${bossTechSlug(technique.nameEn)}`,
    }))),
    implemented: false,
    runtimeReady: false, // no battleCatalog adapter yet -- see database/README.md for the wiring contract to follow when this is picked up
  }))
);

/** Convenience lookup: ff5BossTechniquesById['bossref_bahamut_boss'] */
export const ff5BossTechniquesById = Object.freeze(
  Object.fromEntries(ff5BossTechniques.map((boss) => [boss.id, boss]))
);
