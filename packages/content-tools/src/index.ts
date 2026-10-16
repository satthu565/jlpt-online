/**
 * Normalizes Japanese text using Unicode NFC form without mutating into NFKC.
 */
export function normalizeJapaneseText(text: string): string {
  return text.normalize('NFC');
}

export interface ImportPackageValidation {
  valid: boolean;
  errors: string[];
}

export function validatePackageManifest(manifest: unknown): ImportPackageValidation {
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be an object'] };
  }
  const obj = manifest as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof obj['title'] !== 'string' || obj['title'].trim().length === 0) {
    errors.push('Manifest missing valid title');
  }
  if (!['N1', 'N2', 'N3', 'N4', 'N5'].includes(String(obj['level']))) {
    errors.push('Manifest missing valid JLPT level');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export * from './types.js';
export * from './schema.js';
export * from './validator.js';
export * from './zip.js';
export * from './idempotency.js';
export * from './blueprint-validator.js';
export * from './issues.js';
export * from './nlp/index.js';

