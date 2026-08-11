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
  const level = record.level ?? ({ blue: 3, summon: 3 }[record.school] ?? 1);
  if (/大ダメージ|フレア|バハムート/.test(record.effect)) return 4.2 + level * 0.15;
  if (/中ダメージ/.test(record.effect)) return 2.7;
  if (record.school === 'summon') return 1.8 + level * 0.55;
  return 1.35 + level * 0.38;
}

function healAmount(record) {
  if (record.id === 'magic_cure') return 400;
  if (record.id === 'magic_cura') return 850;
  if (record.id === 'magic_curaga') return 1600;
  return 500 + (record.level ?? 1) * 180;
}

function magicOperations(record) {
  const effect = record.effect ?? '';
  const statuses = statusesFromEffect(effect);
  const operations = [];
  const conditionalLevel = Number(record.nameEn.match(/^Level (\d)/)?.[1] ?? 0) || null;

  if (record.id === 'magic_speed') operations.push({ op: 'battle.speed', multiplier: 0.7, duration: 4 });
  else if (record.id === 'magic_golem') operations.push({ op: 'barrier.physical', amountFormula: 'caster_level' });
  else if (record.id === 'magic_phoenix') operations.push(
    { op: 'damage.magic', formula: 'ff5_magic', power: magicPower(record), targetSide: 'enemy' },
    { op: 'revive', hpRatio: 1, targetSide: 'ally' },
  );
  else if (record.id === 'magic_sylph') operations.push(
    { op: 'drain.hp', formula: 'ff5_magic', power: magicPower(record), targetSide: 'enemy' },
    { op: 'heal.hp', formula: 'ff5_magic', amount: healAmount(record), targetSide: 'ally' },
  );
  else if (record.id === 'magic_transfusion') operations.push(
    { op: 'restore.full', targetSide: 'ally' },
    { op: 'caster.sacrifice' },
  );
  else if (record.id === 'magic_1000_needles') operations.push({ op: 'damage.fixed', amount: 1000 });
  else if (record.id === 'magic_goblin_punch') operations.push({ op: 'damage.physical', formula: 'ff5_goblin_punch', power: 1, sameLevelMultiplier: 8 });
  else if (record.id === 'magic_self_destruct') operations.push({ op: 'damage.caster_hp', sacrificeCaster: true });
  else if (record.id === 'magic_question_marks') operations.push({ op: 'damage.missing_hp' });
  else if (record.id === 'magic_white_wind') operations.push({ op: 'heal.caster_hp' });
  else if (record.id === 'magic_magic_hammer') operations.push({ op: 'damage.mp_ratio', ratio: 0.5 });
  else if (record.id === 'magic_osmose') operations.push({ op: 'drain.mp', power: 1.5 });
  else if (record.id === 'magic_gravity') operations.push({ op: 'damage.hp_ratio', ratio: 0.5, heavyImmune: true });
  else if (record.id === 'magic_graviga' || record.id === 'magic_missile' || record.id === 'magic_level_4_graviga') operations.push({ op: 'damage.hp_ratio', ratio: 0.75, heavyImmune: true });
  else if (/HPを吸収|敵からHPを吸収/.test(effect)) operations.push({ op: 'drain.hp', formula: 'ff5_magic', power: magicPower(record) });
  else if (/HPを.*回復|HPを回復|HPを中回復|HPを大回復/.test(effect)) operations.push({ op: 'heal.hp', formula: 'ff5_magic', amount: healAmount(record) });
  else if (/完全回復|HP・MPを全回復/.test(effect)) operations.push({ op: 'restore.full' });
  else if (/固定ダメージ/.test(effect)) operations.push({ op: 'damage.fixed', amount: 700 });
  else if (/ダメージ|攻撃|フレア/.test(effect)) operations.push({ op: 'damage.magic', formula: record.id === 'magic_flare' ? 'ff5_flare' : 'ff5_magic', power: magicPower(record), hits: /複数回/.test(effect) ? 4 : 1 });

  if (record.id !== 'magic_phoenix' && /復帰|蘇生/.test(effect)) operations.push({ op: 'revive', hpRatio: /完全/.test(effect) ? 1 : 0.25 });
  if (/調べる/.test(effect)) operations.push({ op: 'inspect', fields: ['hp', 'mp', 'weakness', 'status', 'level'] });
  if (/治療/.test(effect)) operations.push({ op: 'status.remove', statuses: statuses.filter((status) => status !== 'ko'), mode: /以外|複数/.test(effect) ? 'all_curable' : 'listed' });
  if (/有利な魔法効果を解除/.test(effect)) operations.push({ op: 'status.dispel', polarity: 'positive' });
  if (/付与|切り替える|バーサク|リフレク|浮遊|徐々に回復|ダメージを軽減|分身/.test(effect)) operations.push({ op: 'status.apply', statuses, toggle: /切り替える/.test(effect), imageHits: /分身/.test(effect) ? 2 : null });
  if (statuses.length > 0 && !/治療|復帰|蘇生/.test(effect) && !operations.some((operation) => operation.op === 'status.apply')) {
    operations.push({ op: 'status.apply', statuses });
  }
  if (/防御を低下/.test(effect)) operations.push({ op: 'stat.modify', stat: 'def', multiplier: 0.5 });
  if (/レベルを半減/.test(effect)) operations.push({ op: 'stat.modify', stat: 'level', multiplier: 0.5 });
  if (/現在MPを半減/.test(effect)) operations.push({ op: 'damage.mp_ratio', ratio: 0.5 });
  if (/戦場から消去/.test(effect)) operations.push({ op: 'remove.from_battle' });
  if (/脱出/.test(effect)) operations.push({ op: 'battle.escape' });
  if (/巻き戻す/.test(effect)) operations.push({ op: 'battle.restart' });
  if (/2回行動/.test(effect)) operations.push({ op: 'turn.extra', count: 2 });
  if (/速度を上昇/.test(effect) && !statuses.includes('haste')) operations.push({ op: 'stat.modify', stat: 'agility', multiplier: 1.25 });
  if (/速度を低下/.test(effect) && !statuses.includes('slow')) operations.push({ op: 'stat.modify', stat: 'agility', multiplier: 0.75 });
  if (/魔法使用不能/.test(effect)) operations.push({ op: 'battle.field_status', status: 'mute' });
  if (/物理ダメージを肩代わり/.test(effect) && !operations.some((operation) => operation.op === 'barrier.physical')) operations.push({ op: 'barrier.physical', amountFormula: 'caster_level' });
  if (record.id === 'magic_transfusion' && !operations.some((operation) => operation.op === 'caster.sacrifice')) operations.push({ op: 'caster.sacrifice' });

  if (operations.length === 0) operations.push({ op: 'effect.script', handlerKey: record.id });
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
  if (/全体攻撃/.test(effect)) return [{ op: 'damage.magic', formula: 'ff5_magic', power: 2.5 }];
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
    formulaVersion: 'ff5_adapter_v1',
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
  return 'scripted';
}

function battleDisabledReason(record) {
  const operations = record.battle?.operations ?? [];
  if (operations.some((operation) => operation.op === 'battle.escape')) return 'ボス戦からはテレポで脱出できない。';
  if (operations.some((operation) => operation.op === 'battle.restart')) return 'ボス戦では戦闘開始時へ巻き戻せない。';
  return null;
}

export function magicRecordToAction(record) {
  const primary = record.battle.operations[0];
  return Object.freeze({
    id: record.id,
    sourceId: record.id,
    sourceType: 'magic',
    school: record.school,
    level: record.level,
    name: record.nameJa,
    actionKind: primaryActionKind(primary),
    ctbCost: 0.8 + Math.min(1.2, (record.mpCost ?? 0) / 65),
    mpCost: record.mpCost,
    element: record.battle.element,
    target: record.target,
    effect: record.effect,
    power: primary.power,
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
    healAmount: primary.amount,
    fixedDamage: primary.amount,
    ratio: primary.ratio,
    statuses: primary.statuses ?? [],
    operations: record.battle.operations,
    runtimeReady: true,
    disabledReason: battleDisabledReason(record),
  });
}

export function crystalShardAction(shardId) {
  const record = battleReadyShards.find((shard) => shard.id === shardId);
  return record ? battleRecordToAction(record) : null;
}

export function magicActionsForSchool(school, { maxLevel = Infinity } = {}) {
  return battleReadyMagic.filter((record) => record.school === school && (record.level ?? 0) <= maxLevel).map(magicRecordToAction);
}
