import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tcg': {
        target: 'https://api.pokemontcg.io',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/tcg/, ''),
      }
    }
  }
})