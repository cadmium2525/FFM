# FF Boss Rush - CTB Edition

## Gameplay database

将来のバトル、魔法、アビリティ、アイテム、装備、ショップ用データは
[`src/database/ff5Database.js`](src/database/ff5Database.js) に集約しています。
基準バージョンはFF5 Pixel Remasterで、本作独自のクリスタルのかけらは
FF5由来のデータと分離しています。スキーマと運用方針は
[`src/database/README.md`](src/database/README.md) を参照してください。

件数と編成参照の整合性は次のコマンドで検証できます。

```sh
node scripts/validate-database.mjs
```

The validator also requires every magic, item, ability, song, equipment item, crystal
shard and shop record to have a battle/runtime adapter. The current catalog contains
413 validated runtime-ready records; battle magic menus are generated directly from it.

## Boss technique reference & admin viewer

[`src/database/ff5BossTechniques.js`](src/database/ff5BossTechniques.js) collects the
named attacks of 52 original FFV bosses (322 techniques) as design/implementation
reference material. It's intentionally separate from `ff5Database.js` and has its own
checker:

```sh
node scripts/validate-boss-techniques.mjs
```

管理者モードのメニューから「ボス技一覧」を選ぶと、この322件を1件ずつ検索・閲覧できます
（技名・ボス名・属性・対象範囲・威力ランク・付与状態異常・出典の確度・出現場所などを表示）。
管理者モードへのアクセス方法は下の「Firebase account setup」を参照してください。

## Character sprites

`src/data/partyData.js` の各パーティメンバーに任意で `spriteUrl` を指定すると、
`BattleUI.js` / `IntermissionUI.js` がCSS描画のプレースホルダの代わりに実画像
（`<img>`、`image-rendering: pixelated`）を表示します。未指定のメンバーは従来通り
プレースホルダのままです。画像は `assets/images/characters/` にWebP形式で配置します。

## Rebuilding the bundle

`app.js` と `index.html` 内のインラインスクリプトは `src/` からの生成物です。
`src/` 以下を変更したら必ず再生成してください。

```sh
node scripts/build-bundle.mjs
```

## Firebase account setup

アカウントUI、Firestore同期、管理者モードは実装済みですが、接続先となる
Firebaseプロジェクトの公開設定値と管理者UIDは環境ごとに設定する必要があります。

1. Firebase ConsoleでWebアプリを作成し、Authenticationの「メール/パスワード」と
   Cloud Firestoreを有効化します。
2. Authenticationの承認済みドメインへ `cadmium2525.github.io` を追加します。
3. Webアプリの設定値を [`firebase-config.js`](firebase-config.js) の
   `FFM_FIREBASE_CONFIG` へ設定します。秘密鍵やサービスアカウント鍵は入れません。
4. 一度ゲーム画面から管理者用アカウントを新規登録し、Firebase Consoleの
   AuthenticationからそのUIDを確認します。
5. UIDを `firebase-config.js` の `FFM_ADMIN_UID` と
   [`firestore.rules`](firestore.rules) の `ADMIN_UID` の両方へ設定します。
6. Firebase CLIで `firebase deploy --only firestore:rules` を実行してルールを反映します。

画面上では、表示に使うプレイヤー名とは別にログインIDとパスワードを入力します。
Firebase Authenticationがメール/パスワード方式のため、内部ではログインIDの
SHA-256から架空のメールアドレスを生成します。ログインIDは半角英数字・`_`・`-`の
4～24文字で、大文字と小文字は区別しません。パスワードはFirestore、LocalStorage、
Gitリポジトリのいずれにも保存しません。

Firestoreの `users/{uid}` にはプレイヤー名、ログインID、レベル、通貨、ポーション、音量、
ウィンドウ色、所持しているかけらだけを保存します。将来のランキングは
クライアントからスコアを書き換えられないよう、現時点では一般ユーザーの
直接書き込みを禁止しています。

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
