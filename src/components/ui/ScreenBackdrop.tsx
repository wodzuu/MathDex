import type { CSSProperties } from 'react';

/**
 * Full-screen painted backdrop pinned behind a scrolling screen: a fixed,
 * column-centred image (max 420 px, matching the app shell) plus an optional
 * dimming scrim gradient. Content renders above it — give the sibling content
 * wrapper `position: relative; z-index: 1`.
 */
interface ScreenBackdropProps {
  src: string;
  /** CSS background for the dimming layer (usually a gradient). Omit for none. */
  scrim?: string;
  /** CSS object-position for the image. Defaults to 'top center'. */
  objectPosition?: string;
}

export default function ScreenBackdrop({ src, scrim, objectPosition = 'top center' }: ScreenBackdropProps) {
  const layer: CSSProperties = {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 420, height: '100%', zIndex: 0, pointerEvents: 'none',
  };
  return (
    <>
      <img src={src} alt="" aria-hidden style={{ ...layer, objectFit: 'cover', objectPosition }} />
      {scrim && <div aria-hidden style={{ ...layer, background: scrim }} />}
    </>
  );
}
