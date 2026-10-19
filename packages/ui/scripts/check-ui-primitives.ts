/**
 * CI / Linter check for raw HTML UI primitives (<button>, <input>, <select>, <textarea>)
 * Enforces gradual migration of apps/web and apps/admin towards @jlpt/ui design system primitives.
 * Task: D00
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const baselinePath = path.resolve(__dirname, 'ui-primitives-baseline.json');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'tests',
  '.turbo',
  '.git',
  '.system_generated',
]);

interface TagCounts {
  button: number;
  input: number;
  select: number;
  textarea: number;
  total: number;
}

interface Occurrence {
  file: string;
  line: number;
  tag: string;
}

function walkDir(dir: string): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkDir(fullPath));
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanApp(appRelDir: string): { counts: TagCounts; items: Occurrence[] } {
  const absDir = path.resolve(repoRoot, appRelDir);
  const files = walkDir(absDir);
  const counts: TagCounts = { button: 0, input: 0, select: 0, textarea: 0, total: 0 };
  const items: Occurrence[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let inBlockComment = false;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('/*')) inBlockComment = true;
      if (inBlockComment) {
        if (trimmed.includes('*/')) inBlockComment = false;
        return;
      }
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

      const matches = [...line.matchAll(/<(button|input|select|textarea)([\s>/]|$)/g)];
      for (const m of matches) {
        const tag = m[1] as 'button' | 'input' | 'select' | 'textarea';
        if (tag in counts) {
          counts[tag]++;
          counts.total++;
          items.push({
            file: path.relative(repoRoot, file),
            line: idx + 1,
            tag,
          });
        }
      }
    });
  }

  return { counts, items };
}

export function runPrimitivesCheck(): { success: boolean; output: string } {
  const isUpdate = process.argv.includes('--update') || process.argv.includes('--update-baseline');
  const isVerbose = process.argv.includes('--verbose');

  const webScan = scanApp('apps/web');
  const adminScan = scanApp('apps/admin');
  const grandTotal = webScan.counts.total + adminScan.counts.total;

  let baselineData = {
    description: 'Baseline of raw HTML UI primitives (<button>, <input>, <select>, <textarea>) across apps/web and apps/admin.',
    updatedAt: new Date().toISOString(),
    baseline: {
      web: webScan.counts,
      admin: adminScan.counts,
      total: grandTotal,
    },
  };

  if (fs.existsSync(baselinePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      if (parsed.baseline) {
        baselineData = parsed;
      }
    } catch {
      // Fallback to default
    }
  }

  const allowedTotal = baselineData.baseline.total;

  console.log('================================================================================');
  console.log(' JLPT ONLINE - UI PRIMITIVES AUDIT (RATCHETED BASELINE)');
  console.log('================================================================================');
  console.log(`Scan scope: apps/web, apps/admin (excluding tests & build outputs)\n`);

  console.log(`[apps/web] Total: ${webScan.counts.total}`);
  console.log(`  • <button>:   ${webScan.counts.button} (baseline: ${baselineData.baseline.web?.button ?? 'N/A'})`);
  console.log(`  • <input>:    ${webScan.counts.input} (baseline: ${baselineData.baseline.web?.input ?? 'N/A'})`);
  console.log(`  • <select>:   ${webScan.counts.select} (baseline: ${baselineData.baseline.web?.select ?? 'N/A'})`);
  console.log(`  • <textarea>: ${webScan.counts.textarea} (baseline: ${baselineData.baseline.web?.textarea ?? 'N/A'})`);

  console.log(`\n[apps/admin] Total: ${adminScan.counts.total}`);
  console.log(`  • <button>:   ${adminScan.counts.button} (baseline: ${baselineData.baseline.admin?.button ?? 'N/A'})`);
  console.log(`  • <input>:    ${adminScan.counts.input} (baseline: ${baselineData.baseline.admin?.input ?? 'N/A'})`);
  console.log(`  • <select>:   ${adminScan.counts.select} (baseline: ${baselineData.baseline.admin?.select ?? 'N/A'})`);
  console.log(`  • <textarea>: ${adminScan.counts.textarea} (baseline: ${baselineData.baseline.admin?.textarea ?? 'N/A'})`);

  console.log('--------------------------------------------------------------------------------');
  console.log(`CURRENT TOTAL:  ${grandTotal}`);
  console.log(`BASELINE LIMIT: ${allowedTotal}`);

  if (isVerbose) {
    console.log('\n[Verbose Details]');
    [...webScan.items, ...adminScan.items].forEach((item) => {
      console.log(`  ${item.file}:${item.line} -> <${item.tag}>`);
    });
  }

  if (isUpdate) {
    baselineData.baseline = {
      web: webScan.counts,
      admin: adminScan.counts,
      total: grandTotal,
    };
    baselineData.updatedAt = new Date().toISOString();
    fs.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2) + '\n');
    console.log(`\n[UPDATED] Baseline updated to ${grandTotal} total primitives.`);
    return { success: true, output: 'Updated baseline' };
  }

  if (grandTotal > allowedTotal) {
    console.error(
      `\n[FAIL] UI primitive tags count (${grandTotal}) exceeded ratchet baseline (${allowedTotal})!`,
    );
    console.error(
      'New UI code must import components from @jlpt/ui (Button, Input, Select, Textarea) instead of raw HTML elements.',
    );
    process.exit(1);
  }

  if (grandTotal < allowedTotal) {
    console.log(
      `\n[PASS - PROGRESS] UI primitives count reduced from ${allowedTotal} to ${grandTotal}! (Ratchet baseline can be updated)`,
    );
  } else {
    console.log('\n[PASS] UI primitive count matches ratchet baseline threshold.');
  }

  return { success: true, output: 'Check passed' };
}

if (process.argv[1] && process.argv[1].endsWith('check-ui-primitives.ts')) {
  runPrimitivesCheck();
}
