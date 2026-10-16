import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  assertNoAnswerLeak,
  PublicExamSnapshotSchema,
  type Level,
} from '@jlpt/schema';
import {
  ImportManager,
  JsonCsvService,
  StandalonePdfError,
  ImportValidationError,
  ImportManagerView,
} from '../features/import';
import {
  ExamService,
  ExamActionForbiddenError,
  ExamValidationError,
  ExamImmutableVersionError,
  ExamListView,
} from '../features/exam';
import type { StaffOperator } from '../features/review/types';
import type { AdminQuestionGroup, AdminExam } from '../features/content/types';
import { createTextSegment } from '../features/content/types';

function createZipBuffer(files: Record<string, string | Uint8Array>): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jlpt-admin-zip-'));
  try {
    for (const [p, content] of Object.entries(files)) {
      const fullPath = path.join(tmpDir, p);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    const zipPath = path.join(tmpDir, 'out.zip');
    execFileSync('python3', [
      '-c',
      `
import zipfile, os, sys
src = sys.argv[1]
out = sys.argv[2]
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src):
        for f in files:
            if f != 'out.zip':
                fp = os.path.join(root, f)
                arc = os.path.relpath(fp, src)
                z.write(fp, arc)
`,
      tmpDir,
      zipPath,
    ]);
    return fs.readFileSync(zipPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('E2E Import to Publish & Audit Suite (N04)', () => {
  const adminOp: StaffOperator = {
    id: 'usr_admin',
    email: 'admin@jlpt.local',
    role: 'admin',
    name: 'Admin User',
  };

  const editorOp: StaffOperator = {
    id: 'usr_editor',
    email: 'editor@jlpt.local',
    role: 'editor',
    name: 'Editor User',
  };

  const reviewerOp: StaffOperator = {
    id: 'usr_reviewer',
    email: 'reviewer@jlpt.local',
    role: 'reviewer',
    name: 'Reviewer User',
  };

  let importManager: ImportManager;
  let jsonCsvService: JsonCsvService;

  beforeEach(() => {
    importManager = new ImportManager();
    jsonCsvService = new JsonCsvService();
  });

  // =========================================================================
  // Acceptance 1: Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không đọc
  // =========================================================================
  describe('Acceptance 1: Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không khởi động đọc file', () => {
    it('rejects standalone PDF by file extension without initiating extraction or reading (PDF-01)', async () => {
      const pdfBytes = Buffer.from('%PDF-1.4 fake pdf content');
      await expect(
        importManager.importPackage(pdfBytes, 'de-thi-n5.pdf', 'editor-01'),
      ).rejects.toThrow(StandalonePdfError);

      try {
        await importManager.importPackage(pdfBytes, 'de-thi-n5.pdf', 'editor-01');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(StandalonePdfError);
        expect((err as StandalonePdfError).message).toContain(
          'Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không khởi động đọc file',
        );
      }
    });

    it('rejects file containing %PDF magic bytes even if disguised with .zip extension', async () => {
      const disguisedPdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]); // %PDF-1.5
      await expect(
        importManager.importPackage(disguisedPdf, 'disguised.zip', 'editor-01'),
      ).rejects.toThrow(StandalonePdfError);
    });

    it('processes valid Import v2 package, validates schema and creates draft exam (PDF-01, PDF-05)', async () => {
      const importJson = {
        formatVersion: 2,
        packageId: 'pkg-n5-2026',
        revision: 1,
        source: {
          level: 'N5',
          year: 2026,
          session: 7,
          provenance: 'official_past_exam',
          licenseRef: 'lic-n5-2026',
        },
        exam: {
          title: 'JLPT N5 Kỳ 07/2026',
          slug: 'jlpt-n5-2026-07',
          kind: 'original',
          blueprintRef: { id: 'bp_N5', version: 1 },
          sections: [
            {
              code: 'language_knowledge',
              title: 'Kiến thức ngôn ngữ',
              durationSec: 3000,
              groupIds: ['g1'],
            },
          ],
        },
        sourceFiles: [
          {
            id: 'n5-goc.pdf',
            path: 'sources/n5-goc.pdf',
            sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            mimeType: 'application/pdf',
          },
        ],
        groups: [
          {
            id: 'g1',
            sectionCode: 'language_knowledge',
            mondaiType: 'kanji_reading',
            skill: 'kanji',
            orderInSection: 1,
            instructions: [createTextSegment('Chọn cách đọc đúng cho từ gạch chân.')],
            sourcePages: [{ sourceId: 'n5-goc.pdf', page: 2 }],
            questions: [
              {
                id: 'q1',
                number: '1',
                stem: [createTextSegment('山に登ります。')],
                options: [
                  { label: '1', content: [createTextSegment('やま')] },
                  { label: '2', content: [createTextSegment('かわ')] },
                  { label: '3', content: [createTextSegment('うみ')] },
                  { label: '4', content: [createTextSegment('そら')] },
                ],
                correctOption: 1,
                explanation: [createTextSegment('山 đọc là やま.')],
              },
            ],
          },
        ],
        media: [],
        issues: [],
      };

      const zipBuf = createZipBuffer({
        'import.json': JSON.stringify(importJson),
      });

      const job = await importManager.importPackage(zipBuf, 'n5-package.zip', 'editor-01');
      expect(job.status).toBe('draft_created');
      expect(job.packageId).toBe('pkg-n5-2026');
      expect(job.targetLevel).toBe('N5');
      expect(job.year).toBe(2026);
      expect(job.session).toBe(7);
      expect(job.provenance).toBe('official_past_exam');
      expect(job.extractedQuestionsCount).toBe(1);
      expect(job.blockingIssueCount).toBe(0);
      expect(job.draftExamId).toBeDefined();

      const draft = importManager.getConvertedDraft(job.id);
      expect(draft).not.toBeNull();
      expect(draft!.groups).toHaveLength(1);
      expect(draft!.groups[0]!.questions[0]!.correctOption).toBe(1);
      expect(draft!.exam.status).toBe('draft');
    });

    it('tracks blocking issues in package and logs processing warnings (PDF-28)', async () => {
      const draftJson = {
        formatVersion: 2,
        packageId: 'pkg-draft-01',
        revision: 1,
        source: {
          level: 'N4',
          year: null,
          session: null,
          provenance: 'self_authored',
        },
        exam: {
          title: 'Bản thảo N4',
          slug: 'draft-n4',
          kind: 'practice',
        },
        groups: [
          {
            id: 'g-draft',
            sectionCode: 'language_knowledge',
            mondaiType: 'kanji_reading',
            skill: 'kanji',
            orderInSection: 1,
            instructions: [createTextSegment('Hướng dẫn')],
            questions: [
              {
                id: 'q-unknown',
                number: '1',
                stem: [createTextSegment('Câu hỏi chưa có đáp án')],
                options: [
                  { label: '1', content: [createTextSegment('A')] },
                  { label: '2', content: [createTextSegment('B')] },
                  { label: '3', content: [createTextSegment('C')] },
                  { label: '4', content: [createTextSegment('D')] },
                ],
                correctOption: null, // missing answer -> blocking issue
              },
            ],
          },
        ],
        issues: [
          {
            id: 'iss-1',
            severity: 'blocking',
            path: '/groups/0/questions/0/correctOption',
            reason: 'Chưa có đáp án chính thức.',
          },
        ],
      };

      const zipBuf = createZipBuffer({
        'import.json': JSON.stringify(draftJson),
      });

      const job = await importManager.importPackage(zipBuf, 'draft-n4.zip', 'editor-01');
      expect(job.status).toBe('draft_created');
      expect(job.blockingIssueCount).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // PDF-02: Batch Upload Packages
  // =========================================================================
  describe('PDF-02: Batch package upload', () => {
    it('handles batch of multiple packages returning aggregate summary and individual statuses', async () => {
      const validPkg1 = createZipBuffer({
        'import.json': JSON.stringify({
          formatVersion: 2,
          packageId: 'pkg-batch-1',
          revision: 1,
          source: { level: 'N5', provenance: 'official_past_exam' },
          groups: [
            {
              id: 'g1',
              sectionCode: 'sec1',
              mondaiType: 'kanji_reading',
              skill: 'kanji',
              questions: [
                {
                  number: '1',
                  stem: [createTextSegment('S')],
                  options: [
                    { label: '1', content: [createTextSegment('O1')] },
                    { label: '2', content: [createTextSegment('O2')] },
                    { label: '3', content: [createTextSegment('O3')] },
                    { label: '4', content: [createTextSegment('O4')] },
                  ],
                  correctOption: 1,
                },
              ],
            },
          ],
        }),
      });

      const invalidStandalonePdf = Buffer.from('%PDF-1.4 file');

      const batch = await importManager.importBatch([
        { buffer: validPkg1, fileName: 'pkg1.zip' },
        { buffer: invalidStandalonePdf, fileName: 'de-thi.pdf' },
      ]);

      expect(batch.totalPackages).toBe(2);
      expect(batch.succeededCount).toBe(1);
      expect(batch.failedCount).toBe(1);
      expect(batch.jobs[0]!.status).toBe('draft_created');
      expect(batch.jobs[1]!.status).toBe('failed');
      expect(batch.jobs[1]!.errors[0]).toContain('PDF đơn lẻ không khởi động đọc file');
    });
  });

  // =========================================================================
  // PDF-03: Upload file đáp án -> Nhận đáp án trong correctOption của JSON
  // =========================================================================
  describe('PDF-03: Nhận đáp án trong correctOption của JSON, không đọc file đáp án', () => {
    it('warns about standalone answer file and relies strictly on correctOption in import.json', async () => {
      const zipBuf = createZipBuffer({
        'import.json': JSON.stringify({
          formatVersion: 2,
          packageId: 'pkg-with-ans-file',
          revision: 1,
          source: { level: 'N3', provenance: 'self_authored' },
          groups: [
            {
              id: 'g-ans',
              sectionCode: 'sec',
              mondaiType: 'kanji_reading',
              skill: 'kanji',
              questions: [
                {
                  number: '1',
                  stem: [createTextSegment('Test')],
                  options: [
                    { label: '1', content: [createTextSegment('A')] },
                    { label: '2', content: [createTextSegment('B')] },
                    { label: '3', content: [createTextSegment('C')] },
                  ],
                  correctOption: 2,
                },
              ],
            },
          ],
        }),
        'answers.key': '1: B\n2: C\n',
      });

      const job = await importManager.importPackage(zipBuf, 'with-ans.zip', 'editor-01');
      expect(job.warnings.some((w) => w.includes('Phát hiện tệp đáp án rời'))).toBe(true);

      const draft = importManager.getConvertedDraft(job.id);
      expect(draft!.groups[0]!.questions[0]!.correctOption).toBe(2);
    });
  });

  // =========================================================================
  // PDF-04 & PDF-17: Audio Manifest and Timeline Verification
  // =========================================================================
  describe('PDF-04 & PDF-17: Audio manifest and timeline verification', () => {
    it('validates listening timeline alignment and checks missing media in manifest', async () => {
      const invalidTimelinePkg = {
        formatVersion: 2,
        packageId: 'pkg-audio-err',
        revision: 1,
        source: { level: 'N2', provenance: 'official_past_exam' },
        media: [{ key: 'media/audio.mp3', path: 'media/audio.mp3', sha256: 'abc' }],
        groups: [
          {
            id: 'g-audio',
            sectionCode: 'listening',
            mondaiType: 'task_based_comprehension',
            skill: 'listening',
            mediaKeys: ['media/audio.mp3'],
            listeningTimeline: [
              { startMs: 5000, endMs: 2000 }, // endMs < startMs!
            ],
            questions: [
              {
                number: '1',
                stem: [createTextSegment('Nghe')],
                options: [
                  { label: '1', content: [createTextSegment('1')] },
                  { label: '2', content: [createTextSegment('2')] },
                  { label: '3', content: [createTextSegment('3')] },
                ],
                correctOption: 1,
              },
            ],
          },
        ],
      };

      const zipBuf = createZipBuffer({
        'import.json': JSON.stringify(invalidTimelinePkg),
        // missing media/audio.mp3 in zip
      });

      await expect(importManager.importPackage(zipBuf, 'err-audio.zip')).rejects.toThrow(
        ImportValidationError,
      );
    });
  });

  // =========================================================================
  // Acceptance 3: Publish version mới, takedown giữ version cũ
  // =========================================================================
  describe('Acceptance 3: Publish version mới, takedown giữ version cũ (ADM-07, PDF-29)', () => {
    let examService: ExamService;
    let sampleApprovedExam: AdminExam;

    beforeEach(() => {
      const approvedGroup: AdminQuestionGroup = {
        id: 'grp_approved_1',
        version: 1,
        level: 'N5',
        sectionCode: 'language_knowledge',
        mondaiType: 'kanji_reading',
        skill: 'kanji',
        instructions: [createTextSegment('Hướng dẫn làm bài')],
        passage: null,
        mediaIds: [],
        questions: [
          {
            questionId: 'q_app_1',
            number: '1',
            stem: [createTextSegment('日')],
            options: [
              { label: '1', content: [createTextSegment('ひ')] },
              { label: '2', content: [createTextSegment('つき')] },
              { label: '3', content: [createTextSegment('みず')] },
              { label: '4', content: [createTextSegment('き')] },
            ],
            correctOption: 1,
          },
        ],
        sourceRef: 'n5-goc.pdf',
        sourcePage: 1,
        status: 'approved',
        lastEditedBy: 'author_1',
        authorId: 'author_1',
        reviewerId: 'reviewer_1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      sampleApprovedExam = {
        id: 'exam_test_01',
        slug: 'jlpt-n5-test-01',
        level: 'N5',
        title: 'Đề thi JLPT N5 Đã Duyệt',
        kind: 'original',
        description: 'Đề thi kiểm thử xuất bản và gỡ đề',
        blueprintId: 'bp_N5',
        blueprintVersion: 1,
        sourceRefs: ['sources/n5.pdf'],
        sections: [
          {
            code: 'language_knowledge',
            title: 'Kiến thức ngôn ngữ',
            durationSec: 1800,
            orderIndex: 1,
            items: [
              {
                id: 'item_1',
                examId: 'exam_test_01',
                sectionCode: 'language_knowledge',
                groupVersionId: 'grp_approved_1_v1',
                groupId: 'grp_approved_1',
                orderIndex: 1,
                group: approvedGroup,
              },
            ],
          },
        ],
        totalQuestions: 1,
        status: 'draft',
        publishedVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      examService = new ExamService([sampleApprovedExam]);
    });

    it('rejects publishing attempt by non-admin staff (editor or reviewer)', () => {
      expect(() => examService.publishExam('exam_test_01', editorOp)).toThrow(
        ExamActionForbiddenError,
      );
      expect(() => examService.publishExam('exam_test_01', reviewerOp)).toThrow(
        ExamActionForbiddenError,
      );
    });

    it('blocks publishing if any question group in the exam is not approved', () => {
      const unapprovedGroup: AdminQuestionGroup = {
        ...sampleApprovedExam.sections[0]!.items[0]!.group!,
        status: 'draft', // not approved
      };

      const unapprovedExam: AdminExam = {
        ...sampleApprovedExam,
        id: 'exam_unapproved',
        sections: [
          {
            ...sampleApprovedExam.sections[0]!,
            items: [
              {
                ...sampleApprovedExam.sections[0]!.items[0]!,
                group: unapprovedGroup,
              },
            ],
          },
        ],
      };

      examService = new ExamService([unapprovedExam]);

      expect(() => examService.publishExam('exam_unapproved', adminOp)).toThrow(ExamValidationError);
    });

    it('publishes exam version 1 with zero answer leak in public snapshot', () => {
      const result = examService.publishExam('exam_test_01', adminOp);

      expect(result.exam.status).toBe('published');
      expect(result.exam.publishedVersion).toBe(1);
      expect(result.versionRecord.version).toBe(1);

      // Verify zero answer leak
      expect(() => assertNoAnswerLeak(result.snapshot)).not.toThrow();
      expect(PublicExamSnapshotSchema.safeParse(result.snapshot).success).toBe(true);

      const jsonStr = JSON.stringify(result.snapshot);
      expect(jsonStr).not.toContain('"correctOption"');
      expect(jsonStr).not.toContain('"isCorrect"');
      expect(jsonStr).not.toContain('"answerKey"');

      // Answer key stored securely
      expect(result.answerKey.version).toBe(1);
      expect(result.answerKey.keys).toEqual([1]);
    });

    it('takedown preserves previous version and snapshot in version history', () => {
      // 1. Publish v1
      examService.publishExam('exam_test_01', adminOp);
      const v1History = examService.getVersionHistory('exam_test_01');
      expect(v1History).toHaveLength(1);
      expect(v1History[0]!.version).toBe(1);
      expect(v1History[0]!.takedownAt).toBeNull();

      // 2. Takedown v1
      const takedownRes = examService.takedownExam(
        'exam_test_01',
        'Cần đối chiếu lại bản quyền với nhà xuất bản',
        adminOp,
      );

      expect(takedownRes.exam.publishedVersion).toBeNull();
      expect(takedownRes.takedownRecord.takedownAt).not.toBeNull();
      expect(takedownRes.takedownRecord.takedownReason).toBe(
        'Cần đối chiếu lại bản quyền với nhà xuất bản',
      );

      // "Takedown giữ version cũ" - check history still contains v1!
      const historyAfterTakedown = examService.getVersionHistory('exam_test_01');
      expect(historyAfterTakedown).toHaveLength(1);
      expect(historyAfterTakedown[0]!.version).toBe(1);
      expect(historyAfterTakedown[0]!.snapshot).toBeDefined();
      expect(historyAfterTakedown[0]!.snapshot.version).toBe(1);

      // 3. Subsequent publish creates version 2, while preserving version 1!
      const v2Res = examService.publishExam('exam_test_01', adminOp);
      expect(v2Res.exam.publishedVersion).toBe(2);

      const fullHistory = examService.getVersionHistory('exam_test_01');
      expect(fullHistory).toHaveLength(2);
      expect(fullHistory[0]!.version).toBe(1);
      expect(fullHistory[0]!.takedownAt).not.toBeNull();
      expect(fullHistory[1]!.version).toBe(2);
      expect(fullHistory[1]!.takedownAt).toBeNull();
    });

    it('enforces version immutability preventing direct edit on published exam', () => {
      examService.publishExam('exam_test_01', adminOp);

      expect(() =>
        examService.updateDraftExam('exam_test_01', { title: 'Tên sửa đè' }, editorOp),
      ).toThrow(ExamImmutableVersionError);

      // Must branch new draft to edit
      const draft = examService.branchNewDraft('exam_test_01', editorOp);
      expect(draft.status).toBe('draft');
      const updated = examService.updateDraftExam(
        'exam_test_01',
        { title: 'Tên đề thi bản thảo mới' },
        editorOp,
      );
      expect(updated.title).toBe('Tên đề thi bản thảo mới');
    });
  });

  // =========================================================================
  // Acceptance 4: JSON/CSV import/export roundtrip và source page tùy chọn mở đúng
  // =========================================================================
  describe('Acceptance 4: JSON/CSV import/export roundtrip và source page tùy chọn mở đúng (PDF-30, PDF-26)', () => {
    const testGroups: AdminQuestionGroup[] = [
      {
        id: 'grp_rt_1',
        version: 1,
        level: 'N4' as Level,
        sectionCode: 'language_knowledge',
        mondaiType: 'kanji_reading',
        skill: 'kanji',
        instructions: [createTextSegment('Chọn cách đọc đúng cho từ Kanji.')],
        passage: null,
        mediaIds: [],
        questions: [
          {
            number: '1',
            stem: [createTextSegment('兄は会社員です。')],
            options: [
              { label: '1', content: [createTextSegment('あに')] },
              { label: '2', content: [createTextSegment('おとうと')] },
              { label: '3', content: [createTextSegment('あね')] },
              { label: '4', content: [createTextSegment('いもうと')] },
            ],
            correctOption: 1,
            explanation: [createTextSegment('兄 đọc là あに.')],
          },
          {
            number: '2',
            stem: [createTextSegment('毎朝、新聞を読みます。')],
            options: [
              { label: '1', content: [createTextSegment('まいあさ')] },
              { label: '2', content: [createTextSegment('まいばん')] },
              { label: '3', content: [createTextSegment('まいとし')] },
              { label: '4', content: [createTextSegment('まいにち')] },
            ],
            correctOption: 1,
            explanation: [createTextSegment('毎朝 đọc là まいあさ.')],
          },
        ],
        sourceRef: 'n4-de-chuan.pdf',
        sourcePage: 5,
        status: 'approved',
        lastEditedBy: 'editor_1',
        authorId: 'editor_1',
        createdAt: '2026-10-16T00:00:00.000Z',
        updatedAt: '2026-10-16T00:00:00.000Z',
      },
    ];

    it('performs accurate RFC 4180 CSV export and import roundtrip', () => {
      // 1. Export to CSV
      const csvString = jsonCsvService.exportQuestionsToCsv(testGroups);
      expect(csvString).toContain('groupId,version,level,sectionCode');
      expect(csvString).toContain('grp_rt_1');
      expect(csvString).toContain('兄は会社員です。');
      expect(csvString).toContain('毎朝、新聞を読みます。');

      // 2. Re-import from CSV
      const importedGroups = jsonCsvService.importQuestionsFromCsv(csvString, 'operator_test');
      expect(importedGroups).toHaveLength(1);

      const g = importedGroups[0]!;
      expect(g.id).toBe('grp_rt_1');
      expect(g.level).toBe('N4');
      expect(g.mondaiType).toBe('kanji_reading');
      expect(g.sourceRef).toBe('n4-de-chuan.pdf');
      expect(g.sourcePage).toBe(5);
      expect(g.questions).toHaveLength(2);

      // Question 1 roundtrip
      expect(g.questions[0]!.number).toBe('1');
      expect(g.questions[0]!.correctOption).toBe(1);
      expect(g.questions[0]!.options).toHaveLength(4);

      // Question 2 roundtrip
      expect(g.questions[1]!.number).toBe('2');
      expect(g.questions[1]!.correctOption).toBe(1);
      expect(g.questions[1]!.options).toHaveLength(4);
    });

    it('performs JSON export and import roundtrip', () => {
      const jsonStr = jsonCsvService.exportQuestionsToJson(testGroups);
      const parsed = jsonCsvService.importQuestionsFromJson(jsonStr);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.id).toBe('grp_rt_1');
      expect(parsed[0]!.questions).toHaveLength(2);
    });

    it('resolves valid optional source page target correctly', () => {
      const sourceFiles = [
        {
          id: 'n4-de-chuan.pdf',
          path: 'sources/n4-de-chuan.pdf',
          sha256: 'abc123hash',
          mimeType: 'application/pdf',
        },
      ];

      const resolution = jsonCsvService.resolveSourcePage(testGroups[0]!, sourceFiles);
      expect(resolution.available).toBe(true);
      expect(resolution.sourceFileId).toBe('n4-de-chuan.pdf');
      expect(resolution.pageNumber).toBe(5);
      expect(resolution.url).toBe('/admin/sources/n4-de-chuan.pdf#page=5');
    });

    it('gracefully handles missing or invalid optional source page without throwing unhandled exceptions', () => {
      const groupWithoutPage: AdminQuestionGroup = {
        ...testGroups[0]!,
        sourcePage: undefined,
      };

      const resMissing = jsonCsvService.resolveSourcePage(groupWithoutPage, []);
      expect(resMissing.available).toBe(false);
      expect(resMissing.error).toContain('Chưa khai báo trang nguồn');

      const groupInvalidPage: AdminQuestionGroup = {
        ...testGroups[0]!,
        sourcePage: -1,
      };

      const resInvalid = jsonCsvService.resolveSourcePage(groupInvalidPage, []);
      expect(resInvalid.available).toBe(false);
      expect(resInvalid.error).toContain('Số trang không hợp lệ');
    });
  });

  // =========================================================================
  // PDF-24: Learner-facing Preview Interface
  // =========================================================================
  describe('PDF-24: Xem trước đề trên giao diện làm bài', () => {
    it('renders learner-facing preview modal simulation strictly without answers', () => {
      const sampleExam: AdminExam = {
        id: 'ex_prev',
        slug: 'slug-prev',
        level: 'N5',
        title: 'Đề thi xem trước N5',
        kind: 'original',
        description: 'Mô tả',
        blueprintId: 'bp_N5',
        blueprintVersion: 1,
        sourceRefs: [],
        sections: [
          {
            code: 'language_knowledge',
            title: 'Kiến thức ngôn ngữ',
            durationSec: 1800,
            orderIndex: 1,
            items: [
              {
                id: 'it1',
                examId: 'ex_prev',
                sectionCode: 'language_knowledge',
                groupVersionId: 'g1_v1',
                groupId: 'g1',
                orderIndex: 1,
                group: {
                  id: 'g1',
                  version: 1,
                  level: 'N5',
                  sectionCode: 'language_knowledge',
                  mondaiType: 'kanji_reading',
                  skill: 'kanji',
                  instructions: [createTextSegment('Chọn đáp án đúng')],
                  questions: [
                    {
                      number: '1',
                      stem: [createTextSegment('水')],
                      options: [
                        { label: '1', content: [createTextSegment('みず')] },
                        { label: '2', content: [createTextSegment('ひ')] },
                      ],
                      correctOption: 1,
                    },
                  ],
                  sourceRef: '',
                  status: 'approved',
                  lastEditedBy: 'ed',
                  authorId: 'ed',
                  createdAt: '',
                  updatedAt: '',
                  mediaIds: [],
                },
              },
            ],
          },
        ],
        totalQuestions: 1,
        status: 'published',
        publishedVersion: 1,
        createdAt: '',
        updatedAt: '',
      };

      const markup = renderToStaticMarkup(
        React.createElement(ExamListView, { initialExams: [sampleExam], currentOperator: adminOp }),
      );

      expect(markup).toContain('Quản lý &amp; Xuất bản Đề thi');
      expect(markup).toContain('Đề thi xem trước N5');
      expect(markup).toContain('data-testid="preview-exam-btn-ex_prev"');
    });
  });

  // =========================================================================
  // UI Component Integration: ImportManagerView
  // =========================================================================
  describe('UI Component Integration: ImportManagerView', () => {
    it('renders import upload zone, job table, and CSV tool controls', () => {
      const markup = renderToStaticMarkup(React.createElement(ImportManagerView));
      expect(markup).toContain('Quản lý Gói Nhập Đề thi (Import v2)');
      expect(markup).toContain('data-testid="package-file-input"');
      expect(markup).toContain('Ngân hàng câu hỏi: Công cụ Import / Export JSON &amp; CSV');
      expect(markup).toContain('data-testid="import-csv-btn"');
    });
  });
});
