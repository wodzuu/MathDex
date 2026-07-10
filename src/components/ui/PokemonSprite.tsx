import { useEffect, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { getIdleSpriteUrl, getSpriteUrl } from '../../lib/sprites';

/**
 * Pokémon sprite with a fallback: prefers the animated "idle" gif but swaps to
 * the "walk" gif when the idle asset is missing (a few are, e.g. Beedrill and
 * Dragonair) — so no screen ever shows a broken image. Accepts all standard
 * <img> props (className, style, onClick, …).
 */

/** Dex numbers whose idle gif is absent from the asset set — verified against
 *  public/pokemon_sprites/. Skipping them up front avoids even a flash of a
 *  broken image; the onError below stays as a safety net for anything else. */
const NO_IDLE_SPRITE = new Set([15 /* Beedrill */, 148 /* Dragonair */]);

interface PokemonSpriteProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  dex: number;
}

export default function PokemonSprite({ dex, alt = '', ...imgProps }: PokemonSpriteProps) {
  const [errored, setErrored] = useState(false);
  // A rerender may reuse this element for a different Pokémon — reset the fallback.
  useEffect(() => setErrored(false), [dex]);
  const useFallback = errored || NO_IDLE_SPRITE.has(dex);
  return (
    <img
      {...imgProps}
      alt={alt}
      src={useFallback ? getSpriteUrl(dex) : getIdleSpriteUrl(dex)}
      onError={() => { if (!useFallback) setErrored(true); }}
    />
  );
}
