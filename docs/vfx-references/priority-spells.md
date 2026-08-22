# SFC版優先3魔法 参照票

対象は日本版SFC『ファイナルファンタジーV』（1992年）。2026-08-22に公開プレイ映像をブラウザでコマ送りし、実装より先に構図・色・進行と根拠フレームのhashを固定した。映像そのものはリポジトリへ同梱しない。

## ミサイル

- 参照: https://www.youtube.com/watch?v=P0xgkoSS4fE&t=50s
- `captureId`: `yt-P0xgkoSS4fE-missile-50.778-52.084`
- フレームセットhash: `d4dd0d6091b48b0f8df1cba29467129181bed8161b181c1157027ff63d5f91ff`
- 観察結果: 術者側から対象へ、白い実心球と途切れた円弧状の残像が直線移動する。実体のミサイル、尾炎、照準器、四分割ブロックは存在しない。着弾時は対象が橙／青に明滅し、その後に結果が表示される。
- portrait変換: 術者と対象の実DOM中心を結ぶ。原作の直線軌道と残像間隔を保ち、左右の陣営に応じて始点・終点だけを変換する。

| 局面 | 秒 | SHA-256 |
|---|---:|---|
| cast | 50.777721 | `50b5040d7733d6853e82e71c8f987ebca47268e0aab011292dbb9b0e1bb7acfb` |
| development | 51.197184 | `7ceb6dce2e028036df1fee6ab10ac1788aaedd19c2a45ee33c8085bd3a83cba0` |
| impact | 51.596979 | `d88e7946b5638a5523c59183579e5134928bc322b1875116c2ab3fa698697554` |
| decay | 52.083692 | `fe4b884843fcc6d2f6c809898487493d9fde6e626eafa96904ae22c493917df4` |

## フレア

- 参照: https://www.youtube.com/watch?v=R-1l6OvnCVk&t=20s
- `captureId`: `yt-R-1l6OvnCVk-ff5-flare-20.404-27.168`
- フレームセットhash: `2ad4be66f44b67cff4231f1532298b3846ebd04f06614bbb573792c75408f961`
- 観察結果: 術者の緑白の鋸歯状オーラ、赤黒い画面パレット、橙／金の光球群、対象の金色発光、橙の縁を持つ巨大な白熱球、赤黒い再明滅、結果表示の順。青いレーダー、シアン同心円、常時の全面白飛びは存在しない。
- portrait変換: パレット変化と光球群はfull-stage、白熱球は実対象中心、詠唱オーラは実術者中心へ固定する。SFC 4:3の局面順を変えず、横幅だけportrait stageへ翻案する。

| 局面 | 秒 | SHA-256 |
|---|---:|---|
| cast | 20.403715 | `d1d9f729704df8c909fc8b931fd0d1181ec3a1b800846fa02eaf199fd108a67a` |
| development | 21.535541 | `2807b67d5997093f72ce5555ae411b07d71e46717727ffa39bd0834f14fb4479` |
| impact | 24.425791 | `a97b982e222f4a726ff3610a7890796011a3bc49342bcc7af0ae374560bc4b20` |
| decay | 27.168281 | `4061e41463e6ac223a17feb866739fa356865be38bd06621f7ba53cfc03fd3fd` |

## レベル5デス

- 参照: https://www.youtube.com/watch?v=uFbq-WKOJHo&t=16s
- `captureId`: `yt-uFbq-WKOJHo-level5death-16.174-18.929`
- フレームセットhash: `e0fe39414fd4e0ec0b0748063609364e1b42a4769a0f4e29190701a85cfbbec8`
- 観察結果: 緑の芯、黄、橙で構成された鋸歯状の三重楕円リングが対象列を反復走査し、成功対象にクリーム／黄／橙の光塊が群発する。赤い門、五芒星、数字の「5」は存在しない。
- 結果分岐: レベル条件・耐性で無効な対象は走査リングまで。実際に戦闘不能が付いた対象だけ成功光塊を描く。
- portrait変換: `hostileTargets` を個別に保持して各対象中心へ反復リングを配置する。対象重心の単一エフェクトへ潰さない。

| 局面 | 秒 | SHA-256 |
|---|---:|---|
| cast | 16.173912 | `bc532cada671ff1bfb75685870708c2b08715a5ba07294b0dc875debbd28acfa` |
| development | 16.759155 | `dab903fdcc7f436f566e6886915e34f5c496c5026cab2b9385a6c00891333a19` |
| impact | 17.842635 | `f535f11a0b2121ad4829b9ddcd632924c01ce9d34fa30bf1213ce62455209a8b` |
| decay | 18.928904 | `6e89ac2911460e5d839164dd20e920f71e0df9f05780b0d9aa1b3205ee17f092` |

## 現在の判定

3技とも `reference-locked`。根拠映像・局面・hash・portrait変換を実装前に確定したが、原作フレームとの自動画像差分、SE、iPhone 12実機性能を通していないため `golden-pass` ではない。
