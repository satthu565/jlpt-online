import crypto from 'node:crypto';
import fs from 'node:fs';

/**
 * Seeded Staff Account Credentials for Integration & Playwright Tests (I00)
 * Corresponds to accounts seeded in tests/fixtures/seed-sessions.sql
 */
export interface StaffAccount {
  email: string;
  password: string;
  role: 'admin' | 'billing_admin' | 'editor' | 'reviewer' | 'student';
  totpSecret: string;
  name: string;
}

export type StaffRoleKey = 'admin' | 'billing_admin' | 'editor' | 'reviewer' | 'student';

export const SEEDED_STAFF_ACCOUNTS = {
  admin: {
    email: 'publisher@jlpt.local',
    password: 'Admin123456!',
    role: 'admin',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    name: 'Demo Publisher Admin',
  },
  billing_admin: {
    email: 'billing.admin@jlpt.local',
    password: 'Admin123456!',
    role: 'billing_admin',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    name: 'Demo Billing Admin',
  },
  editor: {
    email: 'editor@jlpt.local',
    password: 'Admin123456!',
    role: 'editor',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    name: 'Demo Editor',
  },
  reviewer: {
    email: 'reviewer@jlpt.local',
    password: 'Admin123456!',
    role: 'reviewer',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    name: 'Demo Reviewer',
  },
  student: {
    email: 'student.verified@jlpt.local',
    password: 'Student123456!',
    role: 'student',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    name: 'Verified Student',
  },
} as const satisfies Record<StaffRoleKey, StaffAccount>;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a Base32 string into a Buffer
 */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s\-=]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]!;
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates standard RFC 6238 TOTP 6-digit code for a given Base32 secret.
 */
export function generateTotp(
  secret: string = 'JBSWY3DPEHPK3PXP',
  timestampMs: number = Date.now(),
  timeStepSeconds = 30,
  digits = 6,
): string {
  const secretBuffer = base32Decode(secret);
  const counter = Math.floor(timestampMs / 1000 / timeStepSeconds);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuf);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1]! & 0x0f;
  const binary =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);

  const mod = Math.pow(10, digits);
  return (binary % mod).toString().padStart(digits, '0');
}

/**
 * Authenticates staff account against API and returns session details and token
 */
export async function authenticateStaffAccount(
  account: StaffAccount = SEEDED_STAFF_ACCOUNTS.admin!,
  apiBaseUrl = 'http://127.0.0.1:4000',
  customIp?: string,
): Promise<{
  token: string;
  totpCode: string;
  user: { id: string; email: string; role: string };
}> {
  const ip = customIp || '198.51.100.80';
  const signInRes = await fetch(`${apiBaseUrl}/api/v1/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      'cf-connecting-ip': ip,
    },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
    }),
  });

  if (!signInRes.ok) {
    const errorBody = await signInRes.text();
    throw new Error(`Staff login failed for ${account.email}: HTTP ${signInRes.status} ${errorBody}`);
  }

  const data = (await signInRes.json()) as {
    session: { token: string };
    user: { id: string; email: string; role: string };
  };

  const totpCode = generateTotp(account.totpSecret);

  return {
    token: data.session.token,
    totpCode,
    user: data.user,
  };
}

let memoryLastUsedTotpStep = 0;

/**
 * Retrieves the highest recorded TOTP 30-second step across processes
 */
export function getLastUsedTotpStep(): number {
  try {
    if (fs.existsSync('/tmp/jlpt_admin_totp_last_step.txt')) {
      const val = parseInt(fs.readFileSync('/tmp/jlpt_admin_totp_last_step.txt', 'utf8').trim(), 10);
      if (!isNaN(val)) return Math.max(memoryLastUsedTotpStep, val);
    }
  } catch {
    // ignore
  }
  return memoryLastUsedTotpStep;
}

/**
 * Records the used TOTP 30-second step to memory and shared file
 */
export function recordUsedTotpStep(step: number): void {
  memoryLastUsedTotpStep = step;
  try {
    fs.writeFileSync('/tmp/jlpt_admin_totp_last_step.txt', String(step));
  } catch {
    // ignore
  }
}

/**
 * Waits until the next 30-second TOTP step window plus safety buffer.
 */
export async function waitForNextTotpWindow(extraBufferMs = 1500): Promise<void> {
  const msToNextStep = 30000 - (Date.now() % 30000) + extraBufferMs;
  await new Promise((resolve) => setTimeout(resolve, msToNextStep));
}

/**
 * Returns a guaranteed fresh TOTP code that has not been used in the current 30s step.
 */
export async function getFreshTotpCode(
  secret: string = 'JBSWY3DPEHPK3PXP',
  waitFn?: (ms: number) => Promise<void>,
): Promise<string> {
  let currentStep = Math.floor(Date.now() / 1000 / 30);
  const lastStep = getLastUsedTotpStep();
  if (currentStep <= lastStep) {
    const msToNextStep = 30000 - (Date.now() % 30000) + 1500;
    if (waitFn) {
      await waitFn(msToNextStep);
    } else {
      await waitForNextTotpWindow(1500);
    }
    currentStep = Math.floor(Date.now() / 1000 / 30);
  }
  const code = generateTotp(secret);
  recordUsedTotpStep(currentStep);
  return code;
}

/**
 * Submits TOTP code for 2FA challenge. If the API returns "Mã TOTP đã được sử dụng"
 * or replay detection rejections, waits for the next 30-second window and retries with a fresh code.
 */
export async function verifyTotpChallengeWithRetry(
  token: string,
  secret: string = SEEDED_STAFF_ACCOUNTS.admin.totpSecret,
  apiBaseUrl = 'http://127.0.0.1:4000',
  customIp?: string,
  maxRetries = 3,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const ip = customIp || '198.51.100.80';
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = await getFreshTotpCode(secret);
    const res = await fetch(`${apiBaseUrl}/api/v1/auth/totp/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-forwarded-for': ip,
        'cf-connecting-ip': ip,
      },
      body: JSON.stringify({ code }),
    });

    const bodyText = await res.text();
    let bodyJson: unknown = null;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      bodyJson = bodyText;
    }

    if (res.ok) {
      return { ok: true, status: res.status, body: bodyJson };
    }

    if (
      bodyText.includes('Mã TOTP đã được sử dụng') ||
      bodyText.includes('mã cũ') ||
      bodyText.includes('không chính xác hoặc đã hết hạn')
    ) {
      await waitForNextTotpWindow(1500);
      continue;
    }

    return { ok: false, status: res.status, body: bodyJson };
  }
  throw new Error('TOTP challenge verification failed after retry attempts.');
}

