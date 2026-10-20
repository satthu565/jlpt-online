import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

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
 * Records a TOTP time step as consumed/used across all test runner worker processes.
 */
export function recordUsedTotpStep(accountKey: string, step?: number): void {
  const sanitizeKey = accountKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const syncFile = path.join(os.tmpdir(), `jlpt-totp-step-${sanitizeKey}.txt`);
  const usedStep = step ?? Math.floor(Date.now() / 1000 / 30);
  try {
    fs.writeFileSync(syncFile, String(usedStep), 'utf8');
  } catch {
    // Ignore write errors
  }
}

/**
 * Reads the last consumed TOTP step from cross-process file tracker.
 */
export function getLastUsedTotpStep(accountKey: string): number {
  const sanitizeKey = accountKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const syncFile = path.join(os.tmpdir(), `jlpt-totp-step-${sanitizeKey}.txt`);
  try {
    if (fs.existsSync(syncFile)) {
      const val = parseInt(fs.readFileSync(syncFile, 'utf8').trim(), 10);
      if (!Number.isNaN(val)) return val;
    }
  } catch {
    // Ignore read errors
  }
  return 0;
}

/**
 * Waits until the next 30-second TOTP step window with added random jitter.
 */
export async function waitForNextTotpStep(jitterMs = 1500): Promise<void> {
  const now = Date.now();
  const msToNext = 30000 - (now % 30000) + jitterMs + Math.floor(Math.random() * 1500);
  await new Promise((r) => setTimeout(r, msToNext));
}

/**
 * Generates an RFC 6238 TOTP code, ensuring across concurrent test processes that
 * the 30-second step has not already been used for this account.
 * If already used, waits until the next step before generating a fresh code.
 */
export async function getSynchronizedTotp(
  secret = 'JBSWY3DPEHPK3PXP',
  accountKey: string = secret,
): Promise<string> {
  const lastStep = getLastUsedTotpStep(accountKey);
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  if (currentStep <= lastStep) {
    await waitForNextTotpStep();
  }
  const freshStep = Math.floor(Date.now() / 1000 / 30);
  recordUsedTotpStep(accountKey, freshStep);
  return generateTotp(secret);
}

/**
 * Robust Playwright UI handler for TOTP challenge.
 * Retries across 30-second windows if API reports "Mã TOTP đã được sử dụng" due to concurrent test runs.
 */
export async function handleTotpVerification(
  page: Page,
  secret = 'JBSWY3DPEHPK3PXP',
  accountKey: string = secret,
  maxAttempts = 4,
): Promise<void> {
  const codeInput = page
    .locator(
      '[data-testid="challenge-code-input"], [data-testid="input-totp-code"], input[name="code"], input[maxlength="6"]',
    )
    .first();
  const submitBtn = page
    .locator(
      '[data-testid="submit-challenge-button"], [data-testid="btn-verify-2fa-submit"], button[type="submit"]',
    )
    .first();
  const challengeError = page.locator('[data-testid="challenge-error-alert"]').first();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // If we already left verify-2fa, we are done!
    if (!page.url().includes('/verify-2fa')) {
      return;
    }

    // Check if codeInput is present. If not visible and we are not on /verify-2fa, exit immediately
    const isVisible = await codeInput.isVisible().catch(() => false);
    if (!isVisible) {
      if (!page.url().includes('/verify-2fa')) {
        return;
      }
      // Wait briefly if still on /verify-2fa
      await codeInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      if (!page.url().includes('/verify-2fa')) {
        return;
      }
    }

    const validTotp = await getSynchronizedTotp(secret, accountKey);
    await codeInput.click();
    await codeInput.fill(validTotp);
    await expect(codeInput).toHaveValue(validTotp, { timeout: 5000 });
    await page.waitForTimeout(200);
    await submitBtn.click();

    // Race between URL change and immediate error alert from API
    const navPromise = page
      .waitForURL(
        (url: URL) => !url.pathname.includes('/verify-2fa') && !url.pathname.includes('/login'),
        { timeout: 20000, waitUntil: 'commit' },
      )
      .then(() => 'nav' as const)
      .catch(() => 'timeout' as const);

    const errPromise = challengeError
      .waitFor({ state: 'visible', timeout: 3500 })
      .then(() => 'error' as const)
      .catch(() => 'no-error' as const);

    const result = await Promise.race([navPromise, errPromise]);

    if (result === 'nav' || (!page.url().includes('/verify-2fa') && !page.url().includes('/login'))) {
      return;
    }

    if (result === 'error' || (await challengeError.isVisible().catch(() => false))) {
      recordUsedTotpStep(accountKey);
      await waitForNextTotpStep();
      continue;
    }

    if (attempt === maxAttempts) {
      throw new Error(`TOTP challenge failed after ${maxAttempts} attempts for ${accountKey}`);
    }
    await waitForNextTotpStep();
  }
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

  const totpCode = await getSynchronizedTotp(account.totpSecret, account.email);

  return {
    token: data.session.token,
    totpCode,
    user: data.user,
  };
}
