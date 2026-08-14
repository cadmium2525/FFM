import {
  crystalShards,
  ff5Equipment,
  ff5Items,
  ff5JobAbilities,
  ff5Magic,
  ff5Shops,
  ff5Songs,
} from './ff5Database.js';

const normalizeBattleElement = (element) => element === 'lightning' ? 'thunder' : element;

// SFC-style spell attack powers.  Keeping these explicit prevents a spell's
// database prose or MP cost from silently changing its battle strength.
export const FF5_MAGIC_SPECS = Object.freeze({
  magic_cure: { power: 15, formula: 'heal' }, magic_cura: { power: 45, formula: 'heal' }, magic_curaga: { power: 180, formula: 'heal' },
  magic_fire: { power: 15 }, magic_blizzard: { power: 15 }, magic_thunder: { power: 15 },
  magic_fira: { power: 50 }, magic_blizzara: { power: 50 }, magic_thundara: { power: 50 },
  magic_drain: { power: 45 }, magic_bio: { power: 105 },
  magic_firaga: { power: 185 }, magic_blizzaga: { power: 185 }, magic_thundaga: { power: 185 },
  magic_flare: { power: 254, formula: 'ff5_flare' }, magic_holy: { power: 241 },
  magic_comet: { power: 50, variance: 'comet' }, magic_meteor: { power: 110, hits: 4, variance: 'meteor' },
  magic_chocobo: { power: 30 }, magic_sylph: { power: 25 }, magic_shiva: { power: 45 },
  magic_ramuh: { power: 50 }, magic_ifrit: { power: 50 }, magic_titan: { power: 110 },
  magic_syldra: { power: 165 }, magic_phoenix: { power: 105 }, magic_leviathan: { power: 195 }, magic_bahamut: { power: 250 },
  magic_goblin_punch: { power: 1 }, magic_vampire: { power: 35 },
  magic_aero: { power: 10 }, magic_flame_thrower: { power: 50 }, magic_mind_blast: { power: 50 },
  magic_aera: { power: 50 }, magic_level_3_flare: { power: 254, formula: 'ff5_flare' },
  magic_aeroga: { power: 140 }, magic_aqua_breath: { power: 75 },
});

const statusMatchers = Object.freeze([
  ['poison', /毒/], ['blind', /暗闇/], ['silence', /沈黙/], ['toad', /カエル/],
  ['mini', /小人/], ['petrify', /石化/], ['confuse', /混乱/], ['paralyze', /麻痺/],
  ['sleep', /睡眠/], ['old', /老化/], ['berserk', /バーサク/], ['zombie', /ゾンビ/],
  ['stop', /ストップ|時間停止/], ['slow', /スロウ|速度を低下/], ['haste', /ヘイスト|速度を上昇/],
  ['regen', /リジェネ|徐々に回復/], ['protect', /プロテス|物理ダメージを軽減/],
  ['shell', /シェル|魔法ダメージを軽減/], ['reflect', /リフレク|魔法反射/],
  ['float', /レビテト|浮遊/], ['doom', /死の宣告/], ['sap', /スリップ/], ['ko', /即死|戦闘不能/],
]);

const targetDescriptors = Object.freeze({
  self: { scope: 'self', side: 'ally', selection: 'automatic' },
  one_ally: { scope: 'one', side: 'ally', selection: 'manual' },
  one_enemy: { scope: 'one', side: 'enemy', selection: 'manual' },
  one_target: { scope: 'one', side: 'any', selection: 'manual' },
  one_or_all_allies: { scope: 'one_or_all', side: 'ally', selection: 'manual' },
  one_or_all_enemies: { scope: 'one_or_all', side: 'enemy', selection: 'manual' },
  all_allies: { scope: 'all', side: 'ally', selection: 'automatic' },
  all_enemies: { scope: 'all', side: 'enemy', selection: 'automatic' },
  all_units: { scope: 'all', side: 'any', selection: 'automatic' },
  party: { scope: 'all', side: 'ally', selection: 'automatic' },
  battle: { scope: 'battle', side: 'none', selection: 'automatic' },
  enemy_group: { scope: 'all', side: 'enemy', selection: 'automatic' },
  enemy_and_party: { scope: 'hybrid', side: 'both', selection: 'automatic' },
  enemy_group_and_ally: { scope: 'hybrid', side: 'both', selection: 'manual' },
  random_unit: { scope: 'random', side: 'any', selection: 'automatic' },
  none: { scope: 'none', side: 'none', selection: 'automatic' },
});

function targetDescriptor(target) {
  return Object.freeze({ id: target ?? 'none', ...(targetDescriptors[target ?? 'none'] ?? targetDescriptors.none) });
}

function statusesFromEffect(effect) {
  return statusMatchers.filter(([, pattern]) => pattern.test(effect ?? '')).map(([status]) => status);
}

function magicPower(record) {
  if (FF5_MAGIC_SPECS[record.id]) return FF5_MAGIC_SPECS[record.id].power;
  const level = record.level ?? ({ blue: 3, summon: 3 }[record.school] ?? 1);
  if (/大ダメージ|フレア|バハムート/.test(record.effect)) return 4.2 + level * 0.15;
  if (/中ダメージ/.test(record.effect)) return 2.7;
  if (record.school === 'summon') return 1.8 + level * 0.55;
  return 1.35 + level * 0.38;
}

function healAmount(record) {
  if (FF5_MAGIC_SPECS[record.id]?.formula === 'heal') return null;
  return 500 + (record.level ?? 1) * 180;
}

function magicOperations(record) {
  const conditionalLevel = Number(record.nameEn.match(/^Level (\d)/)?.[1] ?? 0) || null;
  const status = (statuses, extra = {}) => [{ op: 'status.apply', statuses, ...extra }];
  const damage = (extra = {}) => [{
    op: 'damage.magic', formula: FF5_MAGIC_SPECS[record.id]?.formula ?? 'ff5_magic',
    ff5Power: magicPower(record), power: magicPower(record), hits: FF5_MAGIC_SPECS[record.id]?.hits ?? 1, ...extra,
  }];
  const explicit = {
    magic_cure: [{ op: 'heal.hp', formula: 'ff5_magic', ff5Power: 15 }],
    magic_libra: [{ op: 'inspect', fields: ['hp', 'mp', 'weakness', 'status', 'level'] }],
    magic_poisona: [{ op: 'status.remove', statuses: ['poison'], mode: 'listed' }],
    magic_silence: status(['silence']), magic_protect: status(['protect']), magic_mini: status(['mini'], { toggle: true }),
    magic_cura: [{ op: 'heal.hp', formula: 'ff5_magic', ff5Power: 45 }],
    magic_raise: [{ op: 'revive', hpRatio: 0.25 }], magic_confuse: status(['confuse']),
    magic_blink: status([], { imageHits: 2 }), magic_shell: status(['shell']),
    magic_esuna: [{ op: 'status.remove', statuses: [], mode: 'all_curable' }],
    magic_curaga: [{ op: 'heal.hp', formula: 'ff5_magic', ff5Power: 180 }],
    magic_reflect: status(['reflect']), magic_berserk: status(['berserk']),
    magic_arise: [{ op: 'revive', hpRatio: 1 }], magic_dispel: [{ op: 'status.dispel', polarity: 'positive' }],
    magic_poison: status(['poison']), magic_sleep: status(['sleep']), magic_toad: status(['toad'], { toggle: true }),
    magic_break: status(['petrify']), magic_bio: [...damage(), ...status(['sap'])], magic_death: status(['ko']),
    magic_osmose: [{ op: 'drain.mp', power: 1.5 }],
    magic_speed: [{ op: 'battle.speed', multiplier: 0.7, duration: 4 }], magic_slow: status(['slow']),
    magic_regen: status(['regen']), magic_mute: [{ op: 'battle.field_status', status: 'mute' }],
    magic_haste: status(['haste']), magic_float: status(['float']),
    magic_gravity: [{ op: 'damage.hp_ratio', ratio: 0.5, heavyImmune: true }], magic_stop: status(['stop']),
    magic_teleport: [{ op: 'battle.escape' }], magic_slowga: status(['slow']), magic_return: [{ op: 'battle.restart' }],
    magic_graviga: [{ op: 'damage.hp_ratio', ratio: 0.75, heavyImmune: true }], magic_hastega: status(['haste']),
    magic_old: status(['old']), magic_quick: [{ op: 'turn.extra', count: 2 }],
    magic_banish: [{ op: 'remove.from_battle' }],
    magic_sylph: [
      { op: 'drain.hp', formula: 'ff5_magic', ff5Power: 25, power: 25, targetSide: 'enemy' },
      { op: 'heal.hp', formula: 'ff5_magic', ff5Power: 25, targetSide: 'ally' },
    ],
    magic_remora: status(['paralyze']), magic_golem: [{ op: 'barrier.physical', amountFormula: 'caster_level' }],
    magic_catoblepas: status(['petrify']), magic_carbuncle: status(['reflect']),
    magic_odin: [{ op: 'summon.odin', ff5Power: 180 }],
    magic_phoenix: [
      { op: 'damage.magic', formula: 'ff5_magic', ff5Power: 105, targetSide: 'enemy' },
      { op: 'revive', hpRatio: 1, targetSide: 'ally' },
    ],
    magic_goblin_punch: [{ op: 'damage.physical', formula: 'ff5_goblin_punch', power: 1, sameLevelMultiplier: 8 }],
    magic_roulette: status(['ko']), magic_self_destruct: [{ op: 'damage.caster_hp', sacrificeCaster: true }],
    magic_vampire: [{ op: 'drain.hp', formula: 'ff5_magic', ff5Power: 35, power: 35 }],
    magic_question_marks: [{ op: 'damage.missing_hp' }], magic_magic_hammer: [{ op: 'damage.mp_ratio', ratio: 0.5 }],
    magic_moon_flute: status(['berserk']), magic_lilliputian_lyric: status(['mini']), magic_pond_s_chorus: status(['toad']),
    magic_mind_blast: [...damage(), ...status(['paralyze', 'sap'])], magic_flash: status(['blind']),
    magic_missile: [{ op: 'damage.hp_ratio', ratio: 0.75, heavyImmune: true }],
    magic_level_4_graviga: [{ op: 'damage.hp_ratio', ratio: 0.75, heavyImmune: true }],
    magic_time_slip: status(['sleep', 'old']), magic_doom: status(['doom']), magic_level_2_old: status(['old']),
    magic_transfusion: [{ op: 'restore.full', targetSide: 'ally' }, { op: 'caster.sacrifice' }],
    magic_level_3_flare: damage(), magic_off_guard: [{ op: 'stat.modify', stat: 'def', multiplier: 0.5 }],
    magic_death_claw: [{ op: 'damage.to_critical', heavyImmune: true }, ...status(['paralyze'])],
    magic_level_5_death: status(['ko']), magic_1000_needles: [{ op: 'damage.fixed', amount: 1000 }],
    magic_dark_spark: [{ op: 'stat.modify', stat: 'level', multiplier: 0.5 }],
    magic_white_wind: [{ op: 'heal.caster_hp' }], magic_mighty_guard: status(['protect', 'shell', 'float']),
  };
  const operations = explicit[record.id] ?? (FF5_MAGIC_SPECS[record.id] ? damage() : [{ op: 'effect.script', handlerKey: record.id }]);
  return operations.map((operation) => Object.freeze({ ...operation, ...(conditionalLevel ? { conditionalLevel } : {}) }));
}

function itemOperations(record) {
  const effect = record.effect ?? '';
  const statuses = statusesFromEffect(effect);
  if (/HP・MPを全回復/.test(effect)) return [{ op: 'restore.full' }];
  if (/HPを(\d+)回復/.test(effect)) return [{ op: 'heal.hp', amount: Number(effect.match(/HPを(\d+)回復/)[1]) }];
  if (/MPを(\d+)回復/.test(effect)) return [{ op: 'heal.mp', amount: Number(effect.match(/MPを(\d+)回復/)[1]) }];
  if (/戦闘不能から復帰/.test(effect)) return [{ op: 'revive', hpRatio: 0.25 }];
  if (/治療/.test(effect)) return [{ op: 'status.remove', statuses, mode: /複数/.test(effect) ? 'all_curable' : 'listed' }];
  if (/最大HPを2倍/.test(effect)) return [{ op: 'stat.modify', stat: 'maxHp', multiplier: 2 }];
  if (/攻撃力を上昇/.test(effect)) return [{ op: 'stat.modify', stat: 'atk', multiplier: 1.25 }];
  if (/行動速度を上昇/.test(effect)) return [{ op: 'stat.modify', stat: 'agility', multiplier: 1.25 }];
  if (/物理防御を上昇/.test(effect)) return [{ op: 'stat.modify', stat: 'def', multiplier: 1.25 }];
  if (/レベルを上昇/.test(effect)) return [{ op: 'stat.modify', stat: 'level', multiplier: 1.2 }];
  if (/全体攻撃/.test(effect)) return [{ op: 'damage.magic', formula: 'ff5_magic', power: 2.5 }];
  if (record.id === 'item_magic_lamp') return [{ op: 'item.magic_lamp' }];
  return [{ op: record.category === 'mix_material' ? 'craft.material' : 'effect.script', handlerKey: record.id }];
}

function abilityOperations(record) {
  const effect = record.effect ?? '';
  if (record.type === 'field') return [{ op: 'field.passive', handlerKey: record.id }];
  if (record.type === 'equip') return [{ op: 'equipment.permission', handlerKey: record.id }];
  if (record.type === 'passive') return [{ op: 'battle.passive', handlerKey: record.id }];
  if (/魔法を使用|青魔法|白魔法|黒魔法|召喚魔法|時空魔法/.test(effect)) return [{ op: 'command.magic_menu', handlerKey: record.id }];
  return [{ op: 'command.execute', handlerKey: record.id }];
}

function songOperations(record) {
  const statuses = statusesFromEffect(record.effect);
  if (/ダメージ/.test(record.effect)) return [{ op: 'damage.magic', formula: 'ff5_flare', power: 2.8, creatureType: 'undead' }];
  if (/段階上昇/.test(record.effect)) return [{ op: 'stat.song_growth', handlerKey: record.id }];
  return [{ op: 'status.apply', statuses }];
}

function makeBattleDescriptor(record, sourceType, operations) {
  return Object.freeze({
    sourceType,
    target: targetDescriptor(record.target),
    mpCost: Math.max(0, Number(record.mpCost ?? 0)),
    element: normalizeBattleElement(record.element ?? null),
    formulaVersion: 'ff5_sfc_integer_v2',
    operations: Object.freeze(operations.map((operation) => Object.freeze({ ...operation }))),
    runtimeReady: true,
  });
}

function wrap(record, sourceType, operations) {
  return Object.freeze({ ...record, battle: makeBattleDescriptor(record, sourceType, operations) });
}

export const battleReadyMagic = Object.freeze(ff5Magic.map((record) => wrap(record, 'magic', magicOperations(record))));
export const battleReadyItems = Object.freeze(ff5Items.map((record) => wrap(record, 'item', itemOperations(record))));
export const battleReadyAbilities = Object.freeze(ff5JobAbilities.map((record) => wrap(record, 'ability', abilityOperations(record))));
export const battleReadySongs = Object.freeze(ff5Songs.map((record) => wrap(record, 'song', songOperations(record))));
export const battleReadyEquipment = Object.freeze(ff5Equipment.map((record) => wrap(record, 'equipment', [{ op: record.special ? 'equipment.special' : 'equipment.stats', handlerKey: record.special ?? record.id }])));
export const battleReadyShards = Object.freeze(crystalShards.map((record) => wrap({ ...record, target: 'one_enemy' }, 'crystal_shard', [{ op: 'damage.magic', formula: 'ffm_crystal', power: 3, techniqueId: record.techniqueId }])));
export const battleReadyShops = Object.freeze(ff5Shops.map((record) => wrap({ ...record, target: null }, 'shop', [{ op: 'shop.inventory', inventoryTags: record.inventoryTags }])));

export const battleCatalog = Object.freeze([
  ...battleReadyMagic,
  ...battleReadyItems,
  ...battleReadyAbilities,
  ...battleReadySongs,
  ...battleReadyEquipment,
  ...battleReadyShards,
  ...battleReadyShops,
]);

export const battleRecordById = new Map(battleCatalog.map((record) => [record.id, record]));

function primaryActionKind(operation) {
  if (operation.op === 'damage.physical') return 'physical-attack';
  if (operation.op === 'damage.fixed') return 'fixed-damage';
  if (operation.op === 'damage.hp_ratio') return 'ratio-damage';
  if (operation.op === 'damage.mp_ratio') return 'mp-ratio-damage';
  if (operation.op === 'drain.hp') return 'magic-attack';
  if (operation.op === 'drain.mp') return 'mp-drain';
  if (operation.op === 'heal.hp' || operation.op === 'heal.caster_hp') return 'heal';
  if (operation.op === 'restore.full') return 'full-restore';
  if (operation.op === 'revive') return 'revive';
  if (operation.op === 'inspect') return 'scan';
  if (operation.op === 'status.remove') return 'cleanse';
  if (operation.op === 'status.dispel') return 'dispel';
  if (operation.op === 'status.apply') return 'status';
  if (operation.op === 'stat.modify') return 'stat-modify';
  if (operation.op === 'damage.magic') return 'magic-attack';
  if (operation.op === 'battle.speed') return 'field-speed';
  if (operation.op === 'battle.field_status') return 'field-status';
  if (operation.op === 'barrier.physical') return 'barrier-physical';
  if (operation.op === 'summon.odin') return 'summon-odin';
  return 'scripted';
}

function battleDisabledReason(record) {
  const operations = record.battle?.operations ?? [];
  if (operations.some((operation) => operation.op === 'battle.escape')) return 'ボス戦からはテレポで脱出できない。';
  if (operations.some((operation) => operation.op === 'battle.restart')) return 'ボス戦では戦闘開始時へ巻き戻せない。';
  if (record.category === 'camp') return '戦闘中は使用できない。';
  if (record.category === 'drink') return '「のむ」で使用する専用薬。';
  if (record.category === 'throw') return '「なげる」で使用する投擲アイテム。';
  if (record.category === 'mix_material') return '「ちょうごう」で使用する素材。';
  if (record.id === 'item_beastmaster_gourd') return '装備品のため戦闘中は使用できない。';
  return null;
}

export function magicRecordToAction(record) {
  const primary = record.battle.operations[0];
  return Object.freeze({
    id: record.id,
    sourceId: record.id,
    sourceType: 'magic',
    school: record.school,
    ignoreReflect: record.school === 'summon',
    level: record.level,
    name: record.nameJa,
    actionKind: primaryActionKind(primary),
    ctbCost: 0.8 + Math.min(1.2, (record.mpCost ?? 0) / 65),
    mpCost: record.mpCost,
    element: record.battle.element,
    target: record.target,
    effect: record.effect,
    power: primary.power,
    ff5Power: primary.ff5Power,
    formula: primary.formula,
    healAmount: primary.amount,
    fixedDamage: primary.amount,
    ratio: primary.ratio,
    statuses: primary.statuses ?? [],
    operations: record.battle.operations,
    runtimeReady: true,
    disabledReason: battleDisabledReason(record),
  });
}

/** Convert any runtime-ready catalog record into the stable action shape used by BattleManager. */
export function battleRecordToAction(record) {
  if (!record?.battle?.runtimeReady) throw new TypeError(`Battle descriptor missing: ${record?.id ?? 'unknown'}`);
  const primary = record.battle.operations[0] ?? { op: 'effect.script' };
  return Object.freeze({
    id: record.id,
    sourceId: record.id,
    sourceType: record.battle.sourceType,
    name: record.techniqueNameJa ?? record.nameJa ?? record.nameEn ?? record.id,
    actionKind: primaryActionKind(primary),
    ctbCost: 0.75 + Math.min(1.25, (record.battle.mpCost ?? 0) / 60),
    mpCost: record.battle.mpCost,
    element: record.battle.element,
    target: record.battle.target.id,
    effect: record.effect ?? record.lore ?? '',
    power: primary.power,
    ff5Power: primary.ff5Power,
    formula: primary.formula,
    healAmount: primary.amount,
    fixedDamage: primary.amount,
    ratio: primary.ratio,
    statuses: primary.statuses ?? [],
    operations: record.battle.operations,
    runtimeReady: true,
    disabledReason: battleDisabledReason(record),
  });
}

export function itemRecordToAction(record) {
  const action = battleRecordToAction(record);
  return Object.freeze({
    ...action,
    name: record.nameJa,
    ctbCost: 1,
    consumable: record.consumable,
    category: record.category,
  });
}

export function crystalShardAction(shardId) {
  const record = battleReadyShards.find((shard) => shard.id === shardId);
  return record ? battleRecordToAction(record) : null;
}

export function magicActionsForSchool(school, { maxLevel = Infinity } = {}) {
  return battleReadyMagic.filter((record) => record.school === school && (record.level ?? 0) <= maxLevel).map(magicRecordToAction);
}
