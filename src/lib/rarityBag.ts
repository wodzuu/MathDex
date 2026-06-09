/**
 * Rarity "bag" — a shuffle-bag (pity-timer) randomiser for encounter rarity.
 * Spec §6.2.
 *
 * The bag holds 100 tickets: one per percentage point of each rarity. A rarity
 * is chosen by drawing one ticket *without replacement*; when the bag is empty
 * it is refilled with a fresh 100. This guarantees that, over every window of
 * 100 encounters, each rarity appears exactly its ticket-count number of times —
 * no droughts, no streaks, and every rarity is guaranteed to show up.
 *
 * The remaining ticket counts are persisted in game state so the cadence holds
 * across sessions.
 */

import type { PokemonRarity, RarityBag } from '../types/pokemon';

/** Ticket counts the bag is (re)filled with — must sum to 100. */
export const RARITY_BAG_REFILL: RarityBag = {
  Common:    55,
  Uncommon:  27,
  Rare:      12,
  Epic:       5,
  Legendary:  1,
};

const ORDER: readonly PokemonRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

/** A fresh, full bag. */
export function createRarityBag(): RarityBag {
  return { ...RARITY_BAG_REFILL };
}

function ticketsRemaining(bag: RarityBag): number {
  return ORDER.reduce((sum, r) => sum + Math.max(0, bag[r] ?? 0), 0);
}

/**
 * Draw one rarity ticket without replacement.
 *
 * Refills the bag first if it is missing or empty. Returns the drawn rarity and
 * the updated bag (the input is never mutated).
 */
export function drawFromBag(bag: RarityBag | undefined): { rarity: PokemonRarity; bag: RarityBag } {
  let next: RarityBag = bag ? { ...bag } : createRarityBag();
  let total = ticketsRemaining(next);
  if (total <= 0) {
    next = createRarityBag();
    total = ticketsRemaining(next);
  }

  let pick = Math.floor(Math.random() * total); // 0 .. total-1
  let drawn: PokemonRarity = ORDER[0];
  for (const r of ORDER) {
    const n = Math.max(0, next[r] ?? 0);
    if (pick < n) { drawn = r; break; }
    pick -= n;
  }

  next[drawn] = Math.max(0, (next[drawn] ?? 0) - 1);
  return { rarity: drawn, bag: next };
}
