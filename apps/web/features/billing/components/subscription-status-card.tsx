'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Alert } from '@jlpt/ui';
import type { UserSubscription } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface SubscriptionStatusCardProps {
  subscription: UserSubscription;
  onCancel?: () => Promise<void>;
  onRenew?: () => Promise<void>;
}

export function SubscriptionStatusCard({
  subscription,
  onCancel,
  onRenew,
}: SubscriptionStatusCardProps): React.JSX.Element {
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return <Badge variant="success">✓ {t('billing.subscription.statusActive')}</Badge>;
      case 'past_due':
        return <Badge variant="warning">⚠️ {t('billing.subscription.statusPastDue')}</Badge>;
      case 'cancelled':
        return <Badge variant="default">✕ {t('billing.subscription.statusCancelled')}</Badge>;
      case 'expired':
        return <Badge variant="error">⛔ {t('billing.subscription.statusExpired')}</Badge>;
      default:
        return <Badge variant="secondary">{t('billing.subscription.statusNone')}</Badge>;
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setLoading(true);
    setFeedback(null);
    try {
      await onCancel();
      setFeedback(t('billing.subscription.cancelSuccess'));
    } catch {
      setFeedback(t('billing.subscription.cancelError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!onRenew) return;
    setLoading(true);
    setFeedback(null);
    try {
      await onRenew();
      setFeedback(t('billing.subscription.renewSuccess'));
    } catch {
      setFeedback(t('billing.subscription.renewError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card data-testid="subscription-status-card">
      <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CardTitle>{t('billing.subscription.cardTitle')}</CardTitle>
        {getStatusBadge()}
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {feedback && (
          <Alert variant="info" onClose={() => setFeedback(null)}>
            {feedback}
          </Alert>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          {subscription.currentPeriodEnd && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('billing.subscription.expiresAt')}:</span>
              <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</strong>
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div style={{ color: 'var(--color-warning)' }}>
              ℹ️ {t('billing.subscription.cancelAtPeriodEndNotice')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              loading={loading}
              data-testid="cancel-subscription-button"
            >
              {t('billing.subscription.cancelAction')}
            </Button>
          )}

          {(subscription.status === 'cancelled' || subscription.status === 'expired') && onRenew && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRenew}
              loading={loading}
              data-testid="renew-subscription-button"
            >
              🔄 {t('billing.subscription.renewAction')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
