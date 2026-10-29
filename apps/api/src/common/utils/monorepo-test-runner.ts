import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const effectiveEnv = {
  ...process.env,
  ...(fs.existsSync('/dev/shm') ? { TMPDIR: process.env.TMPDIR || '/dev/shm' } : {}),
};

// Never enumerate, resume or submit pre-existing attempts.
// Suites own their fixtures; the default API is isolated.

async function main(): Promise<void> {
  const buildResult = spawnSync('pnpm', ['exec', 'turbo', 'run', 'build'], {
    stdio: 'inherit',
    env: effectiveEnv,
    shell: process.platform === 'win32',
  });
  let exitCode = buildResult.status ?? (buildResult.error ? 1 : 0);
  if (buildResult.status === 0) {
    const testResult = spawnSync(
      'pnpm',
      ['exec', 'turbo', 'run', 'test', '--concurrency=2'],
      {
        stdio: 'inherit',
        env: effectiveEnv,
        shell: process.platform === 'win32',
      },
    );
    exitCode = testResult.status ?? (testResult.error ? 1 : 0);
  }

  process.exit(exitCode);
}

void main();
