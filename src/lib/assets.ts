/**
 * Versioned URLs for files in public/.
 *
 * A per-build token (the digits of the build timestamp) is appended as a query
 * string, so each new build references its art at a *different* URL. That
 * guarantees updated images bypass every stale cache — the service-worker
 * runtime cache, the browser HTTP cache, or a CDN — because nothing has that
 * exact URL cached yet. Falls back to the plain URL when no build time is set.
 *
 * Use this for assets that get re-authored (painted backdrops, the Pokédex
 * device frame). The fixed Pokémon / item / ball sprite sets stay unversioned
 * (see lib/sprites.ts) so they aren't needlessly re-downloaded on every deploy.
 */
const BASE = import.meta.env.BASE_URL;
const VERSION = (typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '').replace(/\D/g, '');

export function asset(path: string): string {
  const url = `${BASE}${path}`;
  return VERSION ? `${url}?v=${VERSION}` : url;
}
