import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-ah.png', 'robots.txt'],
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
          { src: '/logo-ah.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo-ah.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  build: {
    // Aumenta o limite de aviso de chunk (opcional, apenas para limpar o console)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Separa bibliotecas grandes em arquivos diferentes para cache eficiente
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          ui: ['react-icons', 'react-hot-toast', 'dompurify']
        }
      }
    }
  }
})