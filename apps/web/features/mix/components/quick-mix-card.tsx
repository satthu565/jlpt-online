'use client';

import React, { useState } from 'react';
import type { Level } from '@jlpt/schema';
import { Card, Button } from '@jlpt/ui';

export interface QuickMixCardProps {
  onQuickMix: (level: Level) => Promise<void> | void;
  isLoading?: boolean;
  className?: string;
}

export function QuickMixCard({
  onQuickMix,
  isLoading = false,
  className = '',
}: QuickMixCardProps): React.JSX.Element {
  const [selectedLevel, setSelectedLevel] = useState<Level>('N3');
  const levels: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

  const handleMixClick = () => {
    onQuickMix(selectedLevel);
  };

  return (
    <Card
      data-testid="quick-mix-card"
      className={`border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/70 to-indigo-50/70 dark:from-slate-900/80 dark:to-indigo-950/40 p-6 ${className}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Trộn đề nhanh 1 chạm (Quick Mix)
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
            Tạo tức thì một đề thi chuẩn cấu trúc JLPT được tổng hợp cân bằng từ các kỳ thi chính thức và ngân hàng câu hỏi chỉ với 1 click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {levels.map((lvl) => (
              <button
                key={lvl}
                type="button"
                data-testid={`quick-mix-level-${lvl}`}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedLevel === lvl
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            loading={isLoading}
            onClick={handleMixClick}
            data-testid="quick-mix-submit-btn"
          >
            Trộn đề {selectedLevel} ngay
          </Button>
        </div>
      </div>
    </Card>
  );
}
