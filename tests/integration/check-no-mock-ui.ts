import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type ViolationCategory = 'ALL_SAMPLE' | 'mảng mẫu' | 'đăng nhập giả';

export interface ViolationRule {
  id: string;
  category: ViolationCategory;
  pattern: RegExp;
  description: string;
}

export interface ViolationMatch {
  ruleId: string;
  category: ViolationCategory;
  matched: string;
  line: number;
  snippet: string;
}

export interface ScannedFileResult {
  app: 'web' | 'admin';
  route: string;
  file: string;
  violations: ViolationMatch[];
}

export interface BaselineEntry {
  app?: string;
  route?: string;
  file?: string;
  violations?: string[];
  reasons?: string[];
}

export interface CheckResult {
  totalFilesScanned: number;
  violatingFiles: ScannedFileResult[];
  knownViolations: ScannedFileResult[];
  newViolations: ScannedFileResult[];
  baselineCount: number;
  passed: boolean;
}

export const RULES: ViolationRule[] = [
  // 1. ALL_SAMPLE
  {
    id: 'RULE_ALL_SAMPLE',
    category: 'ALL_SAMPLE',
    pattern: /\bALL_SAMPLE(_[A-Z0-9_]+)?\b/g,
    description: 'Phát hiện ALL_SAMPLE hoặc ALL_SAMPLE_EXAMS',
  },
  // 2. Mảng mẫu / Dữ liệu viết cứng mẫu
  {
    id: 'RULE_SAMPLE_CONSTANT',
    category: 'mảng mẫu',
    pattern: /\b(SAMPLE_[A-Z0-9_]+|MOCK_[A-Z0-9_]+)\b/g,
    description: 'Phát hiện hằng số mảng mẫu hoặc mock (SAMPLE_*, MOCK_*)',
  },
  {
    id: 'RULE_FIXTURE_IMPORT',
    category: 'mảng mẫu',
    pattern: /import\s+.*from\s+['"].*(fixtures\/|sample-exam).*['"]/g,
    description: 'Phát hiện import dữ liệu từ thư mục fixtures trong mã giao diện',
  },
  {
    id: 'RULE_SAMPLE_RECORD_IDENTIFIER',
    category: 'mảng mẫu',
    pattern: /\b(aud_sample_\w+|rec_run_sample_\w+|media_passage_sample)\b/g,
    description: 'Phát hiện ID bản ghi mẫu viết cứng (aud_sample_*, rec_run_sample_*, media_passage_sample)',
  },
  {
    id: 'RULE_SAMPLE_DATA_ARRAY',
    category: 'mảng mẫu',
    pattern: /\b(tpl-\d+|app-\d+|voc-\d+|art-\d+|totalUsers:\s*1420)\b/g,
    description: 'Phát hiện dữ liệu mẫu viết cứng trong state giao diện',
  },
  // 3. Đăng nhập giả
  {
    id: 'RULE_DANG_NHAP_GIA',
    category: 'đăng nhập giả',
    pattern: /\b(mockId|admin_tok_\w*|mockHashedRecoveryCodes|mockActiveSecret)\b/g,
    description: 'Phát hiện logic đăng nhập giả hoặc token giả trong auth context',
  },
  {
    id: 'RULE_MOCK_AUTH_MODE',
    category: 'đăng nhập giả',
    pattern: /\bmode:\s*['"]mock['"]/g,
    description: 'Phát hiện cờ mode: mock trong client xác thực',
  },
];

/**
 * Normalizes a file path to its canonical route representation.
 */
export function fileToRoute(app: 'web' | 'admin', filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const appPrefix = `apps/${app}/`;
  const cleanPath = normalized.includes(appPrefix)
    ? normalized.slice(normalized.indexOf(appPrefix))
    : normalized;

  if (cleanPath.startsWith(`apps/${app}/app`)) {
    let rel = cleanPath.replace(new RegExp(`^apps/${app}/app`), '');
    rel = rel.replace(/\/\([^)]+\)/g, ''); // Bỏ route groups Next.js e.g. (exam)
    rel = rel.replace(/\/page\.(tsx|ts|jsx|js)$/, '');
    rel = rel.replace(/\/route\.(tsx|ts|jsx|js)$/, '');
    rel = rel.replace(/\.ts$/, '');
    return rel || '/';
  }
  return cleanPath;
}

/**
 * Scans code string against rules.
 */
export function scanCodeString(code: string): ViolationMatch[] {
  const lines = code.split('\n');
  const violations: ViolationMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const rule of RULES) {
      // Reset lastIndex for global RegExp
      rule.pattern.lastIndex = 0;
      const matches = line.match(rule.pattern);
      if (matches) {
        for (const m of matches) {
          violations.push({
            ruleId: rule.id,
            category: rule.category,
            matched: m,
            line: i + 1,
            snippet: line.trim(),
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Scans a file on disk.
 */
export function scanFile(app: 'web' | 'admin', fullPath: string): ViolationMatch[] {
  const content = fs.readFileSync(fullPath, 'utf8');
  return scanCodeString(content);
}

/**
 * Recursively scans directory for TypeScript/React files.
 */
export function scanDirectory(
  app: 'web' | 'admin',
  dirPath: string,
  rootDir = process.cwd(),
): ScannedFileResult[] {
  const results: ScannedFileResult[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    const rel = path.relative(rootDir, full).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'tests') {
        results.push(...scanDirectory(app, full, rootDir));
      }
    } else if (entry.isFile() && (rel.endsWith('.tsx') || rel.endsWith('.ts'))) {
      const violations = scanFile(app, full);
      if (violations.length > 0) {
        results.push({
          app,
          route: fileToRoute(app, rel),
          file: rel,
          violations,
        });
      }
    }
  }

  return results;
}

/**
 * Scans all apps/web and apps/admin code paths.
 */
export function scanApps(rootDir = process.cwd()): ScannedFileResult[] {
  const targets: Array<{ app: 'web' | 'admin'; dir: string }> = [
    { app: 'web', dir: path.join(rootDir, 'apps/web/app') },
    { app: 'web', dir: path.join(rootDir, 'apps/web/components') },
    { app: 'web', dir: path.join(rootDir, 'apps/web/features') },
    { app: 'web', dir: path.join(rootDir, 'apps/web/lib') },
    { app: 'admin', dir: path.join(rootDir, 'apps/admin/app') },
    { app: 'admin', dir: path.join(rootDir, 'apps/admin/components') },
    { app: 'admin', dir: path.join(rootDir, 'apps/admin/features') },
    { app: 'admin', dir: path.join(rootDir, 'apps/admin/lib') },
  ];

  const results: ScannedFileResult[] = [];
  for (const target of targets) {
    results.push(...scanDirectory(target.app, target.dir, rootDir));
  }
  return results;
}

/**
 * Checks if a scanned result matches any baseline entry.
 */
export function isCoveredByBaseline(
  scanned: ScannedFileResult,
  baseline: Array<BaselineEntry | string>,
): boolean {
  const normalizedFile = scanned.file.replace(/\\/g, '/');
  const normalizedRoute = scanned.route;

  for (const item of baseline) {
    if (typeof item === 'string') {
      const normItem = item.replace(/\\/g, '/');
      if (normItem === normalizedFile || normItem === normalizedRoute) {
        return true;
      }
    } else if (typeof item === 'object' && item !== null) {
      if (item.file && item.file.replace(/\\/g, '/') === normalizedFile) {
        return true;
      }
      if (item.route && item.route === normalizedRoute && (!item.app || item.app === scanned.app)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Runs the check against baseline file.
 */
export function runNoMockUiCheck(
  rootDir = process.cwd(),
  baselinePath = path.join(rootDir, 'tests/integration/mock-ui-baseline.json'),
): CheckResult {
  const scanned = scanApps(rootDir);

  let baseline: Array<BaselineEntry | string> = [];
  if (fs.existsSync(baselinePath)) {
    try {
      const raw = fs.readFileSync(baselinePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        baseline = parsed;
      } else if (parsed && Array.isArray(parsed.routes)) {
        baseline = parsed.routes;
      }
    } catch (err) {
      console.error(`[check:no-mock-ui] Lỗi đọc baseline tại ${baselinePath}:`, err);
    }
  }

  const knownViolations: ScannedFileResult[] = [];
  const newViolations: ScannedFileResult[] = [];

  for (const item of scanned) {
    if (isCoveredByBaseline(item, baseline)) {
      knownViolations.push(item);
    } else {
      newViolations.push(item);
    }
  }

  const baselineCount = baseline.length;
  // I07 Acceptance: baseline mock-ui phải rỗng; CI fail nếu có dữ liệu giả mới hoặc baseline không rỗng
  const passed = newViolations.length === 0 && baselineCount === 0;

  return {
    totalFilesScanned: scanned.length,
    violatingFiles: scanned,
    knownViolations,
    newViolations,
    baselineCount,
    passed,
  };
}


/**
 * Internal feature codes such as "(LIB-06)" or "(EXAM-24)" must not reach users. They may stay in
 * comments, data-testid values and tests. Apps listed here are enforced; apps/admin joins after D07.
 */
export const FEATURE_CODE_APPS: Array<'web' | 'admin'> = ['web', 'admin'];
const FEATURE_CODE_RE = /\((?:[A-Z]{2,5}-\d{2,3})(?:\s*[,/&]\s*[A-Z]{2,5}-\d{2,3})*\)/;

export function findVisibleFeatureCodes(rootDir = process.cwd()): string[] {
  const hits: string[] = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.next', 'dist', 'tests', '.turbo'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx|json)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*') || line.includes('data-testid')) return;
          if (FEATURE_CODE_RE.test(line)) hits.push(`${path.relative(rootDir, full)}:${i + 1}: ${t.slice(0, 120)}`);
        });
      }
    }
  };
  for (const app of FEATURE_CODE_APPS) walk(path.join(rootDir, 'apps', app));
  return hits;
}

/**
 * CLI Entrypoint
 */
export function main(): void {
  console.log('===============================================================');
  console.log(' [check:no-mock-ui] Quét apps/web và apps/admin tìm dữ liệu giả');
  console.log(' Tiêu chuẩn: Không dùng mảng mẫu, ALL_SAMPLE, đăng nhập giả');
  console.log(' Nghiệm thu I07: mock-ui-baseline.json phải rỗng tuyệt đối');
  console.log('===============================================================');

  const rootDir = process.cwd();
  const baselinePath = path.join(rootDir, 'tests/integration/mock-ui-baseline.json');

  const result = runNoMockUiCheck(rootDir, baselinePath);

  console.log(`\nTổng số tệp/route phát hiện vi phạm: ${result.violatingFiles.length}`);
  console.log(` - Vi phạm đã ghi nhận trong baseline: ${result.knownViolations.length}`);
  console.log(` - Vi phạm mới ngoài baseline (LỖI CI): ${result.newViolations.length}`);
  console.log(` - Số lượng mục trong baseline: ${result.baselineCount}`);

  if (result.baselineCount > 0) {
    console.error(`\n❌ LỖI BẢO MẬT/CHẤT LƯỢNG (I07): mock-ui-baseline.json phải hoàn toàn rỗng nhưng hiện có ${result.baselineCount} mục!`);
    console.error('Không cho phép bất kỳ dữ liệu giả hoặc ngoại lệ mock UI nào trong baseline sau khi nghiệm thu.');
    process.exit(1);
  }

  const codeHits = findVisibleFeatureCodes(rootDir);
  if (codeHits.length > 0) {
    console.error(`\n❌ GIAO DIỆN CÒN MÃ TÍNH NĂNG NỘI BỘ (${codeHits.length} chỗ):`);
    for (const hit of codeHits.slice(0, 50)) console.error(`  - ${hit}`);
    console.error('\nKiểm tra check:no-mock-ui KHÔNG ĐẠT!');
    process.exit(1);
  }

  if (result.newViolations.length > 0) {
    console.error('\n❌ PHÁT HIỆN VI PHẠM MỚI NGOÀI BASELINE:');
    for (const item of result.newViolations) {
      console.error(`\n[${item.app.toUpperCase()}] Route: ${item.route} (${item.file})`);
      for (const v of item.violations) {
        console.error(`  - Dòng ${v.line} [${v.category}]: ${v.matched}`);
        console.error(`    Code: ${v.snippet}`);
      }
    }
    console.error('\nKiểm tra check:no-mock-ui KHÔNG ĐẠT!');
    process.exit(1);
  } else {
    console.log('\n✅ mock-ui-baseline.json hoàn toàn rỗng và không có dữ liệu giả mới.');
    console.log('Toàn bộ giao diện đã kết nối backend thật. Kiểm tra check:no-mock-ui ĐẠT.');
    process.exit(0);
  }
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  main();
}
