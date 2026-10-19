import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import type { Level } from '@jlpt/schema';
import {
  ReviewService,
  SelfReviewForbiddenError,
  ReviewPermissionError,
  ReviewQueueView,
} from '../features/review';
import { AdminAuthProvider } from '../lib/auth-context';
import type { ReviewItem, StaffOperator } from '../features/review/types';
import type { AdminQuestionGroup } from '../features/content/types';
import { createTextSegment } from '../features/content/types';

describe('Content Review & Two-Person Verification Suite (N04)', () => {
  const editorOp1: StaffOperator = {
    id: 'usr_editor_01',
    email: 'editor1@jlpt.local',
    role: 'editor',
    name: 'Biên tập viên 1',
  };

  const editorOp2: StaffOperator = {
    id: 'usr_editor_02',
    email: 'editor2@jlpt.local',
    role: 'editor',
    name: 'Biên tập viên 2',
  };

  const reviewerOp: StaffOperator = {
    id: 'usr_reviewer_01',
    email: 'reviewer1@jlpt.local',
    role: 'reviewer',
    name: 'Người duyệt độc lập',
  };

  const adminOp: StaffOperator = {
    id: 'usr_admin_01',
    email: 'admin1@jlpt.local',
    role: 'admin',
    name: 'Quản trị viên',
  };

  let reviewService: ReviewService;
  let sampleGroup: AdminQuestionGroup;

  beforeEach(() => {
    sampleGroup = {
      id: 'grp_rev_01',
      version: 1,
      level: 'N3' as Level,
      sectionCode: 'language_knowledge',
      mondaiType: 'kanji_reading',
      skill: 'kanji',
      instructions: [createTextSegment('Chọn cách đọc đúng cho từ gạch chân.')],
      passage: null,
      mediaIds: [],
      questions: [
        {
          questionId: 'q_rev_01',
          number: '1',
          stem: [createTextSegment('彼の手紙に感動しました。')],
          options: [
            { label: '1', content: [createTextSegment('かんどう')] },
            { label: '2', content: [createTextSegment('かんとう')] },
            { label: '3', content: [createTextSegment('かんどう')] },
            { label: '4', content: [createTextSegment('かんとう')] },
          ],
          correctOption: 1,
          explanation: [createTextSegment('感動 đọc là かんどう.')],
        },
      ],
      sourceRef: 'n3-2025-de-goc.pdf',
      sourcePage: 3,
      status: 'draft',
      authorId: editorOp1.id,
      lastEditedBy: editorOp1.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    reviewService = new ReviewService();
  });

  // =========================================================================
  // Acceptance 2: Editor không tự duyệt (Separation of duties / 4-eyes rule)
  // =========================================================================
  describe('Acceptance 2: Editor không tự duyệt (Separation of duties / Two-person rule)', () => {
    it('allows editor to submit content for review', () => {
      const submitted = reviewService.submitForReview(
        {
          targetType: 'question_group',
          targetId: sampleGroup.id,
          version: sampleGroup.version,
          title: 'Nhóm câu hỏi N3 Kanji (Đề 2025)',
          sourceRef: sampleGroup.sourceRef,
          sourcePage: sampleGroup.sourcePage,
          groupData: sampleGroup,
        },
        editorOp1,
      );

      expect(submitted.status).toBe('in_review');
      expect(submitted.authorId).toBe(editorOp1.id);
      expect(submitted.lastEditedBy).toBe(editorOp1.id);

      const pending = reviewService.listPendingReviews();
      expect(pending).toHaveLength(1);
      expect(pending[0]!.targetId).toBe(sampleGroup.id);
    });

    it('strictly forbids the author/editor from approving their own content (SelfReviewForbiddenError)', () => {
      reviewService.submitForReview(
        {
          targetType: 'question_group',
          targetId: sampleGroup.id,
          version: sampleGroup.version,
          title: 'Nhóm câu hỏi N3 Kanji (Đề 2025)',
          sourceRef: sampleGroup.sourceRef,
          sourcePage: sampleGroup.sourcePage,
          groupData: sampleGroup,
        },
        editorOp1,
      );

      // Editor 1 tries to approve their own content:
      expect(() =>
        reviewService.reviewDecision(
          sampleGroup.id,
          sampleGroup.version,
          { decision: 'approved', comment: 'Tôi tự duyệt' },
          editorOp1,
        ),
      ).toThrow(ReviewPermissionError); // editor role cannot review

      // Even if editor has admin role or uses admin account with the SAME authorId:
      const adminWhoIsAuthor: StaffOperator = {
        ...adminOp,
        id: editorOp1.id, // same ID as author!
      };

      expect(() =>
        reviewService.reviewDecision(
          sampleGroup.id,
          sampleGroup.version,
          { decision: 'approved', comment: 'Tự duyệt với quyền admin' },
          adminWhoIsAuthor,
        ),
      ).toThrow(SelfReviewForbiddenError);

      try {
        reviewService.reviewDecision(
          sampleGroup.id,
          sampleGroup.version,
          { decision: 'approved', comment: 'Tự duyệt' },
          adminWhoIsAuthor,
        );
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(SelfReviewForbiddenError);
        expect((err as SelfReviewForbiddenError).message).toContain(
          'Editor không thể tự duyệt nội dung do chính mình biên tập',
        );
      }
    });

    it('allows an independent reviewer (different ID) to review and approve', () => {
      reviewService.submitForReview(
        {
          targetType: 'question_group',
          targetId: sampleGroup.id,
          version: sampleGroup.version,
          title: 'Nhóm câu hỏi N3 Kanji (Đề 2025)',
          sourceRef: sampleGroup.sourceRef,
          sourcePage: sampleGroup.sourcePage,
          groupData: sampleGroup,
        },
        editorOp1,
      );

      const reviewed = reviewService.reviewDecision(
        sampleGroup.id,
        sampleGroup.version,
        { decision: 'approved', comment: 'Đã đối chiếu khớp trang 3 của PDF gốc' },
        reviewerOp,
      );

      expect(reviewed.status).toBe('approved');
      expect(reviewed.reviewerId).toBe(reviewerOp.id);
      expect(reviewed.reviewComment).toBe('Đã đối chiếu khớp trang 3 của PDF gốc');
      expect(reviewed.groupData?.status).toBe('approved');

      // Verify audit trail
      const logs = reviewService.getAuditLogs(sampleGroup.id);
      expect(logs).toHaveLength(2); // submitted + approved
      expect(logs[0]!.action).toBe('submitted');
      expect(logs[0]!.actorId).toBe(editorOp1.id);
      expect(logs[1]!.action).toBe('approved');
      expect(logs[1]!.actorId).toBe(reviewerOp.id);
    });

    it('requires a reason/comment when rejecting content', () => {
      reviewService.submitForReview(
        {
          targetType: 'question_group',
          targetId: sampleGroup.id,
          version: sampleGroup.version,
          title: 'Nhóm câu hỏi N3 Kanji (Đề 2025)',
          sourceRef: sampleGroup.sourceRef,
          sourcePage: sampleGroup.sourcePage,
          groupData: sampleGroup,
        },
        editorOp1,
      );

      expect(() =>
        reviewService.reviewDecision(
          sampleGroup.id,
          sampleGroup.version,
          { decision: 'rejected', comment: '' }, // empty comment!
          reviewerOp,
        ),
      ).toThrow(/nhận xét khi từ chối/);

      const rejected = reviewService.reviewDecision(
        sampleGroup.id,
        sampleGroup.version,
        { decision: 'rejected', comment: 'Lỗi trùng lặp phương án 1 và 3' },
        reviewerOp,
      );

      expect(rejected.status).toBe('rejected');
      expect(rejected.reviewComment).toBe('Lỗi trùng lặp phương án 1 và 3');
    });
  });

  // =========================================================================
  // PDF-20: Cho phép biên tập viên sửa nội dung
  // =========================================================================
  describe('PDF-20: Cho phép biên tập viên sửa nội dung trong review queue', () => {
    it('allows an editor to update question stem and source page reference', () => {
      reviewService.submitForReview(
        {
          targetType: 'question_group',
          targetId: sampleGroup.id,
          version: sampleGroup.version,
          title: 'Nhóm câu hỏi N3 Kanji (Đề 2025)',
          sourceRef: sampleGroup.sourceRef,
          sourcePage: sampleGroup.sourcePage,
          groupData: sampleGroup,
        },
        editorOp1,
      );

      // Editor 2 makes a correction:
      const updated = reviewService.updateContentInReview(
        sampleGroup.id,
        sampleGroup.version,
        {
          sourcePage: 4,
          sourceRef: 'n3-2025-de-goc-revised.pdf',
        },
        editorOp2,
      );

      expect(updated.sourcePage).toBe(4);
      expect(updated.sourceRef).toBe('n3-2025-de-goc-revised.pdf');
      expect(updated.lastEditedBy).toBe(editorOp2.id);

      // Now Editor 2 is the lastEditor: Editor 2 CANNOT approve this item either!
      const adminWhoIsEditor2: StaffOperator = {
        ...adminOp,
        id: editorOp2.id,
      };

      expect(() =>
        reviewService.reviewDecision(
          sampleGroup.id,
          sampleGroup.version,
          { decision: 'approved', comment: 'Tự duyệt sau khi sửa' },
          adminWhoIsEditor2,
        ),
      ).toThrow(SelfReviewForbiddenError);
    });
  });

  // =========================================================================
  // PDF-19 & PDF-26: Hiển thị PDF gốc bên cạnh dữ liệu trích xuất & lưu liên kết
  // =========================================================================
  describe('PDF-19 & PDF-26: Hiển thị PDF gốc bên cạnh dữ liệu trích xuất và lưu liên kết nguồn', () => {
    it('retains sourceRef and sourcePage to each question and group', () => {
      const item: ReviewItem = {
        id: 'rev_1',
        targetType: 'question_group',
        targetId: 'grp_01',
        version: 1,
        title: 'Nhóm câu hỏi N2 Dokkai',
        status: 'in_review',
        authorId: editorOp1.id,
        lastEditedBy: editorOp1.id,
        submittedAt: new Date().toISOString(),
        sourceRef: 'n2-reading-sources.pdf',
        sourcePage: 12,
        groupData: sampleGroup,
      };

      const markup = renderToStaticMarkup(
        React.createElement(
          AdminAuthProvider,
          null,
          React.createElement(ReviewQueueView, { initialItems: [item], currentOperator: reviewerOp }),
        ),
      );

      expect(markup).toContain('Hàng Đợi Kiểm Duyệt Nội Dung');
      expect(markup).toContain('Nhóm câu hỏi N2 Dokkai');
      expect(markup).toContain('Trang 12');
      expect(markup).toContain('data-testid="compare-pdf-btn-grp_01"');
      expect(markup).toContain('data-testid="edit-content-btn-grp_01"');
    });
  });
});
