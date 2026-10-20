import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: '@jlpt/schema', replacement: resolve(currentDir, '../../packages/schema/src/index.ts') },
      // Per-component entry points of @jlpt/ui (D04: pages load only the components they use).
      { find: /^@jlpt\/ui\/components\/(.*)$/, replacement: resolve(currentDir, '../../packages/ui/src/components/$1.tsx') },
      { find: /^@jlpt\/ui\/tokens$/, replacement: resolve(currentDir, '../../packages/ui/src/tokens.ts') },
      { find: /^@jlpt\/ui\/theme-context$/, replacement: resolve(currentDir, '../../packages/ui/src/theme-context.tsx') },
      { find: /^@jlpt\/ui\/utils$/, replacement: resolve(currentDir, '../../packages/ui/src/lib/utils.ts') },
      { find: /^@jlpt\/ui$/, replacement: resolve(currentDir, '../../packages/ui/src/index.tsx') },
      { find: '@jlpt/content-tools', replacement: resolve(currentDir, '../../packages/content-tools/src/index.ts') },
    ],
  },
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-i18n.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  },
});
