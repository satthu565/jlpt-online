#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

const ONYOMI_TSV = path.join(REPO_ROOT, 'tools/import-data/data/hanviet-onyomi.tsv');
const PRIMARY_TSV = path.join(REPO_ROOT, 'tools/import-data/data/hanviet-primary.tsv');
const OVERRIDES_TSV = path.join(REPO_ROOT, 'tools/import-data/data/hanviet-word-overrides.tsv');
const OUT_TS = path.join(REPO_ROOT, 'packages/content-tools/src/nlp/hanviet-tables.ts');

export function packHanVietTables() {
  const onyomiLines = fs.readFileSync(ONYOMI_TSV, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const primaryLines = fs.readFileSync(PRIMARY_TSV, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const overrideLines = fs.readFileSync(OVERRIDES_TSV, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);

  const onyomiTable = {};
  for (const line of onyomiLines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const kanji = parts[0]?.trim();
    const on = parts[1]?.trim();
    const hv = parts[2]?.trim().toUpperCase().normalize('NFC');
    if (!kanji || !on) continue;
    if (!onyomiTable[kanji]) {
      onyomiTable[kanji] = {};
    }
    onyomiTable[kanji][on] = hv;
  }

  const primaryTable = {};
  for (const line of primaryLines) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const kanji = parts[0]?.trim();
    const hv = parts[1]?.trim().toUpperCase().normalize('NFC');
    if (kanji && hv) {
      primaryTable[kanji] = hv;
    }
  }

  const wordOverrides = {};
  for (const line of overrideLines) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const term = parts[0]?.trim();
    const hv = parts[1]?.trim().toUpperCase().normalize('NFC');
    const reason = parts[2]?.trim() || '';
    if (term && hv) {
      wordOverrides[term] = { hanViet: hv, reason };
    }
  }

  const content = `// Auto-generated from tools/import-data/data/ TSV files (Task H01) - DO NOT EDIT DIRECTLY

export interface HanVietOverrideEntry {
  hanViet: string;
  reason: string;
}

/** Bảng âm On của 2.136 chữ Jōyō: kanji -> { onReading: hanVietReading } */
export const HANVIET_ONYOMI_TABLE: Record<string, Record<string, string>> = ${JSON.stringify(onyomiTable, null, 2)};

/** Bảng một âm chính cho mỗi chữ: kanji -> hanViet */
export const HANVIET_PRIMARY_TABLE: Record<string, string> = ${JSON.stringify(primaryTable, null, 2)};

/** Bảng ngoại lệ theo nghĩa (từ vựng JLPT): term -> { hanViet, reason } */
export const HANVIET_WORD_OVERRIDES: Record<string, HanVietOverrideEntry> = ${JSON.stringify(wordOverrides, null, 2)};

/** Danh sách chữ Hán đổi âm theo nghĩa: khi gặp chữ trong danh sách mà không có trong ngoại lệ -> review */
export const MEANING_DEPENDENT_KANJI: ReadonlySet<string> = new Set([
  '長', '行', '重', '楽', '易', '悪', '説', '画', '分', '降',
  '処', '著', '卒', '質', '創', '丁', '読', '否', '塞', '仮',
  '正', '生', '伝', '担', '結', '便', '復'
]);
`;

  fs.writeFileSync(OUT_TS, content, 'utf8');
  console.log(`Đã xuất bảng Hán Việt sang ${OUT_TS}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  packHanVietTables();
}
