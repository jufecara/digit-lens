import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  base: '/digit-lens/',
  build: {
    outDir: './dist-demo',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@digit-lens/core': path.resolve(__dirname, '../core'),
    },
  },
});
