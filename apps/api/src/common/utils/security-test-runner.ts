import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const effectiveEnv = {
  ...process.env,
  ...(fs.existsSync('/dev/shm') ? { TMPDIR: process.env.TMPDIR || '/dev/shm' } : {}),
};

const TARGET_HOST = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
const TOKENS_TO_CLEAN = ['tok_student_verified', 'tok_other_student'];

export async function cleanupStaleAttempts(): Promise<void> {
  try {
    const health = await fetch(`${TARGET_HOST}/api/v1/health`, {
      signal: AbortSignal.timeout(1500),
    }).catch(() => null);
    if (!health || !health.ok) return;

    for (const token of TOKENS_TO_CLEAN) {
      try {
        const res = await fetch(`${TARGET_HOST}/api/v1/me/attempts`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) continue;

        const data = (await res.json()) as { items?: Array<{ id: string; status: string }> };
        const inProgress = (data.items || []).filter((item) => item.status === 'in_progress');

        for (const attempt of inProgress) {
          const resumeRes = await fetch(`${TARGET_HOST}/api/v1/attempts/${attempt.id}/resume`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(3000),
          });
          if (!resumeRes.ok) continue;

          const resumeData = (await resumeRes.json()) as { lease: string; answers?: number[] };
          const count = resumeData.answers?.length || 29;

          await fetch(`${TARGET_HOST}/api/v1/attempts/${attempt.id}/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              lease: resumeData.lease,
              seq: 1,
              answers: Array(count).fill(0),
              flags: Array(count).fill(0),
              timeSpentMs: Array(count).fill(0),
            }),
            signal: AbortSignal.timeout(3000),
          });
        }
      } catch {
        // Ignore individual token cleanup errors
      }
    }
  } catch {
    // Ignore overall cleanup errors if server is unreachable
  }
}

async function main(): Promise<void> {
  await cleanupStaleAttempts();

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
  });

  await cleanupStaleAttempts();

  process.exit(result.status ?? (result.error ? 1 : 0));
}

void main();
