# SFC版 三属性黒魔法9種 参照票

対象は日本版SFC『ファイナルファンタジーV』（1992年）。2026-08-22に、実装より先に公開SFCプレイ映像をブラウザでコマ送りし、9技の構図・色・進行と根拠フレームhashを固定した。映像そのものはリポジトリへ同梱しない。

- 映像参照: https://www.youtube.com/watch?v=QPG8KZ25gGw
- 映像タイトル: `【FF5】 黒魔法のまとめ`
- 動画内区間: 下位3種 `0:00–0:20`、中位3種 `0:34–0:56`、上位3種 `1:15–1:37`
- 技術参照: https://github.com/everything8215/ff5 (`src/btlgfx/btlgfx-main.asm`, `_d838ec`)
- SFC attack animation header: 9技とも `20 10 07 00 FF`
- 共有原作family: `black-magic-script-07`

逆アセンブル上、黒魔法ID `$00–$11` の先頭18件は同じ5-byte headerを共有する。三属性9技を人工的に無関係な構図へ分離せず、共通の緑色詠唱オーラ、script `$07` の対象表示、パレット循環、結果確定という時間構造を共有する。属性と段階による原作側のスプライト選択だけを描き分ける。

## 観察した構図

- ファイア: 対象の足元から橙・赤・白の単発炎柱が立ち上がる。
- ファイラ: 複数の炎が対象の左右を輪状に包む。全面爆発や魔法陣はない。
- ファイガ: 対象輪郭へ黄→橙→赤の強い炎と色循環が重なる。別ヒットを作らない。
- ブリザド: 対象を青白い氷殻で覆い、足元に小さな氷片を残す。
- ブリザラ: 足元から複数の青い氷柱が順にせり上がり、対象が凍結色へ変わる。
- ブリザガ: より明るい青白の氷殻と密な氷柱・氷粒で対象全身を覆う。
- サンダー: 画面を紫へ寄せ、対象へ淡い桃紫の稲妻を落とす。
- サンダラ: 黄・金の局所雷撃が対象と足元へ集中する。
- サンダガ: 紫の予兆に続き、淡桃・白の稲妻を高密度で反復する。

portrait変換では詠唱オーラを実術者中心、属性スプライトを実対象中心へ置く。単体／全体の対象配列を保持し、固定座標や対象重心だけへ誤着弾させない。

## 根拠フレーム

| 技 | 局面 | 秒 | SHA-256 |
|---|---|---:|---|
| ファイア | cast | 0.919045 | `dc7de31b2741abe0ce7c3a7305f7f9b2c560fffb17d91562a1f60cb145c1a736` |
| ファイア | development | 2.080940 | `8208f4d19683cd98222aaa62ea0aa8dfc8db2c7d8b4d4dca514b2a36be07ce0a` |
| ファイア | impact | 2.316222 | `a6539393ff57dbb5a338a832cbfce32ee973855810afed0ee3aa688769ab41b2` |
| ファイア | decay | 2.676112 | `dcecce6c8647bdc564b62e50dc64bc8b8482353bc55736ecf2c21c19bff974aa` |
| ファイラ | cast | 34.995880 | `f94684fa566c136b90e3dd520d01ac9936eabf6b486094807ee5d743d067bdf3` |
| ファイラ | development | 35.523696 | `b7a3307577fd007ea47f6bec2d23273f09d45c78c4096c927c793e3f11c1e64b` |
| ファイラ | impact | 36.090133 | `fd3d9e7f948632034358f0ac12cf7bf2456a20697b02613b2566c05ff8f324ed` |
| ファイラ | decay | 36.918791 | `2979b182d0d11abee596d49a43fb682709df8115f617616d88bf10506cce882a` |
| ファイガ | cast | 75.625583 | `3e05ae93604f19891f2fb8236a711531fc10aee664401810b7f423dd0cfff32a` |
| ファイガ | development | 76.459980 | `6d540758a872101e754736de5dd54423bcda9301a1b40786db5244bab4fa8e5d` |
| ファイガ | impact | 77.291860 | `b0d050c07b8da36a30ddfd9574177b256867e586b46104bdf300d9d38727b791` |
| ファイガ | decay | 78.318771 | `de01b65840919b71b616a23926c0c7e655750ba0ca459f267e5d06e4115d87ab` |
| ブリザド | cast | 7.301164 | `7848cfc3c0b1504bdcf0e71e07769a7bf392f1a3beaa755768623860648e1a7a` |
| ブリザド | development | 8.092301 | `c87c3afb9e0cde008a729b638376901e6c698a98ac6606deb10e2c12a7b37f89` |
| ブリザド | impact | 8.404596 | `64b84a532d479f0c56047f69da89b8095dacf07a9c845036bc67f3d34dbc06e8` |
| ブリザド | decay | 8.769240 | `8d02c64d6fd75b77df47f8b691ae710fe8532c682801d28033ee6c863486c799` |
| ブリザラ | cast | 42.031560 | `315f8f386234e3041009b0db1a7bbf19a2d3898dd81e304d8e756bbfcb3d776e` |
| ブリザラ | development | 42.563021 | `0a5913d37ac228e785d490a6fec746b3da4c06f5319facb4cc5d96d91bc9344e` |
| ブリザラ | impact | 43.132612 | `fce22946db86e7337c5fb8d139eaea9352a1e7184cf9b63fd4eaf89ffad88468` |
| ブリザラ | decay | 43.913016 | `b421517c024505c05fddbe1f6676aaee396620e8b8c9739a6bb219c25766b79f` |
| ブリザガ | cast | 82.990968 | `e40ebb8e9b3b2674d9bbb4fbe03407cdc54695971349336b747a7762efb3c1ff` |
| ブリザガ | development | 83.866287 | `cdf3f281ad1424793b287fed3151d4ad537403dfe92c3ed08965c3ebbcb2da60` |
| ブリザガ | impact | 84.461453 | `440d66ceab7452d11f0796edd47d3df0e8c26f5ec902bab69243e63f6253236d` |
| ブリザガ | decay | 85.000000 | `c164c906fee86163073452a9506793a24a327b79fca01a755726833b57004c9f` |
| サンダー | cast | 16.315797 | `746fc93f9b99200becb1b7a2b3a7a97d1a11502df3036cd77163fad31566fcaa` |
| サンダー | development | 16.783676 | `09704f1b5401515f29dc642bcfe76a0746120f2a48d8d23b7d219541e149d290` |
| サンダー | impact | 17.163490 | `53cb05e11deed74ee9e7dbc137132a1553cb86ee4b23864edc31163dea100e04` |
| サンダー | decay | 17.494573 | `bb3ba5c28e9ee495a5d6e7c4e26a3efe57cb6f4256d1408c984b4b1095cc68a5` |
| サンダラ | cast | 49.311104 | `87e123f564337a08c53969f4ba1f8d0223bc299237700e61326a37f0011bf1f7` |
| サンダラ | development | 49.869657 | `e1f0bfeb45d7dd2ce3e0e60b8ce3e066516ec6d4746cc1869d37c0cc425c2d4c` |
| サンダラ | impact | 50.000000 | `cbcd70bfc8b5fa9653be4731822198b7d780483438a0441299ef6957f542be96` |
| サンダラ | decay | 51.208483 | `aa8cffd8381c12bfdde6314becd6328050db2218f3d6feb3f588637a229e4c9f` |
| サンダガ | cast | 93.935228 | `9e55bdeb6291a90edc7ff5c490e5d926173603ab04bcc17bb3987b48560e64c1` |
| サンダガ | development | 94.382253 | `68fc7d076c7774909d4335ffba245650eb3a2395a011e518d3def769ccd820fc` |
| サンダガ | impact | 94.979887 | `dcbb8b5b16ef2987468d1147c9e513909fa1458bab2ca08f62575edd361a88c5` |
| サンダガ | decay | 95.471761 | `02afb5303957937feee98e9432c18d958abff935bb388da9aa410cd42cf68694` |

## 現在の判定

9技を `reference-locked` とする。映像、4局面、hash、原作共有header、portrait変換を実装前に確定した。原作フレームとの自動画像差分、原作SE、iPhone 12実機性能は未検査のため `golden-pass` ではない。
