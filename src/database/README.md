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
