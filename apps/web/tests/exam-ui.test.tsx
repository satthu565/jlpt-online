import {  } from 'lucide-react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SAMPLE_N5_EXAM_SNAPSHOT } from './fixtures/sample-exam';
import { flattenExamQuestions } from '../features/exam/utils/flatten-questions';
import { ExamClock } from '../features/exam/components/exam-clock';
import { SectionHeader } from '../features/exam/components/section-header';
import { QuestionView } from '../features/exam/components/question-view';
import { QuestionNavigation } from '../features/exam/components/question-navigation';
import { QuestionPalette } from '../features/exam/components/question-palette';
import { ExamProgressBar } from '../features/exam/components/exam-progress-bar';
import { SyncStatusIndicator } from '../features/exam/components/sync-status-indicator';
import { ExamPicker } from '../features/exam/components/exam-picker';
import { InstructionsModal } from '../features/exam/components/modals/instructions-modal';
import { EarlySubmitModal } from '../features/exam/components/modals/early-submit-modal';
import { SectionTransitionModal } from '../features/exam/components/modals/section-transition-modal';
import { FORBIDDEN_ANSWER_FIELDS } from '@jlpt/schema';
import { computeServerOffset, computeClientRemainingMs } from '@jlpt/exam-engine';

const renderClean = (element: React.ReactElement): string =>
  renderToString(element).replace(/<!--.*?-->/g, '');

describe('Exam UI & Interaction Suite (C03)', () => {
  const flatQuestions = flattenExamQuestions(SAMPLE_N5_EXAM_SNAPSHOT);

  // EXAM-01: Chọn đề thi
  it('[EXAM-01] ExamPicker lists exams with levels, durations, and question counts', () => {
    const html = renderClean(
      <ExamPicker
        exams={[SAMPLE_N5_EXAM_SNAPSHOT]}
        onSelectExam={() => {}}
      />,
    );

    expect(html).toContain('Đề thi thử JLPT N5 Mẫu Chuẩn');
    expect(html).toContain('5 câu');
    expect(html).toContain('N5');
    expect(html).toContain('Kiến thức ngôn ngữ (Từ vựng)');
    expect(html).toContain('Ngữ pháp &amp; Đọc hiểu');
    expect(html).toContain('Nghe hiểu');
  });

  // EXAM-02: Chọn chế độ thi thật hoặc luyện tập
  it('[EXAM-02] ExamPicker allows selecting real standard mode vs practice mode', () => {
    const html = renderToString(
      <ExamPicker
        exams={[SAMPLE_N5_EXAM_SNAPSHOT]}
        onSelectExam={() => {}}
      />,
    );

    expect(html).toContain('Thi thật (Chuẩn JLPT)');
    expect(html).toContain('Luyện tập tự do');
    expect(html).toContain('Khuyên dùng');
    expect(html).toContain('Giới hạn thời gian nghiêm ngặt');
  });

  // EXAM-03 & EXAM-06: Hiển thị hướng dẫn làm bài và lưu ý chuyển phần
  it('[EXAM-03 & EXAM-06] InstructionsModal shows exam regulations, section times, and locked section warnings', () => {
    const html = renderClean(
      <InstructionsModal
        isOpen={true}
        onClose={() => {}}
        onConfirmStart={() => {}}
        snapshot={SAMPLE_N5_EXAM_SNAPSHOT}
        mode="real"
      />,
    );

    expect(html).toContain('Hướng dẫn làm bài thi JLPT');
    expect(html).toContain('25');
    expect(html).toContain('50');
    expect(html).toContain('30');
    expect(html).toContain('BỊ KHÓA HOÀN TOÀN');
    expect(html).toContain('Bắt đầu làm bài');
  });

  // EXAM-04: Hiển thị thời gian thi từng phần
  it('[EXAM-04] SectionHeader displays all sections and their exact time limits', () => {
    const html = renderClean(
      <SectionHeader
        sections={SAMPLE_N5_EXAM_SNAPSHOT.sections}
        currentSectionIndex={0}
        lockedSections={[]}
      />,
    );

    expect(html).toContain('Kiến thức ngôn ngữ (Từ vựng)');
    expect(html).toContain('25');
    expect(html).toContain('Ngữ pháp &amp; Đọc hiểu');
    expect(html).toContain('50');
    expect(html).toContain('Nghe hiểu');
    expect(html).toContain('30');
    expect(html).toContain('role="tab"');
  });

  // EXAM-07: Bắt đầu thi và ghi nhận thời điểm bắt đầu
  it('[EXAM-07] computes server offset and start timestamp accurately via exam-engine', () => {
    const serverNow = '2026-10-16T10:00:00.000Z';
    const clientNow = '2026-10-16T09:59:58.000Z'; // client clock is 2 seconds behind server

    const offset = computeServerOffset(serverNow, clientNow);
    expect(offset).toBe(2000); // 2000ms offset

    const deadline = '2026-10-16T10:25:00.000Z'; // 25 minutes after server start
    const remainingMs = computeClientRemainingMs(deadline, serverNow, clientNow);
    expect(remainingMs).toBe(25 * 60 * 1000); // exactly 25 minutes remaining
  });

  // EXAM-08: Đồng hồ đếm ngược với trạng thái cảnh báo 5 phút và 1 phút
  it('[EXAM-08] ExamClock displays countdown with normal, 5m warning, and 1m critical states', () => {
    const serverNow = new Date().toISOString();

    // Normal state: > 5 minutes remaining (e.g. 15 minutes)
    const normalDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const htmlNormal = renderClean(
      <ExamClock deadline={normalDeadline} serverNow={serverNow} />,
    );
    expect(htmlNormal).toMatch(/15:0[01]/);
    expect(htmlNormal).toContain('data-alert-level="normal"');

    // Warning state: <= 5 minutes (e.g. 4 minutes)
    const warnDeadline = new Date(Date.now() + 4 * 60 * 1000).toISOString();
    const htmlWarn = renderClean(
      <ExamClock deadline={warnDeadline} serverNow={serverNow} />,
    );
    expect(htmlWarn).toMatch(/04:0[01]/);
    expect(htmlWarn).toContain('data-alert-level="warning"');
    expect(htmlWarn).toContain('&lt; 5 phút');

    // Critical state: <= 1 minute (e.g. 45 seconds)
    const critDeadline = new Date(Date.now() + 45 * 1000).toISOString();
    const htmlCrit = renderClean(
      <ExamClock deadline={critDeadline} serverNow={serverNow} />,
    );
    expect(htmlCrit).toMatch(/00:4[56]/);
    expect(htmlCrit).toContain('data-alert-level="critical"');
    expect(htmlCrit).toContain('Sắp hết giờ!');
  });

  // EXAM-10: Hiển thị câu hỏi và đáp án lựa chọn
  it('[EXAM-10] QuestionView renders stem with ruby, underline, options 1..4, and table passage', () => {
    // Q0 has ruby: あそこに 犬(いぬ) がいます。
    const q0 = flatQuestions[0]!;
    const html0 = renderToString(
      <QuestionView
        question={q0}
        selectedOption={1}
        isFlagged={false}
        onSelectOption={() => {}}
        onToggleFlag={() => {}}
      />,
    );

    expect(html0).toContain('<ruby');
    expect(html0).toContain('犬');
    expect(html0).toContain('いぬ');
    expect(html0).toContain('いぬ'); // option 1
    expect(html0).toContain('ねこ'); // option 2
    expect(html0).toContain('とり'); // option 3
    expect(html0).toContain('うま'); // option 4

    // Q3 has table passage
    const q3 = flatQuestions[3]!;
    const html3 = renderToString(
      <QuestionView
        question={q3}
        selectedOption={0}
        isFlagged={false}
        onSelectOption={() => {}}
        onToggleFlag={() => {}}
      />,
    );

    expect(html3).toContain('<table');
    expect(html3).toContain('月曜日〜金曜日');
    expect(html3).toContain('9:00〜20:00');
    expect(html3).toContain('土曜日は何時まで開いていますか。');
  });

  // EXAM-11: Chọn, đổi, bỏ chọn đáp án
  it('[EXAM-11] QuestionView supports selecting option, switching option, and deselecting to blank', () => {
    const selectSpy = vi.fn();
    const q0 = flatQuestions[0]!;

    // Rendering with selectedOption = 0 (unselected)
    const htmlUnselected = renderToString(
      <QuestionView
        question={q0}
        selectedOption={0}
        isFlagged={false}
        onSelectOption={selectSpy}
        onToggleFlag={() => {}}
      />,
    );
    expect(htmlUnselected).toContain('aria-checked="false"');

    // Rendering with selectedOption = 2 (selected)
    const htmlSelected = renderToString(
      <QuestionView
        question={q0}
        selectedOption={2}
        isFlagged={false}
        onSelectOption={selectSpy}
        onToggleFlag={() => {}}
      />,
    );
    expect(htmlSelected).toContain('aria-checked="true"');
    expect(htmlSelected).toContain('Bỏ chọn đáp án');
  });

  // EXAM-12: Chuyển câu trước / câu sau
  it('[EXAM-12] QuestionNavigation provides accessible Previous / Next and transition triggers', () => {
    const htmlMiddle = renderClean(
      <QuestionNavigation
        currentIndex={1}
        totalQuestions={5}
        isFirstInSection={false}
        isLastInSection={false}
        isLastSection={false}
        onPrev={() => {}}
        onNext={() => {}}
        onRequestNextSection={() => {}}
        onRequestSubmit={() => {}}
      />,
    );

    expect(htmlMiddle).toContain('Câu trước');
    expect(htmlMiddle).toContain('Câu sau');
    expect(htmlMiddle).toContain('Câu 2 / 5');

    // At end of section
    const htmlSectionEnd = renderClean(
      <QuestionNavigation
        currentIndex={1}
        totalQuestions={5}
        isFirstInSection={false}
        isLastInSection={true}
        isLastSection={false}
        onPrev={() => {}}
        onNext={() => {}}
        onRequestNextSection={() => {}}
        onRequestSubmit={() => {}}
      />,
    );
    expect(htmlSectionEnd).toContain('Chuyển phần tiếp theo');

    // On last section
    const htmlExamEnd = renderClean(
      <QuestionNavigation
        currentIndex={4}
        totalQuestions={5}
        isFirstInSection={false}
        isLastInSection={true}
        isLastSection={true}
        onPrev={() => {}}
        onNext={() => {}}
        onRequestNextSection={() => {}}
        onRequestSubmit={() => {}}
      />,
    );
    expect(htmlExamEnd).toContain('Nộp bài thi');
  });

  // EXAM-13 & EXAM-15: Danh sách câu hỏi dạng phiếu trả lời và phân biệt trạng thái
  it('[EXAM-13 & EXAM-15] QuestionPalette differentiates answered, unanswered, flagged, and current questions with legend', () => {
    const answers = [1, 0, 3, 0, 2]; // Q0 answered, Q1 unanswered, Q2 answered, Q3 unanswered, Q4 answered
    const flags = [0, 1, 0, 0, 1];   // Q1 and Q4 flagged

    const html = renderClean(
      <QuestionPalette
        questions={flatQuestions}
        currentIndex={2} // Q2 is current
        answers={answers}
        flags={flags}
        onSelectQuestion={() => {}}
      />,
    );

    expect(html).toContain('Phiếu trả lời');
    expect(html).toContain('3 / 5 đã làm');
    expect(html).toContain('Chú thích trạng thái:');
    expect(html).toContain('Đã làm');
    expect(html).toContain('Chưa làm');
    expect(html).toContain('Đánh dấu');
    expect(html).toContain('Đang chọn');

        // Contains flag icons
    expect(html).toContain('data-icon="flag"');
    expect(html).toContain('data-answered="true"');
    expect(html).toContain('data-flagged="true"');
  });

  // EXAM-14: Đánh dấu câu cần xem lại
  it('[EXAM-14] QuestionView has explicit bookmark/flag toggle button and state display', () => {
    const q0 = flatQuestions[0]!;
    const htmlFlagged = renderClean(
      <QuestionView
        question={q0}
        selectedOption={1}
        isFlagged={true}
        onSelectOption={() => {}}
        onToggleFlag={() => {}}
      />,
    );

    expect(htmlFlagged).toContain('Đã đánh dấu');
    expect(htmlFlagged).toContain('aria-pressed="true"');

    const htmlUnflagged = renderClean(
      <QuestionView
        question={q0}
        selectedOption={1}
        isFlagged={false}
        onSelectOption={() => {}}
        onToggleFlag={() => {}}
      />,
    );

    expect(htmlUnflagged).toContain('Đánh dấu xem lại');
    expect(htmlUnflagged).toContain('aria-pressed="false"');
  });

  // EXAM-16: Hiển thị tiến độ hoàn thành
  it('[EXAM-16] ExamProgressBar displays answered count and percentage correctly', () => {
    const html = renderClean(
      <ExamProgressBar answeredCount={3} totalQuestions={5} />,
    );

    expect(html).toContain('Tiến độ: 3 / 5 câu');
    expect(html).toContain('60%');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="60"');
    expect(html).toContain('style="width:60%"');
  });

  // EXAM-17: Tự động lưu đáp án indicator
  it('[EXAM-17] SyncStatusIndicator reflects all states: saved, saving, offline, error', () => {
    const htmlSaved = renderClean(<SyncStatusIndicator syncState="saved" />);
    expect(htmlSaved).toContain('Đã lưu');

    const htmlSaving = renderClean(<SyncStatusIndicator syncState="saving" />);
    expect(htmlSaving).toContain('Đang lưu...');

    const htmlOffline = renderClean(<SyncStatusIndicator syncState="offline_saved" />);
    expect(htmlOffline).toContain('Lưu local (Chưa đồng bộ)');

    const htmlError = renderClean(<SyncStatusIndicator syncState="error" onRetry={() => {}} />);
    expect(htmlError).toContain('Lỗi đồng bộ (đã lưu local)');
    expect(htmlError).toContain('Thử lại');
  });

  // EXAM-19: Xác nhận trước khi nộp bài sớm
  it('[EXAM-19] EarlySubmitModal shows counts of answered, unanswered, flagged, and warns about incomplete questions', () => {
    const html = renderClean(
      <EarlySubmitModal
        isOpen={true}
        onClose={() => {}}
        onConfirmSubmit={() => {}}
        totalQuestions={35}
        answeredCount={28}
        unansweredCount={7}
        flaggedCount={3}
      />,
    );

    expect(html).toContain('Xác nhận nộp bài thi');
    expect(html).toContain('28');
    expect(html).toContain('7');
    expect(html).toContain('3');
    expect(html).toContain('Bạn vẫn còn <strong>7 câu hỏi chưa làm</strong>');
    expect(html).toContain('Xác nhận nộp bài');
    expect(html).toContain('Tiếp tục làm bài');
  });

  // EXAM-21: Không cho xem đáp án khi đang thi
  it('[EXAM-21] Public exam snapshot and QuestionView omit all answer keys and explanations', () => {
    // 1. Snapshot schema omits all forbidden answer fields
    for (const forbidden of FORBIDDEN_ANSWER_FIELDS) {
      expect((SAMPLE_N5_EXAM_SNAPSHOT as Record<string, unknown>)[forbidden]).toBeUndefined();
    }

    // 2. Questions in snapshot omit answer keys
    for (const section of SAMPLE_N5_EXAM_SNAPSHOT.sections) {
      for (const group of section.groups) {
        for (const question of group.questions) {
          expect((question as Record<string, unknown>).correctOption).toBeUndefined();
          expect((question as Record<string, unknown>).explanation).toBeUndefined();
          expect((question as Record<string, unknown>).answerKey).toBeUndefined();
        }
      }
    }

    // 3. QuestionView does not display correct answer indicator during exam
    const q0 = flatQuestions[0]!;
    const html = renderClean(
      <QuestionView
        question={q0}
        selectedOption={1}
        isFlagged={false}
        onSelectOption={() => {}}
        onToggleFlag={() => {}}
      />,
    );
    expect(html).not.toContain('Đáp án đúng');
    expect(html).not.toContain('Giải thích:');
  });

  // EXAM-22: Không cho quay lại phần đã khóa
  it('[EXAM-22] SectionTransitionModal warns about permanent lock, and locked questions are disabled', () => {
    // Modal warning
    const htmlModal = renderClean(
      <SectionTransitionModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        currentSectionTitle="Kiến thức ngôn ngữ (Từ vựng)"
        nextSectionTitle="Ngữ pháp &amp; Đọc hiểu"
        unansweredInSection={1}
      />,
    );
    expect(htmlModal).toContain('BỊ KHÓA VĨNH VIỄN');
    expect(htmlModal).toContain('1 câu chưa làm');

    // Locked section questions in flattenQuestions
    const questionsWithLockedSection0 = flattenExamQuestions(SAMPLE_N5_EXAM_SNAPSHOT, [0]);
    expect(questionsWithLockedSection0[0]!.isLocked).toBe(true);
    expect(questionsWithLockedSection0[1]!.isLocked).toBe(true);
    expect(questionsWithLockedSection0[2]!.isLocked).toBe(false);

    // QuestionView for locked question has disabled buttons and locked badge
    const htmlLockedQ = renderClean(
      <QuestionView
        question={questionsWithLockedSection0[0]!}
        selectedOption={1}
        isFlagged={false}
        onSelectOption={() => {}}
        onToggleFlag={() => {}}
      />,
    );
    expect(htmlLockedQ).toContain('Đã khóa');
    expect(htmlLockedQ).toContain('disabled=""');

    // Palette for locked question has padlock icon and disabled click
    const htmlPalette = renderClean(
      <QuestionPalette
        questions={questionsWithLockedSection0}
        currentIndex={2}
        answers={[1, 0, 0, 0, 0]}
        flags={[0, 0, 0, 0, 0]}
        onSelectQuestion={() => {}}
      />,
    );
    expect(htmlPalette).toContain('data-icon="lock"');
    expect(htmlPalette).toContain('Phần thi đã khóa');
  });
});

