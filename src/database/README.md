# FFM gameplay database

`ff5Database.js` is the normalized reference catalog for future implementation.
The baseline is **Final Fantasy V Pixel Remaster**. It contains:

- ATB/battle and formation rules
- 18 White, 18 Black and 18 Time spells
- 15 Summons and 30 Blue Magic spells
- Base-job command/passive/equipment abilities and all 8 Songs
- Recovery, status, camp, drink, mix and throw items
- All 107 weapons and all 79 armor pieces (shield/head/body/accessory)
- The 14 town/shop groups
- FFM-original crystal shards, kept separate from FF5 records

## Record policy

- IDs are stable `snake_case` keys. UI text uses `nameJa`; source matching can use `nameEn`.
- `implemented:false` means the record exists for design/selection but its gameplay effect is not connected yet.
- Prices and combat numbers use the Pixel Remaster baseline. A future port with different values should add a version override instead of overwriting the baseline.
- Effects are short factual summaries written for FFM. They are not copied guide descriptions.
- Formation saves references by ID, never by array position or display text.

## Battle adapter contract

`battleCatalog.js` wraps every database record with a required `battle` descriptor:

```js
{
  sourceType: 'magic',
  target: { id: 'one_or_all_enemies', scope: 'one_or_all', side: 'enemy' },
  mpCost: 4,
  element: 'fire',
  formulaVersion: 'ff5_adapter_v1',
  operations: [
    { op: 'damage.magic', formula: 'ff5_magic', power: 1.73, hits: 1 }
  ],
  runtimeReady: true
}
```

Composite effects contain multiple ordered operations. For example Phoenix has an enemy
damage operation and a separate ally revive operation. `scripts/validate-database.mjs`
fails when any record has no stable ID, target descriptor, formula version, or operation.
Magic menus are generated from this adapter rather than a second hand-written spell list.

`runtimeReady` means that the record has a stable machine-readable route into battle. It
does not claim that every animation, enemy immunity, inventory rule, or Pixel Remaster
edge case is already presented in the current UI. Formula keys remain versioned so exact
balance values can be corrected without changing IDs or menu wiring.

## Formation shape

```js
{
  equipment: {
    weapon: 'equipment_weapon_broadsword',
    shield: 'equipment_shield_leather_shield',
    head: 'equipment_head_leather_cap',
    body: 'equipment_body_leather_armor',
    accessory: 'equipment_accessory_leather_shoes'
  },
  abilityId: 'ability_black_magic',
  crystalShardId: 'shard_azure'
}
```

The battle runtime currently applies weapon attack/accuracy/element, armor defense/magic
defense/evasion, supported stat and elemental equipment effects, and every command ability
shown as `戦闘反映` in formation. Unsupported command abilities remain in this catalog but
are disabled in formation as `準備中`. Job restrictions, inventory ownership, shop stock,
the remaining special procs/statuses, and shard techniques are still future subsystems.

## Boss technique reference (`ff5BossTechniques.js`)

`ff5BossTechniques.js` is a **separate, standalone** reference catalog of the named
attacks/techniques used by 64 FFV story and optional bosses (289 techniques total, World
1–3 plus the GBA/mobile-only EX-stage superbosses), collected entirely from Japanese-
language sources so every name is in Japanese (no English fallback) — this was rebuilt
after an earlier English/Japanese-mixed version proved unusable for in-game display. It's
collected so a boss encounter can be built by pulling straight from this list instead of
re-researching movesets from scratch. It deliberately does **not** join `ff5Database.js` /
`battleCatalog.js` or `scripts/validate-database.mjs`'s record-count assertions — it has its
own lightweight checker at `scripts/validate-boss-techniques.mjs` (ID uniqueness, required
fields, a Latin-letter guard on every `nameJa`, `implemented:false`/`runtimeReady:false`
flags).

Shape per boss record:

```js
{
  id: 'bossref_bahamut_boss',
  nameJa: 'バハムート', nameConfidence: 'high',
  location: '北の山', world: 3, referenceHp: 40000,
  weaknessElement: null, statusWeakness: 'stop',
  techniques: [
    { id: 'bosstech_bahamut_boss_01', nameJa: 'メガフレア',
      element: null, target: 'all_enemies', power: 'extreme', statuses: [],
      note: '戦闘開始直後とHPが1万を切った後に使う切り札級の全体無属性大ダメージ。リフレクで反射可能。',
      implemented: false },
    // ...
  ],
  implemented: false, runtimeReady: false,
}
```

- `nameConfidence` flags how solid each boss's naming is (`high`/`medium`) — `high` means the
  name was confirmed on a Pixel Remaster–specific boss page; `medium` means it comes from a
  GBA-baseline moveset summary (very likely correct, but not individually re-confirmed), or
  the boss is an EX-stage superboss that never shipped in Pixel Remaster at all (`world:
  'ex'`).
- `target` reuses the exact same vocabulary as `battleCatalog.js`'s `targetDescriptors`
  (`one_enemy`, `all_enemies`, `self`, `all_allies`, `one_ally`), but from the **boss's own
  point of view** as the acting unit — so `one_enemy` means "one party member," matching how
  `BossActionProfiles.js` already models boss kits.
- `power` is a relative `'low'|'medium'|'high'|'extreme'` tier per-encounter (not
  cross-boss comparable) derived from the original release's damage ranges, meant as a
  starting point for tuning `BossActionProfiles.js`-style power multipliers, not a final
  balance number.
- `referenceHp` is an original-release baseline (mostly GBA), for relative scaling reference
  only; FFM's own boss stats in `src/data/bossData.js` are original values and are not meant
  to match it 1:1.
- Technique `id`s are per-boss sequential (`bosstech_<bossId>_01`, `_02`, ...) rather than
  slugified from the name, since `nameJa` is Japanese text that doesn't romanize cleanly into
  an ASCII slug.

To wire a technique into an actual encounter: pick entries from
`ff5BossTechniques[...].techniques`, translate them into `BossActionProfiles.js`'s
`attack()`/`magic()`/`status()` shorthands (or a new `battleCatalog.js`-style operations
list if the effect needs one), and set `implemented: true` on the copy that ships — the
reference record itself stays untouched so it remains reusable for other bosses/kits.
