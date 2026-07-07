import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      name: 'DigitLens',
      fileName: 'digit-lens',
    },
  },
});
