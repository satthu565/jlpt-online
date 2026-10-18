import { HANVIET_DATA } from './hanviet-data.js';

const KANJI_CHAR_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const KANJI_GLOBAL_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf]/g;

/**
 * Tra cứu âm Hán Việt cho một chữ Kanji đơn lẻ.
 * Chuẩn hóa Unicode NFC và trả về dạng in hoa (ví dụ: 経 -> 'KINH', 済 -> 'TẾ').
 * Nếu Kanji không có trong dữ liệu Unihan kVietnamese hoặc truyền vào từ nhiều ký tự, trả về chuỗi rỗng '', không đoán mò.
 */
export function getHanVietForKanji(kanji: string): string {
  if (!kanji || typeof kanji !== 'string') return '';
  const normalized = kanji.normalize('NFC').trim();
  if (normalized.length === 0) return '';

  const chars = Array.from(normalized);
  if (chars.length !== 1) {
    return '';
  }

  const firstChar = chars[0];
  if (!firstChar || !KANJI_CHAR_REGEX.test(firstChar)) {
    return '';
  }

  const reading = (HANVIET_DATA.entries as Record<string, string>)[firstChar];
  if (!reading || typeof reading !== 'string') {
    return '';
  }

  return reading.normalize('NFC').toUpperCase();
}

/**
 * Tra cứu âm Hán Việt cho một từ vựng, ghép âm Hán Việt theo từng chữ Hán của từ.
 * Ví dụ:
 * - '経済' -> 'KINH TẾ'
 * - '食べる' -> 'THỰC' (chỉ ghép chữ Hán '食', bỏ qua hiragana 'べる')
 * - '打ち合わせ' -> 'ĐẢ HỢP' (chữ Hán '打', '合')
 * - 'さようなら' -> '' (từ thuần Kana không có chữ Hán -> trả rỗng)
 * - Chữ Hán không có dữ liệu -> để trống, không đoán; nếu cả từ không có chữ nào có dữ liệu -> trả rỗng.
 */
export function getHanVietForWord(word: string): string {
  if (!word || typeof word !== 'string') return '';
  const normalized = word.normalize('NFC').trim();
  if (normalized.length === 0) return '';

  const kanjiChars = normalized.match(KANJI_GLOBAL_REGEX);
  if (!kanjiChars || kanjiChars.length === 0) {
    return '';
  }

  const readings: string[] = [];
  for (const k of kanjiChars) {
    const r = getHanVietForKanji(k);
    if (r.length > 0) {
      readings.push(r);
    }
  }

  if (readings.length === 0) {
    return '';
  }

  return readings.join(' ').normalize('NFC');
}

/**
 * Kiểm tra xem một chữ Kanji hoặc từ vựng có dữ liệu âm Hán Việt hay không.
 */
export function hasHanVietData(text: string): boolean {
  return getHanVietForWord(text).length > 0;
}

/**
 * Trả về thông tin bản quyền và nguồn trích xuất dữ liệu âm Hán Việt.
 */
export function getHanVietLicenseInfo() {
  const metadata = HANVIET_DATA.metadata;
  return {
    ...metadata,
    entryCount: metadata.totalEntries ?? Object.keys(HANVIET_DATA.entries).length,
  };
}
