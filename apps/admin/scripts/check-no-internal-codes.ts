import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Script kiểm tra không lộ mã tính năng nội bộ (ví dụ: (ADM-01), (LIB-06), (EXAM-03))
 * trên giao diện người dùng theo yêu cầu D06/D07.
 *
 * Tiêu chí:
 * - Chuỗi dịch (messages/*.json) không được chứa mẫu \([A-Z]{2,5}-\d{2,3}\).
 * - Mã JSX text / thuộc tính hiển thị trong TSX/TS không được chứa mẫu \([A-Z]{2,5}-\d{2,3}\).
 * - Ngoại lệ cho phép: data-testid, comment (//, /*, {/**\/}) và file kiểm thử (tests, *.test.*, *.spec.*).
 */

export const INTERNAL_CODE_PATTERN = /\([A-Z]{2,5}-\d{2,3}\)/g;

export interface CodeViolation {
  file: string;
  line?: number;
  keyPath?: string;
  matched: string;
  snippet: string;
}

/**
 * Quét đệ quy object JSON tìm chuỗi vi phạm.
 */
export function scanJsonObject(
  obj: unknown,
  filePath: string,
  keyPrefix = '',
): CodeViolation[] {
  const violations: CodeViolation[] = [];

  if (typeof obj === 'string') {
    INTERNAL_CODE_PATTERN.lastIndex = 0;
    const matches = obj.match(INTERNAL_CODE_PATTERN);
    if (matches) {
      for (const m of matches) {
        violations.push({
          file: filePath,
          keyPath: keyPrefix,
          matched: m,
          snippet: obj,
        });
      }
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      violations.push(...scanJsonObject(item, filePath, `${keyPrefix}[${idx}]`));
    });
  } else if (obj !== null && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = keyPrefix ? `${keyPrefix}.${k}` : k;
      violations.push(...scanJsonObject(v, filePath, fullKey));
    }
  }

  return violations;
}

/**
 * Xóa comments và data-testid để tránh false positive khi quét TSX/TS.
 */
export function sanitizeCodeForScan(code: string): string {
  // 1. Thay thế block comments {/* ... */} bằng khoảng trắng
  let clean = code.replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => ' '.repeat(m.length));

  // 2. Thay thế standard block comments /* ... */ bằng khoảng trắng
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));

  // 3. Thay thế single-line comments // ...
  clean = clean.replace(/\/\/.*$/gm, (m) => ' '.repeat(m.length));

  // 4. Bỏ data-testid="..." và data-testid='...' và data-testid={`...`}
  clean = clean.replace(/data-testid\s*=\s*\{`[^`]*`\}/g, (m) => ' '.repeat(m.length));
  clean = clean.replace(/data-testid\s*=\s*"[^"]*"/g, (m) => ' '.repeat(m.length));
  clean = clean.replace(/data-testid\s*=\s*'[^']*'/g, (m) => ' '.repeat(m.length));

  return clean;
}

/**
 * Quét file TSX/TS tìm chuỗi vi phạm trong JSX text hoặc chuỗi hiển thị.
 */
export function scanCodeFile(filePath: string): CodeViolation[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const sanitized = sanitizeCodeForScan(content);
  const lines = sanitized.split('\n');
  const rawLines = content.split('\n');
  const violations: CodeViolation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    INTERNAL_CODE_PATTERN.lastIndex = 0;
    const matches = line.match(INTERNAL_CODE_PATTERN);
    if (matches) {
      for (const m of matches) {
        violations.push({
          file: filePath,
          line: i + 1,
          matched: m,
          snippet: rawLines[i]?.trim() || '',
        });
      }
    }
  }

  return violations;
}

/**
 * Quét đệ quy thư mục
 */
export function scanDir(
  dirPath: string,
  onFile: (fullPath: string) => void,
): void {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name !== 'node_modules' &&
        entry.name !== '.next' &&
        entry.name !== 'tests' &&
        entry.name !== 'dist' &&
        entry.name !== '.turbo'
      ) {
        scanDir(full, onFile);
      }
    } else if (entry.isFile()) {
      onFile(full);
    }
  }
}

/**
 * Chạy toàn bộ kiểm tra không lộ mã tính năng nội bộ trên giao diện.
 */
export function runCheckNoInternalCodes(
  rootDir = process.cwd(),
  target: 'admin' | 'web' | 'all' = 'admin',
): {
  violations: CodeViolation[];
  passed: boolean;
} {
  const violations: CodeViolation[] = [];

  // 1. Quét translation messages
  const messageDirs: string[] = [];
  if (target === 'admin' || target === 'all') {
    messageDirs.push(path.join(rootDir, 'apps/admin/messages'));
  }
  if (target === 'web' || target === 'all') {
    messageDirs.push(path.join(rootDir, 'apps/web/messages'));
  }

  for (const msgDir of messageDirs) {
    scanDir(msgDir, (file) => {
      if (file.endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf8'));
          const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
          violations.push(...scanJsonObject(content, relPath));
        } catch {
          // Bỏ qua lỗi JSON parse nếu file chưa hoàn chỉnh
        }
      }
    });
  }

  // 2. Quét mã nguồn UI
  const targetDirs: string[] = [];
  if (target === 'admin' || target === 'all') {
    targetDirs.push(
      path.join(rootDir, 'apps/admin/app'),
      path.join(rootDir, 'apps/admin/components'),
      path.join(rootDir, 'apps/admin/features'),
    );
  }
  if (target === 'web' || target === 'all') {
    targetDirs.push(
      path.join(rootDir, 'apps/web/app'),
      path.join(rootDir, 'apps/web/components'),
      path.join(rootDir, 'apps/web/features'),
    );
  }

  for (const dir of targetDirs) {
    scanDir(dir, (file) => {
      const rel = path.relative(rootDir, file).replace(/\\/g, '/');
      if (
        (rel.endsWith('.tsx') || rel.endsWith('.ts')) &&
        !rel.includes('.test.') &&
        !rel.includes('.spec.')
      ) {
        violations.push(...scanCodeFile(file).map((v) => ({ ...v, file: rel })));
      }
    });
  }

  return {
    violations,
    passed: violations.length === 0,
  };
}

export function main(): void {
  const args = process.argv.slice(2);
  let target: 'admin' | 'web' | 'all' = 'admin';
  if (args.includes('--all')) {
    target = 'all';
  } else if (args.includes('--web')) {
    target = 'web';
  }

  console.log('===============================================================');
  console.log(` [check:no-internal-codes] Kiểm tra mã tính năng nội bộ UI (${target})`);
  console.log(' Tiêu chuẩn: Cấm mã dạng (ADM-01), (LIB-06)... trong UI & messages');
  console.log('===============================================================');

  const rootDir = process.cwd();
  const result = runCheckNoInternalCodes(rootDir, target);

  if (!result.passed) {
    console.error(`\n❌ PHÁT HIỆN ${result.violations.length} VI PHẠM MÃ TÍNH NĂNG NỘI BỘ:`);
    for (const v of result.violations) {
      if (v.keyPath) {
        console.error(`  - [Message] ${v.file} (Key: ${v.keyPath}): ${v.matched}`);
        console.error(`    Giá trị: ${v.snippet}`);
      } else {
        console.error(`  - [JSX/Code] ${v.file}:${v.line}: ${v.matched}`);
        console.error(`    Dòng: ${v.snippet}`);
      }
    }
    console.error('\nKiểm tra check:no-internal-codes KHÔNG ĐẠT!');
    process.exit(1);
  } else {
    console.log('\n✅ Không phát hiện mã tính năng nội bộ nào trong chuỗi dịch hoặc JSX text.');
    console.log('Kiểm tra check:no-internal-codes ĐẠT.');
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
