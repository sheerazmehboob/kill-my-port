import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import { IncomingMessage, ServerResponse } from 'node:http'
import { scanSystemPorts, killProcessCore } from './electron/scanner-core'

function killMyPortApiPlugin(): Plugin {
  return {
    name: 'kill-my-port-api-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url === '/api/scan-ports') {
          try {
            const ports = await scanSystemPorts();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(ports));
          } catch (err: unknown) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: (err as Error)?.message || 'Failed to scan ports' }));
          }
          return;
        }

        if (req.url === '/api/kill-process' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer | string) => (body += chunk));
          req.on('end', async () => {
            try {
              const { pid, port } = JSON.parse(body || '{}');
              await killProcessCore(pid, port);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: unknown) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: (err as Error)?.message || 'Failed to kill process' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    killMyPortApiPlugin(),
    electron([
      {
        // Main process entry
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
      {
        // Preload script
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    ]),
  ],
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/dist-electron/**'],
    },
  },
  build: {
    outDir: 'dist',
  },
})
