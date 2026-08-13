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
named attacks of 64 original FFV bosses (289 techniques, World 1–3 plus the GBA/mobile
EX-stage superbosses) as design/implementation reference material, sourced entirely from
Japanese-language strategy references so technique names, boss names, and effect text are
consistently in Japanese (no English fallback). It's intentionally separate from
`ff5Database.js` and has its own checker, which also asserts no Latin-letter names slipped
into `nameJa`:

```sh
node scripts/validate-boss-techniques.mjs
```

管理者モードのメニューから「ボス技一覧」を選ぶと、この289件を1件ずつ検索・閲覧できます
（技名・ボス名・属性・対象範囲・威力ランク・付与状態異常・技名の確度・登場世界・出現場所などを
すべて日本語で表示）。管理者モードへのアクセス方法は下の「Firebase account setup」を参照して
ください。

## Full boss reproduction reference: Omega (`src/data/bossData.js` / `BossActionProfiles.js`)

Course 01's first fight (`bossData[0]`, id `omega`) is a from-scratch faithful reproduction
of FFV's optional superboss **オメガ**, built directly from the
`ff5BossTechniques.js` reference catalog (`bossref_omega_boss`) plus the same
Pixel Remaster boss page used to source that catalog entry. It exists as a worked example so
future boss implementations have a concrete pattern to follow. Reproduced faithfully:

- **Stats**: LV119 baseline — HP 55530, MP 60700, ATK 115, DEF 190, Evasion 95, MAG 199,
  MDEF 150 (agility isn't published in the source material, so it's an estimated value tuned
  for Omega's "very high attack frequency" reputation — see the comment in `bossData.js`).
- **Elemental profile**: absorbs everything except thunder (fire/ice/poison/holy/earth/wind/
  water all heal it), thunder is its only weakness — via `equipmentEffects.absorbs` on the
  boss's `Unit`, reusing the same absorb/weak/resist pipeline player equipment uses.
- **Status immunities**: immune to poison/blind/silence/old/mini/toad/petrify/instant-death/
  doom/berserk/confuse/sleep/paralyze; vulnerable to slow and stop, exactly matching the
  source's status-resistance table.
- **Move pool**: all 8 of Omega's "normal action" moves (Atomic Ray, Flame Thrower,
  Targeting, Delta Attack, Rainbow Wind, Wave Cannon, Blaster, Maelstrom) plus representative
  "2-action" combos, implemented in `BossActionProfiles.js` using the existing
  `operations`-array pipeline (`damage.magic`, `status.apply`, etc.) plus two new operation
  kinds added to `ActionResolver.js` for moves the engine didn't have primitives for yet:
  `damage.max_hp_ratio` (Wave Cannon's "50% of max HP, not current HP") and
  `damage.to_critical` (Maelstrom's "brings the whole party to 1 HP").
- **Counterattacks**: Omega always retaliates with 2 moves (Circle / Mustard Bomb / Rocket
  Punch) the instant it takes damage — a new mechanic (`Unit.counterOnHit` +
  `BattleManager.resolveCounterAttacks()`), since nothing like it existed before. It fires
  outside the normal CTB turn order, same as the source game.

Known simplifications (documented in code comments where they occur): "Targeting" telegraphs
a follow-up instead of precisely locking the next move's target; only a handful of the 15
possible "2-action" combinations are modeled as discrete moves rather than all of them; and
combo moves currently share one target scope for all their operations rather than letting
each sub-effect pick independently (matters for Quake-style attacks that should skip
floating targets). None of these affect the moves' names, elements, stats, or immunities.

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
