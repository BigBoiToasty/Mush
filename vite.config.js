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
      manifest: {
        name: 'Mush',
        short_name: 'Mush',
        description: 'Pokemon card binder',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a2540',
        theme_color: '#0a2540',
        icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
      },
      devOptions: { enabled: true }, // SW is off by default under `vite dev` -- needed to test offline locally
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,svg,woff,woff2}'],
        navigateFallbackDenylist: [/\.(xml|txt|webmanifest)$/],
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
