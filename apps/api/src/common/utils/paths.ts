import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Deterministically finds the monorepo root directory.
 * Searches upward from process.cwd() and falls back to searching from the current module directory.
 */
export function getRepoRoot(): string {
  let current = process.cwd();
  while (current && current !== path.dirname(current)) {
    if (
      fs.existsSync(path.join(current, 'pnpm-workspace.yaml')) ||
      fs.existsSync(path.join(current, 'docs/multi-worker'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }

  // Fallback: search upward from import.meta.url
  try {
    const metaDir = path.dirname(fileURLToPath(import.meta.url));
    let fallback = metaDir;
    while (fallback && fallback !== path.dirname(fallback)) {
      if (
        fs.existsSync(path.join(fallback, 'pnpm-workspace.yaml')) ||
        fs.existsSync(path.join(fallback, 'docs/multi-worker'))
      ) {
        return fallback;
      }
      fallback = path.dirname(fallback);
    }
  } catch {
    // ignore
  }

  return process.cwd();
}

/**
 * Resolves a path relative to the monorepo root.
 */
export function resolveRepoPath(...segments: string[]): string {
  return path.resolve(getRepoRoot(), ...segments);
}

export class UnsafePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafePathError';
  }
}

/**
 * Validates that an upload filename or path does not contain traversal sequences,
 * null bytes, backslashes, absolute path indicators, or URL-encoded attacks.
 */
export function isSafeUploadPath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;
  const trimmed = filePath.trim();
  if (trimmed.length === 0) return false;

  // Null byte injection
  if (trimmed.includes('\0')) return false;

  // Backslash
  if (trimmed.includes('\\')) return false;

  // Absolute path (Unix / or Windows drive letter)
  if (trimmed.startsWith('/') || /^[a-zA-Z]:/.test(trimmed)) return false;

  // Directory traversal
  if (trimmed.includes('..')) return false;

  // URL encoded traversal
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      decoded.includes('..') ||
      decoded.includes('\\') ||
      decoded.startsWith('/') ||
      decoded.includes('\0') ||
      /^[a-zA-Z]:/.test(decoded)
    ) {
      return false;
    }
  } catch {
    return false;
  }

  // Segment verification
  const segments = trimmed.split('/').filter(Boolean);
  if (segments.length === 0) return false;

  for (const seg of segments) {
    if (seg === '.' || seg === '..' || seg.trim() === '') {
      return false;
    }
  }

  return true;
}

/**
 * Asserts that the given upload file path is safe against path traversal.
 */
export function assertSafeUploadPath(filePath: string): string {
  if (!isSafeUploadPath(filePath)) {
    throw new UnsafePathError(`Đường dẫn tải lên không an toàn (unsafe upload path): ${filePath}`);
  }
  return filePath.trim();
}

