'use client';

import { Pointer, Volume2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import type { DueFlashcard, ReviewRating } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface FlashcardViewProps {
  card: DueFlashcard;
  onRate: (rating: ReviewRating) => void;
  onPlayTts?: (text: string) => Promise<void>;
  cardIndex?: number;
  totalCards?: number;
}

export function FlashcardView({
  card,
  onRate,
  onPlayTts,
  cardIndex = 1,
  totalCards = 1,
}: FlashcardViewProps): React.JSX.Element {
  const { t } = useI18n();
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flipped state when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [card.cardId]);

  // Keyboard shortcuts (Space = flip, 1 = Again, 2 = Hard, 3 = Good, 4 = Easy)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') onRate(1);
        else if (e.key === '2') onRate(2);
        else if (e.key === '3') onRate(3);
        else if (e.key === '4') onRate(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, onRate]);

  const frontTerm = (card.front.term as string) || (card.front.prompt as string) || '';
  const frontReading = (card.front.reading as string) || '';
  const backMeaning = (card.back.meaning as string) || '';
  const backHanViet = (card.back.hanViet as string) || '';
  const backExamples = Array.isArray(card.back.examples) ? (card.back.examples as string[]) : [];

  return (
    <div
      className="flashcard-container max-w-[560px] mx-auto flex flex-col gap-5"
      data-testid="flashcard-view"
    >
      {/* Progress & State Indicator */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-[var(--text-secondary)]">
          {t('flashcards.progress', { current: String(cardIndex), total: String(totalCards) })}
        </span>
        <div className="flex gap-2">
          <Badge variant={card.state === 'new' ? 'primary' : 'secondary'}>
            {t(`flashcards.state.${card.state}`)}
          </Badge>
          <span className="text-[0.8125rem] text-[var(--text-muted)]">
            {t('flashcards.interval', { days: String(card.intervalDays) })}
          </span>
        </div>
      </div>

      {/* Flip Card Card */}
      <Card
        onClick={() => setIsFlipped(!isFlipped)}
        className="flex min-h-[280px] cursor-pointer select-none flex-col items-center justify-center p-8 text-center shadow-[var(--shadow-md)] transition-transform duration-200"
        data-testid="flashcard-card"
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? t('flashcards.flipToFront') : t('flashcards.flipToBack')}
      >
        <CardContent className="w-full">
          {/* Front Content */}
          <div className={isFlipped ? 'mb-6' : 'mb-0'}>
            {frontReading && isFlipped && (
              <p className="text-[var(--text-muted)] text-base mt-0 mx-0 mb-2">
                {frontReading}
              </p>
            )}

            <h2 className="text-[2.5rem] font-extrabold text-[var(--text-primary)] mt-0 mx-0 mb-4">
              {frontTerm}
            </h2>

            {onPlayTts && frontTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTts(frontTerm);
                }}
                aria-label={t('flashcards.playAudio')}
              >
                <Volume2 className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('flashcards.playAudio')}
              </Button>
            )}
          </div>

          {/* Hint before flip */}
          {!isFlipped && (
            <p className="text-[var(--text-muted)] text-sm mt-6">
              <Pointer className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('flashcards.clickOrSpaceToFlip')}
            </p>
          )}

          {/* Back Content */}
          {isFlipped && (
            <div className="pt-5 border-t border-dashed border-[var(--border-subtle)] mt-4"
              data-testid="flashcard-back"
            >
              {backHanViet && (
                <div className="text-base font-semibold text-[#b45309] bg-[rgba(245,158,11,0.12)] py-[4px] px-[12px] rounded-[8px] inline-block mb-3"
                  data-testid="flashcard-hanviet"
                >
                  Âm Hán Việt: {backHanViet}
                </div>
              )}

              <h3 className="text-2xl font-semibold text-[var(--color-primary)] mt-0 mx-0 mb-4">
                {backMeaning}
              </h3>

              {backExamples.length > 0 && (
                <div className="text-left mt-4">
                  <p className="text-sm font-semibold text-[var(--text-muted)] mt-0 mx-0 mb-1">
                    {t('flashcards.examplesTitle')}:
                  </p>
                  {backExamples.map((eg, idx) => (
                    <p className="text-[0.9375rem] text-[var(--text-secondary)] mt-0 mx-0 mb-1" key={idx}>
                      • {eg}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ratings Controls (Visible after flip) */}
      {isFlipped ? (
        <div className="grid grid-cols-4 gap-2"
          data-testid="flashcard-rating-buttons"
        >
          <Button className="border-[var(--color-error)] text-[var(--color-error)]"
            variant="outline"
            onClick={() => onRate(1)}
            aria-label={t('flashcards.rating.again')}
            data-testid="rating-again-button"
          >
            <div className="flex flex-col items-center">
              <span className="font-bold">{t('flashcards.rating.again')}</span>
              <span className="text-xs opacity-80">(1) &lt; 10m</span>
            </div>
          </Button>

          <Button className="border-[var(--color-warning)] text-[var(--color-warning)]"
            variant="outline"
            onClick={() => onRate(2)}
            aria-label={t('flashcards.rating.hard')}
            data-testid="rating-hard-button"
          >
            <div className="flex flex-col items-center">
              <span className="font-bold">{t('flashcards.rating.hard')}</span>
              <span className="text-xs opacity-80">(2) 1d</span>
            </div>
          </Button>

          <Button className="border-[var(--color-primary)] text-[var(--color-primary)]"
            variant="outline"
            onClick={() => onRate(3)}
            aria-label={t('flashcards.rating.good')}
            data-testid="rating-good-button"
          >
            <div className="flex flex-col items-center">
              <span className="font-bold">{t('flashcards.rating.good')}</span>
              <span className="text-xs opacity-80">(3) 3d</span>
            </div>
          </Button>

          <Button
            variant="primary"
            onClick={() => onRate(4)}
            aria-label={t('flashcards.rating.easy')}
            data-testid="rating-easy-button"
          >
            <div className="flex flex-col items-center">
              <span className="font-bold">{t('flashcards.rating.easy')}</span>
              <span className="text-xs opacity-80">(4) 7d</span>
            </div>
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <Button className="w-full min-h-[44px]"
            variant="outline"
            onClick={() => setIsFlipped(true)}
            aria-label={t('flashcards.showAnswer')}
          >
            {t('flashcards.showAnswer')}
          </Button>
        </div>
      )}
    </div>
  );
}
