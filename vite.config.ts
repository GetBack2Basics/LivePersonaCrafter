import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import net from 'net'

// Find a free TCP port starting from `start`
function findFreePort(start = 3005): Promise<number> {
  return new Promise((resolve) => {
    let port = start;
    const tryPort = () => {
      const srv = net.createServer();
      srv.once('error', () => { port++; tryPort(); });
      srv.once('listening', () => { srv.close(() => resolve(port)); });
      srv.listen(port, '127.0.0.1');
    };
    tryPort();
  });
}

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
  return 3005
}

const devPort = await findFreePort(3005);

// Format timestamp as YYYYMMDDhhmm (e.g., 202608090828)
const now = new Date();
const pad = (n: number) => n.toString().padStart(2, '0');
const buildTimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(buildTimeStr),
  },
  plugins: [react()],
  server: {
    port: devPort,
    strictPort: true, // Port is already confirmed free — don't let Vite re-pick
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

