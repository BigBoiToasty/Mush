import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false, // browser-only: no installable app for now
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Card art never changes -> serve from disk forever once fetched.
            urlPattern: ({ url }) => url.hostname === 'assets.tcgdex.net',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tcgdex-images',
              expiration: { maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Card detail JSON -> fresh when online, cached copy when offline.
            urlPattern: ({ url }) => url.hostname === 'api.tcgdex.net',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'tcgdex-api',
              expiration: { maxEntries: 2000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
