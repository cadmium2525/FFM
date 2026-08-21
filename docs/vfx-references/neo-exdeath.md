# ネオエクスデス VFX原作参照票

対象版: SFC日本版（1992）

このファイルは、グランドクロスとアルマゲストを描き始める前に埋める制作ゲートである。空欄が残る技は `blocked-reference-required` とし、専用Canvasの実装へ進めない。

## 共通取得情報

- `referenceVersion`: `SFC-JP-1992`
- `regionRevision`: 未登録
- `captureEnvironment`: 未登録
- `emulatorCoreOrHardware`: 未登録
- `sourceFps`: 未登録
- `captureResolution`: 未登録
- `sourceCitation`: 未登録
- `sourceMediaHash`: 未登録
- `legalProvenance`: 未登録

## グランドクロス

- `status`: `blocked-reference-required`
- `captureId`: 未登録
- `sourcePartAnchor`: 未登録
- `startFrame`: 未登録
- `telegraphFrames`: 未登録
- `castFrames`: 未登録
- `fieldChangeFrames`: 未登録
- `impactFrames`: 未登録
- `statusLatchFrames`: 未登録
- `targetReactionFrames`: 未登録
- `endFrame`: 未登録
- `palette`: 未登録
- `screenFlash`: 未登録
- `sfxCues`: 未登録
- `goldenCast`: 未登録
- `goldenExpansion`: 未登録
- `goldenImpact`: 未登録
- `goldenDecay`: 未登録
- `portraitAdaptationNotes`: 未登録

必須分岐: 対象ごとの成功、耐性、無効、戦闘不能。

## アルマゲスト

- `status`: `blocked-reference-required`
- `captureId`: 未登録
- `sourcePartAnchor`: 未登録
- `startFrame`: 未登録
- `telegraphFrames`: 未登録
- `castFrames`: 未登録
- `stageTrackFrames`: 未登録
- `impactFrames`: 未登録
- `damageLatchFrames`: 未登録
- `additionalEffectFrames`: 未登録
- `targetReactionFrames`: 未登録
- `endFrame`: 未登録
- `palette`: 未登録
- `screenFlash`: 未登録
- `sfxCues`: 未登録
- `goldenCast`: 未登録
- `goldenExpansion`: 未登録
- `goldenImpact`: 未登録
- `goldenDecay`: 未登録
- `portraitAdaptationNotes`: 未登録

必須検査: 全4対象の個別座標、HP変化、対象反応、メッセージ、SE、画面揺れ、余韻、次行動の開始時刻。

## 実装許可チェック

- [ ] 合法的な原作キャプチャとhashを登録した
- [ ] 発動部位と対象座標を確定した
- [ ] cast・展開・impact・decayの根拠フレームを確定した
- [ ] パレット・明滅・SFX cueを確定した
- [ ] 戦闘結果cueとメッセージcueを確定した
- [ ] portrait座標への変換規則を記録した
- [ ] 参照レビューを完了した

すべて完了して初めて `reference-locked` とし、VFX実装を開始する。
