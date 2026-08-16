import { crystalShards } from '../database/ff5Database.js';

/**
 * えんばんせき (disc stones) — collectible technique discs.
 *
 * Each owned disc is an individual instance (not a stacked count) so it can
 * be freely renamed and fused with another disc. A disc always carries 1-4
 * distinct base techniques drawn from the crystalShards reference pool
 * (src/database/ff5Database.js). Fusing two discs merges their technique
 * lists into a brand-new disc instance; the two source discs are consumed.
 */

let discUidCounter = 0;
export function nextDiscUid() {
  discUidCounter += 1;
  return `disc_${Date.now().toString(36)}_${discUidCounter}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function baseDiscRecord(shardId) {
  return crystalShards.find((entry) => entry.id === shardId) ?? null;
}

export function createDiscInstance(shardId) {
  const base = baseDiscRecord(shardId);
  if (!base) return null;
  return { uid: nextDiscUid(), name: base.nameJa, shardIds: [shardId] };
}

export function discTechniques(disc) {
  return (disc?.shardIds ?? []).map((id) => baseDiscRecord(id)).filter(Boolean);
}

export function discDefaultName(shardIds) {
  const bases = shardIds.map((id) => baseDiscRecord(id)).filter(Boolean);
  if (bases.length <= 1) return bases[0]?.nameJa ?? 'えんばんせき';
  return `融合えんばんせき（${bases.map((base) => base.nameJa.replace('のかけら', '')).join('・')}）`;
}

const MERGE_COST_BY_RESULT_COUNT = { 2: 300, 3: 900, 4: 2000 };
export function mergeCost(resultCount) {
  return MERGE_COST_BY_RESULT_COUNT[resultCount] ?? resultCount * 500;
}

export function canMergeDiscs(discA, discB) {
  if (!discA || !discB || discA.uid === discB.uid) return { ok: false, reason: 'invalid' };
  const shardIds = [...discA.shardIds, ...discB.shardIds];
  const unique = new Set(shardIds);
  if (unique.size !== shardIds.length) return { ok: false, reason: 'duplicate' };
  if (unique.size > 4) return { ok: false, reason: 'toomany' };
  return { ok: true, resultCount: unique.size };
}

export function mergeDiscs(discA, discB, customName = null) {
  const check = canMergeDiscs(discA, discB);
  if (!check.ok) return check;
  const shardIds = [...discA.shardIds, ...discB.shardIds];
  const disc = {
    uid: nextDiscUid(),
    name: customName?.trim() || discDefaultName(shardIds),
    shardIds,
  };
  return { ok: true, disc, cost: mergeCost(check.resultCount), resultCount: check.resultCount };
}

/** Resolve the technique ids an equipped えんばんせき grants in battle. `crystalShardId`
 * may be an owned disc's uid or (for characters who never customized their
 * loadout) a base crystalShards catalog id. */
export function resolveDiscTechniqueIds(crystalShardId, ownedDiscs = []) {
  if (!crystalShardId) return [];
  const owned = ownedDiscs.find((disc) => disc.uid === crystalShardId);
  if (owned) return [...owned.shardIds];
  const base = baseDiscRecord(crystalShardId);
  return base ? [base.id] : [];
}
