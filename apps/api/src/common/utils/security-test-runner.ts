import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const effectiveEnv = {
  ...process.env,
  ...(fs.existsSync('/dev/shm') ? { TMPDIR: process.env.TMPDIR || '/dev/shm' } : {}),
};

// Never enumerate, resume or submit pre-existing attempts.
// Suites own their fixtures; the default API is isolated.

async function main(): Promise<void> {
  const vitestArgs = [
    'exec',
    'vitest',
    'run',
    '-c',
    'tests/vitest.config.ts',
    '--testTimeout=30000',
    '--hookTimeout=30000',
    'tests/integration/security-matrix.test.ts',
    'apps/api/src/common/guards/security-hardening.test.ts',
    'apps/api/src/common/guards/authorization.test.ts',
    'apps/api/src/modules/attempt/no-answer-leak.test.ts',
  ];

  const result = spawnSync('pnpm', vitestArgs, {
    stdio: 'inherit',
    env: effectiveEnv,
    shell: process.platform === 'win32',
  });

  process.exit(result.status ?? (result.error ? 1 : 0));
}

void main();
