# 青魔法6件 原作先行VFX参照記録

## 対象と制作方針

対象版は1992年の日本版SFC『ファイナルファンタジーV』に固定する。今回はVFXを置換する前に、公開されているSFC版映像をコマ送りで確認し、ROM解析表の5-byte animation headerと照合した。

対象はエアロ、エアロラ、エアロガ、火炎放射、ゴブリンパンチ、マジックハンマーの6件。参照映像そのものはリポジトリへ同梱せず、下記の時刻とhashを監査情報として保持する。

- 映像参照: `https://www.youtube.com/watch?v=iUX3m6IbRyc`
- ROM表参照: `https://github.com/everything8215/ff5/blob/main/src/btlgfx/btlgfx-main.asm#L35095-L35106`
- header形式: `sprite palette animation handling sound`
- 検証状態: `reference-locked`。原作画像との自動差分とiPhone 12実機性能検査を通した `golden-pass` ではない。

## エアロ

- SFC effect ID: `$8F`
- SFC animation header: `4F 30 AB 00 37`
- 観察: 対象周辺に灰白色の小型竜巻が複数出現する。単一の緑色三日月斬撃は確認できない。
- portrait変換: 各 `hostileTarget` の実座標を中心に小型竜巻群を置く。単体・全体とも重心一枚へ潰さない。
- 根拠フレーム: `82.187s`, `83.311s`, `83.652s`, `84.689s`
- 根拠hash: `4da09e230bfe3d68a66d1609ccbe912306cacfbe3505c15f4f7381f81b5b1cda`, `8a9c3c71647b21a0fb73b541511761e4fa5c516bfe25f8f10a8291f56bda4b6a`, `0e35073278e92758f3be98f1e4b8f7bd29d8eccb1f31d1fad401678582fdcf47`, `e0250d4f213462e27fba94e82e475dc479d8d51cf21561875ec4742bc9f953d9`

## エアロラ

- SFC effect ID: `$90`
- SFC animation header: `53 28 AC 00 24`
- 観察: 緑色の渦が対象へ進み、対象を包む二重の楕円風輪へ展開する。エアロの小型竜巻、エアロガの縦列風柱とは別構造。
- portrait変換: `caster` から選択対象への移動を保ち、楕円風輪の中心を対象の実座標へ合わせる。
- 根拠フレーム: `87.810s`, `88.719s`, `89.407s`, `90.802s`
- 根拠hash: `f7899958bef4aa2191ff727482e115806b49430bc544c091c4df0aeeebdcf94e`, `3adef70358762719d3030b2c93028f8c8a170a3c1751f9418e89a6a7334449c1`, `5fddf8255464a97242853577735ac8002547e26223c0e47adb49c5ffc111f449`, `7feae1adfb28d0b3ea7b93469fdcf0297c00b63ed308981dfac25c9f849fd3e6`

## エアロガ

- SFC effect ID: `$91`
- SFC animation header: `51 28 AD 80 27`
- 観察: 白と緑の連結した菱形状の風柱が3列で横断する。映像編集で技間に入る全画面放射ブラーは原作VFXに含めない。
- portrait変換: 3列を `caster` 側から対象帯へ移動させ、各対象を通過する軌道を作る。白緑の列数と位相差を維持する。
- 根拠フレーム: `93.420s`, `94.624s`, `95.009s`, `95.423s`
- 根拠hash: `72e2015d13f3ebde1379b58dc9a8ebfaf14fe7d846b68d4200a8fe2a133078ae`, `189c54cc60394758d1f2ca505a2828599fbb21d416e0ac2396581795464ce41a`, `f07e157286cd7cd4eba6ea946ad42dc0cdc23a700bfb01dd57aceda338f94e79`, `d08b3440e223879fe2b23c58d39ba9c929c1bea862682725c8880e8e0016c821`

## 火炎放射

- SFC effect ID: `$92`
- SFC animation header: `51 28 AE 21 28`
- 観察: 独立した火炎スプライト約9個が、術者と対象を結ぶ水平線上を横断する。金属ノズルや連続した一本のビームは確認できない。
- portrait変換: `caster` と対象の実座標から軌道を作り、敵味方の発動方向が逆でも始点と終点を入れ替える。
- 根拠フレーム: `99.501s`, `100.378s`, `101.348s`, `102.310s`
- 根拠hash: `5bc30c356580f553d473064959e9e130539521f28fb136dea40b9e23e06df390`, `952764df9ce112c857515ddbadd7b8f4617e031f47fd3d0a62ce15b454a26821`, `9ef22d918babf40a5c6f4b0030ef6d5e30235fdfa5349a00bee2e898c797c424`, `6bb3e5e1db432ecf070ebf4652d3bc187a73c2ee51da821599d5e9d7746adbc5`

## ゴブリンパンチ

- SFC effect ID: `$93`
- SFC animation header: `76 68 DD 00 29`
- 観察: 対象上に白い歯車状・放射状の衝撃輪が一瞬だけ現れ、ダメージ数字へ移る。巨大な緑色の拳は確認できない。
- portrait変換: 衝撃輪を対象の実座標へ固定し、同レベル8倍か通常倍率かは戦闘結果に従う。倍率条件を説明する文字や巨大な拳を追加しない。
- 根拠フレーム: `105.724s`, `106.382s`, `107.254s`, `107.851s`
- 根拠hash: `8d882e770adab9f77ce2cf5ca8bf0eee3661ffbc9d9e42b13d92d4c1fcc417f9`, `c4be0af748f0891eb0318cd437e91250e14353a264551475f3c3e745fd279ec1`, `27488132f3e48fd39f756d72e9ef485939130062b8195eaed12234c181d782ad`, `2c4bb37178de8a53110a5132dfa23385d060843dcbc937e7730de5e7b7d3b24e`

## マジックハンマー

- SFC effect ID: `$99`
- SFC animation header: `4D 3B AF 00 25`
- 観察: 標準の青魔法詠唱後、対象の頭上へ小さな実ハンマーが落下してMP減少数字へ移る。独自のマナ釘やMPゲージ全損表示は確認できない。
- portrait変換: ハンマーを対象頭上へ置き、impact cueで実際に減ったMP量だけを表示する。処理は「現在MPの半分」であり、0まで落とすゲージ演出は禁止する。
- 根拠フレーム: `139.622s`, `140.293s`, `140.954s`, `141.561s`
- 根拠hash: `d50f8123b983c123cf713c078a5196e34226b21d0db4cf365e4cb7e7eed78b5c`, `f8fcb6eabb578de2dbfbb4b561d5233571050a6387fa030bd740d5dfe91b153f`, `ac5c1e0a7472eb3d78b3a9286d9a25df3d15a1113b1b9842ab87a124163efc14`, `0c9f4618283009f19559045e63b661eabc7a7207b6edfb7f3fbca341e5bf57ae`

## 合格条件

- 6件すべての4局面が上記観察順を維持し、現行の創作意匠へ戻らない。
- `caster` と各対象の論理stage座標誤差を±2px以内とし、左右発動を取り違えない。
- ダメージまたはMP減少は指定impact cueで1回だけ反映し、impact前に表示しない。
- エアロ3段階を技名なしでも主要輪郭と運動から識別できる。
- 390×844実戦とiPhone 12 Safari実機性能、原作フレームとの自動画像差分を通した後だけ `golden-pass` とする。
