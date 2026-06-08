/**
 * Small rarity pill (Common / Uncommon / Rare / Epic / Legendary).
 * Sits next to a Pokémon's name alongside its type / LEAD tags.
 */

import { RARITY_COLORS, FONT_UI } from '../styles/tokens';
import type { PokemonRarity } from '../types/pokemon';

export default function RarityBadge({ rarity }: { rarity: PokemonRarity }) {
  const c = RARITY_COLORS[rarity] ?? RARITY_COLORS.Common;
  return (
    <span style={{
      fontFamily: FONT_UI, fontWeight: 800, fontSize: 9,
      padding: '1px 7px', borderRadius: 99, textTransform: 'uppercase',
      background: c.bg, color: c.fg, border: `1px solid ${c.bdr}`,
      whiteSpace: 'nowrap',
    }}>
      {rarity}
    </span>
  );
}
