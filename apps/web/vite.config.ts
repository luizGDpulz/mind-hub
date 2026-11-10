import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../..');

function pnpmVirtualStoreResolver(): Plugin {
  return {
    name: 'pnpm-virtual-store-resolver',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && req.url.startsWith('/node_modules/.pnpm/')) {
          const urlObj = new URL(req.url, 'http://localhost');
          const cleanPath = decodeURIComponent(urlObj.pathname);
          const candidatePath = path.join(workspaceRoot, cleanPath);
          if (fs.existsSync(candidatePath)) {
            const normalized = candidatePath.replace(/\\/g, '/');
            req.url =
              '/@fs' +
              (normalized.startsWith('/') ? normalized : '/' + normalized) +
              urlObj.search;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    quasar(),
    pnpmVirtualStoreResolver(),
  ],
  server: {
    port: 9000,
    fs: {
      allow: [workspaceRoot],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
    },
  },
});
