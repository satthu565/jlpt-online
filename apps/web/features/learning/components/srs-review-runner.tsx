'use client';

import { Check, Clock3, Save, Settings2, Undo2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Chip, ProgressBar } from '@jlpt/ui/components/exam-controls';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import { Alert } from '@jlpt/ui/components/alert';
import type { DueFlashcard, ReviewRating } from '../types';
import { FlashcardView } from './flashcard-view';
import { SrsSyncManager, type SrsSyncSnapshot } from '../services/srs-sync-manager';
import { defaultLearningClient } from '../services/learning-client';
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
}
export function SrsReviewRunner({
  cards, syncManager, userId, onPlayTts, onFinish,
}: SrsReviewRunnerProps): React.JSX.Element {
  const { t } = useI18n();
  const manager = useMemo(() => syncManager ?? new SrsSyncManager(defaultLearningClient,
    { storageKey: userId ? `jlpt_srs_sync_v2:${userId}` : undefined }), [syncManager, userId]);
  const [state, setState] = useState<StudyState>(() => createStudyState(cards));
  const stateRef = useRef(state);
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [localError, setLocalError] = useState<string | null>(null);
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
  const active = queue.entries.find(entry => entry.availableAt <= now);
  const waiting = queue.entries.filter(entry => entry.availableAt > now);
  const nextAt = waiting.length ? Math.min(...waiting.map(entry => entry.availableAt)) : null;
  const remainingSeconds = nextAt ? Math.max(0, Math.ceil((nextAt - now) / 1000)) : 0;
  const countdown = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  const progress = dailyProgress(state, now);
  const draftCount = state.session.events.length - state.session.savedCount;
  const canUndo = draftCount > 0;
  const reviewedThisSession = new Set(state.session.events.map(event => event.cardId)).size;
  const ended = queue.entries.length === 0;
  const handleRate = (rating: ReviewRating) => {
    setTransitioning(false);
    if (!active || saveLock.current || !ready) return;
    const timestamp = Date.now();
    const next = rateStudyCard(stateRef.current, active.card.cardId, rating, timestamp, `rev-${timestamp}-${crypto.getRandomValues(new Uint32Array(4)).join('-')}`);
    persist(next); setNow(timestamp);
  };
  const handleUndo = () => {
    if (saveLock.current) return;
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
          <Button size="sm" variant="ghost" disabled={transitioning || saving} onPress={() => setShowSettings(value => !value)}
            aria-expanded={showSettings} aria-controls="srs-study-settings">
            <Settings2 size={16} aria-hidden="true" />{t('srs.study.settings')}
          </Button>
        </div>
        <ProgressBar value={Math.min(progress.reviewed.length, state.settings.dailyGoal)} maxValue={state.settings.dailyGoal}
          aria-label={t('srs.study.dailyProgress', { done: progress.reviewed.length, goal: state.settings.dailyGoal })}>
          <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
        </ProgressBar>
        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="tertiary">{t('srs.study.reviewCount', { count: counts.reviews })}</Chip>
          <Chip size="sm" variant="tertiary">{t('srs.study.newCount', { count: counts.fresh })}</Chip>
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

    {localError && <Alert variant="error">{localError}</Alert>}
    {syncSnapshot.state === 'error' && <Alert variant="warning">{t('srs.sync.error')}</Alert>}

    {active ? <FlashcardView key={`${active.card.cardId}:${state.session.events.length}:${viewRevision}`}
      card={active.card} onRate={handleRate} onPlayTts={onPlayTts} onTransitionStart={() => setTransitioning(true)} disabled={!ready || saving}
      cardIndex={reviewedThisSession + 1} totalCards={Math.max(reviewedThisSession + 1, reviewedThisSession + queue.entries.length)} />
      : <Card data-testid={ended ? 'srs-finished-card' : 'srs-waiting-card'}>
        <Card.Content className="flex flex-col items-center gap-4 px-5 py-10 text-center">
          {ended ? <Check size={40} aria-hidden="true" /> : <Clock3 size={40} aria-hidden="true" />}
          <h2 className="text-xl font-semibold">{t(ended ? 'srs.study.roundFinished' : 'srs.study.waitingTitle')}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{ended
            ? t('srs.study.sessionCount', { count: reviewedThisSession })
            : t('srs.study.waitingDescription', { count: waiting.length })}</p>
          {!ended && <p className="text-3xl font-semibold tabular-nums" aria-label={t('srs.study.timeRemaining')} data-testid="srs-countdown">{countdown}</p>}
          {queue.deferredNew > 0 && <p className="text-sm">{t('srs.study.deferred', { count: queue.deferredNew })}</p>}
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
        {onFinish && <Button variant="ghost" onPress={() => { void handleSave(true); }} disabled={saving || !ready || transitioning}>
          {t('srs.study.saveAndExit')}
        </Button>}
      </div>
    </div>
    <div className="flex flex-col gap-2 text-xs text-[var(--text-muted)]">
      <span data-testid="sync-status-badge" role="status">{syncLabel}</span>
      <p>{t('srs.study.undoHint')}</p>
    </div>
  </section>;
}
