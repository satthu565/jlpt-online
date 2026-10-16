import crypto from 'node:crypto';

/**
 * Generates an RFC 9562 / UUIDv7 string.
 * Format: 48-bit timestamp | 4-bit ver (7) | 12-bit rand_a | 2-bit var (10) | 62-bit rand_b
 */
export function generateUuidV7(): string {
  const now = Date.now();
  const hexTime = now.toString(16).padStart(12, '0');
  const rand = crypto.randomBytes(10);

  // Set version 7 (0b0111) in byte 0 of rand (byte 6 of UUID)
  rand[0] = (rand[0]! & 0x0f) | 0x70;
  // Set variant RFC 4122 (0b10) in byte 2 of rand (byte 8 of UUID)
  rand[2] = (rand[2]! & 0x3f) | 0x80;

  const hexRand = rand.toString('hex');
  return `${hexTime.slice(0, 8)}-${hexTime.slice(8, 12)}-${hexRand.slice(0, 4)}-${hexRand.slice(4, 8)}-${hexRand.slice(8, 20)}`;
}
