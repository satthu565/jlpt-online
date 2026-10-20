'use client';

import { AlertTriangle, Check, Hourglass, PartyPopper, RotateCcw, WifiOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import type { DueFlashcard, ReviewRating } from '../types';
import { FlashcardView } from './flashcard-view';
import { SrsSyncManager, defaultSrsSyncManager, type SrsSyncSnapshot } from '../services/srs-sync-manager';
import { useI18n } from '../../../lib/i18n';

export interface SrsReviewRunnerProps {
  cards: DueFlashcard[];
  syncManager?: SrsSyncManager;
  onPlayTts?: (text: string) => Promise<void>;
  onFinish?: () => void;
}

export function SrsReviewRunner({
  cards,
  syncManager = defaultSrsSyncManager,
  onPlayTts,
  onFinish,
}: SrsReviewRunnerProps): React.JSX.Element {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [syncSnapshot, setSyncSnapshot] = useState<SrsSyncSnapshot>(syncManager.getSnapshot());

  useEffect(() => {
    return syncManager.subscribe((snapshot) => {
      setSyncSnapshot(snapshot);
    });
  }, [syncManager]);

  const activeCard = cards[currentIndex];
  const isFinished = currentIndex >= cards.length || cards.length === 0;

  const handleRateCard = async (rating: ReviewRating) => {
    if (!activeCard) return;

    // Queue the review via the offline-safe idempotent sync manager
    await syncManager.queueReview(activeCard.cardId, rating);
    syncManager.processQueue().catch(() => {});

    setCompletedCount((prev) => prev + 1);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleManualSync = async () => {
    await syncManager.processQueue();
  };

  const getSyncBadge = () => {
    switch (syncSnapshot.state) {
      case 'syncing':
        return (
          <Badge variant="warning" data-testid="sync-status-badge">
            <RotateCcw className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('srs.sync.syncing')}
          </Badge>
        );
      case 'pending_sync':
        return (
          <Badge variant="secondary" data-testid="sync-status-badge">
            <Hourglass className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('srs.sync.pendingCount', { count: String(syncSnapshot.pendingCount) })}
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="default" data-testid="sync-status-badge">
            <WifiOff className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('srs.sync.offline')}
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="error" data-testid="sync-status-badge">
            <AlertTriangle className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('srs.sync.error')}
          </Badge>
        );
      case 'synced':
      default:
        return (
          <Badge variant="success" data-testid="sync-status-badge">
            <Check className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('srs.sync.synced')}
          </Badge>
        );
    }
  };

  return (
    <div className="srs-runner flex flex-col gap-6">
      {/* Sync Status Header */}
      <div className="flex justify-between items-center py-3 px-4 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[0.9375rem]">
            {t('srs.title')}
          </span>
          {getSyncBadge()}
        </div>

        <div className="flex items-center gap-2">
          {syncSnapshot.pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              aria-label={t('srs.sync.syncNow')}
              data-testid="sync-now-button"
            >
              <RotateCcw className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('srs.sync.syncNow')}
            </Button>
          )}
          <span className="text-[0.8125rem] text-[var(--text-muted)]">
            {t('srs.completedCount', { count: String(completedCount) })}
          </span>
        </div>
      </div>

      {syncSnapshot.errorMessage && (
        <Alert variant="warning" onClose={() => {}}>
          {syncSnapshot.errorMessage}
        </Alert>
      )}

      {/* Main Review Body */}
      {!isFinished && activeCard ? (
        <FlashcardView
          card={activeCard}
          onRate={handleRateCard}
          onPlayTts={onPlayTts}
          cardIndex={currentIndex + 1}
          totalCards={cards.length}
        />
      ) : (
        <Card data-testid="srs-finished-card">
          <CardContent className="p-12 text-center">
            <PartyPopper className="mx-auto mb-4 size-12" aria-hidden="true" />
            <h2 className="text-[1.75rem] font-extrabold mt-0 mx-0 mb-2 text-[var(--text-primary)]">
              {t('srs.finished.title')}
            </h2>
            <p className="text-[var(--text-secondary)] mt-0 mx-0 mb-6">
              {t('srs.finished.description', { count: String(completedCount) })}
            </p>

            {syncSnapshot.pendingCount > 0 ? (
              <div className="mb-6">
                <Alert variant="info">
                  {t('srs.finished.pendingSyncNotice', { count: String(syncSnapshot.pendingCount) })}
                </Alert>
                <div className="mt-4">
                  <Button variant="primary" onClick={handleManualSync}>
                    <RotateCcw className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('srs.sync.syncNow')}
                  </Button>
                </div>
              </div>
            ) : null}

            {onFinish && (
              <Button className="min-w-[160px]" variant="primary" onClick={onFinish}>
                {t('srs.finished.backToNotebook')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
