'use client';

import { ArrowLeft, Check, Clock3, GraduationCap, Layers, MoreHorizontal, RotateCcw, RotateCcwSquare, Save, Star, Target, Undo2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Chip, Dropdown, Modal, ProgressBar, Tabs } from '@jlpt/ui/components/exam-controls';
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
import styles from './srs-review-runner.module.css';

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
  const [studyView, setStudyView] = useState('review');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [viewRevision, setViewRevision] = useState(0);
  const [syncSnapshot, setSyncSnapshot] = useState<SrsSyncSnapshot>(() => manager.getSnapshot());
  const storageKey = userId ? studyStorageKey(userId) : null;

  useEffect(() => {
    const pendingCards = new Set(manager.getQueue().filter(item => item.status !== 'synced').map(item => item.cardId));
    const availableCards = cards.filter(card => !pendingCards.has(card.cardId));
    const timestamp = Date.now();
    let restored = createStudyState(availableCards, timestamp);
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) restored = restoreStudyState(raw, availableCards, timestamp);
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
    stateRef.current = restored; setState(restored); setNow(timestamp); setReady(true);
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
  const extraQueue = practice ? practiceQueue(practice) : [];
  const availableEntries = practice ? extraQueue.map(card => ({ card, availableAt: now }))
    : queue.entries.filter(entry => entry.availableAt <= now);
  const active = availableEntries.find(entry => entry.card.cardId === selectedCardId) ?? availableEntries[0];
  const activeIndex = availableEntries.findIndex(entry => entry.card.cardId === active?.card.cardId);
  const deck = practice?.cards ?? state.session.cards;
  const moveCard = (direction: number) => {
    if (saving || transitioning || resetOpen) return;
    const entry = availableEntries[activeIndex + direction];
    if (entry) setSelectedCardId(entry.card.cardId);
  };
  const toggleStar = (cardId: string) => {
    if (saving || transitioning || !ready) return;
    const starred = new Set(stateRef.current.starredCardIds ?? []);
    if (starred.has(cardId)) starred.delete(cardId); else starred.add(cardId);
    persist({ ...stateRef.current, starredCardIds: [...starred] });
  };
  const cardText = (card: DueFlashcard): string => {
    const value = card.front.term ?? card.front.kanji ?? card.front.pattern ?? card.front.meaning ?? card.front.prompt;
    return typeof value === 'string' ? value : '';
  };
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
    setTransitioning(false); setSelectedCardId(null);
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

  return <section className={`srs-runner ${styles.runner}`} aria-label={t('srs.title')}>
    <Tabs selectedKey={studyView} onSelectionChange={key => setStudyView(String(key))} className={styles.workspace}>
    <div className={styles.toolbar}>
      <div className={styles.titleGroup}>
        {onFinish && <Button variant="ghost" size="icon" disabled={saving || !ready || transitioning}
          aria-label={t('srs.study.saveAndExit')} onPress={() => { void handleSave(true); }}><ArrowLeft size={22} aria-hidden="true" /></Button>}
        <h2>{t('srs.study.today')}</h2>
      </div>
      <Tabs.ListContainer className={styles.modeTabs}>
        <Tabs.List aria-label={t('srs.study.viewLabel')}>
          <Tabs.Tab id="review"><GraduationCap size={20} aria-hidden="true" />{t('srs.study.reviewTab')}<Tabs.Indicator /></Tabs.Tab>
          <Tabs.Tab id="deck"><Layers size={19} aria-hidden="true" />{t('srs.study.deckTab', { count: deck.length })}<Tabs.Indicator /></Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
      <div className={styles.toolbarActions}>
        <Button variant="outline" disabled={transitioning || saving || resetting} onPress={() => setShowSettings(value => !value)}
          aria-expanded={showSettings} aria-controls="srs-study-settings"><Target size={18} aria-hidden="true" />{t('srs.study.settings')}</Button>
        {onReset && <Button variant="outline" className={styles.resetButton} disabled={!ready || transitioning || saving || resetting}
          onPress={() => { void openReset(); }} data-testid="srs-reset-open"><RotateCcwSquare size={18} aria-hidden="true" />{t('srs.study.resetButton')}</Button>}
        <Dropdown>
          <Dropdown.Trigger className="button button--outline button--icon-only" aria-label={t('srs.study.moreActions')} data-testid="srs-more-actions"><MoreHorizontal size={21} aria-hidden="true" /></Dropdown.Trigger>
          <Dropdown.Popover><Dropdown.Menu aria-label={t('srs.study.moreActions')}>
            <Dropdown.Item id="undo" isDisabled={!canUndo || saving || !ready || transitioning} onAction={handleUndo}>{t('srs.study.undo')}</Dropdown.Item>
            <Dropdown.Item id="save" isDisabled={!ready || saving || transitioning || (!draftCount && !syncSnapshot.pendingCount)} onAction={() => { void handleSave(); }}>{t('srs.study.save')}</Dropdown.Item>
            {onFinish && <Dropdown.Item id="exit" isDisabled={!ready || saving || transitioning} onAction={() => { void handleSave(true); }}>{t('srs.study.saveAndExit')}</Dropdown.Item>}
          </Dropdown.Menu></Dropdown.Popover>
        </Dropdown>
      </div>
    </div>
    <Card className={styles.progressCard}>
      <Card.Content className={styles.progressContent}>
        <span className={styles.progressLabel}>{t('srs.study.dailyProgress', { done: progress.reviewed.length, goal: state.settings.dailyGoal })}</span>
        <ProgressBar value={Math.min(progress.reviewed.length, state.settings.dailyGoal)} maxValue={state.settings.dailyGoal}
          className={styles.dailyProgress} aria-label={t('srs.study.dailyProgress', { done: progress.reviewed.length, goal: state.settings.dailyGoal })}>
          <ProgressBar.Track className={styles.progressTrack}><ProgressBar.Fill className={styles.progressFill} /></ProgressBar.Track>
        </ProgressBar>
        <div className={styles.counts}>
          <span>{t('srs.study.reviewCount', { count: counts.reviews })}</span><span aria-hidden="true">·</span>
          <span>{t('srs.study.newCount', { count: counts.fresh })}</span>
          {waiting.length > 0 && <Chip size="sm" variant="soft">{t('srs.study.waitingCount', { count: counts.waiting })}</Chip>}
        </div>
      </Card.Content>
    </Card>
    {practice && <Chip variant="soft">{t('srs.study.practiceMode')}</Chip>}
    {progress.reviewed.length >= state.settings.dailyGoal && <p role="status">{t('srs.study.goalReached')}</p>}
        {showSettings && <div id="srs-study-settings" className="grid gap-4 sm:grid-cols-2">
          <HeroSelect label={t('srs.study.goalLabel')} value={String(state.settings.dailyGoal)}
            options={[5, 10, 20, 30, 50].map(value => ({ value: String(value), label: t('srs.study.cardsPerDay', { count: value }) }))}
            onChange={value => changeSetting('dailyGoal', value)} disabled={saving} />
          <HeroSelect label={t('srs.study.newLimitLabel')} value={String(state.settings.newPerDay)}
            options={[0, 5, 10, 20, 30, 50].map(value => ({ value: String(value), label: t('srs.study.cardsPerDay', { count: value }) }))}
            onChange={value => changeSetting('newPerDay', value)} disabled={saving} />
          <p className="text-xs text-[var(--text-muted)] sm:col-span-2">{t('srs.study.localSettingsHint')}</p>
        </div>}

    {resetError && !resetOpen && <Alert variant="warning">{resetError}</Alert>}
    {localError && <Alert variant="error">{localError}</Alert>}
    {syncSnapshot.state === 'error' && <Alert variant="warning">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{t('srs.study.syncRetryHint')}</span>
        <Button size="sm" variant="secondary" disabled={saving || transitioning} onPress={() => { void handleSave(); }}>{t('common.buttons.retry')}</Button>
      </div>
    </Alert>}

    <Tabs.Panel id="review" className={styles.reviewPanel}>
    {active ? <FlashcardView key={`${practice ? 'practice' : 'scheduled'}:${active.card.cardId}:${practice?.ratings.length ?? state.session.events.length}:${viewRevision}`}
      card={active.card} practice={Boolean(practice)} onRate={handleRate} onPlayTts={onPlayTts} onTransitionStart={() => setTransitioning(true)} disabled={!ready || saving || resetOpen}
      onPrevious={() => moveCard(-1)} onNext={() => moveCard(1)} previousDisabled={activeIndex <= 0} nextDisabled={activeIndex >= availableEntries.length - 1}
      starred={state.starredCardIds?.includes(active.card.cardId)} onToggleStar={() => toggleStar(active.card.cardId)}
      cardIndex={Math.max(1, deck.findIndex(card => card.cardId === active.card.cardId) + 1)} totalCards={deck.length} />
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

    <div className={styles.footerActions}>
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
    </Tabs.Panel>
    <Tabs.Panel id="deck" className={styles.deckPanel}>
      {deck.length ? deck.map(card => <Card key={card.cardId}>
        <Card.Content className={styles.deckCard}>
          <div><h3 lang="ja">{cardText(card)}</h3>
            {typeof card.back.meaning === 'string' && <p>{card.back.meaning}</p>}</div>
          <div className={styles.deckActions}>
            <Button variant="ghost" size="icon" disabled={!ready || saving || transitioning} aria-pressed={state.starredCardIds?.includes(card.cardId) ?? false}
              aria-label={t(state.starredCardIds?.includes(card.cardId) ? 'srs.study.unstarCard' : 'srs.study.starCard')} onPress={() => toggleStar(card.cardId)}>
              <Star size={20} fill={state.starredCardIds?.includes(card.cardId) ? 'currentColor' : 'none'} aria-hidden="true" />
            </Button>
            <Button variant="outline" disabled={!availableEntries.some(entry => entry.card.cardId === card.cardId)}
              onPress={() => { setSelectedCardId(card.cardId); setStudyView('review'); }}>{t('srs.study.studyThisCard')}</Button>
          </div>
        </Card.Content>
      </Card>) : <Card><Card.Content>{t('srs.study.deckEmpty')}</Card.Content></Card>}
    </Tabs.Panel>
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
    </Tabs>
  </section>;
}
