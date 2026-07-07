import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  base: '/digit-lens/',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
});
