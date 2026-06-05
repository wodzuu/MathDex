import { D, FONT_PIXEL } from '../styles/tokens';

/** Professor Oak identification lab — puzzle-by-puzzle stat reveal. */
export default function IdentifyScreen() {
  return (
    <div style={{ background: D.darker, minHeight: '100vh', padding: 20 }}>
      <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.yellow, marginBottom: 12 }}>
        PROF. OAK
      </div>
      <p style={{ color: D.muted, fontSize: 13 }}>IdentifyScreen — TODO</p>
    </div>
  );
}
