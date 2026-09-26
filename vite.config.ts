/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE is set by the GitHub Pages workflow (e.g. /quintana.roo.species/).
export default defineConfig({
  base: process.env.BASE || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Quintana Roo Species Explorer',
        short_name: 'QRoo Species',
        description: 'Collect the animals and trees of Quintana Roo as trading cards.',
        theme_color: '#f5ead8',
        background_color: '#f5ead8',
        display: 'standalone',
        orientation: 'portrait',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Species data: always try the network first so a new catalog shows on the next launch;
        // the cached copy is the offline / slow-network fallback.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          { urlPattern: ({ url }) => /\/data\/.*\.json$/.test(url.pathname), handler: 'NetworkFirst', options: { cacheName: 'catalog', networkTimeoutSeconds: 4, expiration: { maxEntries: 400 } } },
          { urlPattern: /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org|upload\.wikimedia\.org)\//, handler: 'CacheFirst', options: { cacheName: 'photos', expiration: { maxEntries: 200 }, cacheableResponse: { statuses: [0, 200] } } },
          { urlPattern: /^https:\/\/api\.inaturalist\.org\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'inat-api', expiration: { maxEntries: 100 } } },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'] },
});
