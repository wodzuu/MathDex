import type { PokeType, StatKey } from './pokemon';

// ── Rarity ────────────────────────────────────────────────────────────────────

export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

/**
 * Number of stat slots per rarity tier. Spec §5.2.
 * Common=1, Uncommon=2, Rare=3, Epic=3, Legendary=4.
 */
export const RARITY_SLOT_COUNT: Record<ItemRarity, number> = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 3,
  Legendary: 4,
};

// ── Stat bonuses ──────────────────────────────────────────────────────────────

/**
 * Flat-value bonuses to base stats contributed by a held item.
 * All values are positive integers. Partial — only populated stat keys apply.
 * Added to the stat formula result to get the effective stat. Spec §5.3.
 */
export type StatBonuses = Partial<Record<StatKey, number>>;

export interface TypeBoost {
  type: PokeType;
  /** Percentage damage bonus for moves of this type (e.g. 15 = +15%). Spec §5.3. */
  percent: number;
}

// ── Special effects (Legendary items only) ───────────────────────────────────
// Spec §5.3a

export type SpecialEffectKind =
  | 'recoilShield'  // Reduces recoil damage by 50% — halving a number
  | 'focusBoost'    // +1 Focus pip per correct battle answer — addition
  | 'ppRecovery'    // Restores 5 PP to a move after each battle — addition
  | 'catchAssist'   // +10% to all catch rates — percentage addition
  | 'expShare';     // Shares 25% of EXP to one extra Pokémon — fractions

// ── Item definitions ──────────────────────────────────────────────────────────

/**
 * Static item definition — the blueprint for a held item type.
 * Lives in src/data/items.ts. Never mutated at runtime.
 *
 * All items in the simplified core are held items (no consumable items drop —
 * Potions and Balls are purchased at the Mart only). Spec §5.1.
 */
export interface ItemDef {
  id: string;          // e.g. 'volt-shard'
  name: string;
  typeAffinity: PokeType;
  rarity: ItemRarity;
  /**
   * Full stat bonus values — only revealed slot by slot through identification
   * puzzles. Do not expose these to the UI before the corresponding puzzle is solved.
   */
  bonuses: StatBonuses;
  /** Only present on Epic (floor 40+) and Legendary items. */
  typeBoost?: TypeBoost;
  /** Only present on Legendary items (floor 60+). */
  specialEffect?: SpecialEffectKind;
  /** [minFloor, maxFloor] range this item can appear on. */
  floorRange: [number, number];
  emoji: string;
}

// ── Bag item (player instance) ────────────────────────────────────────────────

/**
 * An item instance in the player's bag — may be fully identified, partially
 * identified, or not yet taken to Professor Oak at all.
 *
 * Persisted to Dexie (table: `bag`).
 *
 * The full item stats live in the static ItemDef (src/data/items.ts). This
 * record only tracks what the PLAYER knows about this particular copy.
 */
export interface BagItem {
  /** UUID — unique instance identifier */
  uid: string;
  /** References ItemDef.id */
  itemDefId: string;
  /** Shown on the item card before identification. */
  droppedBy: {
    speciesName: string;
    floor: number;
  };
  /**
   * One entry per stat slot (length = RARITY_SLOT_COUNT[rarity]).
   *   true  = puzzle answered correctly → full stat value revealed
   *   false = puzzle answered incorrectly → partial stat (≈60%) applied
   *   null  = puzzle not yet attempted → stat shows as "???"
   * Spec §5.4.
   */
  solvedPuzzles: (boolean | null)[];
  /**
   * True once all puzzles have been attempted (any result).
   * At this point the item name is revealed and it can be equipped.
   * Spec §5.4 step 6.
   */
  identified: boolean;
}
