/**
 * FF5 ボス技 参照データベース（日本語データ版）
 * ----------------------------------------------------
 * 目的：原作『ファイナルファンタジーV』のストーリー/隠しボスが使用する技を集約し、
 * ボスの技として実装する際にそのまま参照できる形にしておく（`BossActionProfiles.js`
 * のようなキットへ転記しやすい形）。このファイルはまだ戦闘には接続されていない
 * 参照カタログであり、`ff5Database.js` / `battleCatalog.js` とは独立している
 * （`scripts/validate-database.mjs` の厳密なレコード数検証の対象外）。
 *
 * データ出典・方針
 * ----------------
 * 全レコードを日本語の攻略情報（ピクセルリマスター版のボス個別ページ、および
 * GBA版の行動パターンまとめページ）から収集し、技名・弱点属性は日本語表記の
 * まま採用している。英語名は内部識別用のローマ字ID（`id`フィールド）にのみ
 * 使用し、UIに表示される`nameJa`・`note`等はすべて日本語。
 * 効果の説明文(`note`)は出典の文章をそのまま転記せず、技名から一般的なFF
 * シリーズの用語知識に基づいて簡潔に要約したオリジナルの文章。
 *
 * `nameConfidence`：
 *   - 'high'   : ピクセルリマスター版の個別攻略ページで技名を直接確認済み。
 *   - 'medium' : GBA版まとめページの技名を採用（PR版でも同名の可能性が高いが、
 *                個別ページ未確認、またはEXステージ限定でPR未実装のため）。
 *
 * HP等の数値は原作の一例（多くはGBA版基準）であり、相対的な強さの参考値。
 * FFM独自のボスステータス（`src/data/bossData.js`）と一致させる必要はない。
 */

/** 技1件分のショートハンド */
const T = (nameJa, element, target, power, statuses, note) => ({
  nameJa,
  element: element ?? null,
  target, // battleCatalog.js の targetDescriptors と同じ語彙（one_enemy/all_enemies/self/all_allies/one_ally）。行動主(ボス側)から見た表現
  power, // 'low' | 'medium' | 'high' | 'extreme'（そのボス内での相対的な強さ）
  statuses: statuses ?? [],
  note,
  implemented: false,
});

const bossRows = [
  // [id, nameJa, location, world, referenceHp, weaknessElement, statusWeakness, nameConfidence, techniques[]]

  ['wing_raptor', 'ウイングラプター', '風の神殿', 1, 250, null, null, 'high', [
    T('つめ', null, 'one_enemy', 'medium', [], '翼を閉じた防御形態のときに使う反撃技。'),
    T('ブレスウイング', null, 'all_enemies', 'medium', [], '翼を開いた通常形態で使う全体攻撃。'),
    T('形態変化', null, 'self', 'low', [], '通常形態と防御形態を切り替える。防御形態は防御力が高く、攻撃すると反撃される。'),
  ]],

  ['karlabos', 'カーラボス', 'トルナ運河', 1, 650, 'lightning', null, 'high', [
    T('しょくしゅ', null, 'one_enemy', 'medium', ['paralyze'], '触手による攻撃で、マヒを狙う。'),
    T('テールスクリュー', null, 'one_enemy', 'high', [], '単体を瀕死状態にする強力な尾撃。'),
  ]],

  ['siren', 'セイレーン', '船の墓場', 1, 900, null, null, 'high', [
    T('ライブラ', null, 'one_enemy', 'low', [], '対象のレベル・HP・弱点・状態異常を調べる。'),
    T('プロテス', null, 'self', 'low', ['protect'], '自身の物理防御を上げる。'),
    T('サイレス', null, 'one_enemy', 'low', ['silence'], '対象を沈黙状態にする。'),
    T('スリプル', null, 'one_enemy', 'low', ['sleep'], '対象を睡眠状態にする。'),
    T('ブリザド', 'ice', 'one_enemy', 'medium', [], '冷気属性の単体魔法。'),
    T('サンダー', 'lightning', 'one_enemy', 'medium', [], '雷属性の単体魔法。'),
    T('スロウ', null, 'one_enemy', 'low', ['slow'], '対象の行動速度を下げる。'),
    T('ヘイスト', null, 'one_enemy', 'low', ['haste'], '対象の行動速度を上げる。'),
    T('だきしめる', null, 'one_enemy', 'medium', ['poison'], 'アンデッド状態のときに使う、毒を伴う抱擁攻撃。'),
    T('形態変化', null, 'self', 'low', [], '通常状態とアンデッド状態を一定周期で切り替える。アンデッド時は弱点が炎になる。'),
  ]],

  ['magissa', 'マギサ', '北の山', 1, 650, null, null, 'high', [
    T('クリティカル', null, 'one_enemy', 'medium', [], '会心の一撃となる通常攻撃。'),
    T('ファイア', 'fire', 'one_enemy', 'medium', [], '炎属性の単体魔法。'),
    T('ブリザド', 'ice', 'one_enemy', 'medium', [], '冷気属性の単体魔法。'),
    T('サンダー', 'lightning', 'one_enemy', 'medium', [], '雷属性の単体魔法。'),
    T('ドレイン', null, 'one_enemy', 'medium', [], 'HPを吸収する単体魔法。'),
    T('リジェネ', null, 'one_ally', 'low', ['regen'], '相方フォルツァに継続回復を付与する。'),
    T('エアロ', 'wind', 'one_enemy', 'medium', [], '風属性の単体魔法。HP300程度まで削るとフォルツァを呼ぶ。'),
  ]],

  ['forza', 'フォルツァ', '北の山', 1, 850, null, null, 'high', [
    T('たたかう', null, 'one_enemy', 'medium', [], '通常攻撃。'),
    T('タックル', null, 'one_enemy', 'high', [], '強力な体当たり攻撃。マギサのHPが一定以下になると登場する。'),
  ]],

  ['garula', 'ガルラ', 'ウォルス城', 1, 1200, null, null, 'high', [
    T('突進', null, 'one_enemy', 'high', [], 'ダメージを与えると誘発される反撃技を含む強力な突撃。'),
    T('トード', null, 'one_enemy', 'low', ['toad'], 'カエル状態のときのみ使用する、対象をカエルに変える技。'),
  ]],

  ['shiva_boss', 'シヴァ、アイスコマンダー×3', 'ウォルス城', 1, 1500, 'fire', null, 'high', [
    T('ブリザラ', 'ice', 'one_enemy', 'high', [], 'シヴァが前列・後列に交互に放つ冷気属性魔法。'),
    T('たたかう', null, 'one_enemy', 'medium', [], '護衛のアイスコマンダー(3体)による通常攻撃。'),
  ]],

  ['liquid_flame', 'リクイドフレイム', '火力船', 1, 3000, 'ice', null, 'high', [
    T('炎', 'fire', 'all_enemies', 'high', [], '人型形態で使う全体炎属性攻撃。'),
    T('突進', null, 'one_enemy', 'medium', [], '人型形態の通常攻撃。'),
    T('ファイラ', 'fire', 'one_enemy', 'high', [], '手形態・渦形態が使う炎属性魔法。'),
    T('指先', null, 'one_enemy', 'medium', [], '手形態の物理攻撃。魔法が効きにくい。'),
    T('マグネット', null, 'all_enemies', 'low', [], '渦形態が使う、パーティを引き寄せる技。'),
    T('形態変化', null, 'self', 'low', [], 'ダメージを受けると人型・手・渦の3形態をランダムに切り替える。'),
  ]],

  ['iron_claw', 'アイアンクロー', 'カルナック城', 1, 900, null, null, 'high', [
    T('デスクロー', null, 'one_enemy', 'high', ['paralyze'], '瀕死状態と麻痺を狙う爪撃。'),
  ]],

  ['ifrit_boss', 'イフリート', '古代図書館', 1, 3000, 'ice', null, 'high', [
    T('ファイラ', 'fire', 'one_enemy', 'high', [], '炎属性の単体魔法。'),
    T('炎', 'fire', 'all_enemies', 'high', [], '全体炎属性攻撃。'),
    T('ハイキック', null, 'one_enemy', 'medium', [], '通常の蹴り技。'),
  ]],

  ['byblos', 'ビブロス', '古代図書館', 1, 3600, 'fire', null, 'high', [
    T('マジックハンマー', null, 'one_enemy', 'low', [], '対象のMPを半減させる。'),
    T('かまいたち', 'wind', 'all_enemies', 'high', [], '風の刃による全体攻撃。'),
    T('怪音波', null, 'one_enemy', 'low', [], '対象のレベルを半減させる。'),
    T('くもの糸', null, 'one_enemy', 'low', ['slow'], '対象の行動速度を下げる。'),
    T('コンフュ', null, 'one_enemy', 'low', ['confuse'], '魔法攻撃を受けたときに使う反撃、対象を混乱させる。'),
    T('トード', null, 'one_enemy', 'low', ['toad'], '対象をカエルに変える。'),
    T('プロテス', null, 'self', 'low', ['protect'], '物理攻撃を受けたときに使う反撃、自身の物理防御を上げる。'),
    T('ドレイン', null, 'one_enemy', 'high', [], 'HPが減っているときに使う反撃、HPを吸収する。'),
  ]],

  ['ramuh_boss', 'ラムウ', '森', 1, 4000, null, null, 'high', [
    T('サンダラ', 'lightning', 'one_enemy', 'high', [], '雷属性の単体魔法（メインの攻撃）。'),
    T('稲妻', 'lightning', 'one_enemy', 'medium', [], '雷属性の単体攻撃。'),
    T('電撃', 'lightning', 'one_enemy', 'medium', [], '雷属性の単体攻撃。'),
    T('フラッシュ', null, 'all_enemies', 'low', ['blind'], '全体を暗闇状態にする。'),
    T('アスピル', null, 'one_enemy', 'low', [], '対象のMPを吸収する。'),
  ]],

  ['sandworm', 'サンドウォーム', 'ラーツ砂漠', 1, 3000, 'water', null, 'high', [
    T('流砂', 'earth', 'all_enemies', 'medium', [], '地属性の全体攻撃。'),
    T('グラビデ', null, 'one_enemy', 'medium', [], '対象の現在HPの一定割合を奪う。'),
  ]],

  ['craliclaw', 'クレイクロウ', '飛空艇襲撃', 1, 2000, 'lightning', null, 'high', [
    T('粘液', null, 'one_enemy', 'medium', ['slow'], '継続ダメージと速度低下を与える粘液攻撃。'),
    T('テールスクリュー', null, 'one_enemy', 'high', [], '単体を瀕死状態にする尾撃。'),
  ]],

  ['adamantoise', 'アダマンタイマイ', null, 1, 2000, 'ice', null, 'high', [
    T('たたかう', null, 'one_enemy', 'medium', [], '通常攻撃のみを行う。特殊な技は使わない。'),
  ]],

  ['sol_cannon', 'ソルカノン、ランチャー×2', 'ロンカ遺跡', 1, 22500, 'lightning', null, 'high', [
    T('波動砲', null, 'all_enemies', 'extreme', [], 'ソルカノン本体が使う全体無属性大ダメージ。'),
    T('老化ミサイル', null, 'one_enemy', 'high', ['old'], 'ランチャー(2体)が使う、対象を老化させるミサイル攻撃。両者ともHPが1万を切ると自滅する。'),
  ]],

  ['archeoaevis', 'アルケオエイビス', 'ロンカ遺跡', 1, 6400, 'wind', null, 'high', [
    T('ブレスウイング', null, 'all_enemies', 'high', [], '前半・後半共通で使う全体攻撃。'),
    T('炎', 'fire', 'all_enemies', 'high', [], '全体炎属性攻撃。'),
    T('ブレイズ', 'fire', 'all_enemies', 'high', [], '前半で使う炎属性の全体攻撃。'),
    T('稲妻', 'lightning', 'one_enemy', 'medium', [], '前半で使う雷属性攻撃。'),
    T('しっぽ', null, 'one_enemy', 'medium', [], '前半の尾による物理攻撃。'),
    T('爪', null, 'one_enemy', 'medium', [], '前半の爪による物理攻撃。'),
    T('くちばし', null, 'one_enemy', 'medium', [], '後半のくちばしによる物理攻撃。'),
    T('ミールストーム', null, 'all_enemies', 'extreme', [], '後半が使う、対象を瀕死状態にする全体攻撃。'),
    T('きば', null, 'one_enemy', 'medium', [], '後半の牙による物理攻撃。'),
    T('まきつき', null, 'one_enemy', 'medium', [], '後半の巻きつき攻撃。'),
    T('形態変化', null, 'self', 'low', [], '1600ダメージ毎に弱点属性が無→氷→炎→雷と循環する（前半）。一定ダメージで後半形態へ移行する。'),
  ]],

  ['titan_boss', 'タイタン', 'カルナッククレーター', 1, 2500, null, 'stop', 'high', [
    T('アースシェイカー', 'earth', 'all_enemies', 'extreme', [], '浮遊していない対象全体への大ダメージ地属性攻撃。ラストアタックとして使用。'),
    T('クリティカル', null, 'one_enemy', 'medium', [], '会心の一撃となる通常攻撃。'),
  ]],

  ['purobolos', 'ピュロボロス（6体）', 'ウォルスクレーター', 1, 1500, null, null, 'high', [
    T('自爆', null, 'one_enemy', 'extreme', [], '自爆による大ダメージの単体攻撃。'),
    T('ケアルラ', null, 'self', 'medium', [], '自身のHPを回復する。'),
    T('アレイズ', null, 'one_ally', 'low', [], '倒れた仲間を蘇生させる。ラストアタックとして使用。'),
  ]],

  ['chimera_brain', 'キマイラブレイン', 'ゴーンクレーター', 1, 3300, null, 'stop', 'high', [
    T('アクアブレス', 'water', 'all_enemies', 'high', [], '全体水属性のブレス攻撃。'),
    T('ブレイズ', 'fire', 'all_enemies', 'high', [], '全体炎属性攻撃。'),
  ]],

  ['abductor', 'アブダクター', '無人島／バル城／エクスデス城', 2, 2500, null, 'petrify', 'high', [
    T('物理攻撃', null, 'one_enemy', 'medium', [], '通常の打撃攻撃。'),
    T('ハリケーン', 'wind', 'one_enemy', 'extreme', [], '対象のHPを1桁まで削る強力な風属性攻撃。'),
    T('吸血', null, 'one_enemy', 'medium', [], 'HPを吸収する攻撃。'),
  ]],

  ['gilgamesh', 'ギルガメッシュ', '第2〜第3世界を通して複数回登場', 2, null, null, null, 'high', [
    T('たたかう', null, 'one_enemy', 'medium', [], '基本の通常攻撃。1回目・5回目はこれのみで、一定条件で戦闘が終了する。'),
    T('かまいたち', 'wind', 'all_enemies', 'high', [], '2回目以降に使用する風の刃による全体攻撃。'),
    T('エアロラ', 'wind', 'one_enemy', 'high', [], '風属性の単体魔法。'),
    T('ジャンプ', null, 'one_enemy', 'extreme', [], '空中に退避してから急降下する強力な一撃。'),
    T('ゴブリンパンチ', null, 'one_enemy', 'high', [], '強力な物理攻撃。'),
    T('ヘイスト・シェル・プロテス', null, 'self', 'low', ['haste', 'shell', 'protect'], 'ダメージが一定量を超えると自身に3つの補助魔法をまとめてかける。'),
    T('ハリケーン', 'wind', 'one_enemy', 'extreme', [], '4回目に使用する強力な風属性攻撃。'),
    T('怪しい踊り', null, 'one_enemy', 'low', ['confuse'], '対象を混乱させる。'),
    T('フラッシュ', null, 'all_enemies', 'low', ['blind'], '全体を暗闇にする。'),
    T('ロケットパンチ', null, 'one_enemy', 'high', [], '強力な物理攻撃。'),
  ]],

  ['enkidu', 'エンキドウ', 'ゼザの飛空艇', 2, 4000, null, 'petrify', 'high', [
    T('ホワイトウインド', null, 'all_allies', 'medium', [], '使用者の現在HP相当を味方全体に回復する。'),
    T('かまいたち', 'wind', 'all_enemies', 'high', [], '風の刃による全体攻撃。'),
    T('糸', null, 'one_enemy', 'low', ['slow'], '対象の行動速度を下げる。'),
    T('怪音波', null, 'one_enemy', 'low', [], '対象のレベルを半減させる。'),
  ]],

  ['tyrazaurus', 'ティラザウルス', '地下水脈', 2, 5000, 'fire', null, 'high', [
    T('ポイズンブレス', 'poison', 'all_enemies', 'medium', ['poison'], '全体に毒を付与するブレス攻撃。'),
    T('ボーン', null, 'one_enemy', 'medium', ['zombie'], '対象をゾンビ状態にする骨の技。'),
  ]],

  ['hiryusou', '飛竜草、飛竜花', '飛竜の谷', 2, 12000, null, 'stop', 'high', [
    T('白髪の花粉', null, 'one_enemy', 'medium', ['old'], '飛竜花が使う、老化を伴う花粉攻撃。'),
    T('猛毒の花粉', 'poison', 'one_enemy', 'medium', ['poison'], '飛竜花が使う、毒を伴う花粉攻撃。'),
    T('暗闇の花粉', null, 'one_enemy', 'medium', ['blind'], '飛竜花が使う、暗闇を伴う花粉攻撃。'),
    T('呪縛の花粉', null, 'one_enemy', 'medium', ['paralyze'], '飛竜花が使う、状態異常を伴う花粉攻撃。'),
    T('花を呼ぶ', null, 'self', 'low', [], '飛竜草が毎ターン新しい飛竜花を呼び出す。飛竜草自体は直接攻撃してこない。'),
  ]],

  ['golem_rescue', 'ドラゴンゾンビー、ボーンドラゴン（ゴーレム護衛戦）', '飛竜の谷', 2, null, null, null, 'high', [
    T('たたかう', null, 'one_enemy', 'medium', [], 'アンデッド系モンスター2体による通常攻撃。守るべき「ゴーレム」自体は攻撃してこない。'),
  ]],

  ['atomos_boss', 'アトモス', 'バリアタワー', 2, 19997, null, 'sleep', 'high', [
    T('コメット', null, 'one_enemy', 'extreme', [], '対象をほぼ瀕死にする強力な単体無属性ダメージ。繰り返し使用する。'),
    T('グラビデ', null, 'one_enemy', 'medium', [], '対象の現在HPの一定割合を奪う。'),
    T('ワームホール', null, 'one_ally', 'low', [], '倒れた味方を吸い込む演出技。吸い込まれる前に蘇生しておく必要がある。'),
    T('スロウガ', null, 'all_enemies', 'low', ['slow'], '全体の行動速度を下げる。'),
    T('オールド', null, 'one_enemy', 'low', ['old'], '対象を老化させる。'),
  ]],

  ['catoblepas', 'カトブレパス', 'チョコボの森', 2, 5000, null, 'petrify', 'high', [
    T('悪魔の瞳', null, 'one_enemy', 'medium', ['petrify'], '攻撃を受けたときに使う反撃、対象の石化を狙う。'),
    T('ドレイン', null, 'one_enemy', 'medium', [], 'HPを吸収する単体攻撃。'),
  ]],

  ['crystal_quartet', 'クリスタル×4', '封印の洞窟', 2, 7777, null, 'doom', 'high', [
    T('ファイガ', 'fire', 'one_enemy', 'high', [], '炎のクリスタルが使う強力な炎属性魔法。'),
    T('エアロガ', 'wind', 'one_enemy', 'high', [], '風のクリスタルが使う強力な風属性魔法。'),
    T('アースシェイカー', 'earth', 'all_enemies', 'extreme', [], '地のクリスタルが使う全体地属性大ダメージ。'),
    T('アクアブレス', 'water', 'all_enemies', 'high', [], '水のクリスタルが使う全体水属性攻撃。'),
    T('強化', null, 'self', 'low', [], '各クリスタルのHPが3000を切ると、より強力な技を使うようになる。'),
  ]],

  ['gilgame_turtle', 'ギルガメ', 'からっぽの宝箱／EXステージ', 2, 7000, 'ice', null, 'high', [
    T('たたかう', null, 'one_enemy', 'high', [], 'ほぼ全ての属性攻撃を吸収する亀型ボス。冷気属性以外はほとんど通じない。'),
  ]],

  ['carbuncle_boss', 'カーバンクル', 'エクスデス城', 2, 15000, null, null, 'high', [
    T('ファイラ', 'fire', 'one_enemy', 'high', [], '炎属性の単体魔法。常時リフレク状態で使用。'),
    T('ブリザラ', 'ice', 'one_enemy', 'high', [], '冷気属性の単体魔法。'),
    T('サンダラ', 'lightning', 'one_enemy', 'high', [], '雷属性の単体魔法。'),
    T('コンフュ', null, 'one_enemy', 'low', ['confuse'], '対象を混乱させる。'),
    T('バイオ', 'poison', 'one_enemy', 'high', ['poison'], '強力な毒属性魔法。'),
    T('ストップ', null, 'one_enemy', 'low', ['stop'], '対象の時間を止める。'),
    T('ケアルラ', null, 'self', 'medium', [], '魔法攻撃を3ターン受けるとリフレクを解除して自身を回復し、状態異常を治療して再びリフレクをかけ直す。'),
  ]],

  ['gilgamesh_4', 'ギルガメッシュ（4回目）', 'エクスデス城', 2, 55000, null, null, 'high', [
    T('ハリケーン', 'wind', 'one_enemy', 'extreme', [], '強力な風属性攻撃。'),
    T('怪しい踊り', null, 'one_enemy', 'low', ['confuse'], '対象を混乱させる。'),
    T('フラッシュ', null, 'all_enemies', 'low', ['blind'], '全体を暗闇にする。'),
    T('ロケットパンチ', null, 'one_enemy', 'high', [], '強力な物理攻撃。13000程度ダメージを与えるとイベントが発生し、戦闘が終了する。'),
  ]],

  ['exdeath_1', 'エクスデス（1回目）', 'エクスデス城', 2, 32768, 'holy', null, 'high', [
    T('死の宣告', null, 'one_enemy', 'medium', ['doom'], '一定時間後の即死を宣告する。'),
    T('アースシェイカー', 'earth', 'all_enemies', 'high', [], '浮遊していない対象全体への地属性大ダメージ。'),
    T('レベル3フレア', null, 'all_enemies', 'extreme', [], 'レベルが3の倍数の対象に大ダメージを与える。'),
    T('ゾンビブレス', null, 'all_enemies', 'high', ['zombie'], '全体をゾンビ化させるブレス。'),
    T('真空波', null, 'one_enemy', 'high', [], '単体への強力な無属性攻撃。'),
    T('ミールストーム', null, 'all_enemies', 'extreme', [], '対象を瀕死状態にする全体攻撃。'),
    T('磁場転換', null, 'all_enemies', 'low', [], 'パーティの前衛・後衛を入れ替える。'),
    T('重力100', null, 'all_enemies', 'low', ['float'], '浮遊状態を強制的に解除する。'),
    T('グラビデ', null, 'one_enemy', 'medium', [], '対象の現在HPの一定割合を奪う。'),
    T('炎', 'fire', 'all_enemies', 'high', [], '全体炎属性攻撃。'),
    T('ディスペル', null, 'one_enemy', 'low', [], '対象の有利な状態を解除する。'),
    T('ヘイスト', null, 'self', 'low', ['haste'], '自身の行動速度を上げる。'),
    T('ファイガ・ブリザガ・サンダガ', null, 'one_enemy', 'high', [], 'HPが半分以下になった後半で使用する各属性の強力な魔法。'),
  ]],

  ['antlion', 'アントリオン', '禁断の地周辺', 3, null, 'water', null, 'medium', [
    T('たたかう', null, 'one_enemy', 'medium', [], '砂を好む性質を持ち、水属性攻撃が弱点。'),
  ]],

  ['melusine', 'メリュジーヌ', '元老の樹', 3, 20000, null, null, 'high', [
    T('ファイガ', 'fire', 'one_enemy', 'high', [], '結界の色に応じて切り替わる炎属性魔法。'),
    T('ブリザガ', 'ice', 'one_enemy', 'high', [], '結界の色に応じて切り替わる冷気属性魔法。'),
    T('サンダガ', 'lightning', 'one_enemy', 'high', [], '結界の色に応じて切り替わる雷属性魔法。'),
    T('誘惑', null, 'one_enemy', 'low', ['confuse'], '対象を魅了・混乱させる。'),
  ]],

  ['gargoyle_pair', 'ガーゴイル×2', 'ピラミッド／孤島の神殿／大海溝／東の村滝で繰り返し登場', 3, 5000, null, null, 'high', [
    T('たたかう', null, 'one_enemy', 'high', [], '通常攻撃。'),
    T('フュージョン', null, 'one_ally', 'low', [], '自身を犠牲に相方のHPを全回復させる。相方は撃破しても復活する。'),
  ]],

  ['stoker', 'ストーカー', '孤島の神殿', 3, 20000, null, null, 'high', [
    T('ブレイズ', 'fire', 'all_enemies', 'high', [], '全体攻撃を受けたときに使う反撃の炎属性技。'),
    T('ハリケーン', 'wind', 'one_enemy', 'extreme', [], '強力な風属性攻撃。'),
    T('マインドブラスト', null, 'one_enemy', 'medium', ['paralyze'], '継続ダメージと麻痺を与える。'),
  ]],

  ['minotaur', 'ミノタウロス', null, 3, 19850, null, null, 'high', [
    T('たたかう', null, 'one_enemy', 'extreme', [], '強力な通常攻撃のみを行う。聖属性を吸収する。'),
  ]],

  ['omniscient', 'すべてを知る者', null, 3, 16999, 'wind', null, 'high', [
    T('黒魔法・白魔法・時空魔法', null, 'one_enemy', 'high', [], 'ほとんどの黒魔法・白魔法・時空魔法をランダムに使用する。'),
    T('フレア', null, 'one_enemy', 'extreme', [], 'ラストアタックとして使用する防御無視の無属性大ダメージ。'),
    T('リターン', null, 'all_allies', 'low', [], '物理攻撃を受けると戦闘開始時まで時間を巻き戻す。魔法攻撃で攻める必要がある。'),
  ]],

  ['gogo_boss', 'ものまねしゴゴ', null, 3, 47714, null, null, 'high', [
    T('ものまね', null, 'self', 'low', [], 'パーティが直前に取った行動をそのまま真似する。何もしなければゴゴも何もせず、戦闘を終わらせられる。'),
  ]],

  ['odin_boss', 'オーディン', null, 3, 17000, null, 'petrify', 'high', [
    T('ザンテツケン', null, 'all_enemies', 'extreme', [], '制限時間（約1分）以内に倒せないと使われる強力な全体斬撃。'),
  ]],

  ['triton_trio', 'トライトン、ネレゲイド、フォーボス', '大海溝', 3, 13333, null, 'undead_petrify', 'high', [
    T('デルタアタック', null, 'one_enemy', 'high', ['petrify'], '3体そろっている間だけ使える合体攻撃。'),
    T('火炎放射', 'fire', 'all_enemies', 'high', [], 'トライトンが使う全体炎属性攻撃。'),
    T('ファイガ', 'fire', 'one_enemy', 'high', [], 'トライトンが使う炎属性魔法。'),
    T('吹雪', 'ice', 'all_enemies', 'high', [], 'ネレゲイドが使う全体冷気属性攻撃。'),
    T('ブレイズ', 'fire', 'all_enemies', 'high', [], 'ネレゲイドが使う全体炎属性攻撃。'),
    T('ブリザガ', 'ice', 'one_enemy', 'high', [], 'ネレゲイドが使う冷気属性魔法。'),
    T('虹色の風', null, 'one_enemy', 'medium', ['blind', 'silence'], 'フォーボスが使う、暗闇と沈黙を伴う攻撃。'),
    T('バイオ', 'poison', 'one_enemy', 'medium', ['poison'], 'フォーボスが使う毒属性魔法。'),
  ]],

  ['leviathan_boss', 'リヴァイアサン', '東の村滝', 3, 40000, 'lightning', null, 'high', [
    T('しっぽ', null, 'one_enemy', 'extreme', [], '強力な尾撃。'),
    T('タイダルウェイブ', 'water', 'all_enemies', 'extreme', [], '全体水属性の大ダメージ攻撃。'),
  ]],

  ['bahamut_boss', 'バハムート', '北の山', 3, 40000, null, 'stop', 'high', [
    T('メガフレア', null, 'all_enemies', 'extreme', [], '戦闘開始直後とHPが1万を切った後に使う切り札級の全体無属性大ダメージ。リフレクで反射可能。'),
    T('アトミックレイ', null, 'all_enemies', 'high', [], '全体無属性攻撃。'),
    T('ブレイズ', 'fire', 'all_enemies', 'high', [], '全体炎属性攻撃＋スリップダメージ。'),
    T('アースシェイカー', 'earth', 'all_enemies', 'high', [], '浮遊していない対象全体への地属性大ダメージ。レビテトで無効化できる。'),
    T('ほのお', 'fire', 'all_enemies', 'medium', [], '全体炎属性攻撃。'),
    T('アクアブレス', 'water', 'all_enemies', 'medium', [], '全体水属性のブレス攻撃。'),
    T('いなずま', 'lightning', 'all_enemies', 'medium', [], '全体雷属性攻撃。'),
    T('ふぶき', 'ice', 'all_enemies', 'medium', [], '全体冷気属性攻撃。'),
    T('ミールストーム', null, 'all_enemies', 'extreme', [], '対象を瀕死状態にする全体攻撃。'),
    T('ゾンビブレス', null, 'all_enemies', 'high', ['zombie'], '全体攻撃＋戦闘不能になるとゾンビ化させるブレス。'),
    T('ポイズンブレス', 'poison', 'all_enemies', 'medium', ['poison'], '全体に毒を付与するブレス。'),
  ]],

  ['calofisteri', 'カロフィステリ', null, 3, 18000, null, null, 'high', [
    T('リフレク', null, 'self', 'low', ['reflect'], '自身に魔法反射を付与する。'),
    T('ストップ', null, 'one_enemy', 'low', ['stop'], '対象の時間を止める。'),
    T('オールド', null, 'one_enemy', 'low', ['old'], '対象を老化させる。'),
    T('プロテス', null, 'self', 'low', ['protect'], '自身の物理防御を上げる。'),
    T('ケアルラ', null, 'self', 'medium', [], '自身のHPを回復する。'),
    T('ヘイスト', null, 'self', 'low', ['haste'], '自身の行動速度を上げる。'),
    T('シェル', null, 'self', 'low', ['shell'], '自身の魔法防御を上げる。'),
    T('エスナ', null, 'self', 'low', [], '自身の不利な状態を治療する。'),
    T('リジェネ', null, 'self', 'low', ['regen'], '自身に継続回復を付与する。'),
    T('バイオ', 'poison', 'one_enemy', 'medium', ['poison'], '毒属性の単体魔法。'),
    T('ドレイン', null, 'one_enemy', 'medium', [], 'HPを吸収する単体攻撃。'),
  ]],

  ['apanda', 'アパンダ', null, 3, 22200, 'fire', null, 'high', [
    T('コンフュ', null, 'one_enemy', 'low', ['confuse'], '対象を混乱させる。'),
    T('糸', null, 'one_enemy', 'low', ['slow'], '対象の行動速度を下げる。'),
    T('マジックハンマー', null, 'one_enemy', 'low', [], '対象のMPを半減させる。'),
    T('怪音波', null, 'one_enemy', 'low', [], '対象のレベルを半減させる。'),
    T('かまいたち', 'wind', 'all_enemies', 'high', [], '風の刃による全体攻撃。'),
    T('治療', null, 'self', 'low', [], '自身の状態を回復する。'),
  ]],

  ['apocryphos', 'アポカリョープス', null, 3, 27900, 'poison', null, 'high', [
    T('青魔法', null, 'one_enemy', 'high', [], 'パーティが使用した青魔法を模倣して使い返してくる。'),
  ]],

  ['alte_roite', 'アルテロイテ、ジュラエイビス', null, 3, null, null, null, 'medium', [
    T('たたかう（アルテロイテ）', null, 'one_enemy', 'medium', [], 'アルテロイテ（第一形態、複数体）による通常攻撃。'),
    T('サークル', null, 'one_enemy', 'low', [], '対象を戦闘から強制的に除外する。'),
    T('たたかう（ジュラエイビス）', null, 'one_enemy', 'high', [], 'ジュラエイビス（真の姿）による通常攻撃。'),
  ]],

  ['catastrophe', 'カタストロフィー', null, 3, 19997, null, null, 'high', [
    T('アースシェイカー', 'earth', 'all_enemies', 'extreme', [], '浮遊していない対象全体への地属性大ダメージ。'),
    T('悪魔の瞳', null, 'one_enemy', 'medium', ['petrify'], '対象の石化を狙う。'),
    T('重力100', null, 'all_enemies', 'low', ['float'], '浮遊状態を強制的に解除する。パーティが浮遊している限り優先して使用する。リフレクで跳ね返せる。'),
  ]],

  ['halicarnassus', 'ハリカルナッソス', null, 3, 33333, null, null, 'high', [
    T('クルルルル', null, 'all_enemies', 'low', ['toad'], '戦闘開始時にパーティ全体をカエルに変える鳴き声。'),
    T('ディスペル', null, 'one_enemy', 'low', [], '対象の有利な状態を解除する。'),
    T('ヘイスト', null, 'self', 'low', ['haste'], '自身の行動速度を上げる。'),
    T('シェル', null, 'self', 'low', ['shell'], '自身の魔法防御を上げる。'),
    T('ホーリー', 'holy', 'one_enemy', 'extreme', [], '聖属性の大ダメージ魔法。'),
    T('パワーを集中', null, 'self', 'low', [], '次の攻撃の威力を高める。'),
  ]],

  ['twintania', 'ツインタニア', null, 3, 50000, null, null, 'high', [
    T('かまいたち', 'wind', 'all_enemies', 'medium', [], '風の刃による全体攻撃。'),
    T('吹雪', 'ice', 'all_enemies', 'high', [], '全体冷気属性攻撃。'),
    T('メガフレア', null, 'all_enemies', 'extreme', [], '魔法攻撃を受けたときのカウンターとして使う全体無属性大ダメージ。'),
    T('タイダルウェイブ', 'water', 'all_enemies', 'extreme', [], '物理攻撃を受けたときのカウンターとして使う全体水属性大ダメージ。'),
    T('ギガフレア', null, 'all_enemies', 'extreme', [], '6ターン目以降にパワーアップして使う切り札級の全体大ダメージ。'),
    T('マインドブラスト', null, 'one_enemy', 'medium', ['paralyze'], '継続ダメージと麻痺を与える。'),
  ]],

  ['gilgamesh_5', 'ギルガメッシュ（5回目）', null, 3, 7000, null, null, 'high', [
    T('たたかう', null, 'one_enemy', 'medium', [], '通常攻撃のみ。イベント戦であり、一定条件で戦闘が終了する。'),
  ]],

  ['necrophobe', 'ネクロフォビア、バリア×4', null, 3, 44044, null, null, 'high', [
    T('フラッシュ', null, 'one_enemy', 'low', ['blind'], '本体が使う暗闇付与攻撃。'),
    T('ハリケーン', 'wind', 'one_enemy', 'extreme', [], '本体が使う強力な風属性攻撃。'),
    T('真空波', null, 'one_enemy', 'high', [], '本体が使う無属性攻撃。'),
    T('デス', null, 'one_enemy', 'medium', [], '本体が使う即死級の技。'),
    T('フレア', null, 'one_enemy', 'extreme', [], 'バリア(4体)が使う無属性大ダメージ。'),
    T('ホーリー', 'holy', 'one_enemy', 'extreme', [], 'バリアが使う聖属性大ダメージ。'),
    T('ファイガ・ブリザガ・サンダガ', null, 'one_enemy', 'high', [], 'バリアが使う各属性の魔法攻撃。'),
  ]],

  ['exdeath_2', 'エクスデス（2回目）', null, 3, 49001, null, null, 'high', [
    T('ホワイトホール', null, 'one_enemy', 'extreme', ['petrify'], '即死または石化を狙う技。'),
    T('ホーリー', 'holy', 'one_enemy', 'extreme', [], '聖属性の大ダメージ魔法。HP30000程度から魔法を使い始める。'),
    T('フレア', null, 'one_enemy', 'extreme', [], '防御を無視する無属性の大ダメージ魔法。'),
    T('死の宣告', null, 'one_enemy', 'medium', ['doom'], '一定時間後の即死を宣告する。'),
    T('メテオ', null, 'all_enemies', 'extreme', [], 'HPが1万を切ると使用する、複数回のランダムダメージを与える全体魔法。'),
  ]],

  ['neo_exdeath', 'ネオエクスデス', null, 3, null, null, null, 'high', [
    T('真空波', null, 'one_enemy', 'high', [], '右上のパーツが使う無属性攻撃。'),
    T('ディスペル', null, 'one_enemy', 'low', [], '右上のパーツが使う、有利な状態の解除。'),
    T('アルマゲスト', null, 'all_enemies', 'extreme', [], '右下のパーツが使う全体大ダメージ攻撃。'),
    T('グランドクロス', null, 'all_enemies', 'extreme', ['poison', 'blind', 'silence', 'confuse', 'paralyze', 'sleep', 'toad', 'mini'], '左上のパーツが使う、複数の状態異常をランダムに付与する全体攻撃。'),
    T('メテオ', null, 'all_enemies', 'extreme', [], '左上のパーツが使う全体ランダムダメージ。'),
    T('残り1体の強化', null, 'all_enemies', 'extreme', [], '4パーツのうち1体だけ残ると、アルマゲスト・メテオ・コメット・真空波を連続で使うようになる。'),
  ]],

  ['omega_boss', 'オメガ', null, 3, 55530, 'lightning', null, 'high', [
    T('アトミックレイ', null, 'all_enemies', 'extreme', [], '全体無属性大ダメージ。'),
    T('デルタアタック', null, 'one_enemy', 'medium', ['petrify'], '対象の石化を狙う。'),
    T('ブラスター', null, 'one_enemy', 'high', [], '単体への強力な攻撃。'),
    T('波動砲', null, 'all_enemies', 'extreme', [], '全体無属性大ダメージ。'),
    T('火炎放射', 'fire', 'all_enemies', 'high', [], '全体炎属性攻撃。'),
    T('虹色の風', null, 'one_enemy', 'medium', ['blind', 'silence'], '暗闇と沈黙を伴う攻撃。'),
    T('地震', 'earth', 'all_enemies', 'high', [], '全体地属性攻撃。'),
    T('ミールストーム', null, 'all_enemies', 'extreme', [], '対象を瀕死状態にする全体攻撃。'),
    T('ターゲッティング', null, 'one_enemy', 'high', [], '特定の対象を狙い撃つ攻撃。カーバンクルのリフレクで反射可能。'),
    T('ロケットパンチ', null, 'one_enemy', 'high', ['confuse'], '物理攻撃を受けたときのカウンター。対象のHPを半減させ混乱させる。'),
    T('マスタードボム', null, 'one_enemy', 'high', [], '魔法攻撃を受けたときのカウンター。'),
    T('サークル', null, 'one_enemy', 'low', [], '対象を戦闘から強制的に除外するカウンター。'),
  ]],

  ['shinryu', 'しんりゅう', null, 3, 55500, null, null, 'high', [
    T('タイダルウェイブ', 'water', 'all_enemies', 'extreme', [], '戦闘開始直後に使う全体水属性大ダメージ。'),
    T('死のルーレット', null, 'all_enemies', 'extreme', [], 'ランダムな対象に即死を狙う。'),
    T('ミールストーム', null, 'all_enemies', 'extreme', [], '対象を瀕死状態にする全体攻撃。'),
    T('アトミックレイ', null, 'all_enemies', 'high', [], '全体無属性攻撃。'),
    T('吹雪', 'ice', 'all_enemies', 'extreme', [], '全体冷気属性大ダメージ。'),
    T('稲妻', 'lightning', 'all_enemies', 'high', [], '全体雷属性攻撃。'),
    T('レベル2オールド', null, 'all_enemies', 'low', ['old'], 'レベルが2の倍数の対象を老化させる。'),
    T('レベル3フレア', null, 'all_enemies', 'extreme', [], 'レベルが3の倍数の対象へ大ダメージ。'),
    T('マイティガード', null, 'self', 'low', ['protect', 'shell'], '自身にプロテスとシェルを同時付与する。'),
    T('悪魔の瞳', null, 'one_enemy', 'medium', ['petrify'], '対象の石化を狙う。'),
    T('ポイズンブレス', 'poison', 'all_enemies', 'medium', ['poison'], '全体に毒を付与するブレス。'),
  ]],

  // ---- EXステージ（GBA/モバイル版のみ。ピクセルリマスターには非搭載） ----

  ['gilgame_turtle_2', 'ギルガメ（2回目）', 'EXステージ', 'ex', 50000, 'ice', null, 'medium', [
    T('亀の甲羅', null, 'one_enemy', 'high', [], '物理攻撃を受けたときのカウンター技。'),
    T('地震', 'earth', 'all_enemies', 'extreme', [], 'ラストアタックとして使用する全体地属性大ダメージ。'),
  ]],

  ['gran_avis', 'グランエイビス、ダークエレメント×2', 'EXステージ', 'ex', 42000, null, null, 'medium', [
    T('ゾンビーパウダー', null, 'all_enemies', 'high', ['zombie'], 'グランエイビスが使う、全体をゾンビ化させる技。'),
    T('精霊', null, 'one_enemy', 'medium', [], 'グランエイビスが使う攻撃。'),
    T('ブレスウイング', null, 'all_enemies', 'high', [], 'グランエイビスが使う全体攻撃。'),
    T('ポイズンブレス', 'poison', 'all_enemies', 'medium', ['poison'], 'グランエイビスが使う全体毒属性攻撃。'),
    T('ミールストーム', null, 'all_enemies', 'extreme', [], 'グランエイビスが使う、対象を瀕死にする全体攻撃。'),
    T('悪魔の瞳', null, 'one_enemy', 'medium', ['petrify'], 'グランエイビスが使う石化狙いの技。'),
    T('攻撃魔法', null, 'one_enemy', 'high', [], 'ダークエレメント(2体)が使う各種攻撃魔法。撃破後も時間経過で再出現する。'),
  ]],

  ['omega_mk2', 'オメガ改', 'EXステージ', 'ex', 65000, 'ice', null, 'medium', [
    T('アトミックレイ・ブラスター・デルタアタック', null, 'all_enemies', 'extreme', ['petrify'], '1ターン目に使用する連続攻撃。'),
    T('波動砲', null, 'all_enemies', 'extreme', [], '偶数ターンに使用する全体無属性大ダメージ。'),
    T('火炎放射・虹色の風', 'fire', 'all_enemies', 'high', ['blind', 'silence'], '奇数ターンに使用する連続攻撃。'),
    T('ターゲッティング', null, 'one_enemy', 'high', [], '6ターン目に使用する狙い撃ち攻撃。'),
    T('サークル・回復', null, 'self', 'low', [], '物理攻撃を受けたときのカウンター。対象を除外しつつ自身のHPを全回復する。'),
    T('マスタードボム・ロケットパンチ', null, 'one_enemy', 'high', [], '魔法攻撃を受けたときのカウンター。'),
    T('バリアチェンジ', null, 'self', 'low', [], '弱点属性を周期的に変更する。'),
  ]],

  ['shinryu_mk2', '神竜改', 'EXステージ', 'ex', 65000, null, null, 'medium', [
    T('マイティガード', null, 'self', 'low', ['protect', 'shell'], '開始直後に自身へプロテスとシェルを付与する。'),
    T('ミールストーム', null, 'all_enemies', 'extreme', [], '対象を瀕死状態にする全体攻撃。'),
    T('吹雪・炎', null, 'all_enemies', 'high', [], '冷気と炎の複合全体攻撃。'),
    T('ゾンビブレス・稲妻', null, 'all_enemies', 'high', ['zombie'], 'ゾンビ化を伴う全体攻撃と雷属性攻撃の組み合わせ。'),
    T('ポイズンブレス・ブレスウイング', 'poison', 'all_enemies', 'medium', ['poison'], '毒を伴う全体攻撃の組み合わせ。'),
    T('カーズ', null, 'one_enemy', 'medium', [], '対象を呪う技。'),
    T('アルマゲスト・タイダルウェイブ', null, 'all_enemies', 'extreme', [], '全体大ダメージの複合攻撃。'),
    T('ホワイトホール', null, 'one_enemy', 'extreme', ['petrify'], '物理攻撃を受けたときのカウンター。'),
    T('ギガフレア・メテオ', null, 'all_enemies', 'extreme', [], 'ファイナルアタックとして連続使用する切り札級の大ダメージ。'),
  ]],

  ['archeodemon', 'アルケオデーモン', 'EXステージ', 'ex', 50000, null, null, 'medium', [
    T('ドレインタッチ', null, 'one_enemy', 'medium', [], 'HPを吸収する接触攻撃。'),
    T('フレア', null, 'one_enemy', 'extreme', [], '無属性の大ダメージ魔法。'),
    T('パワーを集中', null, 'self', 'low', [], '次の攻撃の威力を高める。'),
    T('メガフレア・ギガフレア', null, 'all_enemies', 'extreme', [], '力を集中した後に放つ全体大ダメージ。'),
    T('ホーリー', 'holy', 'one_enemy', 'extreme', [], 'HPが減少した後半で使用する聖属性大ダメージ。'),
    T('メテオ', null, 'all_enemies', 'extreme', [], 'HP減少後に使用する全体ランダムダメージ。'),
    T('ハリケーン', 'wind', 'one_enemy', 'extreme', [], 'HP減少後に使用する強力な風属性攻撃。'),
    T('デス', null, 'self', 'low', [], '物理攻撃を受けたときのカウンター。'),
    T('カーズ', null, 'one_enemy', 'medium', [], '魔法攻撃を受けたときのカウンター。'),
  ]],

  ['guardian_quartet', 'ガーディアン、波動砲、ランチャー×2', 'EXステージ', 'ex', 55000, null, null, 'medium', [
    T('たたかう', null, 'one_enemy', 'medium', [], '護衛の波動砲・ランチャーを倒すまでガーディアン本体には攻撃が届かない。護衛は時間経過で復活する。'),
  ]],

  ['enuo', 'エヌオー', 'EXステージ', 'ex', 65000, null, null, 'medium', [
    T('たたかう', null, 'one_enemy', 'medium', [], '前半・後半で中身の異なる別個体。ダミーターゲットを2つ持つ。'),
  ]],
];

export const ff5BossTechniquesMeta = Object.freeze({
  id: 'ff5_boss_techniques_ja_v2',
  version: 2,
  sourceVersion: 'Final Fantasy V ピクセルリマスター版（一部GBA版基準）',
  sourceNote: '日本語の攻略情報サイトを複数参照し、技名・弱点属性の表記をピクセルリマスター版に統一。効果説明は出典の文章を転記せず独自に要約。',
  locale: 'ja-JP',
  updatedAt: '2026-08-12',
  bossCount: bossRows.length,
  policy: 'FFVの原作ボスが使用する技を日本語データで正規化して収集した「実装準備用」の参照データ。まだ戦闘には接続されていない（implemented:false）。',
});

export const ff5BossTechniques = Object.freeze(
  bossRows.map(([id, nameJa, location, world, hp, weaknessElement, statusWeakness, nameConfidence, techniques]) => Object.freeze({
    id: `bossref_${id}`,
    nameJa,
    nameConfidence, // 'high' | 'medium' -- see file header
    location,
    world, // 1 | 2 | 3 | 'ex'
    referenceHp: hp, // 原作の一例（相対的な参考値）
    weaknessElement,
    statusWeakness, // 属性以外の弱点についての自由記述（例: 石化に弱い、浮遊解除を優先する等）
    techniques: Object.freeze(techniques.map((technique, index) => Object.freeze({
      ...technique,
      id: `bosstech_${id}_${String(index + 1).padStart(2, '0')}`,
    }))),
    implemented: false,
    runtimeReady: false, // battleCatalogアダプタ未接続。src/database/README.mdの接続方法を参照
  }))
);

/** 参照用: ff5BossTechniquesById['bossref_bahamut_boss'] */
export const ff5BossTechniquesById = Object.freeze(
  Object.fromEntries(ff5BossTechniques.map((boss) => [boss.id, boss]))
);
