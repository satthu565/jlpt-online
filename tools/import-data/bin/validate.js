#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validatePackagePath } from '../../../packages/content-tools/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function main() {
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
  if (stat.isDirectory()) {
    const result = validatePackagePath(resolvedPath, { mode });
    console.log(JSON.stringify(result, null, 2));
    return result.valid ? 0 : 1;
  }

  // If it is a zip file, run python validator
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

process.exit(main());
