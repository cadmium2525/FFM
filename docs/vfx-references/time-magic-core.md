# 時空魔法4件 SFC-JP原作参照記録

## 対象と制作ゲート

対象はヘイスト、グラビデ、メテオ、リターン。描画を変更する前に1992年SFC日本版の公開プレイ映像をブラウザで停止し、開始・展開・着弾・余韻を確認した。併せてSFC逆アセンブルの `_d838ec` tableから5-byte animation headerを固定した。原作画像や音声はリポジトリへ同梱せず、出典時刻と取得画面のSHA-256のみ保存する。

- 映像: [【FF5】 時空魔法のまとめ](https://www.youtube.com/watch?v=-2avOoXFONk)
- 確認日: 2026-08-22
- 対象版: SFC-JP-1992
- 公開映像: 4:3ゲーム画面、30fps相当
- 取得環境: Codex in-app Browser、1280×720 viewport内のYouTubeプレイヤー
- 逆アセンブル: `everything8215/ff5` の `_d838ec` animation table
- 検証状態: 4件とも `reference-locked`。原作動画との自動画像差分、SE照合、iPhone 12実機性能は未実施なので `golden-pass` ではない。

## 原作で確認した構図

- ヘイスト: 対象の周囲へ灰白色の短い放射片が出現し、橙色の大球と4個の小衛星へ切り替わって消える。時計、針、青い速度線は使われない。
- グラビデ: 術者側の灰白色放射から暗い藍色球が射出され、対象を包む青い球殻へ移行する。着弾時は球殻内部に白い稲妻状の亀裂が走る。
- メテオ: 戦場全体を赤黒いパレットへ繰り返し変調し、赤・橙・黄の火球が複数方向から連続落下する。4回のダメージ表示は各着弾cueへ分離する。
- リターン: 対象スプライトが粗い矩形ピクセルへ拡大・崩壊しながら画面が暗転し、最後は黒い画面へ移る。砂時計や同心円の巻戻し記号は使われない。

## SFC animation header

| scene | spell index | header | family |
|---|---:|---|---|
| haste | `$3A` | `2A 10 2D 00 6B` | script `$2D` |
| gravity | `$3C` | `2E 25 7A 00 2D` | script `$7A` |
| return | `$41` | `00 00 75 00 08` | script `$75` |
| meteor | `$45` | `04 10 7B 91 46` | script `$7B` |

ヘイスガ `$43` はヘイストと同じ `2A 10 2D 00 6B` を共有するため、描画コアも同じ橙色球＋4衛星とする。全体対象化は別デザインではなく、実対象座標への同一script複製として扱う。

## 根拠フレーム

| scene | role | seconds | SHA-256 |
|---|---|---:|---|
| haste | cast | 25 | `be9050a705a84106ecc9ac45bacf9d252ab4e16234f9595822a8c717e4a763d9` |
| haste | development | 26 | `24f920bf57c1e3874d58db0d5c537a66d33418f1b6dd9c73c205b19ddcb9c494` |
| haste | impact | 27 | `d999b95dc1cb04dea17ecf90ebd48d35196e08b95d08548f7ace79399786d6e4` |
| haste | decay | 28 | `5318bbe7bac5d857512a1125193175d4feb5919cca5de64263710d72e4619f6d` |
| gravity | cast | 38 | `ff4cd782d6f4737db75b8486553992237873c0598a1c913fda67c5b7e280d88a` |
| gravity | development | 39 | `5b4d03f8f93d4e8a1be7b2f5e6ee659097c8656c2f2f9eec7e300b5a2ae30a87` |
| gravity | impact | 40 | `833434703e85595567577a8d64a976bce6c7825705edd3c5466856de3bd2591b` |
| gravity | decay | 41 | `75ca0aa90a6bdb6ff66b6563d64cd6cfe40f186dd893c2f52790b8a206affbf6` |
| return | cast | 73 | `9f92cb8168871b60b163082cb39d5dea0503a89f489b708f94fe5e2cf05556bf` |
| return | development | 75 | `c8ff164f336362638dba607f4355ffe34dd67ab105ff8a8c19bb200300784e25` |
| return | impact | 76 | `f203e159bbd1b3bb4d33d17feeb6c961ed61eb578753098748325cae01efc10e` |
| return | decay | 77 | `bbd05efb2c78aacb7e2599eb0689b8bc3cd80c29f8a85d84057f072903a1142f` |
| meteor | cast | 99 | `35bca98ec1ff7ddeb2a779bf2e983bb0a770e982bc108bebeda751557d21ea83` |
| meteor | development | 100 | `78b7d39b659c6436497feb1c7102ba04ec7c8b3930acb748fc38aa2f1694f9eb` |
| meteor | impact-a | 101 | `82d3d5b76f1c05ac8c62ee8b55ad8d4df1285b2cf5cbc756119c2bca2ce9e157` |
| meteor | impact-b | 102 | `1092ff2e9d4ba7b500862f0f2377e05b64afcbb3eaa1a0d0916d2ba28a3b3c35` |
| meteor | decay | 103 | `3d6c572fab3b79d6a8de5f1f31755092234548900fd90ef2db0785d602d02bef` |

取得画面セットhashは、ヘイスト `efde18707ce7efd608531dcd5b16c8b81ded7dacdcdc05e23392267435f5d6d0`、グラビデ `df0c0a76c07dcbf3c12086d61c080c40f1a81993db675c5014b7383caef7757f`、リターン `6d9c605bf817f99c6ee82988fb54498452f5a98f71e87a8696b29b6713c5edb3`、メテオ `daa33ed4a806f72108c604fb49affd5090d785e893bbb036f7ee4fc3063c359f`。

## Portrait変換

原作4:3の術者・対象・戦場全体という役割を、320px幅の縦戦場Canvasへ正規化する。ヘイストは実対象ごと、グラビデは術者から実対象への軌道、メテオはstage全体のパレット変調と対象周辺の独立4着弾、リターンは実対象のピクセル崩壊とstage暗転へ分ける。固定座標や対象重心だけの汎用円へ戻さない。
