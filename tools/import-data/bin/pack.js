#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const DIST_INDEX_PATH = path.join(REPO_ROOT, 'packages/content-tools/dist/index.js');

async function loadZipPacker() {
  if (fs.existsSync(DIST_INDEX_PATH)) {
    try {
      const mod = await import(pathToFileURL(DIST_INDEX_PATH).href);
      if (typeof mod.createZipBuffer === 'function') {
        return mod.createZipBuffer;
      }
    } catch {
      // Fallback to python
    }
  }
  return null;
}

function getAllFiles(dirPath, baseDir = dirPath) {
  const result = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      result.push(...getAllFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      result.push({ name: relPath, fullPath });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function printUsage() {
  console.log(`
Sử dụng:
  node tools/import-data/bin/pack.js <thu-muc-goi> [ten-file-nen.zip]

Ví dụ:
  node tools/import-data/bin/pack.js fixtures/imports/ready de-n5.zip
`);
}

async function main() {
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

  fs.mkdirSync(path.dirname(outputZip), { recursive: true });

  const createZipBuffer = await loadZipPacker();
  if (createZipBuffer) {
    try {
      const filesList = getAllFiles(sourceDir);
      const zipEntries = filesList.map((f) => ({
        name: f.name,
        data: fs.readFileSync(f.fullPath),
      }));
      const zipBuf = createZipBuffer(zipEntries);
      fs.writeFileSync(outputZip, zipBuf);
      console.log(`Đã đóng gói thành công: ${outputZip}`);
      return 0;
    } catch (err) {
      console.warn(`Cảnh báo Node packer: ${err}; chuyển sang Python zipfile fallback...`);
    }
  }

  // Fallback: Create zip using Python zipfile
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

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error('Lỗi đóng gói:', err);
    process.exit(1);
  });
