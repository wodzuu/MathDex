import { FONT_UI, typeColors } from '../../styles/tokens';

/**
 * Pill-shaped Pokémon type badge, coloured from the shared type palette.
 * `large` bumps the size for headline placements (e.g. the battle math panel).
 */
export default function TypeBadge({ type, large }: { type: string; large?: boolean }) {
  const tc = typeColors(type);
  return (
    <span style={{
      display: 'inline-block', fontFamily: FONT_UI, fontWeight: 800,
      fontSize: large ? 12 : 10, padding: large ? '3px 12px' : '2px 8px',
      borderRadius: 99, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.4,
      background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}`,
    }}>
      {type}
    </span>
  );
}
