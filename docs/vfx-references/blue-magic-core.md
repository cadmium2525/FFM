# 青魔法4件 原作先行VFX参照記録

## 対象と制作順

対象版は1992年の日本版SFC『ファイナルファンタジーV』に固定する。今回はVFX実装前に公開プレイ映像をコマ送りし、次の4件について構図、位相、対象範囲、原作animation headerを固定した。

1. はりせんぼん
2. ホワイトウインド
3. アクアブレス
4. マイティガード

原作映像そのものはリポジトリへ同梱しない。下記hashは確認したフレームを再特定するための監査情報である。4件とも `reference-locked` であり、原作フレームとの自動画像差分とiPhone 12実機性能検査を通した `golden-pass` ではない。

## はりせんぼん

- SFC spell effect header: `53 40 AC 00 24`
- 参照: `https://www.youtube.com/watch?v=iUX3m6IbRyc&t=160s`
- 観察: 全画面の短い揺れ、細い淡色の針筋、対象への固定、固定ダメージ確定。巨大な数字「1000」や扇形に整列した太い針は確認できない。
- portrait変換: 画面全体の揺れはstage全域へ、針の終端は実DOMから取得した各敵中心へ変換する。
- 根拠hash: `0284fdc2fdbe65f4a1a614a9346d5a598f5cc7a03bd0ac2f60ccfac2ac37983f`, `82f227d5a5efc67576f22ad1438027b71c376dca6e60ae410b18a554a1dd4c20`, `bc180d02dec6ee7490dd9ff1cb01e082837e967779d20b21124f197bcb445ce8`, `349a09c09a851ff6faba605fe8c34df550984c306cf6806bfb2d7a51d32fbff2`

## ホワイトウインド

- SFC spell effect header: `1A 10 B0 00 56`
- 参照: `https://www.youtube.com/watch?v=O5ifxsMgCJM&t=13s`
- 補助参照: `https://www.youtube.com/watch?v=iUX3m6IbRyc&t=170s`
- 観察: 演出は短く、味方側を通る白から淡いシアンの水平風と、小さな白い上昇光の後にHPが回復する。羽根の嵐や大きな同心円は確認できない。
- portrait変換: `alliedTargets` の上下範囲だけを白風が横切り、各味方の座標で上昇光を描く。
- 根拠hash: `581bfc32e4e511587f1553253f6b8b3bfc0eaab013326e02d939d9e2cbdbed40`, `1d89631d56757c8b56149588a47e335727c040ad73abae59751d885cee297935`, `0c2c60c67a0e8db518ead76ec701423c986c9c897ff1c5758a3c4e4cdc931eb2`, `61ed16cf08c5354bfcfc7673fd4baa65b5cc0ebd2cf17978ed87301b4d838724`

## アクアブレス

- SFC spell effect header: `40 18 A6 80 35`
- 参照: `https://www.youtube.com/watch?v=iUX3m6IbRyc&t=18s`
- 補助参照: `https://www.youtube.com/watch?v=U85_CpJ1e6w`
- 観察: 敵側へ水色の横走査と屈折が重なり、対象が淡く半透明に見える短い状態を経て無属性ダメージが確定する。術者側の水球生成や水球の飛翔は確認できない。
- portrait変換: 敵群の実座標帯へ水平rasterを置き、各敵に淡色afterimageを重ねる。敵味方の中央へ単一impactを置かない。
- 根拠hash: `327ac898783018daadca3774481ba7dca834fcd1e77b282509c8fd98927a59f5`, `27dcf69a69bbcd3b4abe7e6e95514cbb9abab4e81537888fcebcd9fac8e841a1`, `7af8339944bf8b48eb6e1debf9aa15e5144661dce6d3edc5f84b24fd24c0cdcb`, `7fc3d368d8cfd9d55b619b1bee79ad2fe4eb7a0c5e5900b044f907ac34fff6d3`

アクアブレスは他3件より根拠映像の位相境界が短く、開始・終了の±1フレーム照合は未完了である。このため `reference-locked` には進めるが、追加キャプチャで尺とパレットを確定するまで `golden-pass` にしない。

## マイティガード

- SFC spell effect header: `25 10 11 00 57`
- 参照: `https://www.youtube.com/watch?v=iUX3m6IbRyc&t=145s`
- 観察: 味方パーティーを囲む青い菱形は8個。出現、周回、位置固定を経てプロテス・シェル・レビテト相当の結果が確定する。三重の六角シールドは確認できない。
- portrait変換: 8個という個数を維持し、味方全員の実座標から求めた楕円帯へ均等配置する。
- 根拠hash: `b2e50ff3d309368fba012aed401267b8713713d3c4cc142da2ae36984827aa85`, `be0454a4b83f858173c467c24e987f0fa4610386c3615a9f2732885ad0a12d2e`, `2bc7401bea95667d763c8153629bebf225a85e5d0dbec5b2737269c1554f7408`, `d6735044bae3fc0d8f360b0d62277e7b0fd19323a250bbb72d454357185d49c6`

## 合格条件

- 4件すべてで、技名を隠しても主要輪郭と動きから相互識別できる。
- 実対象中心との誤差は論理stage上で±2pxを目標とする。
- ダメージ、回復、状態付与、HP表示、対象反応を各 `impact` cueへ同期する。
- 単体、全体、敵発動、味方発動で敵味方の座標を取り違えない。
- 原作のcast・development・impact・decayフレームとの画像差分、390×844実戦、iPhone 12 Safari実機性能を通した後だけ `golden-pass` とする。
