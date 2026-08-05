import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/digit-lens/',
  build: {
    outDir: './dist-demo',
    emptyOutDir: true,
  },
});
