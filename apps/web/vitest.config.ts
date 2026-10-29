import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: '@jlpt/schema', replacement: path.resolve(__dirname, '../../packages/schema/src/index.ts') },
      // Per-component entry points of @jlpt/ui (D04: pages load only the components they use).
      { find: /^@jlpt\/ui\/components\/(.*)$/, replacement: path.resolve(__dirname, '../../packages/ui/src/components/$1.tsx') },
      { find: /^@jlpt\/ui\/tokens$/, replacement: path.resolve(__dirname, '../../packages/ui/src/tokens.ts') },
      { find: /^@jlpt\/ui\/theme-context$/, replacement: path.resolve(__dirname, '../../packages/ui/src/theme-context.tsx') },
      { find: /^@jlpt\/ui\/utils$/, replacement: path.resolve(__dirname, '../../packages/ui/src/lib/utils.ts') },
      { find: /^@jlpt\/ui\/rich-text$/, replacement: path.resolve(__dirname, '../../packages/ui/src/rich-text/index.ts') },
      { find: /^@jlpt\/ui$/, replacement: path.resolve(__dirname, '../../packages/ui/src/index.tsx') },
      { find: '@jlpt/exam-engine', replacement: path.resolve(__dirname, '../../packages/exam-engine/src/index.ts') },
    ],
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-heroui-ssr.tsx', './tests/setup-i18n.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    maxWorkers: 1,
    fileParallelism: false,
    isolate: false,
  },
});

