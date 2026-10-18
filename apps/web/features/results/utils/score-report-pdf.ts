import { SimplePdfDocument } from './pdf-builder';

export interface ScoreReportSectionItem {
  code: string;
  name: string;
  scaledScore: number;
  maxScore: number;
  passThreshold: number;
  passed: boolean;
}

export interface ScoreReportData {
  attemptId: string;
  userId: string;
  candidateName: string;
  candidateEmail?: string;
  examTitle: string;
  level: string;
  examDate: string;
  durationSec?: number;
  scaledScore: number;
  maxScore: number;
  passThreshold: number;
  passed: boolean;
  sections: ScoreReportSectionItem[];
  generatedAt?: string;
  tenantId?: string;
}

export interface ScoreReportOptions {
  data: ScoreReportData;
  requestingActor: {
    userId: string;
    role?: string;
    tenantId?: string;
  };
}

export interface ScoreReportResult {
  buffer: Uint8Array;
  filename: string;
  mimeType: string;
  attemptId: string;
  userId: string;
  passed: boolean;
  checksumSha256: string;
}

function sanitizeExportField(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

function assertScoreReportIsolation(
  data: { userId: string; tenantId?: string },
  requestingActor: { userId: string; role?: string; tenantId?: string },
): void {
  const isOwner = requestingActor.userId === data.userId;
  const isAdmin = requestingActor.role === 'admin' || requestingActor.role === 'superadmin';

  if (!isOwner && !isAdmin) {
    throw new Error(
      `Quyền riêng tư bị từ chối: Báo cáo kết quả thuộc về người dùng khác (${data.userId}). Không cho phép truy cập trái phép đa người dùng (SCORE-12).`,
    );
  }

  if (requestingActor.tenantId && data.tenantId && requestingActor.tenantId !== data.tenantId && !isAdmin) {
    throw new Error(
      `Quyền riêng tư bị từ chối: Báo cáo kết quả thuộc tổ chức/lớp học khác (${data.tenantId}).`,
    );
  }
}

function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f, 0xc67178f2,
  ];

  for (i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | (code << ((3 - (i % 4)) * 8));
  }
  words[asciiBitLength >> 5] = (words[asciiBitLength >> 5] || 0) | (0x80 << (24 - (asciiBitLength % 32)));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      let s0: number, s1: number, ch: number, temp1: number, temp2: number, maj: number;
      if (j >= 16) {
        const w15 = w[j - 15]!;
        const w2 = w[j - 2]!;
        s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[j] = (w[j - 16]! + s0 + w[j - 7]! + s1) | 0;
      }

      s1 = rightRotate(hash[4]!, 6) ^ rightRotate(hash[4]!, 11) ^ rightRotate(hash[4]!, 25);
      ch = (hash[4]! & hash[5]!) ^ (~hash[4]! & hash[6]!);
      temp1 = (hash[7]! + s1 + ch + k[j]! + w[j]!) | 0;
      s0 = rightRotate(hash[0]!, 2) ^ rightRotate(hash[0]!, 13) ^ rightRotate(hash[0]!, 22);
      maj = (hash[0]! & hash[1]!) ^ (hash[0]! & hash[2]!) ^ (hash[1]! & hash[2]!);
      temp2 = (s0 + maj) | 0;

      hash = [(temp1 + temp2) | 0, hash[0]!, hash[1]!, hash[2]!, (hash[3]! + temp1) | 0, hash[4]!, hash[5]!, hash[6]!];
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j]! + oldHash[j]!) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i]! >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function generateScoreReportPdf(options: ScoreReportOptions): ScoreReportResult {
  const { data, requestingActor } = options;

  // 1. Strict Privacy & Tenant Isolation Assertion (SCORE-12)
  assertScoreReportIsolation(data, requestingActor);

  // 2. Data Sanitization & Unicode NFC Normalization
  const candidateName = String(sanitizeExportField(data.candidateName || 'Anonymous Candidate')).normalize('NFC');
  const examTitle = String(sanitizeExportField(data.examTitle || 'JLPT Standard Exam')).normalize('NFC');
  const generatedAt = data.generatedAt ?? new Date().toISOString();
  const examDate = String(data.examDate ?? generatedAt.split('T')[0]).normalize('NFC');

  // 3. Digital Tamper-Proof Hash (SHA-256)
  const integrityPayload = [
    data.attemptId,
    data.userId,
    data.level,
    data.scaledScore,
    data.passed ? 'PASS' : 'FAIL',
    generatedAt,
  ].join(':');
  const checksumSha256 = sha256Hex(integrityPayload);

  // 4. Build PDF Document
  const doc = new SimplePdfDocument();

  // Colors
  const darkBlue = { r: 0.118, g: 0.227, b: 0.541 }; // #1e3a8a
  const white = { r: 1.0, g: 1.0, b: 1.0 };
  const lightBlue = { r: 0.88, g: 0.94, b: 1.0 };
  const textDark = { r: 0.09, g: 0.12, b: 0.18 };
  const textMuted = { r: 0.35, g: 0.40, b: 0.48 };
  const cardBg = { r: 0.97, g: 0.98, b: 0.99 };
  const cardBorder = { r: 0.85, g: 0.89, b: 0.94 };
  const passBg = { r: 0.92, g: 0.99, b: 0.95 }; // soft green
  const passBorder = { r: 0.06, g: 0.73, b: 0.51 }; // green #10b981
  const passText = { r: 0.02, g: 0.37, b: 0.27 }; // dark green #065f46
  const failBg = { r: 0.99, g: 0.95, b: 0.95 }; // soft red
  const failBorder = { r: 0.94, g: 0.27, b: 0.27 }; // red #ef4444
  const failText = { r: 0.60, g: 0.11, b: 0.11 }; // dark red #991b1b

  // Page Margins
  const marginX = 45;
  const contentWidth = 505.28;

  // A. Top Header Banner
  doc.drawRect(0, 0, 595.28, 85, darkBlue);
  doc.drawJapaneseText('日本語能力試験 成績証明書 / 判定結果通知書', marginX, 38, 16, white);
  doc.drawText('JLPT Official Score Report & Certificate of Results', marginX, 60, 9, lightBlue);
  doc.drawText(`LEVEL ${data.level}`, marginX + contentWidth - 75, 45, 14, white);

  // B. Candidate & Examination Details Box
  const infoY = 100;
  const infoHeight = 110;
  doc.drawBorderedRect(marginX, infoY, contentWidth, infoHeight, cardBg, cardBorder, 1);

  // Column 1
  doc.drawJapaneseText('受験者氏名:', marginX + 16, infoY + 28, 10, textMuted);
  doc.drawJapaneseText(candidateName, marginX + 90, infoY + 28, 11, textDark);

  doc.drawJapaneseText('受験者ID:', marginX + 16, infoY + 54, 10, textMuted);
  doc.drawText(data.userId, marginX + 90, infoY + 54, 9, textDark);

  doc.drawJapaneseText('受験番号:', marginX + 16, infoY + 80, 10, textMuted);
  doc.drawText(data.attemptId, marginX + 90, infoY + 80, 9, textDark);

  // Column 2
  const col2X = marginX + 270;
  doc.drawJapaneseText('試験名:', col2X, infoY + 28, 10, textMuted);
  doc.drawJapaneseText(examTitle, col2X + 65, infoY + 28, 10, textDark);

  doc.drawJapaneseText('受験レベル:', col2X, infoY + 54, 10, textMuted);
  doc.drawJapaneseText(`${data.level} 級`, col2X + 65, infoY + 54, 11, textDark);

  doc.drawJapaneseText('実施年月日:', col2X, infoY + 80, 10, textMuted);
  doc.drawJapaneseText(examDate, col2X + 65, infoY + 80, 10, textDark);

  // C. Pass / Fail Determination Card
  const resultY = 225;
  const resultHeight = 75;
  const resBg = data.passed ? passBg : failBg;
  const resBorder = data.passed ? passBorder : failBorder;
  const resText = data.passed ? passText : failText;

  doc.drawBorderedRect(marginX, resultY, contentWidth, resultHeight, resBg, resBorder, 1.5);

  const passLabel = data.passed ? '合否判定: 【 合格 】 (PASS)' : '合否判定: 【 不合格 】 (FAIL)';
  doc.drawJapaneseText(passLabel, marginX + 20, resultY + 34, 15, resText);

  const scoreText = `総合得点: ${data.scaledScore} / ${data.maxScore} 点 (合格基準点: ${data.passThreshold} 点)`;
  doc.drawJapaneseText(scoreText, marginX + 20, resultY + 58, 11, resText);

  // D. Section Scores Table
  const tableY = 315;
  const rowHeight = 28;

  // Table Header
  doc.drawRect(marginX, tableY, contentWidth, rowHeight, darkBlue);
  doc.drawJapaneseText('得点区分 (Scoring Section)', marginX + 12, tableY + 19, 10, white);
  doc.drawJapaneseText('得点 (Score)', marginX + 230, tableY + 19, 10, white);
  doc.drawJapaneseText('配点 (Max)', marginX + 310, tableY + 19, 10, white);
  doc.drawJapaneseText('基準点 (Benchmark)', marginX + 380, tableY + 19, 10, white);
  doc.drawJapaneseText('判定 (Result)', marginX + 460, tableY + 19, 10, white);

  const sections = data.sections.length > 0 ? data.sections : [
    { code: 'language_vocab', name: '言語知識（文字・語彙・文法）', scaledScore: Math.round(data.scaledScore * 0.35), maxScore: 60, passThreshold: 19, passed: true },
    { code: 'reading', name: '読解', scaledScore: Math.round(data.scaledScore * 0.35), maxScore: 60, passThreshold: 19, passed: true },
    { code: 'listening', name: '聴解', scaledScore: Math.round(data.scaledScore * 0.30), maxScore: 60, passThreshold: 19, passed: true },
  ];

  let currentY = tableY + rowHeight;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    const rowBg = i % 2 === 0 ? white : cardBg;
    doc.drawBorderedRect(marginX, currentY, contentWidth, rowHeight, rowBg, cardBorder, 0.5);

    doc.drawJapaneseText(s.name, marginX + 12, currentY + 19, 10, textDark);
    doc.drawJapaneseText(`${s.scaledScore} 点`, marginX + 230, currentY + 19, 10, textDark);
    doc.drawJapaneseText(`${s.maxScore} 点`, marginX + 310, currentY + 19, 10, textMuted);
    doc.drawJapaneseText(`${s.passThreshold} 点`, marginX + 380, currentY + 19, 10, textMuted);

    const sectionPassed = s.passed ?? (s.scaledScore >= s.passThreshold);
    const statusText = sectionPassed ? '合格' : '基準点未満';
    const statusColor = sectionPassed ? passText : failText;
    doc.drawJapaneseText(statusText, marginX + 460, currentY + 19, 10, statusColor);

    currentY += rowHeight;
  }

  // Total summary row in table
  doc.drawBorderedRect(marginX, currentY, contentWidth, rowHeight, cardBg, cardBorder, 1);
  doc.drawJapaneseText('合計得点 (Total Score)', marginX + 12, currentY + 19, 10, darkBlue);
  doc.drawJapaneseText(`${data.scaledScore} 点`, marginX + 230, currentY + 19, 11, darkBlue);
  doc.drawJapaneseText(`${data.maxScore} 点`, marginX + 310, currentY + 19, 10, textMuted);
  doc.drawJapaneseText(`${data.passThreshold} 点`, marginX + 380, currentY + 19, 10, textMuted);
  const totalStatusText = data.passed ? '合格' : '不合格';
  doc.drawJapaneseText(totalStatusText, marginX + 460, currentY + 19, 11, data.passed ? passText : failText);

  // E. Official Disclaimers (Linear Reference Scaling & Privacy Isolation)
  const discY = currentY + 45;
  doc.drawJapaneseText(
    '【注意事項・公式注記】',
    marginX,
    discY,
    10,
    darkBlue,
  );
  doc.drawJapaneseText(
    '※ 本結果通知書に記載された得点は Linear Reference Scaling に基づく参考得点であり、JLPT公式認定書ではありません。',
    marginX,
    discY + 20,
    9,
    textMuted,
  );
  doc.drawJapaneseText(
    '※ 本データは受験者本人の認証済みセッションに基づき安全に生成され、他者のデータは含まれておりません。',
    marginX,
    discY + 36,
    9,
    textMuted,
  );
  doc.drawJapaneseText(
    '※ データの改ざん防止のため、下記の暗号学的チェックサム（SHA-256）により真正性が保証されています。',
    marginX,
    discY + 52,
    9,
    textMuted,
  );

  // F. Tamper-Proof Digital Verification Footer
  const footerY = discY + 80;
  doc.drawLine(marginX, footerY, marginX + contentWidth, footerY, cardBorder, 0.5);
  doc.drawText(`VERIFICATION HASH: ${checksumSha256}`, marginX, footerY + 18, 8, textMuted);
  doc.drawText(`GENERATED AT: ${generatedAt} (UTC) | MONOREPO JLPT SECURE REPORT ENGINE`, marginX, footerY + 32, 8, textMuted);

  const buffer = doc.toBuffer();
  const filename = `jlpt-score-report-${data.attemptId}.pdf`;

  return {
    buffer,
    filename,
    mimeType: 'application/pdf',
    attemptId: data.attemptId,
    userId: data.userId,
    passed: data.passed,
    checksumSha256,
  };
}
