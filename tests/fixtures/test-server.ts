import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import crypto from 'node:crypto';

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

export const LOAD_STUDENT_TOKENS: string[] = Array.from(
  { length: 30 },
  (_, i) => `tok_load_student_${i}`
);

export const TEST_USERS = {
  admin: '0192f000-0000-7000-8000-0000000000b1',
  billingAdmin: '0192f000-0000-7000-8000-0000000000b2',
  editor: '0192f000-0000-7000-8000-0000000000e1',
  reviewer: '0192f000-0000-7000-8000-0000000000d1',
  student: '0192f000-0000-7000-8000-0000000000c1',
  unverifiedStudent: '0192f000-0000-7000-8000-0000000000c2',
  otherStudent: '0192f000-0000-7000-8000-0000000000c3',
} as const;

export function generateTestTotp(secret = 'JBSWY3DPEHPK3PXP'): string {
  const clean = secret.toUpperCase().replace(/[\s\-=]/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]!);
    if (val !== -1) {
      value = (value << 5) | val;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
  }
  const secretBuf = Buffer.from(bytes);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac('sha1', secretBuf).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}

const STAFF_TOKENS = new Set<string>([
  AUTH_TOKENS.admin,
  AUTH_TOKENS.billingAdmin,
  AUTH_TOKENS.editor,
  AUTH_TOKENS.reviewer,
]);

let isFetchTotpHookInstalled = false;
export function installFetchTotpHook(): void {
  if (isFetchTotpHookInstalled || typeof globalThis.fetch === 'undefined') return;
  isFetchTotpHookInstalled = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    );
    let headersModified = false;

    // Attach client IP headers if none are present to ensure each runner/suite process has an isolated rate-limit bucket
    if (!headers.has('x-forwarded-for') && !headers.has('cf-connecting-ip')) {
      const runnerClientIp = `198.51.100.${(process.pid % 200) + 1}`;
      headers.set('x-forwarded-for', runnerClientIp);
      headers.set('cf-connecting-ip', runnerClientIp);
      headersModified = true;
    }

    if (urlStr.includes('/api/v1/admin') || urlStr.includes('/admin')) {
      const authHeader = headers.get('authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (STAFF_TOKENS.has(token) && !headers.has('x-totp-code')) {
        headers.set('x-totp-code', generateTestTotp());
        headersModified = true;
      }
    }

    if (headersModified) {
      if (init) {
        init.headers = headers;
      } else if (input instanceof Request) {
        input = new Request(input, { headers });
      } else {
        init = { headers };
      }
    }

    return originalFetch.call(this, input, init);
  };
}

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
  installFetchTotpHook();

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
    // Never discover a running demo API; external targets require explicit URLs.

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
          DATABASE_URL: '',
          REDIS_URL: '',
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
