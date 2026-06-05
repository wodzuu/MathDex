import { D, FONT_PIXEL } from '../styles/tokens';

/** Equip screen — party list → Pokémon detail → item browser sheet. */
export default function EquipScreen() {
  return (
    <div style={{ background: D.darker, minHeight: '100vh', padding: 20 }}>
      <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.yellow, marginBottom: 12 }}>
        EQUIP ITEMS
      </div>
      <p style={{ color: D.muted, fontSize: 13 }}>EquipScreen — TODO</p>
    </div>
  );
}
