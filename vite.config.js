import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-ah.png', 'robots.txt'], // Adicione seus assets aqui
      manifest: {
        name: 'Amazing Humans',
        short_name: 'AmazingHumans',
        description: 'Read and write amazing stories.',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/logo-ah.png', // Recomendo criar ícones específicos (192x192 e 512x512) depois
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo-ah.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})