import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url' // Import necessary utilities

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      // This is the corrected alias setup for ES modules
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    // The proxy is used for local development only.
    // In production, the Node server will serve both the API and the client build.
    proxy: {
      // Proxy API requests
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,      
      },
      // Proxy image requests
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.IO connections
      '/socket.io': {
        target: 'ws://localhost:5000',
        ws: true,
      },
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    'process.env': {}
  }
})