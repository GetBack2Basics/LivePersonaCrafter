import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function getBackendPort(): number {
  try {
    const portFile = path.resolve((import.meta as any).dirname || '.', '.server-port')
    if (fs.existsSync(portFile)) {
      const portStr = fs.readFileSync(portFile, 'utf-8').trim()
      const p = parseInt(portStr, 10)
      if (!isNaN(p)) return p
    }
  } catch {
    // fallback
  }
  return 3001
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false, // Automatically tries next port if 3000 is occupied
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: `http://localhost:${getBackendPort()}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, req) => {
            req.headers['host'] = `localhost:${getBackendPort()}`;
          });
        }
      }
    }
  }
})
