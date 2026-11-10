'use client';

import { BookOpen, RotateCcw, Tag, Volume2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Chip, ProgressBar, Separator } from '@jlpt/ui/components/exam-controls';
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
  practice?: boolean;
}
export function FlashcardView({
  card, onRate, onPlayTts, cardIndex = 1, totalCards = 1, disabled = false, onTransitionStart, practice = false,
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
    <div className={styles.cardHeader}>
      <span className="text-[var(--text-secondary)]">{t('flashcards.progress', { current: cardIndex, total: totalCards })}</span>
      <ProgressBar value={cardIndex} maxValue={Math.max(cardIndex, totalCards)} className={styles.cardProgress}
        aria-label={t('flashcards.progress', { current: cardIndex, total: totalCards })}>
        <ProgressBar.Track className={styles.progressTrack}><ProgressBar.Fill className={styles.progressFill} /></ProgressBar.Track>
      </ProgressBar>
      <span className={styles.cardState}>{t(`flashcards.state.${card.state}`)}</span>
    </div>
    <div className={`${styles.scene} ${isFlipped ? styles.answerScene : ''}`}>
      <div className={styles.stackBack} aria-hidden="true" />
      <div className={styles.stackFront} aria-hidden="true" />
      <div className={leaving ? (leaving === 1 ? styles.leaveLeft : styles.leaveRight) : styles.enter}>
        <div className={`${styles.flipper} ${isFlipped ? styles.flipped : ''}`}
          data-testid="flashcard-card">
          <Card className={`${styles.face} ${styles.front}`} aria-hidden={isFlipped} inert={isFlipped}>
            <Card.Content className={styles.faceContent}>
              <span className={styles.faceLabel}>{t('srs.study.prompt')}</span>
              <h2 lang="ja" className={styles.term}>{frontTerm}</h2>
              <span className={styles.flipHint}><RotateCcw size={14} aria-hidden="true" />{t('flashcards.clickOrSpaceToFlip')}</span>
              <Button variant="ghost" className={styles.frontTrigger} onPress={flip}
                disabled={disabled || Boolean(leaving)} aria-label={t('flashcards.flipToBack')}
                data-testid="flashcard-flip-front"><span className="sr-only">{t('flashcards.showAnswer')}</span></Button>
            </Card.Content>
          </Card>
          <Card className={`${styles.face} ${styles.back}`} aria-hidden={!isFlipped} inert={!isFlipped}>
            <Card.Content className={styles.answerContent} data-testid={isFlipped ? 'flashcard-back' : undefined}>
              <div className={styles.answerHeading}>
                <Chip size="lg" variant="soft" className={styles.answerBadge}>{t('srs.study.answer')}</Chip>
                <Button variant="ghost" size="icon" onPress={flip} disabled={disabled || Boolean(leaving)}
                  aria-label={t('flashcards.flipToFront')} className={styles.flipBack}>
                  <RotateCcw size={18} aria-hidden="true" />
                </Button>
              </div>
              {reading && <p lang="ja" className={styles.reading}>{reading}</p>}
              <div className={styles.answerTermRow}>
                <h2 lang="ja" className={styles.backTerm}>{frontTerm}</h2>
                {FEATURES.tts && onPlayTts && frontTerm && <Button variant="secondary" size="icon"
                  className={styles.audioButton} disabled={disabled || Boolean(leaving)}
                  onPress={() => { void onPlayTts(frontTerm); }} aria-label={t('flashcards.playAudio')}>
                  <Volume2 size={24} aria-hidden="true" />
                </Button>}
              </div>
              {hanViet && <Chip size="lg" variant="soft" className={styles.hanViet} data-testid="flashcard-hanviet">{t('srs.study.hanViet', { value: hanViet })}</Chip>}
              <div className={styles.answerDetails}>
                <Separator />
                <div className={styles.detailRow}>
                  <Chip size="lg" variant="soft" className={styles.detailLabel}><Tag size={18} aria-hidden="true" />{t('srs.study.meaningLabel')}</Chip>
                  <h3 className={styles.meaning}>{meaning}</h3>
                </div>
                {examples.length > 0 && <>
                  <Separator />
                  <div className={styles.detailRow}>
                    <Chip size="lg" variant="soft" className={styles.detailLabel}><BookOpen size={18} aria-hidden="true" />{t('srs.study.examplesLabel')}</Chip>
                    <div className={styles.examples}>
                      {examples.map((example, index) => <p key={index} lang="ja">{example}</p>)}
                    </div>
                  </div>
                </>}
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
    <div className={styles.controls}>
      {isFlipped && <p className={styles.ratingPrompt}>{t('srs.study.ratingPrompt')}</p>}
      {isFlipped ? <div className={styles.ratings} data-testid="flashcard-rating-buttons">
        {ratings.map(rating => <Button key={rating} variant={rating === 3 ? 'primary' : 'secondary'}
          className={`${styles.ratingButton} ${styles[names[rating - 1]!]}`}
          disabled={disabled || Boolean(leaving)} onPress={() => rate(rating)}
          aria-label={t(`srs.study.ratings.${names[rating - 1]}`)}
          data-testid={`rating-${names[rating - 1]}-button`}>
          <span className={styles.ratingContent}>
            <span>{t(`srs.study.ratings.${names[rating - 1]}`)}</span>
            <span className={styles.ratingInterval}>{practice ? t(rating === 1 ? 'srs.study.practiceAgain' : 'srs.study.practiceNext') : rating === 1 ? t('srs.study.shortMinutes', { minutes: 10 }) : t('srs.study.shortDays', { days: projectCard(card, rating).intervalDays })}</span>
          </span>
        </Button>)}
      </div> : <Button className="w-full min-h-12" variant="primary" onPress={flip} disabled={disabled || Boolean(leaving)}
        aria-label={t('flashcards.showAnswer')}>{t('flashcards.showAnswer')}</Button>}
      <p className={styles.ratingHint}>
        {practice && isFlipped ? t('srs.study.practiceHint') : isFlipped ? t('srs.study.ratingHint') : t('srs.study.keyboardHint')}
      </p>
    </div>
  </div>;
}
