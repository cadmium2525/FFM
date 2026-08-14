/**
 * FFV Mix/Combine table.
 *
 * The 12 x 12 result matrix is transcribed from MixComboTbl at D1/6EF9 in
 * the SFC disassembly.  Only the upper triangle is exposed because ingredient
 * order does not change the result: 12 * 13 / 2 = 78 selectable recipes.
 */

export const FF5_MIX_INGREDIENTS = Object.freeze([
  ['item_potion', 'ポーション'],
  ['item_hi_potion', 'ハイポーション'],
  ['item_phoenix_down', 'フェニックスのお'],
  ['item_ether', 'エーテル'],
  ['item_antidote', 'どくけし'],
  ['item_eye_drops', 'めぐすり'],
  ['item_maiden_s_kiss', 'おとめのキッス'],
  ['item_holy_water', 'せいすい'],
  ['item_elixir', 'エリクサー'],
  ['item_turtle_shell', 'かめのこうら'],
  ['item_dragon_fang', 'りゅうのきば'],
  ['item_dark_matter', 'ダークマター'],
]);

// Result ids are the original byte values from the SFC MixComboTbl.
const RESULT_MATRIX = Object.freeze([
  [0x0a,0x0b,0x0c,0x0d,0x0e,0x0f,0x0a,0x10,0x11,0x12,0x13,0x14],
  [0x0b,0x15,0x16,0x0d,0x0e,0x0f,0x15,0x17,0x11,0x12,0x13,0x14],
  [0x0c,0x16,0x10,0x0d,0x19,0x1a,0x10,0x0c,0x1b,0x1c,0x1d,0x1e],
  [0x0d,0x0d,0x0d,0x0d,0x19,0x1a,0x0d,0x1f,0x0d,0x0d,0x22,0x23],
  [0x0e,0x0e,0x19,0x19,0x24,0x25,0x26,0x27,0x28,0x29,0x2a,0x2b],
  [0x0f,0x0f,0x1a,0x1a,0x25,0x0f,0x2c,0x2d,0x2e,0x2f,0x30,0x31],
  [0x0a,0x15,0x10,0x0d,0x26,0x2c,0x32,0x33,0x34,0x35,0x36,0x37],
  [0x10,0x17,0x0c,0x1f,0x27,0x2d,0x33,0x38,0x39,0x3a,0x3b,0x3c],
  [0x11,0x11,0x1b,0x0d,0x28,0x2e,0x34,0x39,0x3d,0x3e,0x3f,0x40],
  [0x12,0x12,0x1c,0x0d,0x29,0x2f,0x35,0x3a,0x3e,0x41,0x42,0x43],
  [0x13,0x13,0x1d,0x22,0x2a,0x30,0x36,0x3b,0x3f,0x42,0x44,0x45],
  [0x14,0x14,0x1e,0x23,0x2b,0x31,0x37,0x3c,0x40,0x43,0x45,0x46],
]);

const result = (name, effect, target = 'single-any') => Object.freeze({ name, effect, target });

export const FF5_MIX_RESULTS = Object.freeze({
  0x0a: result('ポーション', 'potion'),
  0x0b: result('ライフウォーター', 'lifewater', 'single-ally'),
  0x0c: result('リザレクション', 'resurrection', 'single-ally'),
  0x0d: result('エクスポーション', 'x-potion', 'single-ally'),
  0x0e: result('ニュートラライズ', 'neutralizer', 'single-ally'),
  0x0f: result('キュアブラインド', 'cure-blind', 'single-ally'),
  0x10: result('フェニックスのお', 'phoenix-down', 'single-ally'),
  0x11: result('エリクサー', 'elixir', 'single-ally'),
  0x12: result('エーテル', 'ether', 'single-ally'),
  0x13: result('ドラゴンパワー', 'dragon-power'),
  0x14: result('デビルジュース', 'devil-juice', 'single-enemy'),
  0x15: result('ハイポーション', 'hi-potion', 'single-ally'),
  0x16: result('リザレクション', 'resurrection', 'single-ally'),
  0x17: result('ハーフエリクサー', 'balm', 'single-ally'),
  0x19: result('レジストアイス', 'resist-ice', 'single-ally'),
  0x1a: result('レジストサンダー', 'resist-thunder', 'single-ally'),
  0x1b: result('リンカネーション', 'reincarnate', 'single-ally'),
  0x1c: result('ばんのうやく', 'remedy', 'single-ally'),
  0x1d: result('ドラゴンアーマー', 'dragon-defense', 'single-ally'),
  0x1e: result('デスポーション', 'death-potion', 'single-enemy'),
  0x1f: result('リリスのキッス', 'lilith-kiss', 'single-enemy'),
  0x22: result('ドラゴンシールド', 'dragon-shield', 'single-ally'),
  0x23: result('ダークエーテル', 'dark-ether', 'single-enemy'),
  0x24: result('どくけし', 'antidote', 'single-ally'),
  0x25: result('きつけぐすり', 'smelling-salts', 'single-ally'),
  0x26: result('レビテト', 'levisalve', 'single-ally'),
  0x27: result('サムソンパワー', 'samson-power'),
  0x28: result('エリクサー', 'elixir', 'single-ally'),
  0x29: result('かめのこうらわり', 'turtle-soup', 'single-enemy'),
  0x2a: result('ポイズンブレス', 'poison-breath', 'all_enemies'),
  0x2b: result('ポイズン', 'poison', 'single-enemy'),
  0x2c: result('ラミアのキッス', 'lamia-kiss', 'single-enemy'),
  0x2d: result('エレメンタルパワー', 'elemental-power', 'single-ally'),
  0x2e: result('エリクサー', 'elixir', 'single-ally'),
  0x2f: result('ヘイストドリンク', 'hasty-ade', 'single-ally'),
  0x30: result('ダークサイ', 'dark-sigh', 'single-enemy'),
  0x31: result('ダークガス', 'dark-gas', 'all_enemies'),
  0x32: result('おとめのキッス', 'maiden-kiss', 'single-ally'),
  0x33: result('しゅくふくのキッス', 'blessed-kiss'),
  0x34: result('リリスのキッス', 'lilith-kiss', 'single-enemy'),
  0x35: result('サキュバスのキッス', 'succubus-kiss', 'single-enemy'),
  0x36: result('りゅうのくちづけ', 'dragon-kiss'),
  0x37: result('トードキッス', 'toad-kiss', 'single-enemy'),
  0x38: result('せいすい', 'holy-water', 'single-ally'),
  0x39: result('エリクサー', 'elixir', 'single-ally'),
  0x3a: result('バッカスのさけ', 'bacchus-cider'),
  0x3b: result('ホーリーブレス', 'holy-breath', 'single-enemy'),
  0x3c: result('しっぱいさく', 'dud-poison', 'single-enemy'),
  0x3d: result('エリクサー', 'elixir', 'single-ally'),
  0x3e: result('しっぱいさく', 'antilixir', 'single-enemy'),
  0x3f: result('ゴライアストニック', 'goliath', 'single-ally'),
  0x40: result('アンチリクサー', 'antilixir', 'single-enemy'),
  0x41: result('プロテクトポーション', 'protect-potion', 'single-ally'),
  0x42: result('しっぱいさく', 'dud-gravity', 'single-enemy'),
  0x43: result('TNT', 'tnt', 'all_enemies'),
  0x44: result('ドラゴンブレス', 'dragon-breath', 'all_enemies'),
  0x45: result('ダークブレス', 'dark-breath', 'single-enemy'),
  0x46: result('シャドウフレア', 'shadowflare', 'single-enemy'),
});

export const ff5MixActions = Object.freeze(FF5_MIX_INGREDIENTS.flatMap(([firstId, firstName], row) =>
  FF5_MIX_INGREDIENTS.slice(row).map(([secondId, secondName], offset) => {
    const column = row + offset;
    const resultId = RESULT_MATRIX[row][column];
    const spec = FF5_MIX_RESULTS[resultId];
    return Object.freeze({
      id: `mix-${row}-${column}`,
      name: spec.name,
      description: `${firstName} + ${secondName}`,
      actionKind: 'special-command',
      specialCommand: 'mix',
      ingredients: [firstId, secondId],
      mixEffect: spec.effect,
      mixResultId: resultId,
      target: spec.target,
      ctbCost: 1.2,
    });
  })
));
