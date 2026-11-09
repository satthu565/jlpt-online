'use client';

import { RotateCcw, Volume2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Chip } from '@jlpt/ui/components/exam-controls';
import type { DueFlashcard, ReviewRating } from '../types';
import { useI18n } from '../../../lib/i18n';
import { FEATURES } from '../../../lib/features';
import { projectCard } from '../services/srs-study-session';
import styles from './flashcard-view.module.css';

export interface FlashcardViewProps {
  card: DueFlashcard;
  onRate: (rating: ReviewRating) => void;
  onPlayTts?: (text: string) => Promise<void>;
  cardIndex?: number;
  totalCards?: number;
  disabled?: boolean;
  onTransitionStart?: () => void;
}
export function FlashcardView({
  card, onRate, onPlayTts, cardIndex = 1, totalCards = 1, disabled = false, onTransitionStart,
}: FlashcardViewProps): React.JSX.Element {
  const { t } = useI18n();
  const [isFlipped, setIsFlipped] = useState(false);
  const [leaving, setLeaving] = useState<ReviewRating | null>(null);
  const ratingLock = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  useEffect(() => {
    setIsFlipped(false); setLeaving(null); ratingLock.current = false;
  }, [card.cardId]);

  const flip = () => { if (!ratingLock.current && !disabled) setIsFlipped(value => !value); };
  const rate = (rating: ReviewRating) => {
    if (!isFlipped || ratingLock.current || disabled) return;
    ratingLock.current = true;
    onTransitionStart?.();
    setLeaving(rating);
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    timeout.current = setTimeout(() => onRate(rating), reduced ? 0 : 220);
  };
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (event.repeat || target?.closest('input,textarea,select,[contenteditable="true"],[role="combobox"],[role="listbox"],[role="option"]')) return;
      if (event.code === 'Space') {
        // Focused buttons handle Space themselves through HeroUI.
        if (target?.closest('button,[role="button"]') && !target.closest('[data-flip-surface]')) return;
        event.preventDefault(); flip();
      } else if (isFlipped && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault(); rate(Number(event.key) as ReviewRating);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const text = (value: unknown): string => typeof value === 'string' ? value : '';
  const frontTerm = text(card.front.term) || text(card.front.kanji) || text(card.front.pattern) || text(card.front.meaning) || text(card.front.prompt);
  const reading = text(card.front.reading) || text(card.back.reading);
  const meaning = text(card.back.meaning) || text(card.back.term);
  const hanViet = text(card.back.hanViet);
  const examples = Array.isArray(card.back.examples) ? card.back.examples.filter((value): value is string => typeof value === 'string') : [];
  const ratings = [1, 2, 3, 4] as const;
  const names = ['again', 'hard', 'good', 'easy'];

  return <div className={styles.studyCard} data-testid="flashcard-view">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-[var(--text-secondary)]">{t('flashcards.progress', { current: cardIndex, total: totalCards })}</span>
      <Chip size="sm" variant="tertiary">{t(`flashcards.state.${card.state}`)}</Chip>
    </div>
    <div className={styles.scene}>
      <div className={styles.stackBack} aria-hidden="true" />
      <div className={styles.stackFront} aria-hidden="true" />
      <div className={leaving ? (leaving === 1 ? styles.leaveLeft : styles.leaveRight) : styles.enter}>
        <div className={`${styles.flipper} ${isFlipped ? styles.flipped : ''}`}
          data-testid="flashcard-card" data-flip-surface role="button" tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || Boolean(leaving)}
          aria-label={isFlipped ? t('flashcards.flipToFront') : t('flashcards.flipToBack')}
          onClick={flip} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); flip(); } }}>
          <Card className={`${styles.face} ${styles.front}`} aria-hidden={isFlipped} inert={isFlipped}>
            <Card.Content className={styles.faceContent}>
              <span className={styles.faceLabel}>{t('srs.study.prompt')}</span>
              <h2 lang="ja" className={styles.term}>{frontTerm}</h2>
              <span className={styles.flipHint}><RotateCcw size={14} aria-hidden="true" />{t('flashcards.clickOrSpaceToFlip')}</span>
            </Card.Content>
          </Card>
          <Card className={`${styles.face} ${styles.back}`} aria-hidden={!isFlipped} inert={!isFlipped}>
            <Card.Content className={styles.faceContent} data-testid={isFlipped ? 'flashcard-back' : undefined}>
              <span className={styles.faceLabel}>{t('srs.study.answer')}</span>
              {reading && <p lang="ja" className={styles.reading}>{reading}</p>}
              <h2 lang="ja" className={styles.backTerm}>{frontTerm}</h2>
              {hanViet && <p className="text-sm text-[var(--text-secondary)]" data-testid="flashcard-hanviet">{t('srs.study.hanViet', { value: hanViet })}</p>}
              <h3 className={styles.meaning}>{meaning}</h3>
              {examples.length > 0 && <div className={styles.examples}>
                <p className="mb-2 text-xs text-[var(--text-muted)]">{t('flashcards.examplesTitle')}</p>
                {examples.map((example, index) => <p key={index} className="mb-2 leading-relaxed">{example}</p>)}
              </div>}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
    {FEATURES.tts && onPlayTts && frontTerm && <Button variant="ghost" size="sm"
      onPress={() => { void onPlayTts(frontTerm); }} aria-label={t('flashcards.playAudio')}>
      <Volume2 size={16} aria-hidden="true" />{t('flashcards.playAudio')}
    </Button>}
    <div className={styles.controls}>
      {isFlipped ? <div className={styles.ratings} data-testid="flashcard-rating-buttons">
        {ratings.map(rating => <Button key={rating} variant={rating === 3 ? 'primary' : 'secondary'}
          className="min-h-16 h-auto whitespace-normal py-3"
          disabled={disabled || Boolean(leaving)} onPress={() => rate(rating)}
          aria-label={t(`srs.study.ratings.${names[rating - 1]}`)}
          data-testid={`rating-${names[rating - 1]}-button`}>
          <span className="flex flex-col items-center gap-1">
            <span>{t(`srs.study.ratings.${names[rating - 1]}`)}</span>
            <span className="text-xs font-normal">{rating === 1 ? t('srs.study.inSessionMinutes', { minutes: 10 }) : t('srs.study.inDays', { days: projectCard(card, rating).intervalDays })}</span>
          </span>
        </Button>)}
      </div> : <Button className="w-full min-h-12" variant="primary" onPress={flip} disabled={disabled || Boolean(leaving)}
        aria-label={t('flashcards.showAnswer')}>{t('flashcards.showAnswer')}</Button>}
      <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
        {isFlipped ? t('srs.study.intervalHint') : t('srs.study.keyboardHint')}
      </p>
    </div>
  </div>;
}
