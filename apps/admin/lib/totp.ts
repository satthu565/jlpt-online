import crypto from 'node:crypto';

// RFC 4648 Base32 Alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a Buffer or Uint8Array into an RFC 4648 Base32 string (without padding).
 */
export function base32Encode(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i]!;
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string into a Buffer.
 * Ignores spaces, hyphens and padding. Case-insensitive.
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
 * Generates a random Base32 secret key for TOTP (default 20 bytes = 160 bits).
 */
export function generateBase32Secret(byteLength = 20): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return base32Encode(randomBytes);
}

/**
 * Formats a secret key in 4-character blocks for easier manual input (e.g. "JBSW Y3DP EHPK 3PXP").
 */
export function formatSecret(secret: string): string {
  const clean = secret.replace(/\s+/g, '').toUpperCase();
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    chunks.push(clean.slice(i, i + 4));
  }
  return chunks.join(' ');
}

export interface TotpOptions {
  digits?: number;
  timeStepSeconds?: number;
  timestampMs?: number;
}

/**
 * Computes the HOTP/TOTP token for a given counter using HMAC-SHA1 (RFC 4226 / RFC 6238).
 */
export function computeHotp(secretBuffer: Buffer, counter: number | bigint, digits = 6): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuf);
  const hash = hmac.digest();

  // Dynamic Truncation
  const offset = hash[hash.length - 1]! & 0x0f;
  const binary =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);

  const mod = Math.pow(10, digits);
  const token = (binary % mod).toString().padStart(digits, '0');
  return token;
}

/**
 * Generates a TOTP code for a given Base32 secret at a specified timestamp.
 */
export function generateTotp(secret: string, options: TotpOptions = {}): string {
  const { digits = 6, timeStepSeconds = 30, timestampMs = Date.now() } = options;
  const secretBuffer = base32Decode(secret);
  const counter = Math.floor(timestampMs / 1000 / timeStepSeconds);
  return computeHotp(secretBuffer, counter, digits);
}

export interface VerifyTotpOptions extends TotpOptions {
  window?: number; // Number of time steps to check backward and forward (default 1)
}

/**
 * Verifies a 6-digit TOTP code against a Base32 secret with clock-drift tolerance.
 */
export function verifyTotp(token: string, secret: string, options: VerifyTotpOptions = {}): boolean {
  if (!token || !secret) return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  const { digits = 6, timeStepSeconds = 30, timestampMs = Date.now(), window = 1 } = options;

  if (cleanToken.length !== digits || !/^\d+$/.test(cleanToken)) {
    return false;
  }

  try {
    const secretBuffer = base32Decode(secret);
    const currentCounter = Math.floor(timestampMs / 1000 / timeStepSeconds);

    for (let delta = -window; delta <= window; delta++) {
      const candidateCounter = currentCounter + delta;
      if (candidateCounter < 0) continue;
      const expectedToken = computeHotp(secretBuffer, candidateCounter, digits);
      if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expectedToken))) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Generates an otpauth:// URL suitable for authenticator apps (e.g. Google Authenticator).
 */
export function generateOtpAuthUri(options: {
  issuer: string;
  accountName: string;
  secret: string;
  digits?: number;
  period?: number;
}): string {
  const { issuer, accountName, secret, digits = 6, period = 30 } = options;
  const label = `${encodeURIComponent(issuer)}:${accountName}`;
  const params = new URLSearchParams({
    secret: secret.replace(/\s+/g, '').toUpperCase(),
    issuer,
    algorithm: 'SHA1',
    digits: String(digits),
    period: String(period),
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Generates N single-use emergency backup recovery codes (formatted as "XXXX-XXXX").
 */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32-ish, excluding easily confused chars like 0/O, 1/I

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(8);
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[bytes[j]! % chars.length];
      if (j === 3) code += '-';
    }
    codes.push(code);
  }

  return codes;
}

/**
 * Hashes a recovery code for secure persistent storage using SHA-256.
 */
export function hashRecoveryCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Validates and consumes a recovery code (Single-Use check).
 * Returns validity and the updated array of remaining hashed codes.
 */
export function verifyAndConsumeRecoveryCode(
  inputCode: string,
  storedHashedCodes: string[],
): { valid: boolean; remainingHashedCodes: string[] } {
  if (!inputCode || storedHashedCodes.length === 0) {
    return { valid: false, remainingHashedCodes: storedHashedCodes };
  }

  const targetHash = hashRecoveryCode(inputCode);
  const targetBuffer = Buffer.from(targetHash, 'hex');

  let matchIndex = -1;
  for (let i = 0; i < storedHashedCodes.length; i++) {
    const storedHash = storedHashedCodes[i]!;
    try {
      const storedBuffer = Buffer.from(storedHash, 'hex');
      if (storedBuffer.length === targetBuffer.length && crypto.timingSafeEqual(targetBuffer, storedBuffer)) {
        matchIndex = i;
        break;
      }
    } catch {
      // In case of invalid hex string in stored codes
    }
  }

  if (matchIndex === -1) {
    return { valid: false, remainingHashedCodes: storedHashedCodes };
  }

  // Remove the consumed code to enforce Single-Use
  const remaining = storedHashedCodes.filter((_, idx) => idx !== matchIndex);
  return { valid: true, remainingHashedCodes: remaining };
}
