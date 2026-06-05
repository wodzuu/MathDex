/**
 * Design token single source of truth.
 *
 * Extracted from the reference mockups (reference/mathdex_*.jsx).
 * Every screen must import colours from here — never hardcode hex values.
 */

// ── Base palette ──────────────────────────────────────────────────────────────

export const D = {
  /** Page / app background */
  darker:  '#0a1220',
  /** Slightly lighter background (headers, gradients) */
  navy:    '#0F1B2D',
  /** Primary card surface */
  card:    '#22253a',
  /** Secondary card surface / nested panels */
  card2:   '#2a2d45',
  /** Default border colour */
  border:  '#3a3d5c',
  /** Lighter border for hover states */
  border2: '#4a4d6c',
  /** Brand yellow — Pokémon yellow. Used for CTAs, active states, gold labels. */
  yellow:  '#FFCB05',
  /** Danger / enemy HP low / incorrect answer */
  red:     '#CC0000',
  /** Success / player HP high / correct answer / level-up */
  green:   '#48c774',
  /** Accent blue — EXP bar, Water-type adjacent accents */
  blue:    '#3B4CCA',
  /** Secondary text, labels, disabled states */
  muted:   '#8892b8',
  /** Primary text */
  white:   '#f0f4ff',
} as const;

export type DToken = keyof typeof D;

// ── Pokémon type palette ──────────────────────────────────────────────────────
// Each type has three tokens: bg (dark background), fg (text/icon), bdr (border).
// Covers the full 18-type chart even though only 6 types are in the launch build.

export const TYPE_COLORS = {
  Electric: { bg: '#302400', fg: '#F8D030', bdr: '#604800' },
  Water:    { bg: '#0a1030', fg: '#6890F0', bdr: '#1a2060' },
  Fire:     { bg: '#301808', fg: '#F08030', bdr: '#603018' },
  Grass:    { bg: '#0a2008', fg: '#78C850', bdr: '#1a4018' },
  Normal:   { bg: '#2a2a20', fg: '#A8A878', bdr: '#4a4a40' },
  Rock:     { bg: '#281c00', fg: '#B8A038', bdr: '#483c00' },
  Ground:   { bg: '#1a1000', fg: '#C8960C', bdr: '#3a2800' },
  Psychic:  { bg: '#300818', fg: '#F85888', bdr: '#601830' },
  Ghost:    { bg: '#180818', fg: '#9070B8', bdr: '#301030' },
  Dragon:   { bg: '#14083c', fg: '#7038F8', bdr: '#241070' },
  Ice:      { bg: '#082828', fg: '#98D8D8', bdr: '#185858' },
  Dark:     { bg: '#180808', fg: '#705848', bdr: '#302020' },
  Steel:    { bg: '#181828', fg: '#B8B8D0', bdr: '#303048' },
  Fairy:    { bg: '#281828', fg: '#EE99AC', bdr: '#503050' },
  Bug:      { bg: '#181800', fg: '#A8B820', bdr: '#303000' },
  Poison:   { bg: '#180018', fg: '#A040A0', bdr: '#300030' },
  Flying:   { bg: '#081830', fg: '#A890F0', bdr: '#182860' },
  Fighting: { bg: '#200808', fg: '#C03028', bdr: '#401818' },
} as const;

export type PokeTypeKey = keyof typeof TYPE_COLORS;

/**
 * Resolves a PokeType string to its colour tokens.
 * Falls back to Normal for any unknown type string.
 */
export function typeColors(type: string): (typeof TYPE_COLORS)[PokeTypeKey] {
  return (TYPE_COLORS as Record<string, (typeof TYPE_COLORS)[PokeTypeKey]>)[type]
    ?? TYPE_COLORS.Normal;
}

// ── Stat colours ──────────────────────────────────────────────────────────────
// Used in stat bars across the equip, identify, and battle screens.
// Keys match StatKey from src/types/pokemon.ts.

export const STAT_COLORS = {
  hp:      '#F87171',
  attack:  '#FB923C',
  defense: '#6890F0',
  spAtk:   '#C084FC',
  spDef:   '#2DD4BF',
  speed:   '#F8D030',
} as const;

/**
 * Display labels for each stat key — used in UI wherever the full name is shown.
 */
export const STAT_LABELS: Record<keyof typeof STAT_COLORS, string> = {
  hp:      'HP',
  attack:  'Atk',
  defense: 'Def',
  spAtk:   'Sp.Atk',
  spDef:   'Sp.Def',
  speed:   'Spd',
};

/**
 * Maximum stat values used to scale bar widths.
 * Derived from the reference mockup (mathdex_equip.jsx SMAX).
 * These are game-specific ceilings, not mainline Pokémon maximums.
 */
export const STAT_MAX: Record<keyof typeof STAT_COLORS, number> = {
  hp:      120,
  attack:  130,
  defense: 90,
  spAtk:   130,
  spDef:   90,
  speed:   140,
};

// ── Rarity colours ────────────────────────────────────────────────────────────
// Used in RarityBadge component and item card backgrounds.

export const RARITY_COLORS = {
  Common:    { bg: '#1a1a1a', fg: '#888888', bdr: '#333333' },
  Uncommon:  { bg: '#0a2010', fg: '#48c774', bdr: '#1a4020' },
  Rare:      { bg: '#0a1030', fg: '#6890F0', bdr: '#1a2060' },
  Epic:      { bg: '#1a0a30', fg: '#C084FC', bdr: '#2a1a50' },
  Legendary: { bg: '#2a1800', fg: '#F8D030', bdr: '#4a3000' },
} as const;

// ── Typography ────────────────────────────────────────────────────────────────
// Loaded at runtime via Google Fonts (see src/styles/animations.ts).

/** "Press Start 2P" — pixel font for labels, stat numbers, floor/level counters. */
export const FONT_PIXEL = "'Press Start 2P', monospace";
/** "Nunito" — rounded sans-serif for body text, button labels, flavour text. */
export const FONT_UI    = "'Nunito', sans-serif";
