import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

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

export function generateBase32Secret(byteLength = 20): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return base32Encode(randomBytes);
}

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

export function computeHotp(secretBuffer: Buffer, counter: number | bigint, digits = 6): string {
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

export function generateTotp(secret: string, options: TotpOptions = {}): string {
  const { digits = 6, timeStepSeconds = 30, timestampMs = Date.now() } = options;
  const secretBuffer = base32Decode(secret);
  const counter = Math.floor(timestampMs / 1000 / timeStepSeconds);
  return computeHotp(secretBuffer, counter, digits);
}

export interface VerifyTotpOptions extends TotpOptions {
  window?: number;
}

export function verifyTotpWithStep(
  token: string,
  secret: string,
  options: VerifyTotpOptions = {},
): { valid: boolean; step?: number } {
  if (!token || !secret) return { valid: false };
  const cleanToken = token.trim().replace(/\s+/g, '');
  const { digits = 6, timeStepSeconds = 30, timestampMs = Date.now(), window = 1 } = options;

  if (cleanToken.length !== digits || !/^\d+$/.test(cleanToken)) {
    return { valid: false };
  }

  try {
    const secretBuffer = base32Decode(secret);
    const currentCounter = Math.floor(timestampMs / 1000 / timeStepSeconds);

    for (let delta = -window; delta <= window; delta++) {
      const candidateCounter = currentCounter + delta;
      if (candidateCounter < 0) continue;
      const expectedToken = computeHotp(secretBuffer, candidateCounter, digits);
      if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expectedToken))) {
        return { valid: true, step: candidateCounter };
      }
    }

    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export function verifyTotp(token: string, secret: string, options: VerifyTotpOptions = {}): boolean {
  return verifyTotpWithStep(token, secret, options).valid;
}

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

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

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

export function hashRecoveryCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

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
      // Ignore corrupt entries
    }
  }

  if (matchIndex === -1) {
    return { valid: false, remainingHashedCodes: storedHashedCodes };
  }

  const remaining = storedHashedCodes.filter((_, idx) => idx !== matchIndex);
  return { valid: true, remainingHashedCodes: remaining };
}

/**
 * Derives a deterministic user-specific 256-bit encryption key from system secret and userId.
 */
function deriveUserKey(userId: string): Buffer {
  const masterKey =
    process.env.AUTH_SECRET ||
    process.env.ENCRYPTION_KEY ||
    'jlpt_prod_auth_secret_must_be_32_bytes_or_longer_secure_key';
  return crypto.createHmac('sha256', masterKey).update(`totp-encryption-key:${userId}`).digest();
}

/**
 * Encrypts a TOTP secret using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (hex).
 */
export function encryptTotpSecret(secret: string, userId: string): string {
  const key = deriveUserKey(userId);
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypts a TOTP secret using AES-256-GCM.
 */
export function decryptTotpSecret(encryptedStr: string, userId: string): string {
  if (!encryptedStr || !encryptedStr.includes(':')) {
    throw new Error('Invalid encrypted TOTP secret payload format.');
  }

  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted TOTP secret parts count.');
  }

  const iv = Buffer.from(parts[0]!, 'hex');
  const authTag = Buffer.from(parts[1]!, 'hex');
  const ciphertext = Buffer.from(parts[2]!, 'hex');

  const key = deriveUserKey(userId);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
