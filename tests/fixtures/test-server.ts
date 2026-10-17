import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

export const AUTH_TOKENS = {
  admin: 'tok_admin_demo',
  billingAdmin: 'tok_billing_admin_demo',
  editor: 'tok_editor_demo',
  reviewer: 'tok_reviewer_demo',
  student: 'tok_student_verified',
  unverifiedStudent: 'tok_student_unverified',
  otherStudent: 'tok_other_student',
} as const;

export const DEVICE_AUTH_TOKENS: Record<string, string> = {
  '0192f000-0000-7000-8000-0000000000d1': 'tok_student_iphone',
  '0192f000-0000-7000-8000-0000000000d2': 'tok_student_pixel',
  '0192f000-0000-7000-8000-0000000000d3': 'tok_student_macbook',
  '0192f000-0000-7000-8000-0000000000d4': 'tok_student_windows',
  '0192f000-0000-7000-8000-0000000000d5': 'tok_student_ubuntu',
};

export const TEST_USERS = {
  admin: '0192f000-0000-7000-8000-0000000000b1',
  billingAdmin: '0192f000-0000-7000-8000-0000000000b2',
  editor: '0192f000-0000-7000-8000-0000000000e1',
  reviewer: '0192f000-0000-7000-8000-0000000000d1',
  student: '0192f000-0000-7000-8000-0000000000c1',
  unverifiedStudent: '0192f000-0000-7000-8000-0000000000c2',
  otherStudent: '0192f000-0000-7000-8000-0000000000c3',
} as const;

let apiProcess: ChildProcess | null = null;
let activeBaseUrl: string | null = null;
let startingPromise: Promise<string> | null = null;

function ensureApiBuilt(): void {
  const schemaEntry = path.join(REPO_ROOT, 'packages/schema/dist/index.js');
  const contentToolsEntry = path.join(REPO_ROOT, 'packages/content-tools/dist/index.js');
  const examEngineEntry = path.join(REPO_ROOT, 'packages/exam-engine/dist/index.js');
  const mediaTokenEntry = path.join(REPO_ROOT, 'packages/media-token/dist/index.js');
  const distEntry = path.join(REPO_ROOT, 'apps/api/dist/src/main.js');

  if (!fs.existsSync(schemaEntry)) {
    console.log('[test-server] packages/schema/dist missing, running pnpm --filter @jlpt/schema build...');
    execSync('pnpm --filter @jlpt/schema build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(contentToolsEntry)) {
    console.log('[test-server] packages/content-tools/dist missing, running pnpm --filter @jlpt/content-tools build...');
    execSync('pnpm --filter @jlpt/content-tools build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(examEngineEntry)) {
    console.log('[test-server] packages/exam-engine/dist missing, running pnpm --filter @jlpt/exam-engine build...');
    execSync('pnpm --filter @jlpt/exam-engine build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(mediaTokenEntry)) {
    console.log('[test-server] packages/media-token/dist missing, running pnpm --filter @jlpt/media-token build...');
    execSync('pnpm --filter @jlpt/media-token build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(distEntry)) {
    console.log('[test-server] apps/api/dist missing, running pnpm --filter @jlpt/api... build...');
    execSync('pnpm --filter @jlpt/api... build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
}

async function findFreePort(_preferred = 4092): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo;
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

export async function getApiBaseUrl(): Promise<string> {
  // 1. External Staging in CI takes highest precedence
  if (process.env.STAGING_API_URL) {
    return process.env.STAGING_API_URL.replace(/\/$/, '');
  }
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/$/, '');
  }
  if (activeBaseUrl) {
    return activeBaseUrl;
  }
  if (startingPromise) {
    return startingPromise;
  }

  startingPromise = (async () => {
    // 2. Check if default staging/dev port 4000 is active
    try {
      const res = await fetch('http://127.0.0.1:4000/api/v1/health');
      if (res.ok) {
        activeBaseUrl = 'http://127.0.0.1:4000';
        return activeBaseUrl;
      }
    } catch {
      // Port 4000 not responding
    }

    // 3. Ensure API dist is built
    ensureApiBuilt();

    // 4. Spawn server-runner.mjs on an isolated port
    const port = await findFreePort(4092);
    const runnerPath = path.join(__dirname, 'server-runner.mjs');

    return new Promise<string>((resolve, reject) => {
      apiProcess = spawn('node', [runnerPath], {
        env: {
          ...process.env,
          PORT: String(port),
          EMAIL_DRIVER: 'memory',
          MEDIA_TOKEN_SECRET:
            process.env.MEDIA_TOKEN_SECRET ||
            'staging_media_token_secret_for_reproducible_smoke_tests',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let resolved = false;
      let stdout = '';
      let stderr = '';

      apiProcess.stdout?.on('data', (data) => {
        const text = data.toString('utf8');
        stdout += text;
        const match = text.match(/API_READY_ON:(http:\/\/[^\s]+)/);
        if (match && match[1] && !resolved) {
          resolved = true;
          const readyUrl = match[1];
          activeBaseUrl = readyUrl;
          resolve(readyUrl);
        }
      });

      apiProcess.stderr?.on('data', (data) => {
        const text = data.toString('utf8');
        stderr += text;
        if (text.includes('Fatal error') && !resolved) {
          resolved = true;
          reject(new Error(`Server runner failed:\n${text}`));
        }
      });

      apiProcess.on('exit', (code) => {
        if (!resolved) {
          resolved = true;
          reject(
            new Error(
              `API server process exited prematurely with code ${code}.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
            ),
          );
        }
      });

      // 45 seconds timeout for cold starts and heavy CI runs
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(
            new Error(
              `API server timed out after 45s on port ${port}.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
            ),
          );
        }
      }, 45000);
    });
  })();

  return startingPromise;
}

export function stopApiServer(): void {
  if (apiProcess) {
    try {
      apiProcess.kill('SIGTERM');
    } catch {
      // ignore
    }
    apiProcess = null;
    activeBaseUrl = null;
    startingPromise = null;
  }
}
