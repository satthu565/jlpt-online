import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  validateImportData,
  validatePackagePath,
  loadPackageDirectory,
} from '../src/index.js';
import type { ImportPackageV2 } from '../src/index.js';

const ROOT = path.resolve(__dirname, '../../..');
const READY_FIXTURE_PATH = path.join(ROOT, 'fixtures/imports/ready');
const DRAFT_FIXTURE_PATH = path.join(ROOT, 'fixtures/imports/draft');

describe('F06 Import Contracts & Manual Data Preparation Acceptance', () => {
  describe('Acceptance 1: Schema và ví dụ có ruby bảng hình sao đáp án audio timeline', () => {
    it('validates ready fixture on disk with READY_FOR_REVIEW status', () => {
      const result = validatePackagePath(READY_FIXTURE_PATH, { mode: 'ready' });
      expect(result.valid).toBe(true);
      expect(result.readiness).toBe('READY_FOR_REVIEW');
      expect(result.blockingIssueCount).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.questionCount).toBe(5);
      expect(result.groupCount).toBe(4);
      expect(result.publicationApproved).toBe(false);
    });

    it('contains ruby furigana representation in question stem', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const vocabGroup = pkg.groups.find((g) => g.id === 'g-vocab');
      expect(vocabGroup).toBeDefined();

      const rubyQuestion = vocabGroup?.questions.find((q) => q.id === 'q-2');
      expect(rubyQuestion).toBeDefined();

      const rubySegment = rubyQuestion?.stem.find((s) => s.t === 'ruby');
      expect(rubySegment).toBeDefined();
      if (rubySegment && rubySegment.t === 'ruby') {
        expect(rubySegment.text).toBe('水');
        expect(rubySegment.rt).toBe('みず');
      }
    });

    it('contains table representation in reading passage', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const readingGroup = pkg.groups.find((g) => g.id === 'g-reading');
      expect(readingGroup).toBeDefined();

      const tableBlock = readingGroup?.passage.find((b) => b.type === 'table');
      expect(tableBlock).toBeDefined();
      if (tableBlock && tableBlock.type === 'table') {
        expect(tableBlock.rows.length).toBe(2);
        const cell1 = tableBlock.rows[0]?.[0]?.[0];
        const cell2 = tableBlock.rows[0]?.[1]?.[0];
        expect(cell1?.t).toBe('text');
        expect(cell2?.t).toBe('text');
        if (cell1?.t === 'text' && cell2?.t === 'text') {
          expect(cell1.text).toBe('曜日');
          expect(cell2.text).toBe('開店');
        }
      }
    });

    it('contains image representation in passage with real manifest and file', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const readingGroup = pkg.groups.find((g) => g.id === 'g-reading');
      expect(readingGroup).toBeDefined();

      const imageBlock = readingGroup?.passage.find((b) => b.type === 'image');
      expect(imageBlock).toBeDefined();
      if (imageBlock && imageBlock.type === 'image') {
        expect(imageBlock.mediaKey).toBe(
          'media/f2fc1dd6c83d15d222b2bc9e60008c5e3b226b035a6ecd779f5b88c5d34a338d.png'
        );
        expect(imageBlock.width).toBe(2);
        expect(imageBlock.height).toBe(2);
        expect(files[imageBlock.mediaKey]).toBeDefined();
      }
    });

    it('contains star symbol and 3 blanks for sentence composition question', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const orderGroup = pkg.groups.find((g) => g.id === 'g-order');
      expect(orderGroup).toBeDefined();
      expect(orderGroup?.mondaiType).toBe('sentence_composition');

      const starQuestion = orderGroup?.questions.find((q) => q.id === 'q-3');
      expect(starQuestion).toBeDefined();

      const starSegments = starQuestion?.stem.filter((s) => s.t === 'star');
      const blankSegments = starQuestion?.stem.filter((s) => s.t === 'blank');
      expect(starSegments?.length).toBe(1);
      expect(blankSegments?.length).toBe(3);
    });

    it('contains genuine audio timeline with valid synchronization', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const listeningSection = pkg.exam.sections.find((s) => s.code === 'listening');
      expect(listeningSection).toBeDefined();
      expect(listeningSection?.listeningTimeline.length).toBe(1);

      const timeline = listeningSection!.listeningTimeline[0]!;
      expect(timeline.groupId).toBe('g-listening');
      expect(timeline.mediaKey).toBe(
        'media/00d0ad3e26f73d387098dddab2d5f79b9f270d9a7be23a5ef15dec78ef9395f1.wav'
      );
      expect(timeline.endMs - timeline.startMs).toBe(
        timeline.audioEndMs - timeline.audioStartMs
      );
      expect(files[timeline.mediaKey]).toBeDefined();
    });

    it('contains authentic answers (correctOption 1..4)', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      for (const group of pkg.groups) {
        for (const question of group.questions) {
          expect(question.correctOption).toBeGreaterThanOrEqual(1);
          expect(question.correctOption).toBeLessThanOrEqual(question.options.length);
        }
      }
    });
  });

  describe('Acceptance 2: Chỗ không chắc có issue blocking, không tự đoán', () => {
    it('validates draft fixture in draft mode with DRAFT_ONLY status', () => {
      const result = validatePackagePath(DRAFT_FIXTURE_PATH, { mode: 'draft' });
      expect(result.valid).toBe(true);
      expect(result.readiness).toBe('DRAFT_ONLY');
      expect(result.blockingIssueCount).toBe(1);
      expect(result.errors).toEqual([]);
      expect(result.publicationApproved).toBe(false);
    });

    it('draft fixture fails in ready mode because blocking issue remains', () => {
      const result = validatePackagePath(DRAFT_FIXTURE_PATH, { mode: 'ready' });
      expect(result.valid).toBe(false);
      expect(result.readiness).toBe('INVALID');
      expect(result.errors.some((e) => e.includes('còn vấn đề blocking'))).toBe(true);
    });

    it('draft question has null correctOption and points to blocking issue', () => {
      const { rawJson } = loadPackageDirectory(DRAFT_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const firstQ = pkg.groups[0]?.questions[0];
      expect(firstQ?.correctOption).toBeNull();

      const issue = pkg.issues.find(
        (i) => i.path === '/groups/0/questions/0/correctOption'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('blocking');
      expect(issue?.reason).toContain('thiếu đáp án');
    });

    it('fails if correctOption is null WITHOUT a corresponding blocking issue', () => {
      const { rawJson, files } = loadPackageDirectory(DRAFT_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      // Remove issue
      pkg.issues = [];
      const result = validateImportData(pkg, { mode: 'draft', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('chưa có đáp án'))).toBe(true);
    });

    it('fails if [KHONG_DOC_RO] is present without a blocking issue', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      pkg.groups[0]!.questions[0]!.stem.push({
        t: 'text',
        text: 'Chữ này [KHONG_DOC_RO] từ bản scan',
      });
      const readyResult = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(readyResult.valid).toBe(false);
      expect(readyResult.errors.some((e) => e.includes('không đọc rõ'))).toBe(true);

      // In draft mode with blocking issue:
      pkg.issues.push({
        id: 'unclear-text',
        severity: 'blocking',
        path: '/groups/0/questions/0/stem',
        reason: 'Chữ mờ trong bản scan cần chủ dự án đối chiếu',
        sourcePages: [],
      });
      const draftResult = validateImportData(pkg, { mode: 'draft', packageFiles: files });
      expect(draftResult.valid).toBe(true);
      expect(draftResult.readiness).toBe('DRAFT_ONLY');
    });
  });

  describe('Acceptance 3: Chủ dự án tự chuẩn bị dữ liệu rồi upload; hệ thống không gọi hoặc điều khiển agent', () => {
    it('publicationApproved is strictly false in local validation', () => {
      const readyResult = validatePackagePath(READY_FIXTURE_PATH, { mode: 'ready' });
      expect(readyResult.publicationApproved).toBe(false);

      const draftResult = validatePackagePath(DRAFT_FIXTURE_PATH, { mode: 'draft' });
      expect(draftResult.publicationApproved).toBe(false);
    });

    it('validator is a pure deterministic function with no AI, network, or external dependencies', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const res1 = validateImportData(rawJson, { mode: 'ready', packageFiles: files });
      const res2 = validateImportData(rawJson, { mode: 'ready', packageFiles: files });
      expect(res1).toEqual(res2);
    });
  });

  describe('PDF Extraction Features (PDF-06..16, PDF-18) External Contract Mapping', () => {
    it('PDF-06: PDF text/scan is handled externally, only import-v2 JSON is ingested', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      expect(pkg.formatVersion).toBe(2);
      expect(pkg.source.provenance).toBe('self_authored');
    });

    it('PDF-07: Japanese text must be strictly Unicode NFC', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      // Inject non-NFC string (NFD decomposed character: e + combining acute accent)
      pkg.exam.title = 'N5 \u0065\u0301xam';
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unicode NFC'))).toBe(true);
    });

    it('PDF-08..09: Kanji, Kana, Furigana are structured via RichText ruby tags', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const q = pkg.groups[0]?.questions[1];
      expect(q?.stem).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ t: 'ruby', text: '水', rt: 'みず' }),
        ])
      );
    });

    it('PDF-10: Questions and sequential numbers are preserved in question objects', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const allNumbers = pkg.groups.flatMap((g) => g.questions.map((q) => q.number));
      expect(allNumbers).toEqual(['1', '2', '3', '4', '5']);
    });

    it('PDF-11: Multiple-choice options must maintain strict "1".."4" sequence', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      // Reverse option labels
      pkg.groups[0]!.questions[0]!.options[0]!.label = '2';
      pkg.groups[0]!.questions[0]!.options[1]!.label = '1';
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('labels phải giữ thứ tự'))).toBe(true);
    });

    it('PDF-12: Mondai headers and groups are represented in groups array with mondaiType', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const types = pkg.groups.map((g) => g.mondaiType);
      expect(types).toContain('kanji_reading');
      expect(types).toContain('sentence_composition');
      expect(types).toContain('info_retrieval');
      expect(types).toContain('quick_response');
    });

    it('PDF-13: Reading passages are structured as RichBlock paragraphs or tables', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const reading = pkg.groups.find((g) => g.mondaiType === 'info_retrieval');
      expect(reading?.passage.length).toBeGreaterThan(0);
      expect(reading?.passage[0]?.type).toBe('table');
    });

    it('PDF-14: Media manifest requires exact SHA-256 hash matching content bytes', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      // Corrupt hash
      pkg.media[0]!.sha256 = '0000000000000000000000000000000000000000000000000000000000000000';
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('hash hoặc tên file không đúng'))).toBe(true);
    });

    it('PDF-15: Sentence composition strictly enforces 1 star and 3 blanks', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      const orderQ = pkg.groups.find((g) => g.mondaiType === 'sentence_composition')
        ?.questions[0];
      // Corrupt stem to have 2 stars
      orderQ!.stem = [{ t: 'star' }, { t: 'star' }];
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('câu sắp xếp cần 3 blank và 1 star'))).toBe(
        true
      );
    });

    it('PDF-16: Answers are linked directly via correctOption (1..options.length)', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      // Answer outside options count (group 2 question 4 has 3 options)
      pkg.groups[2]!.questions[0]!.correctOption = 4;
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('đáp án ngoài số lựa chọn'))).toBe(true);
    });

    it('PDF-18: Question categorization is typed via mondaiType and skill enums', () => {
      const { rawJson } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      for (const group of pkg.groups) {
        expect([
          'kanji_reading',
          'sentence_composition',
          'info_retrieval',
          'quick_response',
        ]).toContain(group.mondaiType);
        for (const q of group.questions) {
          expect(['kanji', 'vocabulary', 'grammar', 'reading', 'listening']).toContain(
            q.skill
          );
        }
      }
    });
  });

  describe('Adversarial & Security Validations', () => {
    it('rejects nested underline or emphasis styles', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      pkg.groups[0]!.questions[0]!.stem = [
        {
          t: 'underline',
          children: [
            {
              t: 'underline',
              children: [{ t: 'text', text: 'nested underline' }],
            },
          ],
        },
      ];
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('không lồng underline/emphasis thêm một cấp'))
      ).toBe(true);
    });

    it('rejects unlisted files in the package directory', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const modifiedFiles = { ...files, 'extra-unlisted.txt': new Uint8Array([1, 2, 3]) };
      const result = validateImportData(rawJson, {
        mode: 'ready',
        packageFiles: modifiedFiles,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('file chưa khai báo'))).toBe(true);
    });

    it('rejects unknown properties in root or nested objects (strict schema)', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson));
      pkg.approved = true;
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('trường không được phép'))).toBe(true);
    });

    it('rejects duplicate question IDs across groups', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      pkg.groups[1]!.questions[0]!.id = pkg.groups[0]!.questions[0]!.id;
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('question id trùng toàn gói'))).toBe(true);
    });

    it('rejects totalQuestions count mismatch', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      pkg.exam.totalQuestions = 999;
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('không bằng tổng câu thực tế'))).toBe(true);
    });

    it('rejects discontinuous listening timeline', () => {
      const { rawJson, files } = loadPackageDirectory(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      const listeningSec = pkg.exam.sections.find((s) => s.code === 'listening');
      // Add a second entry that does not start at previous endMs + gapAfterMs
      listeningSec!.listeningTimeline.push({
        groupId: 'g-listening',
        mediaKey: listeningSec!.listeningTimeline[0]!.mediaKey,
        startMs: 99999, // Should be 2000 + 28000 = 30000
        endMs: 101999,
        audioStartMs: 0,
        audioEndMs: 2000,
        gapAfterMs: 0,
      });
      const result = validateImportData(pkg, { mode: 'ready', packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('timeline không liên tục'))).toBe(true);
    });
  });
});
