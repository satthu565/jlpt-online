#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function printUsage() {
  console.log(`
Sử dụng:
  node tools/import-data/bin/pack.js <thu-muc-goi> [ten-file-nen.zip]

Ví dụ:
  node tools/import-data/bin/pack.js fixtures/imports/ready de-n5.zip
`);
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    return 0;
  }

  const sourceDir = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    console.error(`Lỗi: Thư mục nguồn không tồn tại: ${args[0]}`);
    return 1;
  }

  const importJsonPath = path.join(sourceDir, 'import.json');
  if (!fs.existsSync(importJsonPath)) {
    console.error(`Lỗi: Thư mục không có import.json ở gốc: ${sourceDir}`);
    return 1;
  }

  const outputZip = args[1]
    ? path.resolve(process.cwd(), args[1])
    : path.resolve(process.cwd(), `${path.basename(sourceDir)}.zip`);

  // Create zip using Python zipfile
  const pythonScript = `
import sys, zipfile
from pathlib import Path
source = Path(sys.argv[1]).resolve()
dest = Path(sys.argv[2]).resolve()
dest.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as z:
    for file in sorted(source.rglob('*')):
        if file.is_file():
            rel = file.relative_to(source).as_posix()
            z.write(file, rel)
print(f"Đã đóng gói thành công: {dest}")
`;

  const proc = spawnSync('python3', ['-c', pythonScript, sourceDir, outputZip], {
    encoding: 'utf-8',
  });

  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);

  return proc.status ?? (proc.error ? 1 : 0);
}

process.exit(main());
