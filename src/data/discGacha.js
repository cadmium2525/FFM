import { crystalShards } from '../database/ff5Database.js';
import { createDiscInstance } from './discStones.js';

/**
 * えんばんせきガチャ — gacha odds and reward pools.
 *
 *  - 大当たり (jackpot, 5%): a new single-technique えんばんせき.
 *  - 小当たり (small win): a useful consumable (Phoenix Down / Hi-Potion / Ether).
 *  - ハズレ (miss): a Potion.
 *
 * A 10-pull guarantees at least one 小当たり-or-better among the ten slots.
 */

export const GACHA_SINGLE_COST = 50;
export const GACHA_TEN_COST = 500;
export const GACHA_TEN_PULL_COUNT = 10;

const GACHA_TIER_WEIGHTS = [
  { tier: 'jackpot', weight: 5 },
  { tier: 'small', weight: 25 },
  { tier: 'miss', weight: 70 },
];

const MISS_POOL = [{ itemId: 'item_potion', qty: 1, nameJa: 'ポーション' }];

const SMALL_POOL = [
  { itemId: 'item_phoenix_down', qty: 1, nameJa: 'フェニックスのお' },
  { itemId: 'item_hi_potion', qty: 1, nameJa: 'ハイポーション' },
  { itemId: 'item_ether', qty: 1, nameJa: 'エーテル' },
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function rollTier() {
  const total = GACHA_TIER_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of GACHA_TIER_WEIGHTS) {
    if (roll < entry.weight) return entry.tier;
    roll -= entry.weight;
  }
  return 'miss';
}

function rollJackpotDisc() {
  const shard = pick(crystalShards);
  return createDiscInstance(shard.id);
}

/** Roll one gacha slot. Pass a tier ('jackpot' | 'small' | 'miss') to force a
 * result — used for the guaranteed 10-pull slot and the admin preview. */
export function rollGachaResult(forcedTier = null) {
  const tier = forcedTier ?? rollTier();
  if (tier === 'jackpot') {
    return { tier, kind: 'disc', disc: rollJackpotDisc() };
  }
  const item = pick(tier === 'small' ? SMALL_POOL : MISS_POOL);
  return { tier, kind: 'item', itemId: item.itemId, qty: item.qty, nameJa: item.nameJa };
}

export function rollTenPullResults() {
  const results = Array.from({ length: GACHA_TEN_PULL_COUNT }, () => rollGachaResult());
  const hasGoodResult = results.some((entry) => entry.tier === 'jackpot' || entry.tier === 'small');
  if (!hasGoodResult) {
    const index = Math.floor(Math.random() * results.length);
    results[index] = rollGachaResult('small');
  }
  return results;
}
