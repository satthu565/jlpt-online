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
