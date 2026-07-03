import { useEffect } from 'react';

/**
 * Global CSS injected once at app startup.
 *
 * Contains:
 *   - All keyframe animations used across the reference mockups
 *   - Utility animation classes (.fade-up, .slide-up, .pulsing, .glowY, etc.)
 *   - Custom scrollbar styling
 *   - Base html/body reset (background, font-family, box-sizing)
 *
 * Injected via useGlobalAnimations() in App.tsx. Do not import this module
 * inside individual components — the hook is idempotent but font loading
 * should only happen once.
 */

const GLOBAL_CSS = `
  /* ── Keyframes ─────────────────────────────────────────────────────── */
  @keyframes fadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes slideUp   { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
  @keyframes floatDmg  { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-52px) scale(1.5)} }
  @keyframes pulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(.95)} }
  @keyframes glowY     { 0%,100%{box-shadow:0 0 8px #FFCB0540} 50%{box-shadow:0 0 22px #FFCB0590} }
  @keyframes cflash    { 0%,100%{background:#22253a} 40%{background:#0d2a10} }
  @keyframes wflash    { 0%,100%{background:#22253a} 40%{background:#2a0d0d} }
  @keyframes blinkcur  { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes superEff  { 0%{opacity:0;transform:scale(.5) rotate(-10deg)} 60%{opacity:1;transform:scale(1.1) rotate(2deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes timerPulse{ 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes countPop  { 0%{transform:scale(1)} 40%{transform:scale(1.6);color:#48c774} 100%{transform:scale(1)} }

  /* ── Utility classes ───────────────────────────────────────────────── */
  .fade-up   { animation: fadeUp   .3s ease both; }
  .fade-in   { animation: fadeIn   .2s ease both; }
  .slide-up  { animation: slideUp  .35s cubic-bezier(.34,.7,.64,1) both; }
  .pulsing   { animation: pulse    1.6s ease-in-out infinite; }
  .glowY     { animation: glowY    2s  ease-in-out infinite; }
  .blinkcur  { display:inline-block; animation: blinkcur 1s step-end infinite; }
  .supereff-badge {
    font-family:'Press Start 2P',monospace; font-size:9px;
    color:#CC0000; background:#fff; border:2px solid #CC0000;
    border-radius:6px; padding:4px 9px; display:inline-block;
    animation:superEff .4s ease both; box-shadow:2px 2px 0 #CC0000;
  }
  .timer-pulse { animation: timerPulse .4s ease-in-out infinite; }
  .count-pop   { display:inline-block; animation: countPop .35s ease both; }

  /* ── Scrollbar ─────────────────────────────────────────────────────── */
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-thumb { background:#3a3d5c; border-radius:2px; }

  /* ── Base reset ────────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root {
    margin: 0;
    padding: 0;
    background: #0a1220;
    min-height: 100vh;
    font-family: 'Nunito', sans-serif;
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
  }
  /* Constrain app to mobile width and centre it */
  #root {
    max-width: 420px;
    margin: 0 auto;
  }
`;

let injected = false;

/**
 * Call once in App.tsx to inject global styles and load Google Fonts.
 * Safe to call multiple times — idempotent guard prevents double-injection.
 */
export function useGlobalAnimations(): void {
  useEffect(() => {
    if (injected) return;
    injected = true;

    // Google Fonts — Press Start 2P + Nunito
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@600;700;800;900&display=swap';
    document.head.appendChild(link);

    // Keyframes + utility classes + base reset
    const style = document.createElement('style');
    style.id = 'mathdex-global';
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
  }, []);
}
