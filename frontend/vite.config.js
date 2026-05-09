import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
      proxy: {
        '/upload': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/chat': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/summary': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/quiz': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/history': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/uploads': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/health': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/explain': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/explain-simply': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/conversation': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/rewrite': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/advanced': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/flashcards': { target: 'http://127.0.0.1:5001', changeOrigin: true },
        '/api': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      }
  }
})
