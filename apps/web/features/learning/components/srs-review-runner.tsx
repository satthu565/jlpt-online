'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge, Alert } from '@jlpt/ui';
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
            🔄 {t('srs.sync.syncing')}
          </Badge>
        );
      case 'pending_sync':
        return (
          <Badge variant="secondary" data-testid="sync-status-badge">
            ⏳ {t('srs.sync.pendingCount', { count: String(syncSnapshot.pendingCount) })}
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="default" data-testid="sync-status-badge">
            📶 {t('srs.sync.offline')}
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="error" data-testid="sync-status-badge">
            ⚠️ {t('srs.sync.error')}
          </Badge>
        );
      case 'synced':
      default:
        return (
          <Badge variant="success" data-testid="sync-status-badge">
            ✓ {t('srs.sync.synced')}
          </Badge>
        );
    }
  };

  return (
    <div className="srs-runner" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sync Status Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
            {t('srs.title')}
          </span>
          {getSyncBadge()}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {syncSnapshot.pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              aria-label={t('srs.sync.syncNow')}
              data-testid="sync-now-button"
            >
              🔄 {t('srs.sync.syncNow')}
            </Button>
          )}
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
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
          <CardContent style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              {t('srs.finished.title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>
              {t('srs.finished.description', { count: String(completedCount) })}
            </p>

            {syncSnapshot.pendingCount > 0 ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <Alert variant="info">
                  {t('srs.finished.pendingSyncNotice', { count: String(syncSnapshot.pendingCount) })}
                </Alert>
                <div style={{ marginTop: '1rem' }}>
                  <Button variant="primary" onClick={handleManualSync}>
                    🔄 {t('srs.sync.syncNow')}
                  </Button>
                </div>
              </div>
            ) : null}

            {onFinish && (
              <Button variant="primary" onClick={onFinish} style={{ minWidth: '160px' }}>
                {t('srs.finished.backToNotebook')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
