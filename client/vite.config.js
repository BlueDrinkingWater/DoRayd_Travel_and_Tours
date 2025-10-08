import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    port: 3000,
    open: true,
    host: true,
    https: true,
    proxy: {
      // Proxy API requests
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy image requests
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy Socket.IO connections
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    // Handle React Router future flags
    'process.env': {}
  }
})