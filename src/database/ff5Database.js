/**
 * FF5 Pixel Remaster reference database.
 *
 * This is normalized gameplay data, not copied guide text. Records default to
 * implemented:false so content can be designed now and connected to battle,
 * inventory and shops incrementally without pretending the effect is live.
 */

const SOURCE_VERSION = 'Final Fantasy V Pixel Remaster';

const slug = (value) => value
  .toLowerCase()
  .replaceAll('&', ' and ')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

export const ff5DatabaseMeta = Object.freeze({
  id: 'ff5_reference_v1',
  version: 1,
  sourceVersion: SOURCE_VERSION,
  locale: 'ja-JP',
  updatedAt: '2026-08-11',
  policy: 'FF5のゲーム上の事実を本作向けに正規化。説明文は独自に要約し、版差は別レコードで管理する。',
  progression: 'all_commands_available_no_abp',
  expectedCounts: { weapons: 107, armor: 79, whiteMagic: 18, blackMagic: 18, timeMagic: 18, summonMagic: 15, blueMagic: 30, songs: 8 },
});

export const ff5BattleRules = Object.freeze({
  id: 'ff5_atb_reference',
  sourceVersion: SOURCE_VERSION,
  turnSystem: 'active_time_battle',
  partySize: 4,
  formations: ['normal', 'back_attack', 'preemptive', 'pincer'],
  rows: ['front', 'back'],
  baseCommands: ['attack', 'items', 'row', 'defend'],
  damageCap: 9999,
  equipmentSlots: ['weapon', 'shield', 'head', 'body', 'accessory'],
  configurableSlots: ['ability', 'crystalShard'],
  statusFamilies: ['ko', 'poison', 'blind', 'silence', 'toad', 'mini', 'petrify', 'confuse', 'paralyze', 'sleep', 'old', 'berserk', 'zombie', 'stop', 'slow', 'haste', 'regen', 'protect', 'shell', 'reflect', 'float', 'doom'],
  elements: ['fire', 'ice', 'lightning', 'poison', 'holy', 'earth', 'wind', 'water'],
  implemented: false,
});

const magicRows = [
  // school, level, English, Japanese, MP, element, target, effect, price
  ['white',1,'Cure','ケアル',4,null,'one_ally','HPを回復',180],
  ['white',1,'Libra','ライブラ',1,null,'one_enemy','HP・弱点・状態・レベルを調べる',80],
  ['white',1,'Poisona','ポイゾナ',2,null,'one_ally','毒を治療',90],
  ['white',2,'Silence','サイレス',2,null,'one_enemy','沈黙を付与',280],
  ['white',2,'Protect','プロテス',3,null,'one_ally','物理ダメージを軽減',280],
  ['white',2,'Mini','ミニマム',5,null,'one_target','小人状態を切り替える',300],
  ['white',3,'Cura','ケアルラ',9,null,'one_or_all_allies','HPを中回復',620],
  ['white',3,'Raise','レイズ',29,null,'one_ally','戦闘不能から復帰',700],
  ['white',3,'Confuse','コンフュ',4,null,'one_enemy','混乱を付与',650],
  ['white',4,'Blink','ブリンク',6,null,'one_ally','物理攻撃を回避する分身を付与',3000],
  ['white',4,'Shell','シェル',5,null,'one_ally','魔法ダメージを軽減',3000],
  ['white',4,'Esuna','エスナ',10,null,'one_ally','戦闘不能・ゾンビ以外の状態異常を治療',3000],
  ['white',5,'Curaga','ケアルガ',27,null,'one_or_all_allies','HPを大回復',6000],
  ['white',5,'Reflect','リフレク',15,null,'one_ally','魔法反射を付与',6000],
  ['white',5,'Berserk','バーサク',8,null,'one_target','バーサクを付与',6000],
  ['white',6,'Arise','アレイズ',50,null,'one_ally','戦闘不能から完全回復',10000],
  ['white',6,'Holy','ホーリー',20,'holy','one_enemy','聖属性の大ダメージ',null],
  ['white',6,'Dispel','ディスペル',12,null,'one_enemy','有利な魔法効果を解除',10000],

  ['black',1,'Fire','ファイア',4,'fire','one_or_all_enemies','炎属性ダメージ',150],
  ['black',1,'Blizzard','ブリザド',4,'ice','one_or_all_enemies','冷気属性ダメージ',150],
  ['black',1,'Thunder','サンダー',4,'lightning','one_or_all_enemies','雷属性ダメージ',150],
  ['black',2,'Poison','ポイズン',2,'poison','one_enemy','毒を付与',290],
  ['black',2,'Sleep','スリプル',3,null,'one_or_all_enemies','睡眠を付与',300],
  ['black',2,'Toad','トード',8,null,'one_target','カエル状態を切り替える',300],
  ['black',3,'Fira','ファイラ',10,'fire','one_or_all_enemies','炎属性の中ダメージ',600],
  ['black',3,'Blizzara','ブリザラ',10,'ice','one_or_all_enemies','冷気属性の中ダメージ',600],
  ['black',3,'Thundara','サンダラ',10,'lightning','one_or_all_enemies','雷属性の中ダメージ',600],
  ['black',4,'Drain','ドレイン',13,null,'one_enemy','HPを吸収',3000],
  ['black',4,'Break','ブレイク',15,null,'one_enemy','石化を付与',3000],
  ['black',4,'Bio','バイオ',16,'poison','one_enemy','毒属性ダメージとスリップ',3000],
  ['black',5,'Firaga','ファイガ',25,'fire','one_or_all_enemies','炎属性の大ダメージ',6000],
  ['black',5,'Blizzaga','ブリザガ',25,'ice','one_or_all_enemies','冷気属性の大ダメージ',6000],
  ['black',5,'Thundaga','サンダガ',25,'lightning','one_or_all_enemies','雷属性の大ダメージ',6000],
  ['black',6,'Flare','フレア',39,null,'one_enemy','防御を一部無視する大ダメージ',null],
  ['black',6,'Death','デス',29,null,'one_enemy','即死を付与',10000],
  ['black',6,'Osmose','アスピル',1,null,'one_enemy','MPを吸収',10000],

  ['time',1,'Speed','スピード',1,null,'self','戦闘速度を遅くする',30],
  ['time',1,'Slow','スロウ',3,null,'one_enemy','行動速度を低下',80],
  ['time',1,'Regen','リジェネ',3,null,'one_ally','HPを徐々に回復',100],
  ['time',2,'Mute','ミュート',3,null,'all_units','戦場全体を魔法使用不能にする',320],
  ['time',2,'Haste','ヘイスト',5,null,'one_ally','行動速度を上昇',320],
  ['time',2,'Float','レビテト',10,null,'one_or_all_allies','浮遊を付与',300],
  ['time',3,'Gravity','グラビデ',9,null,'one_enemy','現在HPを半減',620],
  ['time',3,'Stop','ストップ',8,null,'one_enemy','時間停止を付与',580],
  ['time',3,'Teleport','テレポ',15,null,'party','戦闘またはダンジョンから脱出',600],
  ['time',4,'Comet','コメット',7,null,'one_enemy','ランダム倍率の隕石ダメージ',3000],
  ['time',4,'Slowga','スロウガ',9,null,'all_enemies','敵全体の行動速度を低下',3000],
  ['time',4,'Return','リターン',1,null,'battle','戦闘開始時へ巻き戻す',3000],
  ['time',5,'Graviga','グラビガ',18,null,'one_enemy','現在HPを大幅に減少',6000],
  ['time',5,'Hastega','ヘイスガ',15,null,'all_allies','味方全体の行動速度を上昇',6000],
  ['time',5,'Old','オールド',4,null,'one_enemy','老化を付与',6000],
  ['time',6,'Meteor','メテオ',42,null,'all_enemies','複数回の無属性ダメージ',null],
  ['time',6,'Quick','クイック',77,null,'self','時間を止めて2回行動',10000],
  ['time',6,'Banish','デジョン',20,null,'one_enemy','戦場から消去',10000],

  ['summon',1,'Chocobo','チョコボ',4,null,'enemy_group','単体または全体へ無属性攻撃',300],
  ['summon',1,'Sylph','シルフ',8,null,'enemy_and_party','敵からHPを吸収して味方全体を回復',350],
  ['summon',1,'Remora','レモラ',2,null,'one_enemy','麻痺を付与',250],
  ['summon',2,'Shiva','シヴァ',10,'ice','all_enemies','冷気属性ダメージ',null],
  ['summon',2,'Ramuh','ラムウ',12,'lightning','all_enemies','雷属性ダメージ',null],
  ['summon',2,'Ifrit','イフリート',11,'fire','all_enemies','炎属性ダメージ',null],
  ['summon',3,'Titan','タイタン',25,'earth','all_enemies','地属性ダメージ',null],
  ['summon',3,'Golem','ゴーレム',18,null,'party','一定量の物理ダメージを肩代わり',null],
  ['summon',3,'Catoblepas','カトブレパス',33,null,'one_enemy','石化を付与',null],
  ['summon',4,'Carbuncle','カーバンクル',45,null,'all_allies','味方全体へリフレク',null],
  ['summon',4,'Syldra','シルドラ',32,'wind','all_enemies','風属性ダメージ',null],
  ['summon',4,'Odin','オーディン',48,null,'enemy_group','即死または単体大ダメージ',null],
  ['summon',5,'Phoenix','フェニックス',99,'fire','enemy_group_and_ally','敵全体へ炎攻撃し味方1人を完全蘇生',null],
  ['summon',5,'Leviathan','リバイアサン',39,'water','all_enemies','水属性の大ダメージ',null],
  ['summon',5,'Bahamut','バハムート',66,null,'all_enemies','無属性の大ダメージ',null],

  ['blue',null,'Goblin Punch','ゴブリンパンチ',0,null,'one_enemy','使用者と対象が同レベルなら威力増加',null],
  ['blue',null,'Roulette','死のルーレット',1,null,'random_unit','無作為の1体を戦闘不能にする',null],
  ['blue',null,'Self-Destruct','じばく',1,null,'one_enemy','使用者のHPを犠牲に固定ダメージ',null],
  ['blue',null,'Vampire','きゅうけつ',2,null,'one_enemy','HPを吸収',null],
  ['blue',null,'???','？？？？',3,null,'one_enemy','減少HPに応じた固定ダメージ',null],
  ['blue',null,'Magic Hammer','マジックハンマー',3,null,'one_enemy','対象の現在MPを半減',null],
  ['blue',null,'Moon Flute','つきのふえ',3,null,'all_allies','味方全体をバーサクにする',null],
  ['blue',null,'Aero','エアロ',4,'wind','one_enemy','風属性ダメージ',null],
  ['blue',null,'Flame Thrower','かえんほうしゃ',5,'fire','one_enemy','炎属性ダメージ',null],
  ['blue',null,'Lilliputian Lyric','ちいさなメロディ',5,null,'one_enemy','小人を付与',null],
  ['blue',null,"Pond's Chorus",'かえるのうた',5,null,'one_enemy','カエルを付与',null],
  ['blue',null,'Mind Blast','マインドブラスト',6,null,'one_enemy','ダメージ・麻痺・スリップを付与',null],
  ['blue',null,'Flash','フラッシュ',7,null,'all_enemies','敵全体へ暗闇を付与',null],
  ['blue',null,'Missile','ミサイル',7,null,'one_enemy','現在HPを4分の1にする',null],
  ['blue',null,'Level 4 Graviga','レベル4グラビガ',9,null,'all_enemies','レベルが4の倍数の敵へ割合ダメージ',null],
  ['blue',null,'Time Slip','タイムスリップ',9,null,'one_enemy','睡眠と老化を付与',null],
  ['blue',null,'Aera','エアロラ',10,'wind','one_enemy','風属性の中ダメージ',null],
  ['blue',null,'Doom','しのせんこく',10,null,'one_enemy','死の宣告を付与',null],
  ['blue',null,'Level 2 Old','レベル2オールド',11,null,'all_enemies','レベルが2の倍数の敵へ老化を付与',null],
  ['blue',null,'Transfusion','ゆうごう',13,null,'one_ally','使用者を犠牲に味方1人のHP・MPを全回復',null],
  ['blue',null,'Level 3 Flare','レベル3フレア',18,null,'all_enemies','レベルが3の倍数の敵へフレア',null],
  ['blue',null,'Off-Guard','ガードオファ',19,null,'one_enemy','物理防御を低下',null],
  ['blue',null,'Death Claw','デスクロー',21,null,'one_enemy','瀕死と麻痺を付与',null],
  ['blue',null,'Level 5 Death','レベル5デス',22,null,'all_enemies','レベルが5の倍数の敵を即死',null],
  ['blue',null,'Aeroga','エアロガ',24,'wind','one_enemy','風属性の大ダメージ',null],
  ['blue',null,'1000 Needles','はりせんぼん',25,null,'one_enemy','1000固定ダメージ',null],
  ['blue',null,'Dark Spark','くろのしょうげき',27,null,'one_enemy','対象レベルを半減',null],
  ['blue',null,'White Wind','ホワイトウインド',28,null,'all_allies','使用者の現在HPと同量を全体回復',null],
  ['blue',null,'Aqua Breath','アクアブレス',38,null,'all_enemies','敵全体へダメージ。砂漠系に特効',null],
  ['blue',null,'Mighty Guard','マイティガード',72,null,'all_allies','味方全体へプロテス・シェル・レビテト',null],
];

export const ff5Magic = Object.freeze(magicRows.map(([school, level, nameEn, nameJa, mpCost, element, target, effect, buyPrice]) => Object.freeze({
  id: `magic_${slug(nameEn) || 'question_marks'}`,
  sourceVersion: SOURCE_VERSION,
  school,
  level,
  nameJa,
  nameEn,
  mpCost,
  element,
  target,
  effect,
  buyPrice,
  acquisition: buyPrice == null ? (school === 'blue' ? 'learn_from_enemy' : 'event_or_battle') : 'shop_or_field',
  reflectable: !['summon', 'blue'].includes(school),
  implemented: false,
})));

const jobAbilityRows = [
  // job, English, Japanese, type, historical ABP reference, effect.
  // referenceAbp is archival metadata only; this boss-rush has no ABP gates.
  ['knight','Cover','かばう','passive',10,'瀕死の味方への単体物理攻撃を肩代わり'],
  ['knight','Guard','まもり','command',30,'直接物理攻撃を無効化'],
  ['knight','Two-Handed','りょうてもち','passive',50,'対応する片手武器を両手で持ち攻撃力を高める'],
  ['knight','Equip Shields','たてそうび','equip',100,'ジョブ制限を越えて盾を装備'],
  ['knight','Equip Armor','よろいそうび','equip',150,'ジョブ制限を越えて重装備'],
  ['knight','Equip Swords','けんそうび','equip',350,'ジョブ制限を越えて剣を装備'],
  ['monk','Focus','ためる','command',15,'次の一撃を強化'],
  ['monk','Barehanded','かくとう','passive',30,'素手攻撃をモンク相当にする'],
  ['monk','Chakra','チャクラ','command',45,'自分のHPを回復し毒・暗闇を治療'],
  ['monk','Counter','カウンター','passive',60,'物理攻撃へ反撃'],
  ['monk','HP +10%','HP10%アップ','passive',100,'最大HPを10%上昇'],
  ['monk','HP +20%','HP20%アップ','passive',150,'最大HPを20%上昇'],
  ['monk','HP +30%','HP30%アップ','passive',300,'最大HPを30%上昇'],
  ['thief','Find Passages','かくしつうろ','field',10,'隠し通路を発見'],
  ['thief','Scram','とんずら','command',20,'逃走可能な戦闘から離脱'],
  ['thief','Sprint','ダッシュ','field',30,'フィールド移動速度を上昇'],
  ['thief','Steal','ぬすむ','command',50,'敵からアイテムを盗む'],
  ['thief','Vigilance','けいかい','passive',75,'バックアタックを防ぐ'],
  ['thief','Mug','ぶんどる','command',150,'攻撃しながら盗む'],
  ['thief','Artful Dodger','ちょこまかうごく','passive',300,'すばやさをシーフ相当にする'],
  ['blue_mage','Check','しらべる','command',10,'敵のHPを調べる'],
  ['blue_mage','Learning','ラーニング','passive',20,'受けた青魔法を習得'],
  ['blue_mage','Blue Magic','あおまほう','command',70,'習得済み青魔法を使用'],
  ['blue_mage','Scan','みやぶる','command',250,'敵の詳細情報を調べる'],
  ['white_mage','White Magic','しろまほう','command',280,'習得済み白魔法を使用'],
  ['white_mage','MP +10%','MP10%アップ','passive',300,'最大MPを10%上昇'],
  ['black_mage','Black Magic','くろまほう','command',280,'習得済み黒魔法を使用'],
  ['black_mage','MP +30%','MP30%アップ','passive',450,'最大MPを30%上昇'],
  ['mystic_knight','Magic Shell','まほうバリア','passive',10,'瀕死時に自動でシェル'],
  ['mystic_knight','Spellblade','まほうけん','command',670,'武器へ対応魔法を付与'],
  ['berserker','Berserk','バーサク','passive',100,'操作不能で自動攻撃'],
  ['berserker','Equip Axes','おのそうび','equip',400,'ジョブ制限を越えて斧を装備'],
  ['summoner','Summon','しょうかん','command',250,'習得済み召喚魔法を使用'],
  ['summoner','Call','よびだす','command',500,'MPなしで召喚をランダム発動'],
  ['time_mage','Time Magic','じくう','command',280,'習得済み時空魔法を使用'],
  ['time_mage','Equip Rods','ロッドそうび','equip',250,'ジョブ制限を越えてロッドを装備'],
  ['red_mage','Red Magic','あかまほう','command',160,'レベル3までの白・黒魔法を使用'],
  ['red_mage','Dualcast','れんぞくま','command',999,'魔法を連続で2回使用'],
  ['beastmaster','Calm','なだめる','command',10,'魔獣系の行動を止める'],
  ['beastmaster','Control','あやつる','command',50,'敵を操作'],
  ['beastmaster','Equip Whips','むちそうび','equip',100,'ジョブ制限を越えて鞭を装備'],
  ['beastmaster','Catch','とらえる','command',300,'弱った敵を捕獲し後で放つ'],
  ['geomancer','Gaia','ちけい','command',25,'現在地に応じた地形技を発動'],
  ['geomancer','Find Pits','おとしあなかいひ','field',50,'落とし穴を発見'],
  ['geomancer','Light Step','ダメージゆか','field',100,'ダメージ床を無効化'],
  ['ninja','Smoke','けむりだま','command',10,'逃走可能な戦闘から離脱'],
  ['ninja','Image','ぶんしん','command',30,'物理攻撃を2回回避'],
  ['ninja','First Strike','せんせいこうげき','passive',50,'先制攻撃率を上昇'],
  ['ninja','Throw','なげる','command',150,'投擲可能な武器や巻物を消費して攻撃'],
  ['ninja','Dual-Wield','にとうりゅう','passive',450,'両手へ武器を装備して2回攻撃'],
  ['ranger','Animals','どうぶつ','command',15,'レベルに応じた動物を呼ぶ'],
  ['ranger','Aim','ねらう','command',45,'高命中の物理攻撃'],
  ['ranger','Equip Bows','ゆみやそうび','equip',135,'ジョブ制限を越えて弓を装備'],
  ['ranger','Rapid Fire','みだれうち','command',405,'威力を抑えた4回攻撃'],
  ['bard','Hide','かくれる','command',25,'一時的に戦場外へ退避'],
  ['bard','Equip Harps','たてごとそうび','equip',50,'ジョブ制限を越えて竪琴を装備'],
  ['bard','Sing','うたう','command',100,'習得済みの歌を使用'],
  ['samurai','Mineuchi','みねうち','command',10,'麻痺を狙う物理攻撃'],
  ['samurai','Zeninage','ぜになげ','command',30,'ギルを消費して敵全体へ攻撃'],
  ['samurai','Shirahadori','しらはどり','passive',60,'物理攻撃を確率で回避'],
  ['samurai','Equip Katanas','かたなそうび','equip',180,'ジョブ制限を越えて刀を装備'],
  ['samurai','Iainuki','いあいぬき','command',540,'敵全体へ即死を試みる'],
  ['dancer','Flirt','いろめ','command',25,'敵へ混乱を付与'],
  ['dancer','Dance','おどる','command',50,'4種類の踊りからランダム発動'],
  ['dancer','Equip Ribbons','リボンそうび','equip',325,'踊り子専用装備を使用可能にする'],
  ['dragoon','Jump','ジャンプ','command',10,'空中へ退避後に攻撃。槍で威力増加'],
  ['dragoon','Lance','りゅうけん','command',150,'HPとMPを吸収'],
  ['dragoon','Equip Lances','やりそうび','equip',400,'ジョブ制限を越えて槍を装備'],
  ['chemist','Pharmacology','くすりのちしき','passive',15,'回復アイテムの効果を2倍'],
  ['chemist','Mix','ちょうごう','command',30,'2つのアイテムを組み合わせて効果を発動'],
  ['chemist','Drink','のむ','command',45,'戦闘中に専用薬を飲む'],
  ['chemist','Recover','ちゆ','command',135,'味方全体の状態異常を治療'],
  ['chemist','Revive','そせい','command',405,'戦闘不能の味方全体を復帰'],
  ['mime','Mimic','ものまね','command',999,'直前の味方行動をコストなしで再現'],
];

export const ff5JobAbilities = Object.freeze(jobAbilityRows.map(([job, nameEn, nameJa, type, referenceAbp, effect]) => Object.freeze({
  id: `ability_${slug(nameEn)}`,
  sourceVersion: SOURCE_VERSION,
  job,
  nameJa,
  nameEn,
  type,
  // Historical reference only. FFM never gates commands or visuals by ABP.
  referenceAbp,
  unlockRequirement: null,
  effect,
  implemented: false,
})));

export const ff5Songs = Object.freeze([
  ['Mighty March','たいりょくのうた','instant','味方全体へリジェネ'],
  ["Romeo's Ballad",'あいのうた','instant','敵全体へストップ'],
  ['Alluring Air','ゆうわくのうた','instant','敵全体へ混乱'],
  ['Requiem','レクイエム','instant','アンデッド全体へダメージ'],
  ['Swift Song','すばやさのうた','continuous','歌唱中、味方全体のすばやさを段階上昇'],
  ["Mana's Paean",'まりょくのうた','continuous','歌唱中、味方全体の魔力を段階上昇'],
  ['Sinewy Etude','ちからのうた','continuous','歌唱中、味方全体の力を段階上昇'],
  ["Hero's Rime",'えいゆうのうた','continuous','歌唱中、味方全体の主要能力を段階上昇'],
].map(([nameEn, nameJa, mode, effect]) => Object.freeze({ id: `song_${slug(nameEn)}`, sourceVersion: SOURCE_VERSION, nameJa, nameEn, commandAbilityId: 'ability_sing', mode, target: mode === 'instant' && nameEn !== 'Mighty March' ? 'all_enemies' : 'all_allies', effect, implemented: false })));

const itemRows = [
  // English, Japanese, category, buy price, target, effect, shop
  ['Potion','ポーション','recovery',40,'one_ally','HPを50回復',true],
  ['Hi-Potion','ハイポーション','recovery',360,'one_ally','HPを500回復',true],
  ['Phoenix Down','フェニックスのお','recovery',1000,'one_ally','戦闘不能から復帰',true],
  ['Ether','エーテル','recovery',1500,'one_ally','MPを40回復',true],
  ['Elixir','エリクサー','recovery',50000,'one_ally','HP・MPを全回復',false],
  ['Antidote','どくけし','status_cure',30,'one_ally','毒を治療',true],
  ['Eye Drops','めぐすり','status_cure',20,'one_ally','暗闇を治療',true],
  ["Maiden's Kiss",'おとめのキッス','status_cure',60,'one_ally','カエルを治療',true],
  ['Mallet','うちでのこづち','status_cure',50,'one_ally','小人を治療',true],
  ['Gold Needle','きんのはり','status_cure',150,'one_ally','石化を治療',true],
  ['Holy Water','せいすい','status_cure',150,'one_ally','ゾンビを治療',true],
  ['Remedy','ばんのうやく','status_cure',1000,'one_ally','複数の状態異常を治療',true],
  ['Tent','テント','camp',250,'party','セーブ地点でHP・MPを回復',true],
  ['Cottage','コテージ','camp',600,'party','セーブ地点でHP・MPを大回復',true],
  ['Giant Drink','きょじんのくすり','drink',110,'self','戦闘中の最大HPを2倍',true],
  ['Power Drink','ちからのくすり','drink',110,'self','戦闘中の攻撃力を上昇',true],
  ['Speed Shake','スピードドリンク','drink',110,'self','戦闘中の行動速度を上昇',true],
  ['Iron Draft','プロテスドリンク','drink',110,'self','戦闘中の物理防御を上昇',true],
  ["Hero's Cocktail",'えいゆうのくすり','drink',110,'self','戦闘中のレベルを上昇',true],
  ['Turtle Shell','かめのこうら','mix_material',150,null,'調合素材。防御・割合系の効果に使用',false],
  ['Dragon Fang','りゅうのきば','mix_material',2500,null,'調合素材。属性・強化系の効果に使用',false],
  ['Dark Matter','ダークマター','mix_material',5000,null,'調合素材。攻撃・状態異常系の効果に使用',false],
  ['Fire Scroll','かとんのじゅつ','throw',200,'all_enemies','炎属性の全体攻撃',true],
  ['Water Scroll','すいとんのじゅつ','throw',200,'all_enemies','水属性の全体攻撃',true],
  ['Lightning Scroll','らいじんのじゅつ','throw',200,'all_enemies','雷属性の全体攻撃',true],
  ['Ash','すす','throw',null,'one_enemy','投擲素材',false],
  ['Magic Lamp','まほうのランプ','key_battle',null,'enemy_group','使用回数に応じた召喚を発動',false],
  ['Beastmaster Gourd','コルナゴのつぼ','key_battle',10000,'self','捕獲成功率を上げる装備品として扱う',true],
];

export const ff5Items = Object.freeze(itemRows.map(([nameEn, nameJa, category, buyPrice, target, effect, shopAvailable]) => Object.freeze({
  id: `item_${slug(nameEn)}`,
  sourceVersion: SOURCE_VERSION,
  nameJa,
  nameEn,
  category,
  buyPrice,
  sellPrice: buyPrice == null ? null : Math.floor(buyPrice / 2),
  target,
  effect,
  consumable: !['key_battle'].includes(category),
  shopAvailable,
  // All records are routed: direct-use items execute from Item; Mix/Drink/
  // Throw materials are visible with their correct command requirement.
  implemented: true,
})));

const weaponRows = [
  // type, English, Japanese, ATK, ACC, price, element, special
  ['sword','Broadsword','ブロードソード',15,100,280,null,null],['sword','Long Sword','ロングソード',22,100,480,null,null],['sword','Mythril Sword','ミスリルソード',31,100,880,null,null],['sword','Coral Sword','さんごのつるぎ',37,100,2800,'lightning',null],['sword','Ancient Sword','こだいのつるぎ',43,100,4200,null,'old'],['sword','Sleep Blade','ねむりのけん',49,100,5600,null,'sleep'],['sword','Rune Blade','ルーンブレイド',50,99,19000,null,'mp_critical'],['sword','Great Sword','グレートソード',57,100,8400,null,null],['sword','Flametongue','フレイムタン',63,100,10000,'fire',null],['sword','Icebrand','アイスブランド',65,100,11000,'ice',null],['sword','Blood Sword','ブラッドソード',84,25,16000,null,'hp_drain'],['sword','Defender','ディフェンダー',99,100,11000,null,'evasion_and_protect'],['sword','Excalipoor','エクスカリパー',100,128,2,null,'always_1_damage'],['sword','Enhancer','エンハンスソード',102,100,20000,null,'magic_plus'],['sword','Excalibur','エクスカリバー',110,100,20000,'holy',null],['sword','Ragnarok','ラグナロク',140,100,30000,null,null],['sword','Brave Blade','ブレイブブレイド',150,100,30000,null,'power_changes_with_escapes'],
  ['katana','Kunai','くない',29,100,600,null,null],['katana','Ashura','あしゅら',42,100,5800,null,'critical'],['katana','Wind Slash','かぜきりのやいば',44,100,100,'wind','wind_slash'],['katana','Kodachi','こだち',46,100,5100,null,null],['katana','Osafune','おさふね',51,100,8800,null,'critical'],['katana','Kotetsu','こてつ',58,100,11800,null,'critical'],['katana','Kikuichimonji','きくいちもんじ',87,100,14800,null,'critical'],['katana','Murasame','むらさめ',97,100,20000,null,'high_critical'],['katana',"Sasuke's Katana",'さすけのかたな',99,100,20000,null,'physical_evasion'],['katana','Masamune','まさむね',107,100,20000,null,'first_strike_and_haste'],['katana','Murakumo','あめのむらくも',117,100,30000,null,'critical'],
  ['knife','Chicken Knife','チキンナイフ',0,100,2,null,'power_changes_with_escapes'],['knife','Knife','ナイフ',7,100,150,null,null],['knife','Dagger','ダガー',14,100,300,null,null],['knife','Mythril Knife','ミスリルナイフ',23,100,450,null,null],['knife','Mage Masher','メイジマッシャー',31,100,900,null,'silence'],['knife','Main Gauche','マインゴーシュ',36,100,2600,null,'physical_evasion'],['knife','Orichalcum Dirk','オリハルコン',41,100,3400,null,null],['knife','Dancing Dagger','ダンシングダガー',51,100,5800,null,'dance_proc'],['knife','Air Knife','エアナイフ',56,100,6800,'wind','boost_wind'],['knife','Thief Knife','とうぞくのナイフ',66,100,6800,null,'steal_proc'],['knife',"Assassin's Dagger",'アサシンダガー',81,100,20000,null,'instant_death'],['knife','Man-Eater','マンイーター',89,100,2,null,'human_killer'],
  ['spear','Spear','スピア',25,100,100,null,null],['spear','Mythril Spear','ミスリルスピア',30,100,790,null,null],['spear','Trident','トライデント',38,100,2700,'lightning',null],['spear','Wind Spear','ウインドスピア',44,100,5400,'wind',null],['spear','Heavy Lance','ヘヴィランス',54,100,8100,null,null],['spear','Javelin','ジャベリン',55,100,100,null,null],['spear','Twin Lance','ツインランサー',61,100,10800,null,'double_hit'],['spear','Partisan','パルチザン',62,100,10200,null,null],['spear','Holy Lance','ホーリーランス',109,100,20000,'holy',null],['spear','Dragon Lance','ひりゅうのやり',119,100,30000,null,'dragon_killer'],
  ['axe','Battle Axe','バトルアクス',23,80,650,null,null],['hammer','Mythril Hammer','ミスリルハンマー',28,80,1050,null,null],['axe','Ogre Killer','オーガキラー',33,80,3200,null,'giant_killer'],['hammer','War Hammer','ウォーハンマー',38,80,6400,null,null],['axe','Death Sickle','デスシックル',43,85,5900,null,'instant_death'],['axe','Poison Axe','ポイズンアクス',48,80,9600,'poison','poison'],['hammer','Gaia Hammer','だいちのハンマー',58,80,12800,'earth','earthquake_proc'],['axe','Rune Axe','ルーンアクス',71,90,20000,null,'mp_critical'],['hammer',"Thor's Hammer",'トールのハンマー',81,80,30000,'lightning','throwable'],['axe',"Titan's Axe",'きょじんのおの',91,90,40000,null,null],
  ['staff','Healing Staff','いやしのつえ',0,128,900,null,'heal_on_hit'],['staff','Power Staff','ちからのつえ',0,128,1800,null,'berserk_on_hit'],['rod','Wonder Wand','ワンダーワンド',0,100,10000,null,'spell_cycle_and_return'],['rod','Rod','ロッド',8,70,200,null,null],['staff','Staff','つえ',9,95,200,null,null],['rod','Thunder Rod','いかずちのロッド',16,80,750,'lightning','boost_and_break_cast'],['rod','Frost Rod','こおりのロッド',16,80,750,'ice','boost_and_break_cast'],['rod','Flame Rod','ほのおのロッド',16,80,750,'fire','boost_and_break_cast'],['rod','Lilith Rod','リリスのロッド',30,80,3000,null,'mp_drain'],['rod','Poison Rod','ポイズンロッド',32,80,1500,'poison','boost_and_break_cast'],['rod','Magus Rod','ウィザードロッド',40,80,20000,null,'boost_fire_ice_lightning'],['staff','Staff of Light','ひかりのつえ',45,128,2700,'holy','break_cast_holy'],['staff',"Sage's Staff",'けんじゃのつえ',53,128,20000,'holy','boost_holy_and_raise'],['staff','Judgment Staff','さばきのつえ',60,128,30000,'holy','cast_dispel'],
  ['bow','Magic Bow','まふうじのゆみや',0,100,10000,null,'silence'],['bow','Silver Bow','ぎんのゆみや',38,70,1500,null,'two_handed'],['bow','Thunder Bow','いかずちのゆみや',39,70,2500,'lightning','two_handed'],['bow','Frost Bow','こおりのゆみや',39,70,2500,'ice','two_handed'],['bow','Flame Bow','ほのおのゆみや',39,70,2500,'fire','two_handed'],['bow','Dark Bow','くらやみのゆみや',43,70,3800,null,'blind'],['bow','Killer Bow','キラーボウ',49,70,5000,null,'instant_death'],['bow','Elven Bow','エルフィンボウ',56,90,7500,null,'two_handed'],['bow','Hayate Bow','はやてのゆみや',69,80,8500,null,'rapid_fire_proc'],['bow','Aevis Killer','エイビスキラー',91,100,20000,null,'aevis_killer'],['bow',"Yoichi's Bow",'よいちのゆみ',101,90,20000,null,'critical'],['bow',"Artemis's Bow",'アルテミスのゆみ',111,100,30000,null,'magic_beast_killer'],
  ['whip','Whip','むち',26,90,1100,null,'paralyze'],['whip','Blitz Whip','でんげきむち',42,90,2200,'lightning','thunder_proc'],['whip','Chain Whip','チェンウィップ',52,90,3300,null,'paralyze'],['whip','Beast Killer','ビーストキラー',72,100,15000,null,'magic_beast_killer'],['whip','Fire Lash','ファイアビュート',82,90,20000,'fire','firaga_proc'],['whip',"Dragon's Whisker",'りゅうのひげ',92,100,4400,null,'dragon_killer'],
  ['bell','Diamond Bell','ダイアのベル',24,128,500,null,null],['bell','Gaia Bell','だいちのベル',35,99,9000,'earth','earthquake_proc'],['bell','Rune Chime','ルーンのベル',45,99,20000,null,'multi_element_boost'],['bell','Tinklebell','ティンカーベル',55,128,1500,null,null],
  ['harp','Silver Harp','ぎんのたてごと',15,100,800,null,'two_handed'],['harp','Dream Harp','ゆめのたてごと',25,100,1600,null,'sleep'],['harp',"Lamia's Harp",'ラミアのたてごと',35,100,3200,null,'confuse'],['harp',"Apollo's Harp",'アポロンのハープ',45,128,20000,null,'dragon_and_undead_killer'],
  ['flail','Flail','フレイル',16,70,780,null,null],['flail','Morning Star','モーニングスター',50,90,7800,null,null],
  ['throwing','Ash','すす',25,100,2,null,'throw_only'],['throwing','Moonring Blade','えんげつりん',35,95,1100,null,'back_row_full_damage'],['throwing','Shuriken','しゅりけん',50,100,2500,null,'throw_only'],['throwing','Rising Sun','ライジングサン',71,90,11000,null,'back_row_full_damage'],['throwing','Fuma Shuriken','ふうましゅりけん',117,100,25000,null,'throw_only'],
];

const armorRows = [
  // slot, English, Japanese, DEF, MDEF, EVA, price, special
  ['body','Leather Armor','レザーアーマー',1,1,0,80,null],['body','Cotton Robe','もめんのローブ',2,4,0,300,null],['body','Copper Cuirass','どうのむねあて',3,2,0,350,null],['body','Bronze Armor','ブロンズアーマー',4,2,0,400,null],['body','Silk Robe','シルクのローブ',4,6,0,500,null],['body','Kenpo Gi','けんぽうぎ',5,2,0,450,'str_plus_1'],['body','Iron Armor','アイアンアーマー',6,2,0,500,null],['body',"Sage's Surplice",'しじんのふく',6,8,0,1000,'silence_immunity'],['body','Silver Plate','ぎんのむねあて',7,2,0,600,null],['body','Gaia Gear','だいちのころも',8,10,0,2000,'boost_earth'],['body','Ninja Suit','しのびのころも',9,2,0,3000,'agi_plus_1'],['body','Mythril Armor','ミスリルアーマー',9,2,0,700,null],['body','Angel Robe','てんしのはくい',10,11,0,3000,'poison_null_and_vit_plus_5'],['body','Power Sash','ちからだすき',11,0,0,4500,'str_plus_3'],['body','Luminous Robe','ひかりのローブ',11,12,0,4000,'mag_plus_2'],['body','Golden Armor','ゴールドアーマー',12,2,0,4000,null],['body','Diamond Plate','ダイアのむねあて',13,2,0,6000,'resist_lightning'],['body','Mirage Vest','ミラージュベスト',14,4,0,100,'auto_image'],['body','Black Robe','くろのローブ',14,14,0,8000,'mag_plus_5'],['body','White Robe','しろのローブ',14,14,0,8000,'vit_mag_plus_3'],['body','Diamond Armor','ダイアのよろい',15,2,0,8000,'resist_lightning'],['body','Black Garb','くろしょうぞく',17,2,0,9000,'str_agi_plus_1'],['body','Rainbow Dress','レインボードレス',18,3,0,5800,'confuse_immunity_and_dance_boost'],['body','Crystal Armor','クリスタルメイル',20,2,0,12000,null],['body','Genji Armor','げんじのよろい',22,2,0,30000,'confuse_toad_immunity'],['body','Bone Mail','ボーンメイル',30,5,0,2,'undead_properties'],
  ['shield','Leather Shield','レザーシールド',0,0,10,90,null],['shield','Bronze Shield','ブロンズシールド',1,0,15,290,null],['shield','Iron Shield','アイアンシールド',2,0,20,390,null],['shield','Mythril Shield','ミスリルシールド',3,0,25,590,null],['shield','Golden Shield','ゴールドシールド',4,0,30,3000,null],['shield','Aegis Shield','イージスのたて',5,0,33,4500,'petrify_immunity_and_magic_block'],['shield','Diamond Shield','ダイアのたて',6,0,35,6000,'resist_lightning'],['shield','Flame Shield','フレイムシールド',7,5,40,40000,'absorb_fire'],['shield','Ice Shield','アイスシールド',7,5,40,40000,'absorb_ice'],['shield','Crystal Shield','クリスタルのたて',8,0,45,9000,null],['shield','Genji Shield','げんじのたて',9,1,50,20000,'paralyze_mini_immunity'],
  ['head','Gold Hairpin','きんのかみかざり',0,2,0,30000,'half_mp_cost'],['head','Leather Cap','かわのぼうし',1,1,0,50,null],['head','Bronze Helm','ブロンズヘルム',2,2,0,250,null],['head','Plumed Hat','はねつきぼうし',2,2,0,350,null],['head','Green Beret','グリーンベレー',3,2,0,2500,'str_agi_plus_1'],['head',"Lamia's Tiara",'ラミアのティアラ',3,7,0,2500,'confuse_immunity_and_dance_boost'],['head','Iron Helm','アイアンヘルム',4,2,0,350,null],['head',"Wizard's Hat",'さんかくぼうし',4,2,0,1500,'mag_plus_1'],['head','Hypno Crown','ヒュプノクラウン',5,4,0,75000,'control_boost'],['head','Headband','ねじりはちまき',6,0,0,3500,'str_plus_3'],['head','Mythril Helm','ミスリルヘルム',6,2,0,550,null],['head',"Sage's Miter",'しさいのぼうし',6,2,0,3000,'mag_plus_2'],['head','Golden Helm','ゴールドヘルム',8,2,0,3500,null],['head','Tiger Mask','タイガーマスク',9,2,0,5000,null],['head','Diamond Helm','ダイアのかぶと',10,2,0,7000,'resist_lightning'],['head','Circlet','サークレット',10,2,0,4500,'mag_plus_3'],['head','Black Cowl','くろずきん',12,2,0,6500,'agi_plus_2'],['head','Ribbon','リボン',12,2,0,2,'most_status_immunity_and_all_stats_plus_5'],['head','Crystal Helm','クリスタルヘルム',13,2,0,10500,null],['head','Genji Helm','げんじのかぶと',15,2,0,25000,'confuse_mini_immunity'],['head','Thornlet','いばらのかんむり',20,5,0,2,'sap_sleep_immunity_mag_minus_5'],
  ['accessory','Reflect Ring','リフレクトリング',0,0,0,20000,'auto_reflect'],['accessory','Kornago Gourd','コルナゴのつぼ',0,0,0,10000,'catch_boost'],['accessory',"Hermes' Sandals",'エルメスのくつ',0,3,0,50000,'auto_haste_and_status_immunity'],['accessory','Elven Mantle','エルフのマント',0,3,0,4000,'physical_evasion'],['accessory','Leather Shoes','かわのくつ',1,1,0,70,null],['accessory','Silver Specs','ぎんぶちめがね',1,1,0,250,'blind_immunity'],['accessory','Silver Armlet','ぎんのうでわ',2,3,0,500,null],['accessory','Mythril Gloves','ミスリルのこて',3,0,0,600,null],['accessory','Power Armlet','パワーリスト',3,0,0,2500,'str_plus_3'],['accessory',"Thief's Gloves",'とうぞくのこて',4,0,0,3000,'steal_boost_agi_plus_1'],['accessory','Diamond Armlet','ダイアのうでわ',4,5,0,4000,null],['accessory','Flame Ring','ほのおのゆびわ',5,5,0,50000,'absorb_fire_null_ice_weak_water'],['accessory','Coral Ring','さんごのゆびわ',5,5,0,50000,'absorb_water_null_fire_weak_lightning'],['accessory','Angel Ring','てんしのゆびわ',5,10,0,50000,'zombie_old_immunity'],['accessory','Gauntlets','ガントレット',6,1,0,3000,null],['accessory','Kaiser Knuckles','カイザーナックル',8,0,0,15000,'barehanded_boost_str_plus_5'],['accessory',"Titan's Gloves",'きょじんのこて',9,1,0,5000,'mini_immunity_stat_changes'],['accessory','Protect Ring','まもりのゆびわ',10,10,0,30000,'auto_regen_vit_plus_5'],['accessory','Red Slippers','あかいくつ',11,2,0,9800,'confuse_immunity_and_dance_boost'],['accessory','Genji Gloves','げんじのこて',12,1,0,15000,'paralyze_toad_immunity'],['accessory','Cursed Ring','のろいのゆびわ',25,5,0,2,'auto_doom'],
];

export const ff5Equipment = Object.freeze([
  ...weaponRows.map(([type, nameEn, nameJa, attack, accuracy, buyPrice, element, special]) => Object.freeze({ id: `equipment_weapon_${slug(nameEn)}`, sourceVersion: SOURCE_VERSION, slot: 'weapon', type, nameJa, nameEn, attack, accuracy, defense: 0, magicDefense: 0, evasion: 0, buyPrice, sellPrice: Math.floor(buyPrice / 2), element, special, implemented: false })),
  ...armorRows.map(([slot, nameEn, nameJa, defense, magicDefense, evasion, buyPrice, special]) => Object.freeze({ id: `equipment_${slot}_${slug(nameEn)}`, sourceVersion: SOURCE_VERSION, slot, type: slot, nameJa, nameEn, attack: 0, accuracy: null, defense, magicDefense, evasion, buyPrice, sellPrice: Math.floor(buyPrice / 2), element: null, special, implemented: false })),
]);

export const ff5Shops = Object.freeze([
  { id:'shop_tule', nameJa:'トゥール', inventoryTags:['early','weapon','armor','item','white_magic','black_magic'] },
  { id:'shop_carwen', nameJa:'カーウェン', inventoryTags:['early','weapon','armor','item','white_magic','black_magic'] },
  { id:'shop_walse', nameJa:'ウォルス', inventoryTags:['early','weapon','armor','item','time_magic','summon_magic'] },
  { id:'shop_karnak', nameJa:'カルナック', inventoryTags:['world_1','weapon','armor','item','white_magic','black_magic','time_magic'] },
  { id:'shop_jachol', nameJa:'ジャコール', inventoryTags:['world_1','weapon','armor','item','white_magic'] },
  { id:'shop_crescent', nameJa:'クレセント', inventoryTags:['world_1','weapon','armor','item','black_magic'] },
  { id:'shop_lix', nameJa:'リックス', inventoryTags:['world_1','discount','item'] },
  { id:'shop_regole', nameJa:'ルゴル', inventoryTags:['world_2','weapon','armor','item','magic'] },
  { id:'shop_quelb', nameJa:'ケルブ', inventoryTags:['world_2','weapon','armor','item','magic'] },
  { id:'shop_bal', nameJa:'バル城', inventoryTags:['world_2','weapon','armor','item','magic'] },
  { id:'shop_surgate', nameJa:'サーゲイト城', inventoryTags:['world_2','weapon','armor','item','magic'] },
  { id:'shop_moore', nameJa:'ムーア', inventoryTags:['world_2','armor','item','level_5_magic'] },
  { id:'shop_istory', nameJa:'イストリー', inventoryTags:['world_1','item','time_magic'] },
  { id:'shop_phantom_village', nameJa:'蜃気楼の町', inventoryTags:['merged_world','endgame','weapon','armor','item','hidden_magic'] },
].map((shop) => Object.freeze({ ...shop, sourceVersion: SOURCE_VERSION, implemented: false })));

export const crystalShards = Object.freeze([
  { id:'shard_azure', nameJa:'蒼光のかけら', nameEn:'Azure Shard', rarity:'rare', element:'water', techniqueId:'crystal_aqua_spiral', techniqueNameJa:'アクアスパイラル', lore:'水の記憶が結晶化したかけら', implemented:false },
  { id:'shard_ember', nameJa:'紅蓮のかけら', nameEn:'Ember Shard', rarity:'rare', element:'fire', techniqueId:'crystal_flame_burst', techniqueNameJa:'フレイムバースト', lore:'熱と闘争の記憶が結晶化したかけら', implemented:false },
  { id:'shard_storm', nameJa:'紫電のかけら', nameEn:'Storm Shard', rarity:'rare', element:'lightning', techniqueId:'crystal_lightning_edge', techniqueNameJa:'ライトニングエッジ', lore:'雷鳴の記憶が結晶化したかけら', implemented:false },
  { id:'shard_verdant', nameJa:'翠風のかけら', nameEn:'Verdant Shard', rarity:'rare', element:'wind', techniqueId:'crystal_wind_cutter', techniqueNameJa:'ウィンドカッター', lore:'風の記憶が結晶化したかけら', implemented:false },
]);

export const equipmentBySlot = Object.freeze(Object.fromEntries(
  ff5BattleRules.equipmentSlots.map((slot) => [slot, Object.freeze(ff5Equipment.filter((item) => item.slot === slot))])
));

export const selectableAbilities = Object.freeze(ff5JobAbilities.filter((ability) => ability.type === 'command'));

export const ff5Database = Object.freeze({
  meta: ff5DatabaseMeta,
  battleRules: ff5BattleRules,
  magic: ff5Magic,
  jobAbilities: ff5JobAbilities,
  songs: ff5Songs,
  items: ff5Items,
  equipment: ff5Equipment,
  shops: ff5Shops,
  crystalShards,
});
