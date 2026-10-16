import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@jlpt/schema': resolve(currentDir, '../../packages/schema/src/index.ts'),
      '@jlpt/ui': resolve(currentDir, '../../packages/ui/src/index.tsx'),
      '@jlpt/content-tools': resolve(currentDir, '../../packages/content-tools/src/index.ts'),
    },
  },
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'node',
  },
});
