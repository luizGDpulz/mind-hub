import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: ['editor.pulz.dev.br', 'mind-editor-live', 'localhost', '127.0.0.1'],
    hmr: {
      clientPort: 443,
    },
  },
});
