/**
 * Ratchet for hand-written inline styles (`style={{ ... }}`) in apps/web.
 * Each file may not have more occurrences than its entry in inline-style-baseline.json (new files: 0).
 * A file going down does not require touching the baseline, so tasks restyling different pages
 * in parallel never edit the same baseline lines. `--update` rewrites the baseline to current counts.
 * A runtime-computed value (e.g. a progress bar width) is allowed when the line, or the line above,
 * carries the comment `ui-allow-style`.
 * Task: D08
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const baselinePath = path.resolve(__dirname, 'inline-style-baseline.json');
const APPS = ['apps/web'];
const EXCLUDED_DIRS = new Set(['node_modules', '.next', 'dist', 'tests', '.turbo', '.git', 'e2e']);

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|jsx)$/.test(entry.name) && !/\.test\.(tsx|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

export function countInlineStyles(source: string): number {
  const lines = source.split('\n');
  let count = 0;
  lines.forEach((line, i) => {
    const hits = line.match(/style=\{\{/g)?.length ?? 0;
    if (!hits) return;
    if (line.includes('ui-allow-style') || (i > 0 && lines[i - 1]!.includes('ui-allow-style'))) return;
    count += hits;
  });
  return count;
}

export function scanInlineStyles(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const app of APPS) {
    for (const file of walk(path.resolve(repoRoot, app))) {
      const n = countInlineStyles(fs.readFileSync(file, 'utf8'));
      if (n > 0) counts[path.relative(repoRoot, file).split(path.sep).join('/')] = n;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

export function compareToBaseline(
  current: Record<string, number>,
  baseline: Record<string, number>,
): { file: string; current: number; allowed: number }[] {
  return Object.entries(current)
    .filter(([file, n]) => n > (baseline[file] ?? 0))
    .map(([file, n]) => ({ file, current: n, allowed: baseline[file] ?? 0 }));
}

function main(): void {
  const current = scanInlineStyles();
  const total = Object.values(current).reduce((a, b) => a + b, 0);
  if (process.argv.includes('--update')) {
    fs.writeFileSync(baselinePath, `${JSON.stringify({ files: current }, null, 2)}\n`);
    console.log(`Đã ghi baseline inline style: ${total} chỗ trong ${Object.keys(current).length} file.`);
    return;
  }
  const baseline = (JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as { files: Record<string, number> }).files;
  const allowedTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
  const over = compareToBaseline(current, baseline);
  console.log(`[check:inline-styles] apps/web: ${total} style={{}} (baseline ${allowedTotal}).`);
  if (over.length > 0) {
    console.error('Inline style tăng so với baseline. Dùng class Tailwind hoặc thành phần @jlpt/ui thay cho style={{}}:');
    for (const o of over) console.error(`  - ${o.file}: ${o.current} > ${o.allowed}`);
    process.exit(1);
  }
  console.log('Kiểm tra check:inline-styles ĐẠT.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
