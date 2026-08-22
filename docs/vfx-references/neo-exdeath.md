# ネオエクスデス VFX原作参照票

対象版: SFC日本版（1992）

## 共通取得情報

- `referenceVersion`: `SFC-JP-1992`
- `regionRevision`: 日本語SFC版の公開プレイ映像（ROM revision・収録コアは投稿者未記載）
- `captureEnvironment`: Codex in-app BrowserでYouTubeの原寸映像をコマ送り確認
- `emulatorCoreOrHardware`: `source-upload-provenance-not-disclosed`
- `sourceFps`: 30fps（YouTubeの1フレーム送りが約0.033333秒であることを確認）
- `captureResolution`: 640×480
- `sourceCitation`: [FF5 ネオエクスデス戦（SFC版）](https://www.youtube.com/watch?v=XPuj38ABwMQ)、[やりこみFF 原作差分解説](https://yarikomiff.sakura.ne.jp/playdiary.cgi/playdiary.cgi?read=ff5_lowlvgba_29)
- `legalProvenance`: 原作画像・音声をゲームへ収録せず、公開プレイ映像から構図・順序・タイミングだけを観察して独自Canvas描画へ置換
- `reviewedAt`: 2026-08-22

## グランドクロス

- `status`: `reference-locked`（初回Canvas実装。原作画像そのものとの自動golden差分は未合格）
- `captureId`: `yt-XPuj38ABwMQ-grand-cross-477.074-485.074`
- `sourceMediaHash`: `sha256:evidence-frame-set:d8d73f681a4a68a0b33d8c59c1778b6d16156e6d60df4cc2eabc066ff81766dd`
- `sourcePartAnchor`: ネオエクスデス左上パーツ。発動前は本体全体の色相がわずかに変わる
- `startFrame`: 0（動画477.073973秒）
- `telegraphFrames`: 0–38（FFM 60fps換算）
- `castFrames`: 39–82。青と赤紫の稲妻状亀裂が画面を横断
- `fieldChangeFrames`: 83–119で白いシルエット化、120–443で白い流線背景へ移行
- `impactFrames`: 455
- `statusLatchFrames`: 444–467
- `targetReactionFrames`: 455
- `endFrame`: 515（約8.6秒）
- `palette`: 白・薄灰のフィールド、青緑の球、濃紺の三つ巴状紋様、少数の赤橙球
- `screenFlash`: 亀裂の後に白フラッシュ。終了時は黄緑寄りの通常戦場へ戻る
- `sfxCues`: 亀裂開始、球出現、跳ね回る各周期、状態確定。原作音源は抽出・同梱しない
- `goldenCast`: 477.073973秒 / `478cc8d6909d081729a60255c57f0141ba50ab17558eb210a7150b3daeb85de0`
- `goldenExpansion`: 479.073965秒 / `7834931c4467ca28ae94d96334fa0388a2d2b23ded8841e991861df89fed1f77`
- `goldenImpact`: 482.407281秒 / `9ab209385be621e77282a8d090922c96edfce32ded4a02fbe7a47c551d162b9c`
- `goldenDecay`: 485.073941秒 / `515e0b37c4197fa2fad72f65f0d317aa22583a403ca3fcb5f37d14dee0e7bdfe`
- `portraitAdaptationNotes`: 4:3の全画面構図を縦長戦場全面へ写像。球の個数・奥行き順・拡縮周期を維持し、前景／霧／後景の3層に分ける

観察上の核は「技名を隠しても分かる多数の紋様球」と「球が霧の前後を通る奥行き」である。単純な光球パーティクルや一回だけの状態異常フラッシュへ置換してはならない。

## アルマゲスト

- `status`: `reference-locked`（初回Canvas実装。原作画像そのものとの自動golden差分は未合格）
- `captureId`: `yt-XPuj38ABwMQ-almagest-373.074-375.074`
- `sourceMediaHash`: `sha256:evidence-frame-set:cf53bdb08635768073fe06f4e80c49550c42e79f40b0ad0c19d46a7bec5827d2`
- `sourcePartAnchor`: ネオエクスデス右下パーツ。予兆は担当部位の振動
- `startFrame`: 0（動画373.073985秒）
- `telegraphFrames`: 0–11（FFM 60fps換算）
- `castFrames`: 12–35で白2回
- `stageTrackFrames`: 36–73で白青1回、青2回
- `impactFrames`: 74
- `damageLatchFrames`: 74
- `additionalEffectFrames`: 74–83（スリップ付与の結果cueと同時刻）
- `targetReactionFrames`: 74
- `endFrame`: 95（約1.6秒）
- `palette`: 白→白→白青→淡青→濃青
- `screenFlash`: 原作どおり5段階。独自のビーム・魔法陣・爆発を追加しない
- `sfxCues`: 各フラッシュと最終ダメージ確定。原作音源は抽出・同梱しない
- `goldenCast`: 373.073985秒 / `e21ea9c54b3dba150dcdec64f205ea5850c44d15bcab1db0392d70b0d98fda04`
- `goldenExpansion`: 373.740645秒 / `18d4b6806744b03c2143cd4fc836e96ca69b9e61ecfb6f0f6830c964dbe052bb`
- `goldenImpact`: 374.407310秒 / `ad2392642df55d3c9aa5ddf51c63f4f095f9b36784c19d678d6f9f78bbedbfd6`
- `goldenDecay`: 375.073976秒 / `712968b21150ee25e1dfb25eeb4fdeb49968a0cfccd82c1fcf1475ac434d7603`
- `portraitAdaptationNotes`: 五つの全面フラッシュは戦場全域へ適用し、結果cueは味方4人の実座標へ同期する

## 実装許可チェック

- [x] 合法的に参照できる公開プレイ映像と観察フレームhashを登録した
- [x] 発動部位と対象座標を確定した
- [x] cast・展開・impact・decayの根拠フレームを確定した
- [x] パレット・明滅・SFX cueを確定した
- [x] 戦闘結果cueとメッセージcueを確定した
- [x] portrait座標への変換規則を記録した
- [x] 参照レビューを完了した

`reference-locked` は原作映像を見ずに創作していないことを示す段階であり、`golden-pass` を意味しない。実装後の同時刻フレーム比較、実戦4対象同期、iPhone 12性能計測を通過して初めて完成扱いにする。
