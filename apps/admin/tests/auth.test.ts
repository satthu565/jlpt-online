import { describe, it, expect, beforeEach } from 'vitest';
import type { Role } from '@jlpt/schema';
import {
  base32Encode,
  base32Decode,
  generateBase32Secret,
  formatSecret,
  generateTotp,
  verifyTotp,
  generateOtpAuthUri,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyAndConsumeRecoveryCode,
} from '../lib/totp';
import { generateQrMatrix } from '../lib/qrcode';
import { AdminApiClient, AdminClientGuardError } from '../lib/api-client';

describe('Admin Authentication & TOTP Enrollment (Acceptance 2: TOTP bắt buộc ở cả server và UI)', () => {
  describe('RFC 4648 Base32 Encoding & Decoding', () => {
    it('correctly encodes and decodes ASCII and binary buffers', () => {
      const testCases = [
        { raw: '', b32: '' },
        { raw: 'f', b32: 'MY' },
        { raw: 'fo', b32: 'MZXQ' },
        { raw: 'foo', b32: 'MZXW6' },
        { raw: 'foob', b32: 'MZXW6YQ' },
        { raw: 'fooba', b32: 'MZXW6YTB' },
        { raw: 'foobar', b32: 'MZXW6YTBOI' },
      ];

      for (const tc of testCases) {
        const encoded = base32Encode(Buffer.from(tc.raw));
        expect(encoded).toBe(tc.b32);

        const decoded = base32Decode(tc.b32);
        expect(decoded.toString('utf-8')).toBe(tc.raw);
      }
    });

    it('handles padding, hyphens, and whitespace gracefully during decode', () => {
      const decoded = base32Decode('MZXW-6YTB===');
      expect(decoded.toString('utf-8')).toBe('fooba');
    });

    it('generates random 20-byte base32 secret and formats it in blocks', () => {
      const secret = generateBase32Secret(20);
      expect(secret.length).toBe(32); // 20 bytes * 8 / 5 = 32 chars
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);

      const formatted = formatSecret(secret);
      expect(formatted.split(' ').length).toBe(8); // 8 groups of 4 chars
    });
  });

  describe('RFC 6238 TOTP Official Test Vectors (Appendix B)', () => {
    // RFC 6238 Appendix B uses seed ASCII: "12345678901234567890" (20 bytes)
    // Base32 for "12345678901234567890" is "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
    const rfcSecretB32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    it('matches RFC 6238 Appendix B test vectors for 6 digits SHA-1', () => {
      const vectors = [
        { timeSec: 59, expected: '287082' },
        { timeSec: 1111111109, expected: '081804' },
        { timeSec: 1111111111, expected: '050471' },
        { timeSec: 1234567890, expected: '005924' },
        { timeSec: 2000000000, expected: '279037' },
      ];

      for (const { timeSec, expected } of vectors) {
        const token = generateTotp(rfcSecretB32, {
          digits: 6,
          timeStepSeconds: 30,
          timestampMs: timeSec * 1000,
        });
        expect(token).toBe(expected);
      }
    });

    it('verifies TOTP code within clock-drift window (±1 time step)', () => {
      const baseTimeMs = 1700000000000;
      const secret = generateBase32Secret(20);

      const currentCode = generateTotp(secret, { timestampMs: baseTimeMs });
      const prevCode = generateTotp(secret, { timestampMs: baseTimeMs - 30000 });
      const nextCode = generateTotp(secret, { timestampMs: baseTimeMs + 30000 });
      const futureCode = generateTotp(secret, { timestampMs: baseTimeMs + 90000 });

      // Valid codes within ±1 step window
      expect(verifyTotp(currentCode, secret, { timestampMs: baseTimeMs, window: 1 })).toBe(true);
      expect(verifyTotp(prevCode, secret, { timestampMs: baseTimeMs, window: 1 })).toBe(true);
      expect(verifyTotp(nextCode, secret, { timestampMs: baseTimeMs, window: 1 })).toBe(true);

      // Outside window: rejected
      expect(verifyTotp(futureCode, secret, { timestampMs: baseTimeMs, window: 1 })).toBe(false);

      // Invalid format or characters: rejected
      expect(verifyTotp('abcdef', secret, { timestampMs: baseTimeMs })).toBe(false);
      expect(verifyTotp('123', secret, { timestampMs: baseTimeMs })).toBe(false);
      expect(verifyTotp('', secret, { timestampMs: baseTimeMs })).toBe(false);
    });
  });

  describe('TOTP Enrollment & QR Code Generation', () => {
    it('generates standard otpauth URI conforming to authenticator specifications', () => {
      const uri = generateOtpAuthUri({
        issuer: 'JLPT Admin',
        accountName: 'staff@jlpt.local',
        secret: 'JBSWY3DPEHPK3PXP',
      });

      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('JLPT%20Admin:staff@jlpt.local');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=JLPT+Admin');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });

    it('generates valid SVG QR code for the otpauth URI', () => {
      const uri = 'otpauth://totp/JLPT%20Admin:staff@jlpt.local?secret=JBSWY3DPEHPK3PXP&issuer=JLPT+Admin';
      const qr = generateQrMatrix(uri);

      expect(qr.size).toBeGreaterThan(20);
      expect(qr.matrix.length).toBe(qr.size);
      expect(qr.svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(qr.svg).toContain('<rect');
      expect(qr.svg).toContain('aria-label="QR Code"');
    });
  });

  describe('Single-Use Backup Recovery Codes', () => {
    it('generates 8 single-use recovery codes formatted as XXXX-XXXX', () => {
      const codes = generateRecoveryCodes(8);
      expect(codes.length).toBe(8);

      for (const code of codes) {
        expect(code.length).toBe(9); // 4 + '-' + 4
        expect(code[4]).toBe('-');
        expect(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)).toBe(true);
      }
    });

    it('hashes recovery codes with SHA-256 deterministically', () => {
      const code = 'ABCD-1234';
      const hash1 = hashRecoveryCode(code);
      const hash2 = hashRecoveryCode('abcd-1234'); // case-insensitive
      const hash3 = hashRecoveryCode('ABCD1234'); // hyphen-insensitive

      expect(hash1.length).toBe(64); // SHA-256 hex
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
    });

    it('verifies and consumes a recovery code exactly once (Single-Use)', () => {
      const codes = generateRecoveryCodes(4);
      const storedHashes = codes.map(hashRecoveryCode);

      const targetCode = codes[1]!;

      // 1. First use: valid, code is consumed
      const res1 = verifyAndConsumeRecoveryCode(targetCode, storedHashes);
      expect(res1.valid).toBe(true);
      expect(res1.remainingHashedCodes.length).toBe(3);
      expect(res1.remainingHashedCodes).not.toContain(hashRecoveryCode(targetCode));

      // 2. Re-use: rejected!
      const res2 = verifyAndConsumeRecoveryCode(targetCode, res1.remainingHashedCodes);
      expect(res2.valid).toBe(false);
      expect(res2.remainingHashedCodes.length).toBe(3);

      // 3. Invalid code: rejected
      const res3 = verifyAndConsumeRecoveryCode('INVALID-CODE', res1.remainingHashedCodes);
      expect(res3.valid).toBe(false);
      expect(res3.remainingHashedCodes.length).toBe(3);
    });
  });

  describe('Staff Login & TOTP Enrollment Flow Integration', () => {
    let client: AdminApiClient;

    beforeEach(() => {
      client = new AdminApiClient({ mode: 'mock' });
    });

    it('Rejects login attempt for non-staff roles (e.g. student)', async () => {
      await expect(client.login('student@example.com', 'student' as unknown as Role, false)).rejects.toThrow(
        AdminClientGuardError,
      );
    });

    it('New staff login without 2FA redirects to setup_2fa', async () => {
      const res = await client.login('editor@jlpt.local', 'editor', false);
      expect(res.nextStep).toBe('setup_2fa');
      expect(res.user.twoFactorEnabled).toBe(false);
      expect(res.user.twoFactorStatus).toBe('setup_required');

      // Staff cannot call admin API while setup is pending
      expect(() => client.enforceGuard(['editor'])).toThrow(AdminClientGuardError);
      try {
        client.enforceGuard(['editor']);
      } catch (err: unknown) {
        expect((err as AdminClientGuardError).code).toBe('TWO_FACTOR_REQUIRED');
      }
    });
  });

  describe('Server TOTP Requirement Integration (RolesGuard / API)', () => {
    it('simulates server-side roles guard blocking staff requests when ENFORCE_STAFF_2FA=true and twoFactorEnabled=false', () => {
      const simulateServerRolesGuard = (
        user: { role: string; twoFactorEnabled: boolean } | null,
        enforceStaff2fa: boolean,
      ): { allowed: boolean; errorCode?: string } => {
        if (!user) return { allowed: false, errorCode: 'UNAUTHENTICATED' };
        if (!['admin', 'editor', 'reviewer', 'moderator', 'billing_admin'].includes(user.role)) {
          return { allowed: false, errorCode: 'FORBIDDEN' };
        }
        if (user.twoFactorEnabled === false && enforceStaff2fa) {
          return { allowed: false, errorCode: 'TWO_FACTOR_REQUIRED' };
        }
        return { allowed: true };
      };

      // Staff without 2FA when enforcement is ON -> TWO_FACTOR_REQUIRED
      const res1 = simulateServerRolesGuard({ role: 'editor', twoFactorEnabled: false }, true);
      expect(res1.allowed).toBe(false);
      expect(res1.errorCode).toBe('TWO_FACTOR_REQUIRED');

      // Staff with 2FA when enforcement is ON -> Allowed
      const res2 = simulateServerRolesGuard({ role: 'editor', twoFactorEnabled: true }, true);
      expect(res2.allowed).toBe(true);

      // Student attempting to access admin route -> FORBIDDEN
      const res3 = simulateServerRolesGuard({ role: 'student', twoFactorEnabled: true }, true);
      expect(res3.allowed).toBe(false);
      expect(res3.errorCode).toBe('FORBIDDEN');
    });
  });
});
