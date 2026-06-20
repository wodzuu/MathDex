import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Minimal typing for the Node global (avoids a dependency on @types/node just
// to read one env var at config time).
declare const process: { env: Record<string, string | undefined> };

// Base public path. On GitHub Pages a *project* site is served from
// https://<user>.github.io/<repo>/, so assets must be prefixed with "/<repo>/".
// The deploy workflow sets VITE_BASE accordingly; locally it defaults to "/".
const base = process.env.VITE_BASE || '/';

// Build timestamp (ISO 8601). The deploy workflow sets VITE_BUILD_TIME; locally
// it falls back to the moment `vite build` runs. Exposed as the __BUILD_TIME__
// global and shown in the Town footer.
const buildTime = process.env.VITE_BUILD_TIME || new Date().toISOString();

export default defineConfig({
  base,
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' (not autoUpdate): a new version installs but waits for the user
      // to tap the in-app "New version available" panel before activating.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'MathDex',
        short_name: 'MathDex',
        description: 'A Pokémon-inspired mathematics adventure for ages 9–11',
        theme_color: '#0a1220',
        background_color: '#0a1220',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache all compiled assets
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            // Cache same-origin images (painted backdrops, Pokémon sprite gifs,
            // item/ball sprites) so they load from the client cache on repeat
            // visits instead of being re-fetched every time a screen mounts.
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'mathdex-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache Google Fonts webfont files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // expose on LAN for mobile testing
  },
});
