import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.tsx',
    'src/rich-text/index.ts',
    'src/components/*.tsx',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  treeshake: true,
});
