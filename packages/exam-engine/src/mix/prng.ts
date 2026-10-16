import * as crypto from 'node:crypto';

/**
 * 32-bit Mulberry32 PRNG for fast deterministic random number generation
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = (seed ^ 0x12345678) >>> 0;
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  /**
   * Returns a pseudo-random float in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer in [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    if (min >= max) return min;
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Shuffles an array in place using the Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = array[i]!;
      array[i] = array[j]!;
      array[j] = temp;
    }
    return array;
  }

  /**
   * Returns a shallow-shuffled copy of an array
   */
  sample<T>(array: readonly T[]): T[] {
    return this.shuffle([...array]);
  }
}

/**
 * Deterministically serializes an object by sorting its keys recursively
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJsonStringify((obj as Record<string, unknown>)[k])}`,
  );
  return '{' + entries.join(',') + '}';
}

/**
 * Computes deterministic SHA-256 hash in hex
 */
export function canonicalConfigHash(config: unknown): string {
  const canonical = canonicalJsonStringify(config);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Generates a deterministic RFC4122 v4 UUID from seed and salt
 */
export function deterministicUuid(seed: number, salt: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${seed}:${salt}`, 'utf8')
    .digest('hex');

  // Format as 8-4-4-4-12 hex string
  const p1 = hash.substring(0, 8);
  const p2 = hash.substring(8, 12);
  const p3 = '4' + hash.substring(13, 16); // version 4
  const variantNibble = (parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8;
  const p4 = variantNibble.toString(16) + hash.substring(17, 20);
  const p5 = hash.substring(20, 32);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

/**
 * Allocates integer question quotas among sources according to weights using Largest Remainder (Hare-Niemeyer).
 * Guarantees sum(quotas) === totalCount exactly.
 */
export function allocateIntegerQuotas(
  sessions: string[],
  weights: Record<string, number>,
  totalCount: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  if (sessions.length === 0 || totalCount <= 0) {
    return result;
  }

  let totalWeight = 0;
  for (const s of sessions) {
    totalWeight += Math.max(0, weights[s] ?? 0);
  }

  // If all weights are 0, allocate uniformly
  const effectiveWeights: Record<string, number> = {};
  for (const s of sessions) {
    effectiveWeights[s] = totalWeight > 0 ? Math.max(0, weights[s] ?? 0) : 1;
  }
  const effectiveTotalWeight =
    totalWeight > 0 ? totalWeight : sessions.length;

  interface SessionAllocation {
    session: string;
    floor: number;
    remainder: number;
  }

  const items: SessionAllocation[] = [];
  let floorSum = 0;

  for (const s of sessions) {
    const w = effectiveWeights[s]!;
    const exact = (w / effectiveTotalWeight) * totalCount;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    items.push({ session: s, floor, remainder });
    floorSum += floor;
  }

  // Sort by remainder descending, with tie break by session name for determinism
  items.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return a.session.localeCompare(b.session);
  });

  const deficit = totalCount - floorSum;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const bonus = i < deficit ? 1 : 0;
    result[item.session] = item.floor + bonus;
  }

  return result;
}
