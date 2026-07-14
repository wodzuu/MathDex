/**
 * iOS "Add to Home Screen" hint banner.
 *
 * iOS never offers to install a PWA on its own: the `beforeinstallprompt` API
 * that drives Android/Chrome's install suggestion doesn't exist in WebKit, and
 * every iOS browser (Safari, Firefox, Chrome, …) is WebKit underneath. The only
 * install path on an iPhone/iPad is the user doing Share → Add to Home Screen
 * themselves — so this banner teaches that gesture.
 *
 * Shown only when all three hold:
 *   1. the device is iOS (incl. iPadOS masquerading as macOS),
 *   2. the app is NOT already running installed (standalone display mode),
 *   3. the player hasn't dismissed it before (persisted in localStorage).
 */

import { useState } from 'react';
import { D, FONT_UI } from '../styles/tokens';

const DISMISS_KEY = 'mathdex-ios-install-hint-dismissed';

function isIosDevice(): boolean {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  // iPadOS 13+ reports itself as a Mac; a Mac with a multi-touch screen is an iPad.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export default function IosInstallHint() {
  const [hidden, setHidden] = useState(() => !isIosDevice() || isInstalled() || wasDismissed());

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode — banner just returns next visit */
    }
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: 'linear-gradient(180deg, #1b2a4d, #14203c)',
        borderBottom: `2px solid ${D.blue}`,
        fontFamily: FONT_UI, color: '#e8efff',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden>📲</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>
        Play MathDex as an app! Tap the <b>Share</b> button{' '}
        <span aria-hidden>⬆️</span> then <b>“Add to Home Screen”</b>.
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss install hint"
        style={{
          flexShrink: 0, width: 30, height: 30, borderRadius: 8,
          background: 'rgba(255,255,255,0.08)', border: `1px solid ${D.border}`,
          color: '#aab6d8', fontSize: 15, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT_UI,
        }}
      >
        ✕
      </button>
    </div>
  );
}
