# FF Boss Rush - CTB Edition

FF5風UIとFFX風CTB(カウントタイムバトル)を組み合わせたボスラッシュ・プロトタイプです。
外部ライブラリ不使用のVanilla JS (ES6 Modules) + HTML5 + CSS3のみで動作します。

## 遊び方

1. `index.html` をブラウザで直接開くか、ローカルサーバーで配信してください。
   ES Modules を使用しているため `file://` では動かないブラウザがあります。
   例:
   ```bash
   npx serve .
   # または
   python3 -m http.server 8000
   ```
2. 「はじめる」→ ボス1（ロックタイタン、弱点：みず）と戦闘。
3. CTBゲージ（画面右上のリスト）に従って行動順が回ってきます。
   自分のキャラの番になったら「たたかう／まほう／アビリティ／アイテム／ぼうぎょ」から選択してください。
   アクションごとにCTBコストが異なり、次の自分の番が来るまでの早さが変わります
   （ぼうぎょは早く回ってくる、強力な魔法は遅くなる、等）。
4. ボスを倒すとインターミッション（編成画面）へ。武器や魔法セットを変更して「じゅんび かんりょう」を押すと次のボスへ。
5. 全3体のボスを倒すとクリアです。

## ディレクトリ構成

```
index.html
css/
  style.css      # レイアウト・リセット
  ff5-ui.css     # FF5風の青いウインドウ・フォント・UI装飾
assets/          # プロトタイプではプレースホルダのため画像・音声は未使用
                 # （すべてCSSで描画したブロブ形状のプレースホルダスプライト）
src/
  main.js
  core/
    GameState.js
    EventBus.js
  battle/
    BattleManager.js
    CTBEngine.js
    Unit.js
    ActionResolver.js
  ui/
    BattleUI.js
    IntermissionUI.js
    MessageWindow.js
  data/
    partyData.js
    bossData.js
    abilityData.js
```

## GitHub Pages への公開

1. このフォルダをリポジトリのルート（またはお好みのブランチ）にpush。
2. リポジトリの Settings → Pages で公開ブランチ／ルートディレクトリを指定。
3. `https://<username>.github.io/<repo>/` で公開されます。

## 実装メモ / 拡張ポイント

- **CTBEngine.js**: FFXの「行動速度によってゲージが溜まり、行動コストで次のターンが遅れる」仕組みを
  シンプルなカウント方式で再現しています。`previewQueue()` が右側の行動順リストの元データです。
- ボス・味方ステータスは `src/data/` にまとめてあるので、数値調整やボス追加はそこだけ触れば済みます。
- スプライトは全てCSSのグラデーション形状（プレースホルダ）です。実際のドット絵に差し替える場合は
  `assets/images/characters/` `assets/images/bosses/` に画像を置き、`BattleUI.js` の
  `sprite-placeholder` 生成部分を `<img>` に差し替えてください。
