/** Boss-specific action scripts.  No shared "pick any weighted move" AI. */
const physical = (id, name, power, extra = {}) => ({ id, name, kind: 'physical-attack', power, ctbCost: 1, ...extra });
const magic = (id, name, ff5Power, element, extra = {}) => ({ id, name, kind: 'magic-attack', ff5Power, formula: 'ff5_magic', element, ctbCost: 1.15, ...extra });
const scripted = (id, name, operations, extra = {}) => ({ id, name, kind: 'scripted', operations, ctbCost: 1.2, ...extra });
const phase = (maxHpRatio, sequence) => ({ maxHpRatio, sequence, actions: sequence });
const randomChoice = (...choices) => Object.freeze({ choices: Object.freeze(choices) });

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
  waveCannon: scripted('omega-wave-cannon', 'はどうほう', [
    { op: 'damage.max_hp_ratio', ratio: 0.5 },
    { op: 'status.apply', statuses: ['sap'], statusChance: 1 },
  ], { target: 'all_enemies', ctbCost: 1.55 }),
  blasterParalyze: { id: 'omega-blaster-paralyze', name: 'ブラスター', kind: 'status', statuses: ['paralyze'], statusChance: 0.85, target: 'one_enemy', ctbCost: 1 },
  blasterDeath: { id: 'omega-blaster-death', name: 'ブラスター', kind: 'status', statuses: ['ko'], statusChance: 0.66, target: 'one_enemy', ctbCost: 1 },
  maelstrom: scripted('omega-maelstrom', 'ミールストーム', [{ op: 'damage.to_critical' }], { target: 'all_enemies', ctbCost: 1.4 }),
  quake: magic('omega-quake', 'じしん', 110, 'earth', { target: 'all_enemies' }),
  targeting: physical('omega-targeting', 'ターゲッティング', 1.6, { target: 'one_enemy', ignoreEvasion: true }),
});

export const BOSS_ACTION_PROFILES = Object.freeze({
  boss1: Object.freeze({
    phases: [phase(1, [
      magic('granite-fall', '大陸落とし', 120, 'earth', { target: 'all_enemies', telegraph: '巨岩を天高く掲げた――次の行動で落下する！', ctbCost: 1.8 }),
      physical('granite-fist', '花崗岩の拳', 1.25),
      magic('fault-line', '断層波', 70, 'earth', { target: 'all_enemies' }),
    ])],
    counterPool: [],
  }),
  omega: Object.freeze({
    // SFC Omega's eight-slot loop alternates a choice group with Wave Cannon.
    // Choice selection is derived from the persisted cursor, so suspend/resume
    // cannot reroll a more convenient move.
    phases: [
      phase(1, [
        randomChoice(omegaActions.atomicRay, omegaActions.deltaAttack, omegaActions.blasterParalyze, omegaActions.blasterDeath),
        omegaActions.waveCannon,
        randomChoice(omegaActions.rainbowWind, omegaActions.flameThrower, omegaActions.atomicRay),
        omegaActions.waveCannon,
        randomChoice(omegaActions.maelstrom, omegaActions.quake, omegaActions.rainbowWind),
        omegaActions.waveCannon,
        omegaActions.targeting,
        omegaActions.waveCannon,
      ]),
    ],
    counterPool: [
      { id: 'omega-circle', name: 'サークル', kind: 'remove-from-battle', target: 'one_enemy', ctbCost: 0 },
      scripted('omega-mustard-bomb', 'マスタードボム', [{ op: 'damage.magic', formula: 'ff5_magic', ff5Power: 85 }, { op: 'status.apply', statuses: ['sap'], statusChance: 0.85 }], { target: 'one_enemy', ctbCost: 0 }),
      scripted('omega-rocket-punch', 'ロケットパンチ', [{ op: 'damage.hp_ratio', ratio: 0.5 }, { op: 'status.apply', statuses: ['confuse'], statusChance: 0.85 }], { target: 'one_enemy', ctbCost: 0 }),
    ],
  }),
  boss2: Object.freeze({
    phases: [
      phase(1, [physical('garuda-talon', '裂空爪', 1.15), magic('garuda-gale', '真空連刃', 45, 'wind', { hits: 3 }), { id: 'garuda-cry', name: '天鳴', kind: 'status', statuses: ['silence'], statusChance: 0.7, target: 'all_enemies' }]),
      phase(0.5, [magic('garuda-tempest', '蒼穹の嵐', 90, 'wind', { target: 'all_enemies' }), physical('garuda-dive', '天墜衝', 1.9), magic('garuda-eye', '嵐の風眼', 145, 'wind', { target: 'all_enemies', telegraph: '風が一点へ収束する――次の行動で風眼が荒れ狂う！', ctbCost: 1.8 })]),
    ],
    counterPool: [],
  }),
  boss3: Object.freeze({
    phases: [
      phase(1, [physical('bahamut-claw', '竜爪連撃', 0.75, { hits: 2 }), magic('bahamut-flare', 'ダークフレア', 130, null), { id: 'bahamut-roar', name: '竜威', kind: 'status', statuses: ['sap'], statusChance: 0.8, target: 'all_enemies' }]),
      phase(0.6, [magic('bahamut-breath', '雷嵐の息吹', 120, 'thunder', { target: 'all_enemies' }), physical('bahamut-tail', '震天尾撃', 1.7, { target: 'all_enemies' }), magic('bahamut-collapse', '星砕メガフレア', 210, null, { target: 'all_enemies', telegraph: '星光が竜の胸へ集う――守りを固めろ！', ctbCost: 2 })]),
      phase(0.25, [magic('bahamut-nova', '終焉新星', 185, 'fire', { target: 'all_enemies' }), physical('bahamut-rush', '破滅の四連撃', 0.58, { hits: 4 }), magic('bahamut-collapse-plus', '極星砕メガフレア', 250, null, { target: 'all_enemies', telegraph: '空間が砕け始めた――これが最後の予兆だ！', ctbCost: 2.2 })]),
    ],
    counterPool: [],
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

export function nextBossActionFor(unit, cursor = 0) {
  const sequence = bossActionsFor(unit);
  if (!sequence.length) return { id: 'enemy-attack', name: 'こうげき', kind: 'physical-attack', ctbCost: 1 };
  const safeCursor = Math.max(0, cursor);
  const entry = sequence[safeCursor % sequence.length];
  if (!entry?.choices?.length) return entry;
  const cycle = Math.floor(safeCursor / sequence.length);
  const choiceIndex = ((Math.imul(cycle + 1, 1103515245) + safeCursor * 12345) >>> 16) % entry.choices.length;
  return entry.choices[choiceIndex];
}

export function bossPhaseIndex(unit) {
  const profile = BOSS_ACTION_PROFILES[unit.id];
  if (!profile) return 0;
  return Math.max(0, profile.phases.indexOf(activePhase(unit)));
}

export function counterPoolFor(unit) {
  return BOSS_ACTION_PROFILES[unit.id]?.counterPool ?? [];
}
