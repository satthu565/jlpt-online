import path from 'node:path';
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  validatePackagePath,
  validateImportData,
  loadPackageArchive,
  computePackageContentHash,
  evaluatePackageImportIdempotency,
  validateExamAgainstBlueprint,
  formatPackageIssues,
  getQuestionIssues,
  findUnresolvedOcrMarkers,
  buildSnapshotFromImportPackage,
} from '../src/index.js';
import type { ImportPackageV2, BlueprintDefinition, PackageIdentity } from '../src/index.js';
import { assertNoAnswerLeak, PublicExamSnapshotSchema } from '@jlpt/schema';

const ROOT = path.resolve(__dirname, '../../..');
const READY_FIXTURE_PATH = path.join(ROOT, 'fixtures/imports/ready');
const DRAFT_FIXTURE_PATH = path.join(ROOT, 'fixtures/imports/draft');
const READY_ZIP_PATH = path.join(ROOT, 'fixtures/imports/ready.zip');
const DRAFT_ZIP_PATH = path.join(ROOT, 'fixtures/imports/draft.zip');
const DEMO_N5_ZIP_PATH = path.join(ROOT, 'docs/multi-worker/demo-data/demo-n5-1.zip');
const DEMO_BLUEPRINT_PATH = path.join(
  ROOT,
  'docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json',
);

describe('C05 Validator gói nhập kiểm tra dữ liệu và đóng gói', () => {
  // --------------------------------------------------------------------------
  // Acceptance 1: Lỗi schema checksum đáp án timeline hoặc thiếu file có path cụ thể
  // --------------------------------------------------------------------------
  describe('Acceptance 1: Lỗi schema checksum đáp án timeline hoặc thiếu file có path cụ thể', () => {
    it('reports specific path for schema validation errors', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      // Invalidate level with non-enum value
      // @ts-expect-error test invalid level
      pkg.source.level = 'N9';
      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/source/level:'))).toBe(true);

      // Invalidate exam kind
      // @ts-expect-error test invalid kind
      pkg.exam.kind = 'invalid_kind';
      const result2 = validateImportData(pkg);
      expect(result2.valid).toBe(false);
      expect(result2.errors.some((e) => e.startsWith('/exam/kind:'))).toBe(true);
    });

    it('reports specific path for media checksum and file size mismatches', () => {
      const { rawJson, files } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      // Invalidate checksum
      pkg.media[0]!.sha256 = '0000000000000000000000000000000000000000000000000000000000000000';
      const result = validateImportData(pkg, { packageFiles: files });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/media/0/sha256:'))).toBe(true);
    });

    it('reports specific path for missing media and source files', () => {
      const { rawJson, files } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      // Remove media file from packageFiles
      const modifiedFiles = { ...files };
      delete modifiedFiles[pkg.media[0]!.path];

      const result = validateImportData(pkg, { packageFiles: modifiedFiles });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/media/0/path:'))).toBe(true);
    });

    it('reports specific path for unlisted files in package archive', () => {
      const { rawJson, files } = loadPackageArchive(READY_FIXTURE_PATH);
      const modifiedFiles = {
        ...files,
        'media/extra-unlisted.png': new Uint8Array([1, 2, 3]),
      };

      const result = validateImportData(rawJson, {
        packageFiles: modifiedFiles,
      });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.startsWith('/files:') && e.includes('extra-unlisted.png')),
      ).toBe(true);
    });

    it('reports specific path for timeline errors (gap, duration mismatch, startMs)', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;
      const listeningSec = pkg.exam.sections.find((s) => s.code === 'listening')!;
      const listeningSecIdx = pkg.exam.sections.indexOf(listeningSec);

      // Create timeline duration mismatch
      listeningSec.listeningTimeline[0]!.endMs = 5000;
      listeningSec.listeningTimeline[0]!.audioEndMs = 2000; // mismatch (5000-0 != 2000-0)

      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.startsWith(`/exam/sections/${listeningSecIdx}/listeningTimeline/0/audioEndMs:`),
        ),
      ).toBe(true);
    });

    it('reports specific path for answer out-of-bounds error', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.groups[0]!.questions[0]!.correctOption = 9; // out of bounds (options length is 4)
      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/groups/0/questions/0/correctOption:'))).toBe(
        true,
      );
    });
  });

  // --------------------------------------------------------------------------
  // Acceptance 2: Draft có vấn đề vẫn lưu nháp nhưng bị chặn publish
  // --------------------------------------------------------------------------
  describe('Acceptance 2: Draft có vấn đề vẫn lưu nháp nhưng bị chặn publish', () => {
    it('allows valid draft with blocking issues to pass with DRAFT_ONLY readiness in draft mode', () => {
      const result = validatePackagePath(DRAFT_FIXTURE_PATH, { mode: 'draft' });
      expect(result.valid).toBe(true);
      expect(result.readiness).toBe('DRAFT_ONLY');
      expect(result.blockingIssueCount).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
      expect(result.publicationApproved).toBe(false);
    });

    it('strictly blocks draft with blocking issues in ready mode', () => {
      const result = validatePackagePath(DRAFT_FIXTURE_PATH, { mode: 'ready' });
      expect(result.valid).toBe(false);
      expect(result.readiness).toBe('INVALID');
      expect(result.errors.some((e) => e.startsWith('/issues:'))).toBe(true);
      expect(result.publicationApproved).toBe(false);
    });

    it('ensures publicationApproved is unconditionally false across all modes', () => {
      const readyResult = validatePackagePath(READY_FIXTURE_PATH, {
        mode: 'ready',
      });
      expect(readyResult.publicationApproved).toBe(false);

      const draftResult = validatePackagePath(DRAFT_FIXTURE_PATH, {
        mode: 'draft',
      });
      expect(draftResult.publicationApproved).toBe(false);
    });

    it('rejects draft question missing answer if no blocking issue covers it', () => {
      const { rawJson } = loadPackageArchive(DRAFT_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      // Remove blocking issues entirely
      pkg.issues = [];
      const result = validateImportData(pkg, { mode: 'draft' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/groups/0/questions/0/correctOption:'))).toBe(
        true,
      );
    });

    it('rejects draft containing [KHONG_DOC_RO] marker without a corresponding blocking issue', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.groups[0]!.questions[0]!.stem.push({
        t: 'text',
        text: 'Nội dung có chữ [KHONG_DOC_RO]',
      });

      const result = validateImportData(pkg, { mode: 'draft' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/groups/0/questions/0/stem:'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Acceptance 3: Ready đủ media và không issue blocking
  // --------------------------------------------------------------------------
  describe('Acceptance 3: Ready đủ media và không issue blocking', () => {
    it('validates ready directory fixture as READY_FOR_REVIEW with 0 blocking issues', () => {
      const result = validatePackagePath(READY_FIXTURE_PATH, { mode: 'ready' });
      expect(result.valid).toBe(true);
      expect(result.readiness).toBe('READY_FOR_REVIEW');
      expect(result.blockingIssueCount).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.questionCount).toBe(5);
      expect(result.groupCount).toBe(4);
    });

    it('validates ready zip archive directly in TypeScript as READY_FOR_REVIEW', () => {
      const result = validatePackagePath(READY_ZIP_PATH, { mode: 'ready' });
      expect(result.valid).toBe(true);
      expect(result.readiness).toBe('READY_FOR_REVIEW');
      expect(result.blockingIssueCount).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('fails ready mode if any blocking issue is present', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.issues.push({
        id: 'manual-check-required',
        severity: 'blocking',
        path: '/groups/0/questions/0',
        reason: 'Chưa xác minh bản quyền hình ảnh',
        sourcePages: [],
      });

      const result = validateImportData(pkg, { mode: 'ready' });
      expect(result.valid).toBe(false);
      expect(result.readiness).toBe('INVALID');
      expect(result.errors.some((e) => e.startsWith('/issues:'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Acceptance 4: Nhập lại packageId/revision/content hash không tạo trùng; sửa nội dung có revision mới
  // --------------------------------------------------------------------------
  describe('Acceptance 4: Nhập lại packageId/revision/content hash không tạo trùng; sửa nội dung có revision mới', () => {
    it('computes deterministic content hash invariant to JSON property ordering', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg1 = rawJson as ImportPackageV2;

      // Clone and reverse top-level keys
      const pkg2 = JSON.parse(JSON.stringify(pkg1)) as ImportPackageV2;
      const reversedKeysObj = Object.fromEntries(
        Object.entries(pkg2).reverse(),
      ) as unknown as ImportPackageV2;

      const hash1 = computePackageContentHash(pkg1);
      const hash2 = computePackageContentHash(reversedKeysObj);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces different content hash when package question content is modified', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg1 = rawJson as ImportPackageV2;
      const pkg2 = JSON.parse(JSON.stringify(pkg1)) as ImportPackageV2;

      pkg2.groups[0]!.questions[0]!.stem.push({
        t: 'text',
        text: ' (modified)',
      });

      const hash1 = computePackageContentHash(pkg1);
      const hash2 = computePackageContentHash(pkg2);
      expect(hash1).not.toBe(hash2);
    });

    it('correctly handles idempotency on re-importing the same package without duplicate creation', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const contentHash = computePackageContentHash(pkg);

      const incoming: PackageIdentity = {
        packageId: pkg.packageId,
        revision: pkg.revision,
        contentHash,
      };

      const existingRecords: PackageIdentity[] = [
        {
          packageId: pkg.packageId,
          revision: pkg.revision,
          contentHash,
          status: 'draft',
        },
      ];

      const evaluation = evaluatePackageImportIdempotency(incoming, existingRecords);
      expect(evaluation.action).toBe('IDEMPOTENT_SKIP');
      expect(evaluation.statusCode).toBe(200);
      expect(evaluation.reason).toContain('idempotent');
    });

    it('rejects with 409 conflict when content changes but revision is NOT incremented', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const originalHash = computePackageContentHash(pkg);

      const incomingModified: PackageIdentity = {
        packageId: pkg.packageId,
        revision: pkg.revision,
        contentHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // altered content
      };

      const existingRecords: PackageIdentity[] = [
        {
          packageId: pkg.packageId,
          revision: pkg.revision,
          contentHash: originalHash,
          status: 'draft',
        },
      ];

      const evaluation = evaluatePackageImportIdempotency(incomingModified, existingRecords);
      expect(evaluation.action).toBe('REJECT_CONFLICT');
      expect(evaluation.statusCode).toBe(409);
      expect(evaluation.reason).toContain('xung đột nội dung');
    });

    it('accepts new revision when content changes and revision is incremented', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const originalHash = computePackageContentHash(pkg);

      const incomingNewRevision: PackageIdentity = {
        packageId: pkg.packageId,
        revision: pkg.revision + 1,
        contentHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      };

      const existingRecords: PackageIdentity[] = [
        {
          packageId: pkg.packageId,
          revision: pkg.revision,
          contentHash: originalHash,
          status: 'draft',
        },
      ];

      const evaluation = evaluatePackageImportIdempotency(incomingNewRevision, existingRecords);
      expect(evaluation.action).toBe('PROCEED_NEW_REVISION');
      expect(evaluation.statusCode).toBe(200);
    });

    it('rejects regression if incoming revision is lower than already stored revision', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;

      const incomingLower: PackageIdentity = {
        packageId: pkg.packageId,
        revision: 1,
        contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      };

      const existingRecords: PackageIdentity[] = [
        {
          packageId: pkg.packageId,
          revision: 2,
          contentHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          status: 'published',
        },
      ];

      const evaluation = evaluatePackageImportIdempotency(incomingLower, existingRecords);
      expect(evaluation.action).toBe('REJECT_REGRESSION');
      expect(evaluation.statusCode).toBe(409);
    });

    it('handles initial import of a brand new packageId', () => {
      const incoming: PackageIdentity = {
        packageId: '11111111-1111-4111-8111-111111111111',
        revision: 1,
        contentHash: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      };

      const evaluation = evaluatePackageImportIdempotency(incoming, []);
      expect(evaluation.action).toBe('PROCEED_INITIAL_IMPORT');
      expect(evaluation.statusCode).toBe(201);
    });
  });

  // --------------------------------------------------------------------------
  // Acceptance 5: Gói demo docs/multi-worker/demo-data/demo-n5-1.zip đạt READY
  // --------------------------------------------------------------------------
  describe('Acceptance 5: Gói demo docs/multi-worker/demo-data/demo-n5-1.zip đạt READY', () => {
    it('validates demo-n5-1.zip package directly from disk as READY_FOR_REVIEW', () => {
      const result = validatePackagePath(DEMO_N5_ZIP_PATH, { mode: 'ready' });
      expect(result.valid).toBe(true);
      expect(result.readiness).toBe('READY_FOR_REVIEW');
      expect(result.questionCount).toBe(29);
      expect(result.groupCount).toBe(15);
      expect(result.blockingIssueCount).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.publicationApproved).toBe(false);
    });

    it('validates demo-n5-1.zip against synthetic-n5-demo blueprint with 100% question count alignment', () => {
      const { rawJson } = loadPackageArchive(DEMO_N5_ZIP_PATH);
      const pkg = rawJson as ImportPackageV2;

      const blueprintRaw = JSON.parse(fs.readFileSync(DEMO_BLUEPRINT_PATH, 'utf-8'));
      const blueprint = blueprintRaw as BlueprintDefinition;

      const bpResult = validateExamAgainstBlueprint(pkg.exam, pkg.groups, blueprint);
      expect(bpResult.valid).toBe(true);
      expect(bpResult.errors).toEqual([]);
      expect(bpResult.expectedTotalQuestions).toBe(29);
      expect(bpResult.actualTotalQuestions).toBe(29);
    });
  });

  // --------------------------------------------------------------------------
  // Feature PDF-21: Đánh dấu câu có độ tin cậy OCR thấp
  // --------------------------------------------------------------------------
  describe('Feature PDF-21: Đánh dấu câu có độ tin cậy OCR thấp', () => {
    it('formats package issues report and highlights OCR low confidence items', () => {
      const { rawJson } = loadPackageArchive(DRAFT_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.issues.push({
        id: 'ocr-low-confidence-q1',
        severity: 'blocking',
        path: '/groups/0/questions/0/stem',
        reason: 'Độ tin cậy OCR thấp, chữ mờ: [KHONG_DOC_RO]',
        sourcePages: [{ sourceId: 'de-goc', page: 1 }],
      });

      const report = formatPackageIssues(pkg);
      expect(report.totalIssues).toBe(2);
      expect(report.blockingCount).toBe(2);
      expect(report.ocrLowConfidenceCount).toBe(1);
    });

    it('retrieves issues associated with a specific question by question ID and pointer', () => {
      const { rawJson } = loadPackageArchive(DRAFT_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.issues.push({
        id: 'q-specific-issue',
        severity: 'warning',
        path: '/groups/0/questions/0/stem',
        reason: 'Từ này có thể có furigana ở bản in khác',
        sourcePages: [],
      });

      const issuesById = getQuestionIssues(pkg, 'q-1');
      expect(issuesById.length).toBeGreaterThan(0);
      expect(issuesById.some((i) => i.id === 'q-specific-issue')).toBe(true);

      const issuesByPointer = getQuestionIssues(pkg, '/groups/0/questions/0');
      expect(issuesByPointer.length).toBeGreaterThan(0);
    });

    it('scans and detects unresolved [KHONG_DOC_RO] markers across package', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.groups[0]!.questions[0]!.stem.push({
        t: 'text',
        text: 'Chữ [KHONG_DOC_RO] trong câu',
      });

      const markers = findUnresolvedOcrMarkers(pkg);
      expect(markers.length).toBe(1);
      expect(markers[0]!.covered).toBe(false);
      expect(markers[0]!.path).toBe('/groups/0/questions/0/stem/1/text');
    });
  });

  // --------------------------------------------------------------------------
  // Feature PDF-22: Phát hiện thiếu câu, thiếu đáp án hoặc trùng câu
  // --------------------------------------------------------------------------
  describe('Feature PDF-22: Phát hiện thiếu câu, thiếu đáp án hoặc trùng câu', () => {
    it('detects missing questions when a group has an empty questions array', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.groups[0]!.questions = [];
      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/groups/0/questions:'))).toBe(true);
    });

    it('detects missing question stem', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.groups[0]!.questions[0]!.stem = [];
      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/groups/0/questions/0/stem:'))).toBe(true);
    });

    it('detects missing answer (null correctOption without blocking issue in ready mode)', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.groups[0]!.questions[0]!.correctOption = null;
      const result = validateImportData(pkg, { mode: 'ready' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/groups/0/questions/0/correctOption:'))).toBe(
        true,
      );
    });

    it('detects duplicate question IDs across groups', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      // Duplicate question id from group 0 into group 1
      pkg.groups[1]!.questions[0]!.id = pkg.groups[0]!.questions[0]!.id;

      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/groups/1/questions/0/id:'))).toBe(true);
    });

    it('detects duplicate question numbers within exam', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      // Duplicate number "1"
      pkg.groups[1]!.questions[0]!.number = pkg.groups[0]!.questions[0]!.number;

      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/groups/1/questions/0/number:'))).toBe(true);
    });

    it('detects duplicate question stem and options across questions', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      // Make question 1 duplicate of question 0
      pkg.groups[1]!.questions[0]!.stem = JSON.parse(
        JSON.stringify(pkg.groups[0]!.questions[0]!.stem),
      );
      pkg.groups[1]!.questions[0]!.options = JSON.parse(
        JSON.stringify(pkg.groups[0]!.questions[0]!.options),
      );

      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('phát hiện câu hỏi bị trùng lặp với câu q-1')),
      ).toBe(true);
    });

    it('detects duplicate option content within the same question', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      // Duplicate option 1 into option 2
      pkg.groups[0]!.questions[0]!.options[1]!.content = JSON.parse(
        JSON.stringify(pkg.groups[0]!.questions[0]!.options[0]!.content),
      );

      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/groups/0/questions/0/options:'))).toBe(true);
    });

    it('detects empty option content within a question', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.groups[0]!.questions[0]!.options[0]!.content = [];
      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.startsWith('/groups/0/questions/0/options/0/content:')),
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Feature PDF-23: Kiểm tra tổng số câu theo cấu trúc đề
  // --------------------------------------------------------------------------
  describe('Feature PDF-23: Kiểm tra tổng số câu theo cấu trúc đề', () => {
    it('detects mismatch between exam.totalQuestions and actual question count', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = JSON.parse(JSON.stringify(rawJson)) as ImportPackageV2;

      pkg.exam.totalQuestions = 999;
      const result = validateImportData(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('/exam/totalQuestions:'))).toBe(true);
    });

    it('validates structure against blueprint and detects mondai question count mismatch', () => {
      const { rawJson } = loadPackageArchive(DEMO_N5_ZIP_PATH);
      const pkg = rawJson as ImportPackageV2;
      const blueprintRaw = JSON.parse(fs.readFileSync(DEMO_BLUEPRINT_PATH, 'utf-8'));
      const blueprint = JSON.parse(JSON.stringify(blueprintRaw)) as BlueprintDefinition;

      // Alter blueprint expectation for kanji_reading from 4 to 5
      blueprint.sections[0]!.mondai[0]!.questionCount = 5;

      const bpResult = validateExamAgainstBlueprint(pkg.exam, pkg.groups, blueprint);
      expect(bpResult.valid).toBe(false);
      expect(
        bpResult.errors.some(
          (e) =>
            e.startsWith('/exam/sections/0/mondai/kanji_reading:') &&
            e.includes('số câu (4) không khớp'),
        ),
      ).toBe(true);
    });

    it('validates structure against blueprint via validateImportData options.blueprint', () => {
      const { rawJson, files } = loadPackageArchive(DEMO_N5_ZIP_PATH);
      const pkg = rawJson as ImportPackageV2;
      const blueprintRaw = JSON.parse(fs.readFileSync(DEMO_BLUEPRINT_PATH, 'utf-8'));
      const blueprint = blueprintRaw as BlueprintDefinition;

      const result = validateImportData(pkg, {
        packageFiles: files,
        blueprint,
      });

      expect(result.valid).toBe(true);
      expect(result.readiness).toBe('READY_FOR_REVIEW');
    });
  });

  // --------------------------------------------------------------------------
  // Feature PDF-27: Nhập lại file mà không tạo trùng dữ liệu
  // --------------------------------------------------------------------------
  describe('Feature PDF-27: Nhập lại file mà không tạo trùng dữ liệu', () => {
    it('preserves idempotency on repeated imports of demo-n5-1.zip', () => {
      const { rawJson, files } = loadPackageArchive(DEMO_N5_ZIP_PATH);
      const pkg = rawJson as ImportPackageV2;
      const contentHash = computePackageContentHash(pkg, files);

      const identity: PackageIdentity = {
        packageId: pkg.packageId,
        revision: pkg.revision,
        contentHash,
      };

      // First evaluation: new package
      const firstRun = evaluatePackageImportIdempotency(identity, []);
      expect(firstRun.action).toBe('PROCEED_INITIAL_IMPORT');
      expect(firstRun.statusCode).toBe(201);

      // Second evaluation: exact duplicate (re-upload)
      const secondRun = evaluatePackageImportIdempotency(identity, [identity]);
      expect(secondRun.action).toBe('IDEMPOTENT_SKIP');
      expect(secondRun.statusCode).toBe(200);
      expect(secondRun.reason).toContain('không tạo bản sao trùng');
    });
  });

  // --------------------------------------------------------------------------
  // ZIP Archive Security & Validation
  // --------------------------------------------------------------------------
  describe('ZIP Archive Security & Validation', () => {
    it('validates draft zip fixture in draft mode as DRAFT_ONLY', () => {
      const result = validatePackagePath(DRAFT_ZIP_PATH, { mode: 'draft' });
      expect(result.valid).toBe(true);
      expect(result.readiness).toBe('DRAFT_ONLY');
      expect(result.blockingIssueCount).toBe(1);
    });

    it('rejects non-existent file or directory paths gracefully', () => {
      const result = validatePackagePath('/non/existent/path/package.zip');
      expect(result.valid).toBe(false);
      expect(result.readiness).toBe('INVALID');
      expect(result.errors[0]).toContain('không tồn tại');
    });
  });

  // --------------------------------------------------------------------------
  // V05 Acceptance 1: Gói chuẩn giữ đúng ruby bảng sao audio đáp án qua import và snapshot không lộ đáp án
  // --------------------------------------------------------------------------
  describe('V05 Acceptance 1: Gói chuẩn giữ đúng ruby bảng sao audio đáp án qua import và snapshot không lộ đáp án', () => {
    it('preserves ruby furigana across import package and snapshot without leaking answers', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;

      // 1. Build public snapshot
      const { snapshot, answerKeys } = buildSnapshotFromImportPackage(pkg);

      // Verify ruby preserved in public question
      const vocabSec = snapshot.sections.find((s) => s.code === 'language_vocab');
      expect(vocabSec).toBeDefined();

      const rubyQ = vocabSec?.groups[0]?.questions.find((q) => q.number === '2');
      expect(rubyQ).toBeDefined();

      // Check ruby segment in stem
      const rubySegment = rubyQ?.stem.find((seg) => seg.t === 'ruby');
      expect(rubySegment).toBeDefined();
      if (rubySegment && rubySegment.t === 'ruby') {
        expect(rubySegment.text).toBe('水');
        expect(rubySegment.rt).toBe('みず');
      }

      // Verify answer key stored on server side and not in snapshot
      expect(answerKeys[rubyQ!.index]).toBe(1);
      const rubyQRecord = rubyQ as unknown as Record<string, unknown>;
      expect(rubyQRecord['correctOption']).toBeUndefined();
      expect(rubyQRecord['answer']).toBeUndefined();
      expect(rubyQRecord['explanation']).toBeUndefined();
    });

    it('preserves tables and images in reading passage across import and into public snapshot', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;

      const { snapshot } = buildSnapshotFromImportPackage(pkg);
      const readingSec = snapshot.sections.find((s) => s.code === 'language_grammar_reading');
      expect(readingSec).toBeDefined();

      const readingGroup = readingSec?.groups.find((g) => g.mondaiType === 'info_retrieval');
      expect(readingGroup?.passage).not.toBeNull();

      // Table preservation
      const tableBlock = readingGroup?.passage?.find((b) => b.type === 'table');
      expect(tableBlock).toBeDefined();
      if (tableBlock && tableBlock.type === 'table') {
        expect(tableBlock.rows.length).toBe(2);
        const cell = tableBlock.rows[0]?.[0]?.[0];
        expect(cell?.t).toBe('text');
        if (cell?.t === 'text') {
          expect(cell.text).toBe('曜日');
        }
      }

      // Image in passage
      const imageBlock = readingGroup?.passage?.find((b) => b.type === 'image');
      expect(imageBlock).toBeDefined();
      if (imageBlock && imageBlock.type === 'image') {
        expect(imageBlock.mediaKey).toContain('.png');
      }
    });

    it('preserves star and blanks in sentence composition across import and into public snapshot', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;

      const { snapshot, answerKeys } = buildSnapshotFromImportPackage(pkg);
      const grammarSec = snapshot.sections.find((s) => s.code === 'language_grammar_reading');
      const orderGroup = grammarSec?.groups.find((g) => g.mondaiType === 'sentence_composition');
      expect(orderGroup).toBeDefined();

      const starQuestion = orderGroup?.questions[0];
      expect(starQuestion).toBeDefined();

      const starSegments = starQuestion?.stem.filter((s) => s.t === 'star');
      const blankSegments = starQuestion?.stem.filter((s) => s.t === 'blank');
      expect(starSegments?.length).toBe(1);
      expect(blankSegments?.length).toBe(3);

      // Verify answer key stored
      expect(answerKeys[starQuestion!.index]).toBe(3);
    });

    it('preserves audio timeline with millisecond precision in listening section and manifest', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;

      const { snapshot, manifest } = buildSnapshotFromImportPackage(pkg);
      const listeningSec = snapshot.sections.find((s) => s.code === 'listening');
      expect(listeningSec).toBeDefined();
      expect(listeningSec?.listeningTimeline).not.toBeNull();
      expect(listeningSec?.listeningTimeline?.length).toBeGreaterThan(0);

      const timelineItem = listeningSec!.listeningTimeline![0]!;
      expect(timelineItem.mediaKey).toContain('.wav');
      expect(timelineItem.startMs).toBe(0);
      expect(timelineItem.endMs).toBe(2000);
      expect(timelineItem.audioStartMs).toBe(0);
      expect(timelineItem.audioEndMs).toBe(2000);
      expect(timelineItem.gapAfterMs).toBe(28000);

      // Manifest must include the media key
      expect(manifest.media).toContain(timelineItem.mediaKey);
    });

    it('strictly satisfies assertNoAnswerLeak and PublicExamSnapshotSchema on full import snapshot', () => {
      const { rawJson } = loadPackageArchive(DEMO_N5_ZIP_PATH);
      const pkg = rawJson as ImportPackageV2;

      const { snapshot, answerKeys, manifest } = buildSnapshotFromImportPackage(pkg);

      // Total questions
      expect(snapshot.totalQuestions).toBe(29);
      expect(Object.keys(answerKeys).length).toBe(29);
      expect(manifest.version).toBe(1);

      // 1. Must satisfy assertNoAnswerLeak
      expect(() => assertNoAnswerLeak(snapshot)).not.toThrow();

      // 2. Must satisfy PublicExamSnapshotSchema
      expect(() => PublicExamSnapshotSchema.parse(snapshot)).not.toThrow();
    });

    it('strictly detects and rejects if any answer key is leaked into snapshot', () => {
      const { rawJson } = loadPackageArchive(READY_FIXTURE_PATH);
      const pkg = rawJson as ImportPackageV2;
      const { snapshot } = buildSnapshotFromImportPackage(pkg);

      // Intentionally contaminate public snapshot with an answer key
      const leakedSnapshot = JSON.parse(JSON.stringify(snapshot));
      leakedSnapshot.sections[0].groups[0].questions[0].correctOption = 2;

      expect(() => assertNoAnswerLeak(leakedSnapshot)).toThrow(/forbidden answer field "correctOption"/);
      expect(() => PublicExamSnapshotSchema.parse(leakedSnapshot)).toThrow();

      // Contaminate with explanation
      const leakedExplanation = JSON.parse(JSON.stringify(snapshot));
      leakedExplanation.sections[0].groups[0].questions[0].explanation = 'Lộ lời giải';
      expect(() => assertNoAnswerLeak(leakedExplanation)).toThrow(/forbidden answer field "explanation"/);
    });
  });
});
