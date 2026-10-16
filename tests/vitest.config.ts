import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export default defineConfig({
  resolve: {
    alias: {
      '@jlpt/schema': path.resolve(rootDir, 'packages/schema/src/index.ts'),
      '@jlpt/content-tools': path.resolve(rootDir, 'packages/content-tools/src/index.ts'),
      '@jlpt/exam-engine': path.resolve(rootDir, 'packages/exam-engine/src/index.ts'),
      '@jlpt/media-token': path.resolve(rootDir, 'packages/media-token/src/index.ts'),
      '@jlpt/srs': path.resolve(rootDir, 'packages/srs/src/index.ts'),
      '@jlpt/api-client': path.resolve(rootDir, 'packages/api-client/src/index.ts'),
      '@jlpt/config': path.resolve(rootDir, 'packages/config/src/index.ts'),
      '@jlpt/ui': path.resolve(rootDir, 'packages/ui/src/index.tsx'),
    },
  },
  test: {
    environment: 'node',
  },
});
