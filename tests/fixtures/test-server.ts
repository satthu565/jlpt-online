import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AUTH_TOKENS = {
  admin: 'tok_admin_demo',
  editor: 'tok_editor_demo',
  reviewer: 'tok_reviewer_demo',
  student: 'tok_student_verified',
  unverifiedStudent: 'tok_student_unverified',
  otherStudent: 'tok_other_student',
} as const;

export const TEST_USERS = {
  admin: '0192f000-0000-7000-8000-0000000000b1',
  editor: '0192f000-0000-7000-8000-0000000000e1',
  reviewer: '0192f000-0000-7000-8000-0000000000d1',
  student: '0192f000-0000-7000-8000-0000000000c1',
  unverifiedStudent: '0192f000-0000-7000-8000-0000000000c2',
  otherStudent: '0192f000-0000-7000-8000-0000000000c3',
} as const;

let apiProcess: ChildProcess | null = null;
let activeBaseUrl: string | null = null;

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

  // 3. Spawn server-runner.mjs on an isolated port
  const port = 4092;
  const runnerPath = path.join(__dirname, 'server-runner.mjs');

  return new Promise<string>((resolve, reject) => {
    apiProcess = spawn('node', [runnerPath], {
      env: {
        ...process.env,
        PORT: String(port),
        EMAIL_DRIVER: 'memory',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;

    apiProcess.stdout?.on('data', (data) => {
      const text = data.toString('utf8');
      const match = text.match(/API_READY_ON:(http:\/\/[^\s]+)/);
      if (match && match[1] && !resolved) {
        resolved = true;
        const readyUrl = match[1];
        activeBaseUrl = readyUrl;
        resolve(readyUrl);
      }
    });

    apiProcess.stderr?.on('data', (data) => {
      // In case of fatal bootstrap errors
      const text = data.toString('utf8');
      if (text.includes('Fatal error') && !resolved) {
        resolved = true;
        reject(new Error(text));
      }
    });

    apiProcess.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`API server process exited prematurely with code ${code}`));
      }
    });

    // 15 seconds timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`API server timed out after 15s on port ${port}`));
      }
    }, 15000);
  });
}

export function stopApiServer(): void {
  if (apiProcess) {
    apiProcess.kill('SIGTERM');
    apiProcess = null;
    activeBaseUrl = null;
  }
}
