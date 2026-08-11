/** Original boss kits. Data-only so encounter tuning does not add DOM cost. */
const attack = (id, name, power, extra = {}) => ({ id, name, kind: 'physical-attack', power, ctbCost: 1, ...extra });
const magic = (id, name, power, element, extra = {}) => ({ id, name, kind: 'magic-attack', power, element, ctbCost: 1.15, ...extra });
const status = (id, name, statuses, extra = {}) => ({ id, name, kind: 'status', statuses, statusChance: 0.78, ctbCost: 0.9, ...extra });

export const BOSS_ACTION_PROFILES = Object.freeze({
  boss1: Object.freeze({
    phases: [
      { maxHpRatio: 1, actions: [attack('granite-fist', '花崗岩の拳', 1.25, { weight: 3 }), magic('fault-line', '断層波', 1.1, 'earth', { target: 'all_enemies', weight: 2 }), status('stone-roar', '石気の咆哮', ['slow'], { target: 'all_enemies' })] },
      { maxHpRatio: 0.5, actions: [attack('crush', '地殻粉砕', 1.65, { weight: 2 }), magic('magma-vein', '灼熱脈動', 1.55, 'fire', { target: 'all_enemies' }), attack('continental-fall', '大陸落とし', 2.5, { target: 'all_enemies', telegraph: '巨岩を天高く掲げた――水の力で体勢を崩せ！', ctbCost: 1.8 })] },
    ],
  }),
  boss2: Object.freeze({
    phases: [
      { maxHpRatio: 1, actions: [attack('talon', '裂空爪', 1.15, { weight: 3 }), magic('razor-gale', '真空連刃', 1.05, 'wind', { hits: 3, weight: 2 }), status('siren-cry', '天哭', ['silence'], { target: 'all_enemies' })] },
      { maxHpRatio: 0.5, actions: [magic('tempest', '蒼穹の嵐', 1.55, 'wind', { target: 'all_enemies', weight: 2 }), attack('sky-dive', '天墜衝', 1.9), magic('eye-of-storm', '滅びの風眼', 2.65, 'wind', { target: 'all_enemies', telegraph: '風が一点へ収束する――氷撃で風眼を乱せ！', ctbCost: 1.9 })] },
    ],
  }),
  boss3: Object.freeze({
    phases: [
      { maxHpRatio: 1, actions: [attack('dragon-claw', '竜爪連撃', 0.75, { hits: 2, weight: 3 }), magic('dark-flare', '黒耀フレア', 1.7, null, { weight: 2 }), status('dread-roar', '竜威', ['sap'], { target: 'all_enemies' })] },
      { maxHpRatio: 0.6, actions: [magic('storm-breath', '雷嵐の息吹', 1.6, 'thunder', { target: 'all_enemies', weight: 2 }), attack('tail-calamity', '震天尾撃', 1.7, { target: 'all_enemies' }), magic('astral-collapse', '星蝕メガフレア', 2.8, null, { target: 'all_enemies', telegraph: '星光が竜の胸へ集う――守りを固め、雷で魔力を散らせ！', ctbCost: 2 })] },
      { maxHpRatio: 0.25, actions: [magic('last-nova', '終焉新星', 2.1, 'fire', { target: 'all_enemies', weight: 2 }), attack('ruin-rush', '破滅の四連撃', 0.58, { hits: 4, weight: 2 }), magic('astral-collapse-plus', '極星蝕メガフレア', 3.2, null, { target: 'all_enemies', telegraph: '空間が砕け始めた――これが最後の予兆だ！', ctbCost: 2.2 })] },
    ],
  }),
});

export function bossActionsFor(unit) {
  const profile = BOSS_ACTION_PROFILES[unit.id];
  if (!profile) return unit.aiActions ?? [];
  const ratio = unit.hpRatio();
  return profile.phases
    .filter((phase) => ratio <= phase.maxHpRatio)
    .sort((a, b) => a.maxHpRatio - b.maxHpRatio)[0]?.actions ?? [];
}

export function bossPhaseIndex(unit) {
  const profile = BOSS_ACTION_PROFILES[unit.id];
  if (!profile) return 0;
  const eligible = profile.phases.filter((phase) => unit.hpRatio() <= phase.maxHpRatio);
  const active = eligible.sort((a, b) => a.maxHpRatio - b.maxHpRatio)[0];
  return profile.phases.indexOf(active);
}
