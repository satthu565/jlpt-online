#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

const TSV_PATH = path.join(REPO_ROOT, 'tools/import-data/data/hanviet-onyomi.tsv');
const JOYO_PATH = path.join(REPO_ROOT, 'tools/import-data/data/joyo-kanji.json');

export function checkHanVietOnyomiCoverage() {
  if (!fs.existsSync(TSV_PATH)) {
    throw new Error(`File TSV không tồn tại: ${TSV_PATH}`);
  }
  if (!fs.existsSync(JOYO_PATH)) {
    throw new Error(`File danh sách Joyo không tồn tại: ${JOYO_PATH}`);
  }

  const joyoData = JSON.parse(fs.readFileSync(JOYO_PATH, 'utf8'));
  const tsvContent = fs.readFileSync(TSV_PATH, 'utf8');

  // Parse TSV: kanji \t onyomi \t hanViet \t note
  const lines = tsvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const coveredMap = new Map(); // kanji -> Map<onyomi, hanViet>
  const coveredKanjiSet = new Set();

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const kanji = parts[0]?.trim();
    const onyomi = parts[1]?.trim();
    const hanViet = parts[2]?.trim();
    if (!kanji) continue;

    coveredKanjiSet.add(kanji);
    if (!coveredMap.has(kanji)) {
      coveredMap.set(kanji, new Map());
    }
    if (onyomi && onyomi !== '-') {
      coveredMap.get(kanji).set(onyomi, hanViet);
    }
  }

  const missingKanji = [];
  const missingReadings = [];

  for (const item of joyoData) {
    const k = item.kanji;
    if (!coveredKanjiSet.has(k)) {
      missingKanji.push(k);
      continue;
    }

    const onMap = coveredMap.get(k) || new Map();
    for (const on of item.onyomi || []) {
      const hv = onMap.get(on);
      if (!hv || hv.trim().length === 0) {
        missingReadings.push({ kanji: k, onyomi: on });
      }
    }
  }

  const isSuccess = missingKanji.length === 0 && missingReadings.length === 0;

  console.log(`Kiểm tra hanviet-onyomi.tsv với toàn bộ ${joyoData.length} chữ Jōyō:`);
  console.log(`- Số chữ Jōyō được phủ: ${coveredKanjiSet.size}/${joyoData.length}`);
  console.log(`- Số chữ thiếu: ${missingKanji.length}`);
  console.log(`- Số âm On thiếu: ${missingReadings.length}`);

  if (!isSuccess) {
    if (missingKanji.length > 0) {
      console.error(`Các chữ thiếu (${missingKanji.length}):`, missingKanji.slice(0, 20));
    }
    if (missingReadings.length > 0) {
      console.error(`Các âm On thiếu (${missingReadings.length}):`, missingReadings.slice(0, 20));
    }
    return { success: false, missingKanji, missingReadings };
  }

  console.log('hanviet-onyomi.tsv phủ mọi âm On của 2.136 chữ Jōyō; script kiểm tra báo 0 chữ thiếu.');
  return { success: true, missingKanji: [], missingReadings: [] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const res = checkHanVietOnyomiCoverage();
  if (!res.success) {
    process.exit(1);
  }
}
