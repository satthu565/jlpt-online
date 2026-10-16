'use client';

import React, { useState } from 'react';
import type { GeneratedExam } from '@jlpt/schema';
import { Card, Badge, Button } from '@jlpt/ui';
import { ShareExamModal } from './share-exam-modal';

export interface GeneratedExamCardProps {
  generatedExam: GeneratedExam;
  title?: string;
  onRegenerate?: (newSeed: number) => Promise<void> | void;
  isRegenerating?: boolean;
  className?: string;
}

export function GeneratedExamCard({
  generatedExam,
  title = 'Đề thi đã trộn thành công',
  onRegenerate,
  isRegenerating = false,
  className = '',
}: GeneratedExamCardProps): React.JSX.Element {
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleRegenerate = () => {
    const nextSeed = Math.floor(Math.random() * 1000000);
    onRegenerate?.(nextSeed);
  };

  const sources = generatedExam.sourceSummary || {};

  return (
    <Card
      data-testid="generated-exam-card"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-5 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="success" size="sm">
              Đã tạo đề trộn
            </Badge>
            {generatedExam.blueprintConformant && (
              <span
                data-testid="blueprint-conformant-badge"
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              >
                ✓ Chuẩn Blueprint JLPT
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Share Exam Button (MIX-14) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            data-testid="share-exam-btn"
          >
            🔗 Chia sẻ đề
          </Button>

          {/* Regenerate Exam with New Seed (MIX-15) */}
          {onRegenerate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={isRegenerating}
              onClick={handleRegenerate}
              data-testid="regenerate-exam-btn"
            >
              🔄 Trộn lại (Seed mới)
            </Button>
          )}

          <a href={`/phong-thi?examId=${generatedExam.examId}`}>
            <Button variant="primary" size="sm" data-testid="start-generated-exam-btn">
              Vào thi ngay
            </Button>
          </a>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
        <div>
          <span className="text-[11px] text-slate-500 block">Mã sinh đề:</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
            {generatedExam.id.slice(0, 13)}...
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 block">Hạt giống (Seed):</span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block" data-testid="generated-seed">
            {generatedExam.seed}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 block">Số nhóm câu hỏi:</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
            {generatedExam.selectionGroupIds?.length || 0} nhóm
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 block">Engine Version:</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
            {generatedExam.engineVersion || '1.0.0'}
          </span>
        </div>
      </div>

      {/* Source Summary Breakdown (MIX-01..12) */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Tỷ lệ đóng góp nguồn đề (Source Breakdown):
        </h4>
        <div className="space-y-1.5" data-testid="source-summary-list">
          {Object.entries(sources).map(([srcKey, val]) => {
            const item = val as { count?: number; ratio?: number; requestedRatio?: number };
            const count = item.count ?? 0;
            const ratioPct = Math.round((item.ratio ?? 0) * 100);
            const reqPct = Math.round((item.requestedRatio ?? item.ratio ?? 0) * 100);

            return (
              <div
                key={srcKey}
                data-testid={`source-item-${srcKey}`}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-xs flex items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{srcKey}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      {count} câu ({ratioPct}%) / Yêu cầu: {reqPct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, ratioPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warnings if any */}
      {generatedExam.warnings && generatedExam.warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <span className="font-bold block">Lưu ý sinh đề:</span>
          <ul className="list-disc list-inside">
            {generatedExam.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Share Modal */}
      <ShareExamModal
        isOpen={shareModalOpen}
        examId={generatedExam.examId}
        examTitle={title}
        onClose={() => setShareModalOpen(false)}
      />
    </Card>
  );
}
