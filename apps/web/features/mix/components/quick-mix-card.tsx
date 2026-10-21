'use client';

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import type { Level } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';

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
            <Zap className="h-5 w-5 text-amber-500 shrink-0" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Trộn đề nhanh 1 chạm (Quick Mix)
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
            Tạo tức thì một đề thi chuẩn cấu trúc JLPT được tổng hợp cân bằng từ các kỳ thi chính thức và ngân hàng câu hỏi chỉ với 1 click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] flex items-center gap-1 p-1">
            {levels.map((lvl) => (
              <Button
                key={lvl}
                type="button"
                size="sm"
                variant={selectedLevel === lvl ? 'primary' : 'ghost'}
                data-testid={`quick-mix-level-${lvl}`}
                onClick={() => setSelectedLevel(lvl)}
                className="px-2.5 py-1 text-xs font-bold min-h-[32px] h-8"
              >
                {lvl}
              </Button>
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
