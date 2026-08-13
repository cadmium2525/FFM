/** Original boss kits. Data-only so encounter tuning does not add DOM cost. */
const attack = (id, name, power, extra = {}) => ({ id, name, kind: 'physical-attack', power, ctbCost: 1, ...extra });
const magic = (id, name, power, element, extra = {}) => ({ id, name, kind: 'magic-attack', power, element, ctbCost: 1.15, ...extra });
const status = (id, name, statuses, extra = {}) => ({ id, name, kind: 'status', statuses, statusChance: 0.78, ctbCost: 0.9, ...extra });

/**
 * オメガ（次元の狭間）— FF5原作の行動パターンを再現したキット。
 * 出典: src/database/ff5BossTechniques.js の 'bossref_omega_boss' レコード
 * （行動パターンは 神ゲー攻略/FF5ピクセルリマスター版ボス個別ページ 準拠）。
 *
 * 原作の構成:
 *  - 通常行動: 8種の技から1つを選んで行動（アトミックレイ/かえんほうしゃ/
 *    ターゲッティング/デルタアタック/にじいろのかぜ/はどうほう/ブラスター/
 *    ミールストーム）
 *  - 2連続行動: 上記のうち6種（じしんを含む）から2つを選んで連続行動
 *  - 反撃行動: ダメージを受けると必ず、サークル/マスタードボム/ロケットパンチ
 *    から2つを選んで反撃してくる（BattleManagerのcounterOnHit機構で再現）
 *
 * エンジン上の簡略化点（完全な1:1ではない箇所）:
 *  - 「ターゲッティング」は原作では次の行動の対象を絞るだけの技だが、この
 *    エンジンでは1ターン目に「照準ロック」を予告し、2ターン目にその対象へ
 *    強力な一撃（ダメージ+マヒ）を放つ形で再現している（telegraph機構を流用）。
 *  - 「2連続行動」は全15通りの組み合わせではなく、代表的な組み合わせのみを
 *    個別の複合アクションとして採用している。
 */
const omegaCombo = (id, name, ops, extra = {}) => ({ id, name, kind: 'scripted', operations: ops, ctbCost: 1.4, weight: 1, ...extra });

export const BOSS_ACTION_PROFILES = Object.freeze({
  omega: Object.freeze({
    phases: [
      {
        maxHpRatio: 1,
        actions: [
          // ---- 通常行動（8種）----
          magic('omega-atomic-ray', 'アトミックレイ', 1.3, 'fire', { target: 'all_enemies', weight: 3 }),
          magic('omega-flame-thrower', 'かえんほうしゃ', 1.15, 'fire', { target: 'one_enemy', weight: 2 }),
          {
            id: 'omega-targeting', name: '照準ロック', kind: 'scripted', target: 'one_enemy', weight: 1, ctbCost: 1.3,
            telegraph: 'オメガの照準が一点に絞られていく……！',
            operations: [
              { op: 'damage.physical', power: 1.9 },
              { op: 'status.apply', statuses: ['paralyze'], statusChance: 0.5 },
            ],
          },
          omegaCombo('omega-delta-attack', 'デルタアタック', [
            { op: 'damage.physical', power: 1.35 },
            { op: 'status.apply', statuses: ['petrify'], statusChance: 0.6 },
          ], { target: 'one_enemy', weight: 2 }),
          omegaCombo('omega-rainbow-wind', 'にじいろのかぜ', [
            { op: 'status.apply', statuses: ['silence'], statusChance: 0.85 },
            { op: 'status.apply', statuses: ['sap'], statusChance: 0.85 },
          ], { target: 'one_enemy', weight: 2 }),
          omegaCombo('omega-wave-cannon', 'はどうほう', [
            { op: 'damage.max_hp_ratio', ratio: 0.5, heavyImmune: true },
            { op: 'status.apply', statuses: ['sap'], statusChance: 1 },
          ], { target: 'all_enemies', weight: 3, ctbCost: 1.6 }),
          status('omega-blaster-paralyze', 'ブラスター', ['paralyze'], { target: 'one_enemy', weight: 1, statusChance: 0.85 }),
          status('omega-blaster-death', 'ブラスター', ['ko'], { target: 'one_enemy', weight: 1, statusChance: 0.4 }),
          omegaCombo('omega-maelstrom', 'ミールストーム', [
            { op: 'damage.to_critical', heavyImmune: true },
          ], { target: 'all_enemies', weight: 2, ctbCost: 1.5 }),

          // ---- 2連続行動（代表的な組み合わせ）----
          omegaCombo('omega-combo-quake-wave', 'じしん→はどうほう', [
            { op: 'damage.magic', power: 1.2, element: 'earth' },
            { op: 'damage.max_hp_ratio', ratio: 0.5, heavyImmune: true },
            { op: 'status.apply', statuses: ['sap'], statusChance: 1 },
          ], { target: 'all_enemies', weight: 1, ctbCost: 1.9 }),
          omegaCombo('omega-combo-wave-maelstrom', 'はどうほう→ミールストーム', [
            { op: 'damage.max_hp_ratio', ratio: 0.5, heavyImmune: true },
            { op: 'status.apply', statuses: ['sap'], statusChance: 1 },
            { op: 'damage.to_critical', heavyImmune: true },
          ], { target: 'all_enemies', weight: 1, ctbCost: 2.1, telegraph: 'オメガの機関部が唸りを上げる――全力出力！' }),
          omegaCombo('omega-combo-delta-blaster', 'デルタアタック→ブラスター', [
            { op: 'damage.physical', power: 1.35 },
            { op: 'status.apply', statuses: ['petrify'], statusChance: 0.55 },
            { op: 'status.apply', statuses: ['paralyze'], statusChance: 0.5 },
          ], { target: 'one_enemy', weight: 1, ctbCost: 1.8 }),
          omegaCombo('omega-combo-wind-delta', 'にじいろのかぜ→デルタアタック', [
            { op: 'status.apply', statuses: ['silence'], statusChance: 0.85 },
            { op: 'status.apply', statuses: ['sap'], statusChance: 0.85 },
            { op: 'damage.physical', power: 1.35 },
            { op: 'status.apply', statuses: ['petrify'], statusChance: 0.55 },
          ], { target: 'one_enemy', weight: 1, ctbCost: 1.8 }),
        ],
      },
    ],
    /**
     * 反撃行動: ダメージを受けると必ず、以下から2つ選んで反撃してくる。
     * BattleManager.resolveCounterAttacks() から参照される。
     */
    counterPool: [
      { id: 'omega-circle', name: 'サークル', kind: 'remove-from-battle', target: 'one_enemy', ctbCost: 0 },
      omegaCombo('omega-mustard-bomb', 'マスタードボム', [
        { op: 'damage.magic', power: 1.5, element: null },
        { op: 'status.apply', statuses: ['sap'], statusChance: 0.85 },
      ], { target: 'one_enemy', ctbCost: 0 }),
      omegaCombo('omega-rocket-punch', 'ロケットパンチ', [
        { op: 'damage.hp_ratio', ratio: 0.5 },
        { op: 'status.apply', statuses: ['confuse'], statusChance: 0.85 },
      ], { target: 'one_enemy', ctbCost: 0 }),
    ],
  }),
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

/** Counter-move pool for bosses that always retaliate when hit (e.g. Omega). */
export function counterPoolFor(unit) {
  const profile = BOSS_ACTION_PROFILES[unit.id];
  return profile?.counterPool ?? [];
}
