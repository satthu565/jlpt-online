'use client';

import { Check, Clock3, RotateCcw, RotateCcwSquare, Save, Settings2, Undo2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Chip, Modal, ProgressBar } from '@jlpt/ui/components/exam-controls';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import { Alert } from '@jlpt/ui/components/alert';
import type { DueFlashcard, ReviewRating } from '../types';
import { FlashcardView } from './flashcard-view';
import { SrsSyncManager, type SrsSyncSnapshot } from '../services/srs-sync-manager';
import { newReviewId } from '../services/srs-review-id';
import { practiceQueue, ratePractice, reviewedCards, undoPractice, type PracticeSession } from '../services/srs-practice';
import { defaultLearningClient, LearningClientError } from '../services/learning-client';
import {
  createStudyState, dailyProgress, markStudySaved, rateStudyCard, restoreStudyState,
  selectStudyQueue, studyStorageKey, undoStudyRating, isNewCard, type StudyState,
} from '../services/srs-study-session';
import { useI18n } from '../../../lib/i18n';

export interface SrsReviewRunnerProps {
  cards: DueFlashcard[];
  syncManager?: SrsSyncManager;
  userId?: string;
  onPlayTts?: (text: string) => Promise<void>;
  onFinish?: () => void;
  onReset?: () => Promise<void>;
}
export function SrsReviewRunner({
  cards, syncManager, userId, onPlayTts, onFinish, onReset,
}: SrsReviewRunnerProps): React.JSX.Element {
  const { t } = useI18n();
  const manager = useMemo(() => syncManager ?? new SrsSyncManager(defaultLearningClient,
    { storageKey: userId ? `jlpt_srs_sync_v2:${userId}` : undefined }), [syncManager, userId]);
  const [state, setState] = useState<StudyState>(() => createStudyState(cards));
  const stateRef = useRef(state);
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const [practice, setPractice] = useState<PracticeSession | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCandidates, setResetCandidates] = useState<string[]>([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const resetLock = useRef(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewRevision, setViewRevision] = useState(0);
  const [syncSnapshot, setSyncSnapshot] = useState<SrsSyncSnapshot>(() => manager.getSnapshot());
  const storageKey = userId ? studyStorageKey(userId) : null;

  useEffect(() => {
    const pendingCards = new Set(manager.getQueue().filter(item => item.status !== 'synced').map(item => item.cardId));
    const availableCards = cards.filter(card => !pendingCards.has(card.cardId));
    let restored = createStudyState(availableCards);
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) restored = restoreStudyState(raw, availableCards);
      } catch { setLocalError(t('srs.study.restoreError')); }
    }
    // Recover the last deck from the old completed/pending screen before auto-sync
    // can remove those cards from the due endpoint.
    if (!restored.lastReviewedCards?.length) {
      const known = new Set([...dailyProgress(restored).reviewed, ...manager.getQueue().map(item => item.cardId)]);
      const lastReviewedCards = cards.filter(card => known.has(card.cardId));
      if (lastReviewedCards.length) {
        restored = { ...restored, lastReviewedCards };
        try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(restored)); }
        catch { setLocalError(t('srs.study.storageError')); }
      }
    }
    // Recover a save interrupted between durable queueing and writing the study checkpoint.
    const queued = new Set(manager.getQueue().map(item => item.id));
    let savedThrough = restored.session.savedCount;
    restored.session.events.forEach((event, index) => {
      if (queued.has(event.clientReviewId)) savedThrough = Math.max(savedThrough, index + 1);
    });
    if (savedThrough > restored.session.savedCount) {
      const original = restored.session.events;
      const prefix = { ...restored, session: { ...restored.session, events: original.slice(0, savedThrough) } };
      restored = markStudySaved(prefix);
      restored = { ...restored, session: { ...restored.session, events: original } };
    }
    stateRef.current = restored; setState(restored); setReady(true);
    const unsubscribe = manager.subscribe(setSyncSnapshot);
    void manager.processQueue();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); unsubscribe(); if (!syncManager) manager.dispose(); };
  }, [manager, storageKey, cards, t, syncManager]);

  const persist = (next: StudyState): boolean => {
    try {
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
      stateRef.current = next; setState(next); setLocalError(null); return true;
    } catch {
      setLocalError(t('srs.study.storageError')); setViewRevision(value => value + 1); return false;
    }
  };
  const queue = selectStudyQueue(state, now);
  const scheduledActive = queue.entries.find(entry => entry.availableAt <= now);
  const extraQueue = practice ? practiceQueue(practice) : [];
  const active = practice ? (extraQueue[0] ? { card: extraQueue[0], availableAt: now } : undefined) : scheduledActive;
  const waiting = practice ? [] : queue.entries.filter(entry => entry.availableAt > now);
  const nextAt = waiting.length ? Math.min(...waiting.map(entry => entry.availableAt)) : null;
  const remainingSeconds = nextAt ? Math.max(0, Math.ceil((nextAt - now) / 1000)) : 0;
  const countdown = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  const progress = dailyProgress(state, now);
  const draftCount = state.session.events.length - state.session.savedCount;
  const canUndo = practice ? practice.ratings.length > 0 : draftCount > 0;
  const reviewedThisSession = new Set(state.session.events.map(event => event.cardId)).size;
  const ended = practice ? extraQueue.length === 0 : queue.entries.length === 0;
  const currentReviewed = reviewedCards(state);
  const knownReviewed = new Set([...progress.reviewed, ...manager.getQueue().map(item => item.cardId)]);
  const repeatCards = currentReviewed.length ? currentReviewed : state.lastReviewedCards?.length
    ? state.lastReviewedCards : cards.filter(card => knownReviewed.has(card.cardId));
  const startPractice = () => {
    const deck = practice?.cards ?? repeatCards;
    if (!deck.length || saving || transitioning) return;
    if (!persist({ ...stateRef.current, lastReviewedCards: deck })) return;
    setPractice({ cards: deck, ratings: [] });
    setViewRevision(value => value + 1);
  };
  const handleRate = (rating: ReviewRating) => {
    setTransitioning(false);
    if (!active || saveLock.current || !ready) return;
    if (practice) {
      setPractice(current => current ? ratePractice(current, active.card.cardId, rating) : current);
      return;
    }
    const timestamp = Date.now();
    const next = rateStudyCard(stateRef.current, active.card.cardId, rating, timestamp, newReviewId());
    persist(next); setNow(timestamp);
  };
  const handleUndo = () => {
    if (saveLock.current) return;
    if (practice) {
      setPractice(undoPractice(practice)); setViewRevision(value => value + 1); return;
    }
    const next = undoStudyRating(stateRef.current);
    if (persist(next)) { setViewRevision(value => value + 1); setNow(Date.now()); }
  };
  const handleSave = async (exit = false) => {
    if (saveLock.current || !ready) return;
    saveLock.current = true; setSaving(true);
    try {
      const current = stateRef.current;
      manager.queueSubmissions(current.session.events.slice(current.session.savedCount));
      const committed = markStudySaved(current);
      // The queue is now durable: never offer Undo for reviews that can already reach the API.
      stateRef.current = committed; setState(committed);
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(committed));
      setLocalError(null);
      await manager.processQueue();
      if (exit) onFinish?.();
    } catch { setLocalError(t('srs.study.saveError')); }
    finally { saveLock.current = false; setSaving(false); }
  };
  const openReset = async () => {
    setResetError(null);
    if (draftCount > 0 || manager.getSnapshot().pendingCount > 0 || practice) {
      setResetError(t('srs.study.resetNeedsSync'));
      return;
    }
    setResetCandidates([]); setResetOpen(true); setResetLoading(true);
    try {
      const result = await defaultLearningClient.getResetCandidates();
      setResetCandidates(result.cardIds);
    } catch (error) {
      setResetError(error instanceof LearningClientError && error.status === 404
        ? t('srs.study.resetUnavailable') : t('srs.study.resetLoadError'));
    } finally { setResetLoading(false); }
  };
  const confirmReset = async () => {
    if (resetLock.current || !resetCandidates.length || resetLoading) return;
    if (stateRef.current.session.events.length > stateRef.current.session.savedCount ||
      manager.getSnapshot().pendingCount > 0) {
      setResetError(t('srs.study.resetNeedsSync')); return;
    }
    resetLock.current = true; setResetting(true); setResetError(null);
    try {
      await defaultLearningClient.resetRememberedCards(resetCandidates);
      const next = { ...stateRef.current, session: createStudyState([]).session, lastReviewedCards: [] };
      if (!persist(next)) return;
      setPractice(null); setResetOpen(false); setViewRevision(value => value + 1);
      await onReset?.();
    } catch (error) {
      if (error instanceof LearningClientError && error.status === 409) setResetCandidates([]);
      setResetError(error instanceof LearningClientError && error.status === 409
        ? t('srs.study.resetChanged') : t('srs.study.resetFailed'));
    } finally { resetLock.current = false; setResetting(false); }
  };

  const changeSetting = (key: 'dailyGoal' | 'newPerDay', value: string) => {
    if (!saving) persist({ ...stateRef.current, settings: { ...stateRef.current.settings, [key]: Number(value) } });
  };
  const syncLabel = draftCount > 0 ? t('srs.study.drafts', { count: draftCount })
    : syncSnapshot.pendingCount > 0 ? t('srs.sync.pendingCount', { count: syncSnapshot.pendingCount })
    : syncSnapshot.state === 'synced' ? t('srs.sync.synced') : t('srs.study.ready');
  const counts = {
    reviews: queue.entries.filter(entry => !isNewCard(entry.card) && entry.availableAt <= now).length,
    fresh: queue.entries.filter(entry => isNewCard(entry.card)).length,
    waiting: waiting.length,
  };

  return <section className="srs-runner mx-auto flex w-full max-w-4xl flex-col gap-5" aria-label={t('srs.title')}>
    <Card>
      <Card.Content className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">{t('srs.study.today')}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t('srs.study.dailyProgress', { done: progress.reviewed.length, goal: state.settings.dailyGoal })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" disabled={transitioning || saving || resetting} onPress={() => setShowSettings(value => !value)}
              aria-expanded={showSettings} aria-controls="srs-study-settings">
              <Settings2 size={16} aria-hidden="true" />{t('srs.study.settings')}
            </Button>
            {onReset && <Button size="sm" variant="secondary" disabled={!ready || transitioning || saving || resetting}
              onPress={() => { void openReset(); }} data-testid="srs-reset-open">
              <RotateCcwSquare size={16} aria-hidden="true" />{t('srs.study.resetButton')}
            </Button>}
          </div>
        </div>
        <ProgressBar value={Math.min(progress.reviewed.length, state.settings.dailyGoal)} maxValue={state.settings.dailyGoal}
          aria-label={t('srs.study.dailyProgress', { done: progress.reviewed.length, goal: state.settings.dailyGoal })}>
          <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
        </ProgressBar>
        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="tertiary">{t('srs.study.reviewCount', { count: counts.reviews })}</Chip>
          <Chip size="sm" variant="tertiary">{t('srs.study.newCount', { count: counts.fresh })}</Chip>
          {practice && <Chip size="sm" variant="tertiary">{t('srs.study.practiceMode')}</Chip>}
          {waiting.length > 0 && <Chip size="sm" variant="tertiary">{t('srs.study.waitingCount', { count: counts.waiting })}</Chip>}
        </div>
        {progress.reviewed.length >= state.settings.dailyGoal && <p role="status" className="text-sm">{t('srs.study.goalReached')}</p>}
        {showSettings && <div id="srs-study-settings" className="grid gap-4 sm:grid-cols-2">
          <HeroSelect label={t('srs.study.goalLabel')} value={String(state.settings.dailyGoal)}
            options={[5, 10, 20, 30, 50].map(value => ({ value: String(value), label: t('srs.study.cardsPerDay', { count: value }) }))}
            onChange={value => changeSetting('dailyGoal', value)} disabled={saving} />
          <HeroSelect label={t('srs.study.newLimitLabel')} value={String(state.settings.newPerDay)}
            options={[0, 5, 10, 20, 30, 50].map(value => ({ value: String(value), label: t('srs.study.cardsPerDay', { count: value }) }))}
            onChange={value => changeSetting('newPerDay', value)} disabled={saving} />
          <p className="text-xs text-[var(--text-muted)] sm:col-span-2">{t('srs.study.localSettingsHint')}</p>
        </div>}
      </Card.Content>
    </Card>

    {resetError && !resetOpen && <Alert variant="warning">{resetError}</Alert>}
    {localError && <Alert variant="error">{localError}</Alert>}
    {syncSnapshot.state === 'error' && <Alert variant="warning">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{t('srs.study.syncRetryHint')}</span>
        <Button size="sm" variant="secondary" disabled={saving || transitioning} onPress={() => { void handleSave(); }}>{t('common.buttons.retry')}</Button>
      </div>
    </Alert>}

    {active ? <FlashcardView key={`${practice ? 'practice' : 'scheduled'}:${active.card.cardId}:${practice?.ratings.length ?? state.session.events.length}:${viewRevision}`}
      card={active.card} practice={Boolean(practice)} onRate={handleRate} onPlayTts={onPlayTts} onTransitionStart={() => setTransitioning(true)} disabled={!ready || saving || resetOpen}
      cardIndex={practice ? practice.cards.length - extraQueue.length + 1 : reviewedThisSession + 1} totalCards={practice ? practice.cards.length : Math.max(reviewedThisSession + 1, reviewedThisSession + queue.entries.length)} />
      : <Card data-testid={ended ? 'srs-finished-card' : 'srs-waiting-card'}>
        <Card.Content className="flex flex-col items-center gap-4 px-5 py-10 text-center">
          {ended ? <Check size={40} aria-hidden="true" /> : <Clock3 size={40} aria-hidden="true" />}
          <h2 className="text-xl font-semibold">{t(practice ? 'srs.study.practiceFinished' : ended ? 'srs.study.roundFinished' : 'srs.study.waitingTitle')}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{ended
            ? practice ? t('srs.study.practiceCount', { count: practice.cards.length })
              : reviewedThisSession ? t('srs.study.sessionCount', { count: reviewedThisSession })
              : t('srs.study.repeatAvailable', { count: repeatCards.length })
            : t('srs.study.waitingDescription', { count: waiting.length })}</p>
          {ended && (practice ? practice.cards.length > 0 : repeatCards.length > 0) && <>
            <Button onPress={startPractice} disabled={saving || !ready || transitioning} data-testid="srs-practice-start">
              <RotateCcw size={16} aria-hidden="true" />{t('srs.study.repeat')}
            </Button>
            <p className="text-xs text-[var(--text-muted)]">{t('srs.study.practiceHint')}</p>
          </>}
          {!ended && <p className="text-3xl font-semibold tabular-nums" aria-label={t('srs.study.timeRemaining')} data-testid="srs-countdown">{countdown}</p>}
          {!practice && queue.deferredNew > 0 && <p className="text-sm">{t('srs.study.deferred', { count: queue.deferredNew })}</p>}
        </Card.Content>
      </Card>}

    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="secondary" onPress={handleUndo} disabled={!canUndo || saving || !ready || transitioning} data-testid="srs-undo">
        <Undo2 size={16} aria-hidden="true" />{t('srs.study.undo')}
      </Button>
      <div className="flex flex-wrap gap-2">
        {(draftCount > 0 || syncSnapshot.pendingCount > 0) && <Button onPress={() => { void handleSave(); }}
          loading={saving} disabled={!ready || transitioning} data-testid="srs-save">
          <Save size={16} aria-hidden="true" />{t('srs.study.save')}
        </Button>}
        {practice && <Button variant="secondary" onPress={() => { setPractice(null); setViewRevision(value => value + 1); }}
          disabled={transitioning} data-testid="srs-practice-exit">{t('srs.study.practiceExit')}</Button>}
        {onFinish && <Button variant="ghost" onPress={() => { void handleSave(true); }} disabled={saving || !ready || transitioning}>
          {t('srs.study.saveAndExit')}
        </Button>}
      </div>
    </div>
    <Modal isOpen={resetOpen} onClose={() => { if (!resetting) setResetOpen(false); }}
      title={t('srs.study.resetTitle')} closeLabel={t('common.buttons.cancel')}
      footer={<div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={resetting} onPress={() => setResetOpen(false)}>{t('common.buttons.cancel')}</Button>
        <Button variant="danger" loading={resetting} disabled={resetLoading || !resetCandidates.length}
          onPress={() => { void confirmReset(); }} data-testid="srs-reset-confirm">{t('srs.study.resetConfirm')}</Button>
      </div>}>
      <div className="flex flex-col gap-4">
        {resetLoading ? <p role="status">{t('common.status.loading')}</p> : !resetError || resetCandidates.length > 0 ? <>
          <p>{t('srs.study.resetCount', { count: resetCandidates.length })}</p>
          <p className="text-sm text-[var(--text-secondary)]">{t('srs.study.resetExplanation')}</p>
          {!resetCandidates.length && !resetError && <p>{t('srs.study.resetEmpty')}</p>}
        </> : null}
        {resetError && <Alert variant="error">{resetError}</Alert>}
      </div>
    </Modal>

    <div className="flex flex-col gap-2 text-xs text-[var(--text-muted)]">
      <span data-testid="sync-status-badge" role="status">{syncLabel}</span>
      <p>{t(practice ? 'srs.study.practiceHint' : 'srs.study.undoHint')}</p>
    </div>
  </section>;
}
