/** Boss-specific action scripts.  No shared "pick any weighted move" AI. */
const physical = (id, name, power, extra = {}) => ({ id, name, kind: 'physical-attack', power, ctbCost: 1, ...extra });
const magic = (id, name, ff5Power, element, extra = {}) => ({ id, name, kind: 'magic-attack', ff5Power, formula: 'ff5_magic', element, ctbCost: 1.15, ...extra });
const scripted = (id, name, operations, extra = {}) => ({ id, name, kind: 'scripted', operations, ctbCost: 1.2, ...extra });
const phase = (maxHpRatio, sequence) => ({ maxHpRatio, sequence, actions: sequence });
const randomChoice = (...choices) => Object.freeze({ choices: Object.freeze(choices) });
// A single CTB turn that fires two actions back-to-back (each may itself be
// a randomChoice). Faithful to Omega's turn-5 "2回攻撃".
const doubleAction = (...entries) => Object.freeze({ multi: Object.freeze(entries) });

const omegaActions = Object.freeze({
  atomicRay: magic('omega-atomic-ray', 'アトミックレイ', 95, 'fire', { target: 'all_enemies' }),
  flameThrower: magic('omega-flame-thrower', 'かえんほうしゃ', 70, 'fire', { target: 'one_enemy' }),
  deltaAttack: scripted('omega-delta-attack', 'デルタアタック', [
    { op: 'damage.magic', formula: 'ff5_magic', ff5Power: 65 },
    { op: 'status.apply', statuses: ['petrify'], statusChance: 0.66 },
  ], { target: 'one_enemy' }),
  rainbowWind: scripted('omega-rainbow-wind', 'にじいろのかぜ', [
    { op: 'status.apply', statuses: ['blind', 'silence', 'sap'], statusChance: 0.85 },
  ], { target: 'one_enemy' }),
  // 最大HPの半分のダメージ(状態異常なし)。
  waveCannon: scripted('omega-wave-cannon', 'はどうほう', [
    { op: 'damage.max_hp_ratio', ratio: 0.5 },
  ], { target: 'all_enemies', ctbCost: 1.55 }),
  // 即死 or マヒのどちらか一方のみが発生する(両方同時には発生しない)。
  blaster: randomChoice(
    { id: 'omega-blaster-paralyze', name: 'ブラスター', kind: 'status', statuses: ['paralyze'], statusChance: 0.85, target: 'one_enemy', ctbCost: 1 },
    { id: 'omega-blaster-death', name: 'ブラスター', kind: 'status', statuses: ['ko'], statusChance: 0.66, target: 'one_enemy', ctbCost: 1 },
  ),
  maelstrom: scripted('omega-maelstrom', 'ミールストーム', [{ op: 'damage.to_critical' }], { target: 'all_enemies', ctbCost: 1.4 }),
  quake: magic('omega-quake', 'じしん', 110, 'earth', { target: 'all_enemies' }),
  // ターゲッティングはリフレクで反射される特殊技(物理相当のダメージだが
  // 反射判定の扱いは魔法と同じ)。
  targeting: physical('omega-targeting', 'ターゲッティング', 1.6, { target: 'one_enemy', ignoreEvasion: true, reflectable: true }),
});

// にじいろのかぜ・かえんほうしゃ・アトミックレイの3択は、行動パターン表の
// 3ターン目と7ターン目で全く同じ選択肢として再利用されている。
const windOrFireOrRayChoice = randomChoice(omegaActions.rainbowWind, omegaActions.flameThrower, omegaActions.atomicRay);

export const BOSS_ACTION_PROFILES = Object.freeze({
  boss1: Object.freeze({
    phases: [phase(1, [
      magic('granite-fall', '大陸落とし', 120, 'earth', { target: 'all_enemies', telegraph: '巨岩を天高く掲げた――次の行動で落下する！', ctbCost: 1.8 }),
      physical('granite-fist', '花崗岩の拳', 1.25),
      magic('fault-line', '断層波', 70, 'earth', { target: 'all_enemies' }),
    ])],
    counterSequence: [],
  }),
  omega: Object.freeze({
    // FF5原作のオメガ行動パターン(8ターン周期):
    // 1: アトミックレイ/デルタアタック/ブラスター(いずれか1つ)
    // 2: はどうほう
    // 3: にじいろのかぜ/かえんほうしゃ/アトミックレイ(いずれか1つ)
    // 4: はどうほう
    // 5: 2回攻撃 (1)デルタアタック/ブラスター/はどうほう (2)ミールストーム/じしん/にじいろのかぜ
    // 6: ターゲッティング
    // 7: にじいろのかぜ/かえんほうしゃ/アトミックレイ(3ターン目と同一)
    // 8: はどうほう
    phases: [
      phase(1, [
        randomChoice(omegaActions.atomicRay, omegaActions.deltaAttack, omegaActions.blaster),
        omegaActions.waveCannon,
        windOrFireOrRayChoice,
        omegaActions.waveCannon,
        doubleAction(
          randomChoice(omegaActions.deltaAttack, omegaActions.blaster, omegaActions.waveCannon),
          randomChoice(omegaActions.maelstrom, omegaActions.quake, omegaActions.rainbowWind),
        ),
        omegaActions.targeting,
        windOrFireOrRayChoice,
        omegaActions.waveCannon,
      ]),
    ],
    // ダメージを受けると必ず2回のカウンター行動を行う。1回目は
    // ロケットパンチ/マスタードボムのいずれか、2回目はロケットパンチ/
    // サークルのいずれか(原作の反撃仕様に準拠)。
    counterSequence: [
      randomChoice(
        scripted('omega-rocket-punch', 'ロケットパンチ', [{ op: 'damage.hp_ratio', ratio: 0.5 }, { op: 'status.apply', statuses: ['confuse'], statusChance: 0.85 }], { target: 'one_enemy', ctbCost: 0 }),
        scripted('omega-mustard-bomb', 'マスタードボム', [{ op: 'damage.magic', formula: 'ff5_magic', ff5Power: 85 }], { target: 'one_enemy', ctbCost: 0 }),
      ),
      randomChoice(
        scripted('omega-rocket-punch', 'ロケットパンチ', [{ op: 'damage.hp_ratio', ratio: 0.5 }, { op: 'status.apply', statuses: ['confuse'], statusChance: 0.85 }], { target: 'one_enemy', ctbCost: 0 }),
        { id: 'omega-circle', name: 'サークル', kind: 'remove-from-battle', target: 'one_enemy', ctbCost: 0 },
      ),
    ],
  }),
  boss2: Object.freeze({
    phases: [
      phase(1, [physical('garuda-talon', '裂空爪', 1.15), magic('garuda-gale', '真空連刃', 45, 'wind', { hits: 3 }), { id: 'garuda-cry', name: '天鳴', kind: 'status', statuses: ['silence'], statusChance: 0.7, target: 'all_enemies' }]),
      phase(0.5, [magic('garuda-tempest', '蒼穹の嵐', 90, 'wind', { target: 'all_enemies' }), physical('garuda-dive', '天墜衝', 1.9), magic('garuda-eye', '嵐の風眼', 145, 'wind', { target: 'all_enemies', telegraph: '風が一点へ収束する――次の行動で風眼が荒れ狂う！', ctbCost: 1.8 })]),
    ],
    counterSequence: [],
  }),
  boss3: Object.freeze({
    phases: [
      phase(1, [physical('bahamut-claw', '竜爪連撃', 0.75, { hits: 2 }), magic('bahamut-flare', 'ダークフレア', 130, null), { id: 'bahamut-roar', name: '竜威', kind: 'status', statuses: ['sap'], statusChance: 0.8, target: 'all_enemies' }]),
      phase(0.6, [magic('bahamut-breath', '雷嵐の息吹', 120, 'thunder', { target: 'all_enemies' }), physical('bahamut-tail', '震天尾撃', 1.7, { target: 'all_enemies' }), magic('bahamut-collapse', '星砕メガフレア', 210, null, { target: 'all_enemies', telegraph: '星光が竜の胸へ集う――守りを固めろ！', ctbCost: 2 })]),
      phase(0.25, [magic('bahamut-nova', '終焉新星', 185, 'fire', { target: 'all_enemies' }), physical('bahamut-rush', '破滅の四連撃', 0.58, { hits: 4 }), magic('bahamut-collapse-plus', '極星砕メガフレア', 250, null, { target: 'all_enemies', telegraph: '空間が砕け始めた――これが最後の予兆だ！', ctbCost: 2.2 })]),
    ],
    counterSequence: [],
  }),
});

function activePhase(unit) {
  const profile = BOSS_ACTION_PROFILES[unit.id];
  if (!profile) return null;
  return profile.phases.filter((phase) => unit.hpRatio() <= phase.maxHpRatio).sort((a, b) => a.maxHpRatio - b.maxHpRatio)[0] ?? profile.phases[0];
}

export function bossActionsFor(unit) {
  return activePhase(unit)?.sequence ?? unit.aiActions ?? [];
}

function resolveChoiceIndex(entry, safeCursor, sequenceLength, depth) {
  const cycle = Math.floor(safeCursor / sequenceLength);
  const seed = Math.imul(cycle + 1 + depth * 7919, 1103515245) + safeCursor * 12345 + depth * 97;
  return (seed >>> 16) % entry.choices.length;
}

function resolveEntry(entry, safeCursor, sequenceLength) {
  let resolved = entry;
  let depth = 0;
  while (resolved?.choices?.length) {
    resolved = resolved.choices[resolveChoiceIndex(resolved, safeCursor, sequenceLength, depth)];
    depth += 1;
    if (depth > 5) break; // safety net against a misconfigured cyclic choice
  }
  return resolved;
}

/**
 * Returns either a single resolved action, or `{ multi: [actionA, actionB] }`
 * for turns that fire more than one action (e.g. Omega's turn-5 "2回攻撃").
 * Resolution is a deterministic hash of the cursor, so suspend/resume can't
 * reroll into a more convenient move.
 */
export function nextBossActionFor(unit, cursor = 0) {
  const sequence = bossActionsFor(unit);
  if (!sequence.length) return { id: 'enemy-attack', name: 'こうげき', kind: 'physical-attack', ctbCost: 1 };
  const safeCursor = Math.max(0, cursor);
  const entry = sequence[safeCursor % sequence.length];
  if (entry?.multi?.length) {
    return { multi: entry.multi.map((subEntry) => resolveEntry(subEntry, safeCursor, sequence.length)) };
  }
  return resolveEntry(entry, safeCursor, sequence.length);
}

export function bossPhaseIndex(unit) {
  const profile = BOSS_ACTION_PROFILES[unit.id];
  if (!profile) return 0;
  return Math.max(0, profile.phases.indexOf(activePhase(unit)));
}

export function counterSequenceFor(unit) {
  return BOSS_ACTION_PROFILES[unit.id]?.counterSequence ?? [];
}
