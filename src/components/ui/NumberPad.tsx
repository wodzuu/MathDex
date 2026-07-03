import { useEffect } from 'react';
import { D, FONT_PIXEL, FONT_UI } from '../../styles/tokens';

/**
 * In-game number pad — replaces the OS keyboard for battle math so nothing
 * pops over the screen and the layout never reflows. Digits, ± (answers can be
 * negative at higher Math Ranks), backspace, and a submit key.
 *
 * Also listens for a physical keyboard (digits, '-', Backspace, Enter) so
 * desktop play keeps working.
 */

interface NumberPadProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  /** Label on the submit key, e.g. "CHECK", "NEXT", "THROW!". */
  submitLabel: string;
  disabled?: boolean;
}

const MAX_LEN = 5;   // enough for "-9999"

export default function NumberPad({ value, onChange, onSubmit, submitLabel, disabled }: NumberPadProps) {
  const digit = (d: string) => {
    if (disabled) return;
    if (value.replace('-', '').length >= MAX_LEN - 1) return;
    onChange(value + d);
  };
  const toggleMinus = () => {
    if (disabled) return;
    onChange(value.startsWith('-') ? value.slice(1) : '-' + value);
  };
  const backspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  // Physical keyboard support (desktop). Enter is swallowed here so it can't
  // double-trigger other listeners while the pad is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key >= '0' && e.key <= '9') { digit(e.key); }
      else if (e.key === '-') { toggleMinus(); }
      else if (e.key === 'Backspace') { backspace(); }
      else if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const keyStyle: React.CSSProperties = {
    height: 44, borderRadius: 10, border: `2px solid ${D.border2}`,
    background: D.darker, color: D.white, fontFamily: FONT_PIXEL, fontSize: 15,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, opacity: disabled ? 0.5 : 1,
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 44, gap: 6 }}>
      {['7', '8', '9'].map((d) => <button key={d} style={keyStyle} onClick={() => digit(d)}>{d}</button>)}
      <button style={{ ...keyStyle, fontSize: 13, color: D.muted }} onClick={backspace} aria-label="Delete digit">⌫</button>
      {['4', '5', '6'].map((d) => <button key={d} style={keyStyle} onClick={() => digit(d)}>{d}</button>)}
      <button style={{ ...keyStyle, fontSize: 13, color: D.muted }} onClick={toggleMinus} aria-label="Toggle minus sign">±</button>
      {['1', '2', '3'].map((d) => <button key={d} style={keyStyle} onClick={() => digit(d)}>{d}</button>)}
      <button
        onClick={() => !disabled && onSubmit()}
        style={{
          gridRow: 'span 2', height: 'auto', borderRadius: 10, border: '2px solid rgba(0,0,0,.15)',
          background: disabled ? D.border2 : D.yellow, color: disabled ? D.muted : D.darker,
          fontFamily: FONT_UI, fontSize: 13, fontWeight: 900, letterSpacing: 0.5,
          cursor: disabled ? 'not-allowed' : 'pointer', boxShadow: disabled ? 'none' : '0 3px 0 #a07800',
          padding: 0,
        }}
      >
        {submitLabel}
      </button>
      <button style={{ ...keyStyle, gridColumn: 'span 3' }} onClick={() => digit('0')}>0</button>
    </div>
  );
}
