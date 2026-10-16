import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@jlpt/schema': path.resolve(__dirname, '../../packages/schema/src/index.ts'),
      '@jlpt/ui': path.resolve(__dirname, '../../packages/ui/src/index.tsx'),
      '@jlpt/exam-engine': path.resolve(__dirname, '../../packages/exam-engine/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
});

