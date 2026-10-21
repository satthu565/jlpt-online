import { HANVIET_DATA } from './hanviet-data.js';
import {
  HANVIET_ONYOMI_TABLE,
  HANVIET_PRIMARY_TABLE,
  HANVIET_WORD_OVERRIDES,
  MEANING_DEPENDENT_KANJI,
} from './hanviet-tables.js';

const KANJI_CHAR_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf]/;

export interface HanVietPerKanji {
  kanji: string;
  onyomi?: string;
  hanViet: string;
}

export interface HanVietComputationResult {
  hanViet: string;
  perKanji: HanVietPerKanji[];
  confidence: 'high' | 'review' | 'kun';
  source: 'override' | 'rule';
}

/**
 * Chuyển Hiragana sang Katakana
 */
export function hiraganaToKatakana(str: string): string {
  if (!str) return '';
  return str.replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

/**
 * Bảng biến âm tiếng Nhật:
 * - Đục hóa (Rendaku): カ->ガ, サ->ザ, タ->ダ, ハ->バ/パ
 * - Bán đục hóa (Handakuon): ハ->パ
 * - Âm ngắt (Sokuon): tận cùng ク/キ/ツ/チ -> ッ
 */
function getPhoneticRealizations(on: string): string[] {
  const forms = new Set<string>();
  forms.add(on);

  const firstChar = on[0];
  const rest = on.slice(1);

  // Rendaku (đục hóa)
  const dakuonMap: Record<string, string> = {
    カ: 'ガ', キ: 'ギ', ク: 'グ', ケ: 'ゲ', コ: 'ゴ',
    サ: 'ザ', シ: 'ジ', ス: 'ズ', セ: 'ゼ', ソ: 'ゾ',
    タ: 'ダ', チ: 'ヂ', ツ: 'ヅ', テ: 'デ', ト: 'ド',
    ハ: 'バ', ヒ: 'ビ', フ: 'ブ', ヘ: 'ベ', ホ: 'ボ',
  };
  // Handakuon (bán đục hóa)
  const handakuonMap: Record<string, string> = {
    ハ: 'パ', ヒ: 'ピ', フ: 'プ', ヘ: 'ペ', ホ: 'ポ',
  };

  if (firstChar && dakuonMap[firstChar]) {
    forms.add(dakuonMap[firstChar] + rest);
  }
  if (firstChar && handakuonMap[firstChar]) {
    forms.add(handakuonMap[firstChar] + rest);
  }

  // Âm ngắt (Sokuon gemination): biến âm cuối thành ッ
  // Áp dụng cho cả dạng gốc và dạng biến âm đầu
  const currentForms = Array.from(forms);
  for (const f of currentForms) {
    const lastChar = f[f.length - 1] ?? '';
    if (['ク', 'キ', 'ツ', 'チ'].includes(lastChar)) {
      forms.add(f.slice(0, -1) + 'ッ');
    }
  }

  return Array.from(forms);
}

interface MatchStep {
  kanji: string;
  onyomi: string;
  hanViet: string;
}

/**
 * Thử tách reading theo từng chữ Kanji trong term bằng các âm On và biến âm.
 */
function matchReadingByOnyomi(
  termChars: string[],
  termIdx: number,
  reading: string,
  readIdx: number,
  acc: MatchStep[],
): MatchStep[] | null {
  if (termIdx === termChars.length) {
    return readIdx === reading.length ? acc : null;
  }

  const char = termChars[termIdx]!;

  // Ký tự Kana (okurigana, kana trong từ ghép)
  if (!KANJI_CHAR_REGEX.test(char)) {
    const charKata = hiraganaToKatakana(char);
    if (reading.startsWith(charKata, readIdx)) {
      return matchReadingByOnyomi(termChars, termIdx + 1, reading, readIdx + charKata.length, acc);
    }
    return null;
  }

  // Ký tự Kanji
  const onMap = HANVIET_ONYOMI_TABLE[char];
  if (!onMap) {
    return null;
  }

  for (const [on, hv] of Object.entries(onMap)) {
    if (!on || on === '-') continue;
    const realizations = getPhoneticRealizations(on);
    for (const form of realizations) {
      if (reading.startsWith(form, readIdx)) {
        const nextAcc = [...acc, { kanji: char, onyomi: on, hanViet: hv }];
        const result = matchReadingByOnyomi(termChars, termIdx + 1, reading, readIdx + form.length, nextAcc);
        if (result) {
          return result;
        }
      }
    }
  }

  return null;
}

/**
 * Thuật toán tính âm Hán Việt và độ tin cậy theo 3 lớp (Task H01):
 * LỚP 1: Bảng chữ + âm On (hanviet-onyomi.tsv, hanviet-primary.tsv)
 * LỚP 2: Ngoại lệ theo nghĩa (hanviet-word-overrides.tsv)
 * LỚP 3: Thuật toán nhận diện reading và độ tin cậy:
 *   (a) Có trong ngoại lệ -> confidence: high, source: override
 *   (b) Khớp reading bằng âm On -> confidence: high (hoặc review nếu có chữ trong danh sách đổi âm theo nghĩa), source: rule
 *   (c) Đọc âm Kun (không khớp âm On) -> ghép âm chính, confidence: kun, source: rule
 *   Chữ không có trong bảng -> để trống '', confidence: review
 */
export function computeHanViet(term: string, reading?: string): HanVietComputationResult {
  if (!term || typeof term !== 'string') {
    return { hanViet: '', perKanji: [], confidence: 'review', source: 'rule' };
  }

  const normalizedTerm = term.normalize('NFC').trim();
  if (normalizedTerm.length === 0) {
    return { hanViet: '', perKanji: [], confidence: 'review', source: 'rule' };
  }

  const termChars = Array.from(normalizedTerm);
  const kanjiChars = termChars.filter((c) => KANJI_CHAR_REGEX.test(c));

  if (kanjiChars.length === 0) {
    return { hanViet: '', perKanji: [], confidence: 'review', source: 'rule' };
  }

  // (a) Lớp 2: Kiểm tra ngoại lệ theo nghĩa
  const override = HANVIET_WORD_OVERRIDES[normalizedTerm];
  if (override) {
    const tokens = override.hanViet.split(/\s+/).filter(Boolean);
    const perKanji: HanVietPerKanji[] = [];

    kanjiChars.forEach((k, idx) => {
      const hvPart = tokens[idx] || '';
      // Tìm âm On khớp với âm Hán Việt này
      const onMap = HANVIET_ONYOMI_TABLE[k];
      let matchedOn: string | undefined;
      if (onMap) {
        for (const [on, hv] of Object.entries(onMap)) {
          if (hv === hvPart) {
            matchedOn = on;
            break;
          }
        }
        if (!matchedOn) {
          matchedOn = Object.keys(onMap)[0];
        }
      }
      perKanji.push({
        kanji: k,
        onyomi: matchedOn,
        hanViet: hvPart || HANVIET_PRIMARY_TABLE[k] || '',
      });
    });

    return {
      hanViet: override.hanViet,
      perKanji,
      confidence: 'high',
      source: 'override',
    };
  }

  // (b) Lớp 3: Tách reading bằng âm On
  const normalizedReading = (reading || '').normalize('NFC').trim();
  if (normalizedReading.length > 0) {
    const kataReading = hiraganaToKatakana(normalizedReading);
    const matchedSteps = matchReadingByOnyomi(termChars, 0, kataReading, 0, []);

    if (matchedSteps && matchedSteps.length === kanjiChars.length) {
      const perKanji: HanVietPerKanji[] = matchedSteps.map((s) => ({
        kanji: s.kanji,
        onyomi: s.onyomi,
        hanViet: s.hanViet,
      }));

      const hanViet = perKanji.map((p) => p.hanViet).join(' ').normalize('NFC');

      // Nếu có chữ thuộc danh sách "đổi âm theo nghĩa" mà từ không nằm trong ngoại lệ -> review
      const hasMeaningDependent = kanjiChars.some((k) => MEANING_DEPENDENT_KANJI.has(k));
      const confidence = hasMeaningDependent ? 'review' : 'high';

      return {
        hanViet,
        perKanji,
        confidence,
        source: 'rule',
      };
    }
  }

  // (c) Đọc âm Kun hoặc không tách được bằng âm On: ghép âm chính của chữ
  let missingAny = false;
  const perKanji: HanVietPerKanji[] = [];

  for (const k of kanjiChars) {
    const primary = HANVIET_PRIMARY_TABLE[k] || (HANVIET_DATA.entries as Record<string, string>)[k];
    if (!primary || typeof primary !== 'string' || primary.trim().length === 0) {
      missingAny = true;
      perKanji.push({ kanji: k, hanViet: '' });
    } else {
      perKanji.push({ kanji: k, hanViet: primary.normalize('NFC').toUpperCase() });
    }
  }

  if (missingAny) {
    return {
      hanViet: '',
      perKanji,
      confidence: 'review',
      source: 'rule',
    };
  }

  return {
    hanViet: perKanji.map((p) => p.hanViet).join(' ').normalize('NFC'),
    perKanji,
    confidence: 'kun',
    source: 'rule',
  };
}

/**
 * Tra cứu âm Hán Việt cho một chữ Kanji đơn lẻ.
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

  const primary = HANVIET_PRIMARY_TABLE[firstChar] || (HANVIET_DATA.entries as Record<string, string>)[firstChar];
  if (!primary || typeof primary !== 'string') {
    return '';
  }

  return primary.normalize('NFC').toUpperCase();
}

/**
 * Tra cứu âm Hán Việt cho một từ vựng.
 * Tận dụng computeHanViet để tính âm chính xác theo ngữ nghĩa và cách đọc.
 */
export function getHanVietForWord(word: string, reading?: string): string {
  if (!word || typeof word !== 'string') return '';
  const res = computeHanViet(word, reading);
  return res.hanViet;
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

/**
 * Âm Hán Việt theo từng âm On của một chữ (bảng lớp 1 của H01), ví dụ 楽 -> [ガク NHẠC, ラク LẠC].
 * Chữ ngoài 2.136 chữ Jōyō trả mảng rỗng.
 */
export function getHanVietByOnyomi(kanji: string): Array<{ onyomi: string; hanViet: string }> {
  const onMap = HANVIET_ONYOMI_TABLE[kanji];
  if (!onMap) return [];
  return Object.entries(onMap)
    .filter(([on, hv]) => on && on !== '-' && hv)
    .map(([onyomi, hanViet]) => ({ onyomi, hanViet }));
}
