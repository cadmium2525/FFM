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

export const GACHA_TIER_WEIGHTS = [
  { tier: 'jackpot', weight: 5 },
  { tier: 'small', weight: 25 },
  { tier: 'miss', weight: 70 },
];

export const MISS_POOL = [{ itemId: 'item_potion', qty: 1, nameJa: 'ポーション' }];

export const SMALL_POOL = [
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

/**
 * "確定演出" (early-tell) state for the crystal-crack reveal (see
 * playGachaReveal in main.js). About half of all 小当たり/大当たり slots
 * light up gold/rainbow while the crystal is still cracking, so the player
 * gets an early tell; the other half stay a mystery blue crystal until the
 * moment it opens (surprise reveal). ハズレ is always plain blue.
 *
 *  - 'blue'         : no early tell, stays blue until opened
 *  - 'gold'          : early tell, confirmed 小当たり以上
 *  - 'rainbow'       : early tell, confirmed 大当たり (visible immediately)
 *  - 'gold-upgrade'  : early tell shows gold, then upgrades to rainbow
 *                      (大当たり) right before it opens
 */
function rollTellState(tier) {
  if (tier === 'miss') return 'blue';
  const hasTell = Math.random() < 0.5;
  if (!hasTell) return 'blue';
  if (tier === 'small') return 'gold';
  return Math.random() < 0.5 ? 'rainbow' : 'gold-upgrade';
}

/** Roll one gacha slot. Pass a tier ('jackpot' | 'small' | 'miss') to force a
 * result — used for the guaranteed 10-pull slot and the admin preview. */
export function rollGachaResult(forcedTier = null) {
  const tier = forcedTier ?? rollTier();
  const tell = rollTellState(tier);
  if (tier === 'jackpot') {
    return { tier, tell, kind: 'disc', disc: rollJackpotDisc() };
  }
  const item = pick(tier === 'small' ? SMALL_POOL : MISS_POOL);
  return { tier, tell, kind: 'item', itemId: item.itemId, qty: item.qty, nameJa: item.nameJa };
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
