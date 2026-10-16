import crypto from 'node:crypto';
import type { Level, MondaiType, Skill } from '@jlpt/schema';
import { StandalonePdfError, ImportValidationError } from './types';

export interface PackageValidationInput {
  files: Record<string, Uint8Array>;
  fileName: string;
}

export interface PackageValidationOutput {
  valid: boolean;
  packageJson: Record<string, unknown>;
  contentHash: string;
  errors: string[];
  warnings: string[];
  blockingIssueCount: number;
  nonBlockingIssueCount: number;
}

const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

/**
 * Detects whether the uploaded file is a standalone PDF.
 * Enforces acceptance criterion:
 * "Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không khởi động đọc file"
 */
export function assertNotStandalonePdf(buffer: Uint8Array | Buffer, fileName: string): void {
  const isPdfExtension = fileName.trim().toLowerCase().endsWith('.pdf');
  const hasPdfMagic =
    buffer.length >= 4 &&
    buffer[0] === PDF_MAGIC_BYTES[0] &&
    buffer[1] === PDF_MAGIC_BYTES[1] &&
    buffer[2] === PDF_MAGIC_BYTES[2] &&
    buffer[3] === PDF_MAGIC_BYTES[3];

  if (isPdfExtension || hasPdfMagic) {
    throw new StandalonePdfError(
      'Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không khởi động đọc file. Không thực hiện OCR hoặc bóc tách tự động.',
    );
  }
}

/**
 * Validates package contents against JLPT Import v2 specification.
 */
export function validateImportV2Package(input: PackageValidationInput): PackageValidationOutput {
  const { files, fileName } = input;
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Must contain import.json
  const importJsonBytes = files['import.json'];
  if (!importJsonBytes) {
    errors.push('Gói nhập thiếu tệp import.json ở thư mục gốc.');
    return {
      valid: false,
      packageJson: {},
      contentHash: '',
      errors,
      warnings,
      blockingIssueCount: 1,
      nonBlockingIssueCount: 0,
    };
  }

  // 2. Parse import.json UTF-8
  let parsed: Record<string, unknown>;
  try {
    const text = new TextDecoder('utf-8').decode(importJsonBytes);
    parsed = JSON.parse(text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`import.json không phải định dạng JSON hợp lệ: ${msg}`);
    return {
      valid: false,
      packageJson: {},
      contentHash: '',
      errors,
      warnings,
      blockingIssueCount: 1,
      nonBlockingIssueCount: 0,
    };
  }

  // 3. Schema & version validation
  if (parsed['formatVersion'] !== 2) {
    errors.push(`formatVersion phải là 2, nhận được: ${String(parsed['formatVersion'])}`);
  }

  if (typeof parsed['packageId'] !== 'string' || !parsed['packageId'].trim()) {
    errors.push('Thiếu trường packageId hợp lệ trong import.json.');
  }

  if (typeof parsed['revision'] !== 'number' || parsed['revision'] < 1) {
    errors.push('Trường revision phải là số nguyên dương >= 1.');
  }

  // 4. Source validation (PDF-05: Khai báo N1–N5, năm, kỳ thi, nguồn)
  const source = parsed['source'] as Record<string, unknown> | undefined;
  if (!source || typeof source !== 'object') {
    errors.push('Thiếu trường source trong import.json.');
  } else {
    const validLevels: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];
    if (!validLevels.includes(source['level'] as Level)) {
      errors.push(`source.level không hợp lệ: ${String(source['level'])}. Cần là N1–N5.`);
    }

    const validProvenances = ['official_past_exam', 'self_authored', 'third_party'];
    if (!validProvenances.includes(String(source['provenance']))) {
      errors.push(
        `source.provenance không hợp lệ: ${String(source['provenance'])}. Cần là official_past_exam, self_authored hoặc third_party.`,
      );
    }

    if (source['year'] !== undefined && source['year'] !== null && typeof source['year'] !== 'number') {
      errors.push('source.year phải là số nguyên năm (ví dụ 2026) hoặc null.');
    }

    if (
      source['session'] !== undefined &&
      source['session'] !== null &&
      source['session'] !== 7 &&
      source['session'] !== 12
    ) {
      errors.push('source.session phải là 7 hoặc 12 (kỳ thi tháng 7 hoặc tháng 12) hoặc null.');
    }
  }

  // 5. Answers in correctOption check (PDF-03: Upload file đáp án -> Nhận đáp án trong correctOption của JSON, không đọc file đáp án riêng)
  const separateAnswerFiles = Object.keys(files).filter((f) => {
    const lower = f.toLowerCase();
    return (
      lower.endsWith('.ans') ||
      lower.endsWith('.key') ||
      (lower.includes('dap-an') && !lower.endsWith('.json')) ||
      (lower.includes('answer') && !lower.endsWith('.json'))
    );
  });
  if (separateAnswerFiles.length > 0) {
    warnings.push(
      `Phát hiện tệp đáp án rời (${separateAnswerFiles.join(', ')}). Hệ thống chỉ nhận đáp án thông qua trường correctOption trong import.json, không đọc tệp đáp án rời.`,
    );
  }

  // 6. Media and audio timeline verification (PDF-04, PDF-17)
  const mediaManifest = Array.isArray(parsed['media']) ? (parsed['media'] as Record<string, unknown>[]) : [];
  const mediaKeysInManifest = new Set<string>();
  for (const m of mediaManifest) {
    if (typeof m['key'] === 'string') {
      mediaKeysInManifest.add(m['key']);
    }
    const mediaPath = String(m['path'] || '');
    if (mediaPath && !files[mediaPath]) {
      errors.push(`Tệp media được khai báo trong manifest (${mediaPath}) không tồn tại trong gói nén.`);
    }
  }

  // 7. Groups and Questions check (PDF-17, PDF-26)
  const groups = Array.isArray(parsed['groups']) ? (parsed['groups'] as Record<string, unknown>[]) : [];
  if (groups.length === 0) {
    errors.push('Gói nhập không chứa nhóm câu hỏi nào (groups rỗng).');
  }

  const sourceFiles = Array.isArray(parsed['sourceFiles'])
    ? (parsed['sourceFiles'] as Record<string, unknown>[])
    : [];

  let blockingIssues = 0;
  let nonBlockingIssues = 0;

  for (const g of groups) {
    const gid = String(g['id'] || 'unnamed');
    const questions = Array.isArray(g['questions']) ? (g['questions'] as Record<string, unknown>[]) : [];
    if (questions.length === 0) {
      errors.push(`Nhóm câu hỏi ${gid} không có câu hỏi nào.`);
    }

    // Check mediaKeys in group
    const groupMediaKeys = Array.isArray(g['mediaKeys']) ? (g['mediaKeys'] as string[]) : [];
    for (const mk of groupMediaKeys) {
      if (!mediaKeysInManifest.has(mk)) {
        errors.push(`Nhóm ${gid} tham chiếu mediaKey "${mk}" không có trong manifest.`);
      }
    }

    // Check timeline items (PDF-17: timeline alignment)
    const timeline = Array.isArray(g['listeningTimeline'])
      ? (g['listeningTimeline'] as Record<string, unknown>[])
      : [];
    for (const t of timeline) {
      const startMs = Number(t['startMs'] ?? 0);
      const endMs = Number(t['endMs'] ?? 0);
      if (endMs < startMs) {
        errors.push(`Nhóm ${gid} có timeline lỗi: endMs (${endMs}) nhỏ hơn startMs (${startMs}).`);
      }
    }

    // Check sourcePages (PDF-26)
    if (g['sourcePages'] && Array.isArray(g['sourcePages']) && g['sourcePages'].length > 0) {
      if (sourceFiles.length === 0) {
        warnings.push(`Nhóm ${gid} khai báo sourcePages nhưng gói không đính kèm sourceFiles (PDF nguồn).`);
      }
    }

    // Check questions in group
    for (const q of questions) {
      const qid = String(q['id'] || q['number'] || 'unnamed');
      const options = Array.isArray(q['options']) ? (q['options'] as unknown[]) : [];
      if (options.length !== 3 && options.length !== 4) {
        errors.push(`Câu hỏi ${qid} trong nhóm ${gid} phải có 3 hoặc 4 lựa chọn (hiện có ${options.length}).`);
      }

      const correctOption = q['correctOption'];
      if (correctOption === null || correctOption === undefined) {
        blockingIssues++;
      } else if (
        typeof correctOption !== 'number' ||
        correctOption < 1 ||
        correctOption > options.length
      ) {
        errors.push(
          `Câu hỏi ${qid} trong nhóm ${gid} có correctOption không hợp lệ (${String(correctOption)}). Phải từ 1 đến ${options.length}.`,
        );
      }
    }
  }

  // 8. Issues in package
  const issues = Array.isArray(parsed['issues']) ? (parsed['issues'] as Record<string, unknown>[]) : [];
  for (const iss of issues) {
    if (iss['severity'] === 'blocking' || iss['blocking'] === true) {
      blockingIssues++;
    } else {
      nonBlockingIssues++;
    }
  }

  // 9. Content hash computation (SHA-256)
  const hasher = crypto.createHash('sha256');
  hasher.update(importJsonBytes);
  const contentHash = hasher.digest('hex');

  return {
    valid: errors.length === 0,
    packageJson: parsed,
    contentHash,
    errors,
    warnings,
    blockingIssueCount: blockingIssues,
    nonBlockingIssueCount: nonBlockingIssues,
  };
}
