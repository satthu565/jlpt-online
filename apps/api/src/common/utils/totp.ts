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
