import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { AttemptSummary } from '@jlpt/schema';
import {
  ExamHistorySummary,
  ExamResumeBanner,
  GuestSaveNote,
  PassCriteria,
} from '../features/library/components/exam-detail-learner';

const EXAM_ID = '0192f000-0000-7000-8000-0000000000aa';

function attempt(overrides: Partial<AttemptSummary>): AttemptSummary {
  return {
    id: '0192f000-0000-7000-8000-0000000000b1',
    examId: EXAM_ID,
    examVersion: 1,
    mode: 'real',
    status: 'submitted',
    startedAt: '2026-11-01T01:00:00.000Z',
    submittedAt: '2026-11-01T03:00:00.000Z',
    score: 95,
    passed: true,
    ...overrides,
  };
}

describe('trang chi tiết đề: thông tin cho người học', () => {
  it('ExamResumeBanner dẫn tới bài đang làm dở và ẩn khi không có', () => {
    const open = attempt({ id: '0192f000-0000-7000-8000-0000000000b2', status: 'in_progress', submittedAt: null, score: null, passed: null });
    const html = renderToString(<ExamResumeBanner attempts={[attempt({}), open]} />);
    expect(html).toContain('exam-resume-banner');
    expect(html).toContain(`/phong-thi?attemptId=${open.id}&amp;mode=real`);
    expect(renderToString(<ExamResumeBanner attempts={[attempt({})]} />)).toBe('');
  });

  it('ExamHistorySummary hiện số lần, điểm cao nhất và link kết quả lần gần nhất', () => {
    const older = attempt({ id: '0192f000-0000-7000-8000-0000000000b3', score: 120, submittedAt: '2026-10-20T03:00:00.000Z' });
    const newer = attempt({ id: '0192f000-0000-7000-8000-0000000000b4', score: 80, passed: false });
    const html = renderToString(<ExamHistorySummary attempts={[older, newer]} />);
    expect(html).toContain('2 lần');
    expect(html).toContain('120 / 180');
    expect(html).toContain(`/ket-qua/${newer.id}`);
    expect(html).toContain('Chưa đạt');
  });

  it('ExamHistorySummary không hiện khi chưa nộp lần nào', () => {
    const open = attempt({ status: 'in_progress', submittedAt: null, score: null, passed: null });
    expect(renderToString(<ExamHistorySummary attempts={[open]} />)).toBe('');
  });

  it('PassCriteria lấy điểm đỗ và điểm sàn từ bảng chấm chính thức', () => {
    const n4 = renderToString(<PassCriteria level="N4" />);
    expect(n4).toContain('90');
    expect(n4).toContain('38');
    const n1 = renderToString(<PassCriteria level="N1" />);
    expect(n1).toContain('100');
    expect(n1).toContain('19');
  });

  it('GuestSaveNote nhắc khách đăng nhập và quay lại đúng đề', () => {
    const html = renderToString(<GuestSaveNote slug="n4-2024-07" />);
    expect(html).toContain('exam-guest-note');
    expect(html).toContain('redirect=%2Fde-thi%2Fn4-2024-07');
  });
});
