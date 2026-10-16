'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge } from '@jlpt/ui';
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
  const backExamples = Array.isArray(card.back.examples) ? (card.back.examples as string[]) : [];

  return (
    <div
      className="flashcard-container"
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
      data-testid="flashcard-view"
    >
      {/* Progress & State Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {t('flashcards.progress', { current: String(cardIndex), total: String(totalCards) })}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Badge variant={card.state === 'new' ? 'primary' : 'secondary'}>
            {t(`flashcards.state.${card.state}`)}
          </Badge>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {t('flashcards.interval', { days: String(card.intervalDays) })}
          </span>
        </div>
      </div>

      {/* Flip Card Card */}
      <Card
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          minHeight: '280px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)',
          transition: 'transform 0.2s ease',
          userSelect: 'none',
        }}
        data-testid="flashcard-card"
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? t('flashcards.flipToFront') : t('flashcards.flipToBack')}
      >
        <CardContent style={{ width: '100%' }}>
          {/* Front Content */}
          <div style={{ marginBottom: isFlipped ? '1.5rem' : '0' }}>
            {frontReading && isFlipped && (
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: '0 0 0.5rem 0' }}>
                {frontReading}
              </p>
            )}

            <h2
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: '0 0 1rem 0',
              }}
            >
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
                🔊 {t('flashcards.playAudio')}
              </Button>
            )}
          </div>

          {/* Hint before flip */}
          {!isFlipped && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1.5rem' }}>
              👆 {t('flashcards.clickOrSpaceToFlip')}
            </p>
          )}

          {/* Back Content */}
          {isFlipped && (
            <div
              style={{
                paddingTop: '1.25rem',
                borderTop: '1px dashed var(--border-subtle)',
                marginTop: '1rem',
              }}
              data-testid="flashcard-back"
            >
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  margin: '0 0 1rem 0',
                }}
              >
                {backMeaning}
              </h3>

              {backExamples.length > 0 && (
                <div style={{ textAlign: 'left', marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 0.25rem 0' }}>
                    {t('flashcards.examplesTitle')}:
                  </p>
                  {backExamples.map((eg, idx) => (
                    <p key={idx} style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
          }}
          data-testid="flashcard-rating-buttons"
        >
          <Button
            variant="outline"
            onClick={() => onRate(1)}
            aria-label={t('flashcards.rating.again')}
            data-testid="rating-again-button"
            style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>{t('flashcards.rating.again')}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(1) &lt; 10m</span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => onRate(2)}
            aria-label={t('flashcards.rating.hard')}
            data-testid="rating-hard-button"
            style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>{t('flashcards.rating.hard')}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(2) 1d</span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => onRate(3)}
            aria-label={t('flashcards.rating.good')}
            data-testid="rating-good-button"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>{t('flashcards.rating.good')}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(3) 3d</span>
            </div>
          </Button>

          <Button
            variant="primary"
            onClick={() => onRate(4)}
            aria-label={t('flashcards.rating.easy')}
            data-testid="rating-easy-button"
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>{t('flashcards.rating.easy')}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(4) 7d</span>
            </div>
          </Button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <Button
            variant="outline"
            onClick={() => setIsFlipped(true)}
            aria-label={t('flashcards.showAnswer')}
            style={{ width: '100%', minHeight: '44px' }}
          >
            {t('flashcards.showAnswer')}
          </Button>
        </div>
      )}
    </div>
  );
}
