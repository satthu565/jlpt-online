import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import type { Blueprint, RichText } from '@jlpt/schema';
import { RichBlockSchema, RichTextSchema } from '@jlpt/schema';
import {
  createBlankSegment,
  createImageBlock,
  createImageSegment,
  createLineBreakSegment,
  createParagraphBlock,
  createRubySegment,
  createStarSegment,
  createTableBlock,
  createTextSegment,
  createUnderlineSegment,
  richTextToPlainText,
} from '../features/content/types';
import type { AdminQuestionGroup } from '../features/content/types';
import {
  QuestionGroupPreview,
} from '../features/content/preview';
import {
  QuestionBankManager,
  QuestionBankError,
} from '../features/content/question-bank';
import {
  BlueprintManager,
  BlueprintManagerError,
} from '../features/content/blueprint-manager';
import {
  ExamManager,
  ExamManagerError,
  validateExamBlueprint,
} from '../features/content/exam-manager';
import type { StaffUser } from '../lib/auth-context';

const mockAdmin: StaffUser = {
  id: 'usr_admin',
  email: 'admin@jlpt.local',
  name: 'Admin',
  role: 'admin',
  twoFactorEnabled: true,
  twoFactorStatus: 'verified',
};

const mockEditor: StaffUser = {
  id: 'usr_editor',
  email: 'editor@jlpt.local',
  name: 'Editor',
  role: 'editor',
  twoFactorEnabled: true,
  twoFactorStatus: 'verified',
};

const mockReviewer: StaffUser = {
  id: 'usr_reviewer',
  email: 'reviewer@jlpt.local',
  name: 'Reviewer',
  role: 'reviewer',
  twoFactorEnabled: true,
  twoFactorStatus: 'verified',
};

describe('Content Management & Authoring (C04: ADM-04, ADM-08)', () => {
  describe('Acceptance 1: Tạo sửa ruby star bài đọc bảng nghe và xem trước', () => {
    it('creates and validates rich-text segments (ruby, star, underline, blank, br, image)', () => {
      const segments: RichText = [
        createTextSegment('彼女は'),
        createRubySegment('毎日', 'まいにち'),
        createTextSegment('日本語を'),
        createUnderlineSegment('勉強'),
        createTextSegment('して'),
        createStarSegment(),
        createBlankSegment('1'),
        createLineBreakSegment(),
        createImageSegment({ mediaKey: 'img_01', alt: 'Minh họa' }),
      ];

      // Must strictly conform to RichTextSchema from @jlpt/schema
      const parsed = RichTextSchema.safeParse(segments);
      expect(parsed.success).toBe(true);

      // Verify plain text indexing
      const plain = richTextToPlainText(segments);
      expect(plain).toContain('彼女は');
      expect(plain).toContain('毎日(まいにち)');
      expect(plain).toContain('勉強');
      expect(plain).toContain('★');
      expect(plain).toContain('(1)');
      expect(plain).toContain('[Minh họa]');
    });

    it('creates and validates reading comprehension passage blocks (paragraphs, tables, images)', () => {
      const passage = [
        createParagraphBlock([
          createTextSegment('Đây là đoạn văn bài đọc N1 với chữ '),
          createRubySegment('漢字', 'かんじ'),
          createTextSegment(' và dấu sao '),
          createStarSegment(),
        ]),
        createTableBlock([
          [[createTextSegment('Tiêu đề A')], [createTextSegment('Tiêu đề B')]],
          [[createTextSegment('Giá trị 1')], [createTextSegment('Giá trị 2')]],
        ]),
        createImageBlock('passage_chart_01', 'Biểu đồ dân số', 600, 400),
      ];

      for (const block of passage) {
        const parsed = RichBlockSchema.safeParse(block);
        expect(parsed.success).toBe(true);
      }
    });

    it('renders preview component matching visual specifications without XSS vulnerability', () => {
      const group: AdminQuestionGroup = {
        id: 'grp_01',
        version: 1,
        level: 'N1',
        sectionCode: 'language_knowledge',
        mondaiType: 'kanji_reading',
        skill: 'reading',
        title: 'Mondai 1: Đọc Kanji',
        instructions: [createTextSegment('Hãy chọn cách đọc đúng cho từ gạch chân:')],
        passage: [
          createParagraphBlock([
            createTextSegment('Đoạn văn có '),
            createRubySegment('日本語', 'にほんご'),
            createTextSegment(' và dấu sao '),
            createStarSegment(),
            createTextSegment('<script>alert("xss")</script>'),
          ]),
          createTableBlock([
            [[createTextSegment('Cột 1')], [createTextSegment('Cột 2')]],
            [[createTextSegment('Dữ liệu 1')], [createTextSegment('Dữ liệu 2')]],
          ]),
        ],
        audioMediaKey: 'audio/n1_listening.mp3',
        listeningTimeline: [
          {
            groupId: 'grp_01',
            mediaKey: 'audio/n1_listening.mp3',
            startMs: 0,
            endMs: 35000,
            audioStartMs: 0,
            audioEndMs: 35000,
            gapAfterMs: 5000,
          },
        ],
        mediaIds: ['audio/n1_listening.mp3'],
        questions: [
          {
            number: '1',
            stem: [
              createTextSegment('この'),
              createRubySegment('問題', 'もんだい'),
              createTextSegment('は'),
              createStarSegment(),
              createTextSegment('難しいです。'),
            ],
            options: [
              { label: '1', content: [createTextSegment('もんだい')] },
              { label: '2', content: [createTextSegment('もんたい')] },
              { label: '3', content: [createTextSegment('もんだん')] },
              { label: '4', content: [createTextSegment('もんてい')] },
            ],
            correctOption: 1,
            explanation: [createTextSegment('Đáp án đúng là 1 (もんだい).')],
          },
        ],
        sourceRef: 'https://www.jlpt.jp',
        status: 'draft',
        lastEditedBy: mockEditor.id,
        authorId: mockEditor.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const html = renderToStaticMarkup(
        React.createElement(QuestionGroupPreview, { group, showCorrectAnswers: true }),
      );

      // Verify ruby rendering
      expect(html).toContain('<ruby>日本語<rt>にほんご</rt></ruby>');
      expect(html).toContain('<ruby>問題<rt>もんだい</rt></ruby>');

      // Verify star rendering
      expect(html).toContain('★');

      // Verify table rendering
      expect(html).toContain('<table');
      expect(html).toContain('Cột 1');
      expect(html).toContain('Dữ liệu 2');

      // Verify listening audio rendering
      expect(html).toContain('audio/n1_listening.mp3');
      expect(html).toContain('Đoạn 1: 0s - 35s');

      // Verify options and correct answer highlight
      expect(html).toContain('Đáp án đúng');
      expect(html).toContain('もんだい');

      // Verify XSS safety: script tag is encoded as text entities, not executed
      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;alert');
    });
  });

  describe('Acceptance 2: Không sửa đè published version', () => {
    describe('1. Question Group Version Immutability', () => {
      it('updates draft or rejected question groups in-place with same version number', () => {
        const qb = new QuestionBankManager();
        const created = qb.createGroup(
          {
            level: 'N1',
            sectionCode: 'language_knowledge',
            mondaiType: 'kanji_reading',
            skill: 'reading',
            instructions: [createTextSegment('Hướng dẫn bản thảo')],
            passage: null,
            mediaIds: [],
            questions: [
              {
                number: '1',
                stem: [createTextSegment('Câu hỏi gốc')],
                options: [
                  { label: '1', content: [createTextSegment('A')] },
                  { label: '2', content: [createTextSegment('B')] },
                  { label: '3', content: [createTextSegment('C')] },
                  { label: '4', content: [createTextSegment('D')] },
                ],
                correctOption: 1,
              },
            ],
            sourceRef: 'https://www.jlpt.jp',
          },
          mockEditor,
        );

        expect(created.version).toBe(1);
        expect(created.status).toBe('draft');

        // Sửa bản thảo: sửa trực tiếp in-place, version giữ nguyên 1
        const updated = qb.updateGroup(
          created.id,
          { instructions: [createTextSegment('Hướng dẫn đã chỉnh sửa')] },
          mockEditor,
        );

        expect(updated.isNewVersion).toBe(false);
        expect(updated.group.version).toBe(1);
        expect(updated.group.status).toBe('draft');
        expect(richTextToPlainText(updated.group.instructions)).toBe('Hướng dẫn đã chỉnh sửa');
      });

      it('branches to a new draft version (v+1) when modifying an approved group (never overwriting approved version)', () => {
        const qb = new QuestionBankManager();
        const group = qb.createGroup(
          {
            level: 'N2',
            sectionCode: 'language_knowledge',
            mondaiType: 'kanji_reading',
            skill: 'reading',
            instructions: [createTextSegment('Bản 1 đã duyệt')],
            passage: null,
            mediaIds: [],
            questions: [
              {
                number: '1',
                stem: [createTextSegment('Câu hỏi 1')],
                options: [
                  { label: '1', content: [createTextSegment('A')] },
                  { label: '2', content: [createTextSegment('B')] },
                  { label: '3', content: [createTextSegment('C')] },
                  { label: '4', content: [createTextSegment('D')] },
                ],
                correctOption: 2,
              },
            ],
            sourceRef: 'https://www.jlpt.jp',
          },
          mockEditor,
        );

        // Gửi duyệt và được duyệt
        qb.submitForReview(group.id, mockEditor);
        const approved = qb.reviewGroup(group.id, 'approved', 'Đạt chuẩn', mockReviewer);
        expect(approved.version).toBe(1);
        expect(approved.status).toBe('approved');

        // Biên tập viên sửa nhóm đã approved: KHÔNG được sửa đè bản v1!
        const editResult = qb.updateGroup(
          group.id,
          { instructions: [createTextSegment('Bản cập nhật v2')] },
          mockEditor,
        );

        // Phải sinh version 2 ở trạng thái draft
        expect(editResult.isNewVersion).toBe(true);
        expect(editResult.group.version).toBe(2);
        expect(editResult.group.status).toBe('draft');
        expect(richTextToPlainText(editResult.group.instructions)).toBe('Bản cập nhật v2');

        // Bản v1 gốc vẫn nguyên vẹn ở trạng thái approved
        const originalV1 = qb.getGroup(group.id, 1);
        expect(originalV1).not.toBeNull();
        expect(originalV1?.version).toBe(1);
        expect(originalV1?.status).toBe('approved');
        expect(richTextToPlainText(originalV1!.instructions)).toBe('Bản 1 đã duyệt');
      });

      it('enforces two-person review rule (reviewer cannot be the author/last editor)', () => {
        const qb = new QuestionBankManager();
        const group = qb.createGroup(
          {
            level: 'N3',
            sectionCode: 'reading',
            mondaiType: 'comprehension_short',
            skill: 'reading',
            instructions: [createTextSegment('Đọc đoạn văn')],
            passage: null,
            mediaIds: [],
            questions: [
              {
                number: '1',
                stem: [createTextSegment('Câu hỏi')],
                options: [
                  { label: '1', content: [createTextSegment('A')] },
                  { label: '2', content: [createTextSegment('B')] },
                  { label: '3', content: [createTextSegment('C')] },
                ],
                correctOption: 1,
              },
            ],
            sourceRef: 'https://www.jlpt.jp',
          },
          mockEditor,
        );

        qb.submitForReview(group.id, mockEditor);

        // 1. Editor trying to review -> Blocked because not reviewer/admin
        expect(() => {
          qb.reviewGroup(group.id, 'approved', 'Editor duyệt', mockEditor);
        }).toThrow('Chỉ người duyệt (Reviewer) hoặc Admin mới có quyền');

        // 2. Author who is admin (or reviewer) trying to self-approve own group -> Blocked by 4-eyes rule
        const adminAuthorGroup = qb.createGroup(
          {
            level: 'N3',
            sectionCode: 'reading',
            mondaiType: 'comprehension_short',
            skill: 'reading',
            instructions: [createTextSegment('Đề do admin soạn')],
            passage: null,
            mediaIds: [],
            questions: [
              {
                number: '1',
                stem: [createTextSegment('Câu hỏi')],
                options: [
                  { label: '1', content: [createTextSegment('A')] },
                  { label: '2', content: [createTextSegment('B')] },
                  { label: '3', content: [createTextSegment('C')] },
                ],
                correctOption: 1,
              },
            ],
            sourceRef: 'https://www.jlpt.jp',
          },
          mockAdmin,
        );
        qb.submitForReview(adminAuthorGroup.id, mockAdmin);

        // Admin who authored the group cannot self-approve -> 4-eyes rule violation
        expect(() => {
          qb.reviewGroup(adminAuthorGroup.id, 'approved', 'Admin tự duyệt', mockAdmin);
        }).toThrow(QuestionBankError);

        try {
          qb.reviewGroup(adminAuthorGroup.id, 'approved', 'Admin tự duyệt', mockAdmin);
        } catch (err: unknown) {
          const e = err as QuestionBankError;
          expect(e.code).toBe('FORBIDDEN');
          expect(e.message).toContain('nguyên tắc 4 mắt');
        }
      });
    });

    describe('2. Blueprint Version Immutability (ADM-08)', () => {
      const sampleBp: Blueprint = {
        id: 'bp_N1',
        level: 'N1',
        version: 1,
        kind: 'official',
        status: 'active',
        isOfficial: true,
        isConfirmed: true,
        effectiveFrom: '2026-01-01',
        sourceRef: [{ url: 'https://www.jlpt.jp/guidelines.html', accessedAt: '2026-01-01T00:00:00Z' }],
        sections: [
          {
            code: 'language_knowledge',
            title: 'Kiến thức ngôn ngữ',
            durationSec: 6600,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 6 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['kanji'], maxScaled: 60, minPass: 19 },
          ],
          totalMax: 60,
          totalPass: 30,
        },
      };

      it('does not allow overwriting active blueprint version directly', () => {
        const bpm = new BlueprintManager([sampleBp]);

        expect(() => {
          bpm.overwriteActiveVersion();
        }).toThrow(BlueprintManagerError);

        try {
          bpm.overwriteActiveVersion();
        } catch (err: unknown) {
          const e = err as BlueprintManagerError;
          expect(e.code).toBe('IMMUTABLE_VERSION');
          expect(e.message).toContain('Không thể sửa đè phiên bản blueprint đã kích hoạt');
        }
      });

      it('creates new version (v+1) when updating blueprint, preserving active version', () => {
        const bpm = new BlueprintManager([sampleBp]);

        const v2 = bpm.createNewVersion(
          'bp_N1',
          {
            sections: [
              {
                code: 'language_knowledge',
                title: 'Kiến thức ngôn ngữ',
                durationSec: 6600,
                mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 7 }],
              },
            ],
          },
          mockAdmin,
        );

        expect(v2.version).toBe(2);
        expect(v2.status).toBe('draft');
        expect(v2.sections[0]!.mondai[0]!.questionCount).toBe(7);

        // Version 1 remains active and untouched
        const v1 = bpm.getBlueprint('bp_N1', 1);
        expect(v1).not.toBeNull();
        expect(v1?.version).toBe(1);
        expect(v1?.status).toBe('active');
        expect(v1?.sections[0]!.mondai[0]!.questionCount).toBe(6);
      });

      it('strictly requires official source (jlpt.jp) and confirmation before activating official blueprint', () => {
        const bpm = new BlueprintManager();
        const unconfirmedBp = bpm.createBlueprint(
          {
            level: 'N2',
            version: 1,
            kind: 'official',
            isOfficial: true,
            effectiveFrom: '2026-01-01',
            sourceRef: [{ url: 'https://unverified-blog.com/test', accessedAt: '2026-01-01T00:00:00Z' }],
            sections: [
              {
                code: 'lang',
                title: 'Lang',
                durationSec: 3600,
                mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 5 }],
              },
            ],
            scoring: {
              method: 'linear_reference',
              rounding: 'round',
              scoringSections: [{ code: 'lang', label: 'Lang', skills: ['kanji'], maxScaled: 60, minPass: 19 }],
              totalMax: 60,
              totalPass: 30,
            },
          },
          mockAdmin,
        );

        // Activation without jlpt.jp source -> Throws OFFICIAL_SOURCE_REQUIRED
        expect(() => {
          bpm.activateBlueprint(unconfirmedBp.id!, 1, mockAdmin, { confirmedBy: mockAdmin.id });
        }).toThrow(BlueprintManagerError);

        try {
          bpm.activateBlueprint(unconfirmedBp.id!, 1, mockAdmin, { confirmedBy: mockAdmin.id });
        } catch (err: unknown) {
          const e = err as BlueprintManagerError;
          expect(e.code).toBe('OFFICIAL_SOURCE_REQUIRED');
        }
      });
    });

    describe('3. Exam Publishing & Version Immutability (ADM-04)', () => {
      const blueprintN1: Blueprint = {
        id: 'bp_N1_official',
        level: 'N1',
        version: 1,
        kind: 'official',
        status: 'active',
        effectiveFrom: '2026-01-01',
        sourceRef: [{ url: 'https://www.jlpt.jp', accessedAt: '2026-01-01T00:00:00Z' }],
        sections: [
          {
            code: 'language_knowledge',
            title: 'Kiến thức ngôn ngữ',
            durationSec: 6600,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 1 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [{ code: 'language_knowledge', label: 'Ngôn ngữ', skills: ['kanji'], maxScaled: 60, minPass: 19 }],
          totalMax: 60,
          totalPass: 30,
        },
      };

      it('validates blueprint conformity and blocks publishing unapproved question groups', () => {
        const em = new ExamManager();
        const exam = em.createExam(
          {
            slug: 'exam-n1-draft',
            level: 'N1',
            title: 'Đề thi nháp N1',
            kind: 'original',
            description: 'Đề N1',
            blueprintId: 'bp_N1_official',
            blueprintVersion: 1,
            sourceRefs: ['https://www.jlpt.jp'],
            sections: [
              {
                code: 'language_knowledge',
                title: 'Kiến thức ngôn ngữ',
                durationSec: 6600,
                orderIndex: 1,
                items: [
                  {
                    id: 'it_1',
                    examId: 'exam-n1-draft',
                    sectionCode: 'language_knowledge',
                    groupVersionId: 'grp_draft_v1',
                    groupId: 'grp_draft',
                    orderIndex: 1,
                    group: {
                      id: 'grp_draft',
                      version: 1,
                      level: 'N1',
                      sectionCode: 'language_knowledge',
                      mondaiType: 'kanji_reading',
                      skill: 'kanji',
                      instructions: [createTextSegment('Đề')],
                      passage: null,
                      mediaIds: [],
                      questions: [
                        {
                          stem: [createTextSegment('Câu')],
                          options: [
                            { label: '1', content: [createTextSegment('A')] },
                            { label: '2', content: [createTextSegment('B')] },
                            { label: '3', content: [createTextSegment('C')] },
                          ],
                          correctOption: 1,
                        },
                      ],
                      sourceRef: 'https://www.jlpt.jp',
                      status: 'draft', // CHƯA APPROVED!
                      lastEditedBy: mockEditor.id,
                      authorId: mockEditor.id,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  },
                ],
              },
            ],
          },
          mockEditor,
        );

        // Validation detects unapproved group
        const validation = validateExamBlueprint(exam, blueprintN1);
        expect(validation.valid).toBe(false);
        expect(validation.violations.some((v) => v.includes('chưa được duyệt'))).toBe(true);

        // Publishing is blocked
        expect(() => {
          em.publishExam(exam.id, blueprintN1, mockAdmin);
        }).toThrow(ExamManagerError);
      });

      it('publishes exam with strictly separated answer keys and immutable snapshot', () => {
        const em = new ExamManager();
        const exam = em.createExam(
          {
            slug: 'exam-n1-ready',
            level: 'N1',
            title: 'Đề thi N1 Đã duyệt',
            kind: 'original',
            description: 'Mô tả',
            blueprintId: 'bp_N1_official',
            blueprintVersion: 1,
            sourceRefs: ['https://www.jlpt.jp'],
            sections: [
              {
                code: 'language_knowledge',
                title: 'Kiến thức ngôn ngữ',
                durationSec: 6600,
                orderIndex: 1,
                items: [
                  {
                    id: 'it_ready',
                    examId: 'exam-n1-ready',
                    sectionCode: 'language_knowledge',
                    groupVersionId: 'grp_ok_v1',
                    groupId: 'grp_ok',
                    orderIndex: 1,
                    group: {
                      id: 'grp_ok',
                      version: 1,
                      level: 'N1',
                      sectionCode: 'language_knowledge',
                      mondaiType: 'kanji_reading',
                      skill: 'kanji',
                      instructions: [createTextSegment('Hướng dẫn')],
                      passage: null,
                      mediaIds: [],
                      questions: [
                        {
                          number: '1',
                          stem: [createTextSegment('Câu 1')],
                          options: [
                            { label: '1', content: [createTextSegment('A')] },
                            { label: '2', content: [createTextSegment('B')] },
                            { label: '3', content: [createTextSegment('C')] },
                            { label: '4', content: [createTextSegment('D')] },
                          ],
                          correctOption: 3,
                        },
                      ],
                      sourceRef: 'https://www.jlpt.jp',
                      status: 'approved', // ĐÃ APPROVED
                      lastEditedBy: mockEditor.id,
                      authorId: mockEditor.id,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  },
                ],
              },
            ],
          },
          mockAdmin,
        );

        // Xuất bản đề
        const published = em.publishExam(exam.id, blueprintN1, mockAdmin);
        expect(published.exam.status).toBe('published');
        expect(published.exam.publishedVersion).toBe(1);

        // Snapshot kiểm chứng KHÔNG chứa đáp án
        const rawSnapshot = JSON.stringify(published.snapshot);
        expect(rawSnapshot).not.toContain('"correctOption"');
        expect(rawSnapshot).not.toContain('"keys"');
        expect(rawSnapshot).not.toContain('"answers"');

        // Answer key được lưu riêng biệt
        expect(published.answerKey.keys).toEqual([3]);
        expect(published.answerKey.version).toBe(1);

        // THỬ SỬA ĐÈ ĐỀ ĐÃ XUẤT BẢN -> BỊ CHẶN BỞI QUY TẮC BẤT BIẾN (Acceptance 2)
        expect(() => {
          em.updateExam(exam.id, { title: 'Tên sửa đè' }, mockEditor);
        }).toThrow(ExamManagerError);

        try {
          em.updateExam(exam.id, { title: 'Tên sửa đè' }, mockEditor);
        } catch (err: unknown) {
          const e = err as ExamManagerError;
          expect(e.code).toBe('IMMUTABLE_VERSION');
          expect(e.message).toContain('Không thể sửa đè đề thi đã xuất bản');
        }
      });
    });
  });
});
