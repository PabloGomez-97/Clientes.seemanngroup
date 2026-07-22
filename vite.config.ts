// vite.config.ts
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.xlsx'],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // API México (más específico primero)
      '/mx/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/mx/, ''),
      },
      // SPA México (npm run dev en Clientes.seemannmexico → :5174)
      '/mx': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
    },
  },
})
