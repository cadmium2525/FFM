# 白魔法6件 SFC-JP原作参照記録

## 対象と制作ゲート

対象はケアル、ケアルラ、ケアルガ、レイズ、プロテス、ホーリー。描画実装前に1992年SFC日本版の公開プレイ映像をフレーム単位で確認し、SFC逆アセンブルの5-byte animation headerと照合した。原作画像・音声は同梱せず、出典時刻とブラウザ取得フレームのSHA-256だけを保存する。

- 映像: [【FF5】 白魔法のまとめ](https://www.youtube.com/watch?v=hT8dptEpahs)
- 確認日: 2026-08-22
- 対象版: SFC-JP-1992
- キャプチャ: 640×480、公開映像30fps相当、4:3全画面
- 逆アセンブル: `everything8215/ff5` の `_d838ec` animation table
- 検証状態: 6件とも `reference-locked`。原作同時刻の自動画像差分と実機性能検査は未実施のため `golden-pass` ではない。

## 原作で確認した構図

- ケアル: 白魔法共通の黄白色詠唱星 → 対象上を進む黄色の四芒星 → 緑の十字星で回復確定。
- ケアルラ: 同じ回復系譜を保ちつつ黄色の星列が増え、緑の回復光が強くなる。
- ケアルガ: 青い鋸歯状の星群と白い核が対象を覆い、最後に大型の緑星へ移行する。
- レイズ: 戦闘不能者の近くに翼付きの輪光が現れ、金色の生命星を経て復帰する。
- プロテス: 対象の左右へ金色・黄緑色の分節した括弧状障壁が組み上がる。青い六角盾ではない。
- ホーリー: 白い正方形光が降下 → 画面暗転 → 対象周囲を白い粒が周回 → 白い縦光柱と紫の対象影 → 白い着弾光。

## SFC animation header

| scene | spell index | header | family |
|---|---:|---|---|
| cure | `$12` | `20 11 08 00 13` | script `$08` |
| protect | `$16` | `23 11 0E 00 4F` | script `$0E` |
| cura | `$18` | `20 11 09 00 13` | script `$09` |
| raise | `$19` | `24 20 0D 80 65` | script `$0D` |
| curaga | `$1E` | `20 12 0A 2C 13` | script `$0A` |
| holy | `$22` | `0D 12 7F A2 15` | script `$7F` |

## 根拠フレーム

| scene | role | seconds | SHA-256 |
|---|---|---:|---|
| cure | cast | 0.737404 | `9a997b19d602c11d165f6113598ae2a94f8c77f4b20b8a842fa10f50c899b978` |
| cure | development | 1.378625 | `80155d79a2e199626904a11e4ae7707ce4ff8ca29b3e562ef693857b6343e1b7` |
| cure | impact | 2.019847 | `b3e3f8882115ca1fa4bc6c511666b672d9170266234d86480a170857ba0543cc` |
| cure | decay | 2.500763 | `d4257bdba09ef60d89d5ca4ed7559a38617d5c71aa34220c8a30129503443fa6` |
| protect | cast | 28.838709 | `e77b94aadfb0b778c3061b359ed39946ad82ee553ec003f6843ff1a47b171a80` |
| protect | development | 29.645161 | `6f8160dd86c59fd1fdaec5dfa68f3bfac6df4e801cb18bb31b212b4481055345` |
| protect | impact | 30.451612 | `a2e121fbb70f4d5aeec8926d82198caa90f3d34c4f939572c7148cfe41be4c73` |
| protect | decay | 30.774193 | `777b0dfd52d4b1f67267725c9a446bc9384113687434fc92cd253e5e4d02cda9` |
| cura | cast | 41.000000 | `d0625036bf55129ad7eb6253e66f11d15b419f139acd5e4230b8904ea9ada117` |
| cura | development | 42.066153 | `ee0dad675d866e3b726bd38441790d1e51d98f1d24cd4315af83a28a1e944f59` |
| cura | impact | 42.873845 | `1ce9d6ec09cbc0ac1bdc22f44ccd0a898cc8309e196b3cab0e4f23a9deb9fbbe` |
| cura | decay | 43.843076 | `7be9b1ef6e355592b1e98a4afabc93fda91af6092e9ef6f4ba24c1f61f0a5db8` |
| raise | cast | 48.850768 | `b0e1d73e93922c6f208b32d5a716a90451c457a7bdf22bed6772fb41329220dc` |
| raise | development | 50.950768 | `d69ab4c700fd9160ab3de8d545a1141bcc5e2b663655af7e735c1d28ab16a358` |
| raise | impact | 51.112307 | `1646e0d147ea99956df483d22b1ccd83336fed1a5058e54d88ff4da321732df5` |
| raise | decay | 52.404615 | `b3027f6999a5d463a82e50d6822031f022a580be07b452ba052ad9516a97e6ca` |
| curaga | cast | 81.000000 | `1956fff0ea7682d2f74b903308db8e994f1470ce11655b58e8d9116f8cf17eaf` |
| curaga | development | 81.906666 | `56889cbcb73ffa7b74db40efefeb1832f18403af00d30c13e409574eac1b7773` |
| curaga | impact | 82.716190 | `511577f8761ee8ed733887e6a7846c97cad0a2c4ae429f83f995351b2822ee14` |
| curaga | decay | 83.525714 | `825190b4c83c7a0181234e5dc4a4a58e92ba0aaf182c38e0244cddd4f4c6f184` |
| holy | cast | 106.830956 | `ee7a6bfcfc89af40ee4feaef9b9bb32f6c722287f1c3928b65b77293db21f950` |
| holy | development | 107.963130 | `dd046a6aa705c5b090a22d2c0298e7f40c621b968e58f7c7f68d76ecc365ecd7` |
| holy | impact | 110.712695 | `678366ad09e2cfaaac66bff62d5129f295ae75f69d7b3815098fdcfb12dd9523` |
| holy | decay | 111.359651 | `253191eaebc2e395cde0c3c254194eb4aede97c1a3e15b2554b75af9109ef0eb` |

## Portrait変換

4:3原作画角の役割座標を、320×400の戦場Canvasへ正規化して配置する。詠唱星は術者アンカー、回復・防御・蘇生・攻撃本体は対象アンカーを使う。全体対象では対象ごとに同じ原作scriptを複製し、画面中央の単一汎用エフェクトで代用しない。ホーリーの暗転と降下光はstage全体、周回光と光柱は対象別トラックとして描く。
