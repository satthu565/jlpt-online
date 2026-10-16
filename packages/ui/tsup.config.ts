import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx', 'src/rich-text/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  banner: {
    js: "'use client';",
  },
});
