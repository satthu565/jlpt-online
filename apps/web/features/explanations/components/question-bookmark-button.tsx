'use client';

import React, { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@jlpt/ui/components/button';
import type { QuestionMarkType } from '../types';

export interface QuestionBookmarkButtonProps {
  questionId: string;
  initialBookmarked?: boolean;
  markType?: QuestionMarkType;
  onToggle?: (isBookmarked: boolean) => void;
  className?: string;
}

export function QuestionBookmarkButton({
  questionId,
  initialBookmarked = false,
  markType = 'review',
  onToggle,
  className = '',
}: QuestionBookmarkButtonProps): React.JSX.Element {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const nextState = !bookmarked;
    setBookmarked(nextState);
    onToggle?.(nextState);

    // Call API in background if possible
    try {
      setLoading(true);
      const method = nextState ? 'PUT' : 'DELETE';
      const endpoint = `/api/me/question-marks/${questionId}${!nextState ? `?markType=${markType}` : ''}`;
      await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: nextState ? JSON.stringify({ markType }) : undefined,
      }).catch(() => {
        // Fallback for offline/test environments
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      aria-label={bookmarked ? 'Bỏ đánh dấu câu hỏi' : 'Lưu câu hỏi để ôn tập lại'}
      data-testid="question-bookmark-btn"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] h-8 text-xs font-semibold transition-colors ${
        bookmarked
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
          : 'text-slate-600 dark:text-slate-400'
      } ${className}`}
    >
      {bookmarked ? (
        <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>{bookmarked ? 'Đã lưu' : 'Lưu câu hỏi'}</span>
    </Button>
  );
}
