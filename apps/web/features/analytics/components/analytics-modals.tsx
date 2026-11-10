'use client';

import { buildPracticeHref } from '../practice-link';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Modal } from '@jlpt/ui/components/modal';
import { Button } from '@jlpt/ui/components/button';
import type { MistakeRecord } from './analytics-mistake-library';

export interface AnalyticsModalsProps {
  infoModalOpen: boolean;
  onCloseInfoModal: () => void;
  questionModalRecord: MistakeRecord | null;
  onCloseQuestionModal: () => void;
  studyModalState: { open: boolean; title: string; message: string; actionText: string; actionHref?: string };
  onCloseStudyModal: () => void;
  detailModalState: { open: boolean; title: string; content: React.ReactNode };
  onCloseDetailModal: () => void;
}

export function AnalyticsModals({
  infoModalOpen,
  onCloseInfoModal,
  questionModalRecord,
  onCloseQuestionModal,
  studyModalState,
  onCloseStudyModal,
  detailModalState,
  onCloseDetailModal,
}: AnalyticsModalsProps): React.JSX.Element {
  return (
    <>
      {/* 1. Modal giải thích cách đánh giá khả năng đỗ */}
      <Modal
        isOpen={infoModalOpen}
        onClose={onCloseInfoModal}
        title="Cách đánh giá khả năng đỗ JLPT"
        footer={
          <Button variant="primary" size="sm" onClick={onCloseInfoModal}>
            Đã hiểu <Check className="size-3.5 inline ml-1" aria-hidden="true" />
          </Button>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>
            Bảng điều khiển sử dụng điểm thi thử <strong>ước tính</strong> để so sánh với các ngưỡng chuẩn của kỳ thi năng lực tiếng Nhật JLPT.
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <strong className="text-slate-800 dark:text-slate-200 block text-xs">Ngưỡng điểm tối thiểu (Điểm liệt):</strong>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>
                <strong>Cấp độ N1 – N3:</strong> Mỗi phần thi (Kiến thức ngôn ngữ, Đọc hiểu, Nghe hiểu) bắt buộc phải đạt tối thiểu <strong>19 / 60 điểm</strong>.
              </li>
              <li>
                <strong>Cấp độ N4 – N5:</strong> Phần Kiến thức ngôn ngữ + Đọc hiểu cần tối thiểu <strong>38 / 120 điểm</strong>; Nghe hiểu tối thiểu <strong>19 / 60 điểm</strong>.
              </li>
              <li>
                Đồng thời, tổng điểm tích lũy phải vượt qua ngưỡng đỗ của từng cấp độ (N1: 100/180, N2: 90/180, N3: 95/180, N4: 90/180, N5: 80/180).
              </li>
            </ul>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Điểm chính thức của JLPT được chuẩn hóa theo mô hình IRT (Item Response Theory), kết quả thi thử mang tính chất định hướng và đo lường độ sẵn sàng cá nhân.
          </p>
        </div>
      </Modal>

      {/* 2. Modal chi tiết câu hỏi sai */}
      {questionModalRecord && (
        <Modal
          isOpen={Boolean(questionModalRecord)}
          onClose={onCloseQuestionModal}
          title={`Câu sai của tôi · ${questionModalRecord.term}`}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onCloseQuestionModal}>
                Đóng
              </Button>
              <Link
                href={buildPracticeHref({
                  level: (questionModalRecord.level as 'N1' | 'N2' | 'N3' | 'N4' | 'N5') ?? 'N3',
                  pool: 'wrong',
                  skills: questionModalRecord.skill ? [questionModalRecord.skill] : undefined,
                  mondaiTypes: questionModalRecord.mondaiType ? [questionModalRecord.mondaiType] : undefined,
                  count: 10,
                  label: questionModalRecord.term,
                })}
              >
                <Button variant="primary" size="sm" onClick={onCloseQuestionModal}>
                  Luyện lại dạng câu này
                  <ArrowRight className="size-3.5 inline ml-1.5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          }
        >
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {questionModalRecord.meaning}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                Sai {questionModalRecord.wrong}/{questionModalRecord.total} lượt · Sai liên tiếp {questionModalRecord.streak} lần
              </span>
            </div>

            <div>
              <strong className="block text-slate-700 dark:text-slate-300 mb-1">
                Nguyên nhân ghi nhận:
              </strong>
              <p className="text-slate-500 dark:text-slate-400">
                {questionModalRecord.reason}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                {questionModalRecord.source}
              </div>
              <div className="font-japanese text-sm sm:text-base text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                {questionModalRecord.prompt}
              </div>

              <div className="pt-2 text-xs space-y-1">
                <p>
                  Bạn đã chọn:{' '}
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    {questionModalRecord.selected}
                  </span>
                </p>
                <p>
                  Đáp án đúng:{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {questionModalRecord.correct}
                  </span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 text-slate-700 dark:text-slate-300 text-xs mt-2 border border-indigo-100 dark:border-indigo-900/40">
                <strong className="text-indigo-800 dark:text-indigo-300 block mb-1">
                  Giải thích chi tiết:
                </strong>
                {questionModalRecord.explain}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Modal Luyện tập / Học tập */}
      <Modal
        isOpen={studyModalState.open}
        onClose={onCloseStudyModal}
        title={studyModalState.title}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCloseStudyModal}>
              Đóng
            </Button>
            {studyModalState.actionHref ? (
              <Link href={studyModalState.actionHref}>
                <Button variant="primary" size="sm" onClick={onCloseStudyModal}>
                  {studyModalState.actionText}
                  <ArrowRight className="size-3.5 inline ml-1.5" aria-hidden="true" />
                </Button>
              </Link>
            ) : (
              <Button variant="primary" size="sm" onClick={onCloseStudyModal}>
                {studyModalState.actionText}
                <Check className="size-3.5 inline ml-1.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>{studyModalState.message}</p>
          <div className="grid grid-cols-3 gap-2 py-3 text-center border-y border-slate-100 dark:border-slate-800 my-2">
            <div>
              <strong className="block text-lg font-bold text-indigo-600 dark:text-indigo-400">15</strong>
              <span className="text-[10px] text-slate-400">Số câu đề xuất</span>
            </div>
            <div>
              <strong className="block text-lg font-bold text-indigo-600 dark:text-indigo-400">30′</strong>
              <span className="text-[10px] text-slate-400">Thời lượng</span>
            </div>
            <div>
              <strong className="block text-lg font-bold text-indigo-600 dark:text-indigo-400">Chuẩn</strong>
              <span className="text-[10px] text-slate-400">Cấu trúc JLPT</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Sau khi hoàn thành phiên luyện tập, hệ thống sẽ tự động cập nhật lại các chỉ số và phân tích kỹ năng trên trang này.
          </p>
        </div>
      </Modal>

      {/* 4. Modal Chi tiết Phân tích nâng cao */}
      <Modal
        isOpen={detailModalState.open}
        onClose={onCloseDetailModal}
        title={detailModalState.title}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCloseDetailModal}>
              Đóng
            </Button>
            <Link href="/luyen-tap">
              <Button variant="primary" size="sm" onClick={onCloseDetailModal}>
                Luyện nội dung này
                <ArrowRight className="size-3.5 inline ml-1.5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {detailModalState.content}
        </div>
      </Modal>
    </>
  );
}
