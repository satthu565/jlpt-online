#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const DIST_INDEX_PATH = path.join(REPO_ROOT, 'packages/content-tools/dist/index.js');

async function loadValidator() {
  if (!fs.existsSync(DIST_INDEX_PATH)) {
    // Attempt automatic build if dist is missing
    const buildProc = spawnSync('pnpm', ['--filter', '@jlpt/content-tools', 'build'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });
    if (!fs.existsSync(DIST_INDEX_PATH)) {
      console.error(
        'Lỗi: Chưa biên dịch @jlpt/content-tools (không tìm thấy tệp packages/content-tools/dist/index.js).\n' +
          'Vui lòng chạy "pnpm build" hoặc "pnpm --filter @jlpt/content-tools build" trước khi thực hiện kiểm tra gói.\n' +
          (buildProc.stderr || buildProc.stdout || ''),
      );
      return null;
    }
  }

  const mod = await import(pathToFileURL(DIST_INDEX_PATH).href);
  return mod.validatePackagePath;
}

function printUsage() {
  console.log(`
Sử dụng:
  node tools/import-data/bin/validate.js <duong-dan-goi> [--mode ready|draft]

Ví dụ:
  node tools/import-data/bin/validate.js fixtures/imports/ready
  node tools/import-data/bin/validate.js fixtures/imports/draft --mode draft
  node tools/import-data/bin/validate.js fixtures/imports/ready.zip
`);
}

async function main() {
  const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
  let packagePath = null;
  let mode = 'ready';

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      return 0;
    }
    if (arg === '--mode') {
      const nextArg = rawArgs[i + 1];
      if (nextArg === 'ready' || nextArg === 'draft') {
        mode = nextArg;
        i++;
      } else {
        console.error('Lỗi: --mode phải là "ready" hoặc "draft"');
        return 1;
      }
    } else if (arg.startsWith('--mode=')) {
      const val = arg.split('=')[1];
      if (val === 'ready' || val === 'draft') {
        mode = val;
      } else {
        console.error('Lỗi: --mode phải là "ready" hoặc "draft"');
        return 1;
      }
    } else if (!arg.startsWith('-') && !packagePath) {
      packagePath = arg;
    }
  }

  if (!packagePath) {
    console.error('Lỗi: Thiếu đường dẫn gói đề cần kiểm tra.');
    printUsage();
    return 1;
  }

  const resolvedPath = path.resolve(process.cwd(), packagePath);
  if (!fs.existsSync(resolvedPath)) {
    const errorResult = {
      valid: false,
      mode,
      readiness: 'INVALID',
      questionCount: 0,
      groupCount: 0,
      blockingIssueCount: 0,
      errors: [`Đường dẫn không tồn tại: ${packagePath}`],
      warnings: [],
      publicationApproved: false,
    };
    console.log(JSON.stringify(errorResult, null, 2));
    return 1;
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory() || (stat.isFile() && resolvedPath.endsWith('.zip'))) {
    const validatePackagePath = await loadValidator();
    if (validatePackagePath) {
      const result = validatePackagePath(resolvedPath, { mode });
      console.log(JSON.stringify(result, null, 2));
      return result.valid ? 0 : 1;
    }
  }

  // Fallback to python validator if TypeScript dist is not available
  const pythonScript = path.join(__dirname, '../validate_import.py');
  const proc = spawnSync('python3', [pythonScript, resolvedPath, '--mode', mode], {
    encoding: 'utf-8',
  });

  if (proc.stdout) {
    process.stdout.write(proc.stdout);
  }
  if (proc.stderr) {
    process.stderr.write(proc.stderr);
  }

  return proc.status ?? (proc.error ? 1 : 0);
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error('Lỗi thực thi:', err);
    process.exit(1);
  });
