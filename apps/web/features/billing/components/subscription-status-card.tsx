'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Check, AlertTriangle, X, Ban, Info, RefreshCw } from 'lucide-react';
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
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <Check className="size-3" />
            <span>{t('billing.subscription.statusActive')}</span>
          </Badge>
        );
      case 'past_due':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="size-3" />
            <span>{t('billing.subscription.statusPastDue')}</span>
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <X className="size-3" />
            <span>{t('billing.subscription.statusCancelled')}</span>
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="error" className="flex items-center gap-1">
            <Ban className="size-3" />
            <span>{t('billing.subscription.statusExpired')}</span>
          </Badge>
        );
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
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>{t('billing.subscription.cardTitle')}</CardTitle>
        {getStatusBadge()}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {feedback && (
          <Alert variant="info" onClose={() => setFeedback(null)}>
            {feedback}
          </Alert>
        )}

        <div className="flex flex-col gap-2 text-sm">
          {subscription.currentPeriodEnd && (
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">{t('billing.subscription.expiresAt')}:</span>
              <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</strong>
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="text-[var(--color-warning)] flex items-center gap-1.5">
              <Info className="size-4 shrink-0" />
              <span>{t('billing.subscription.cancelAtPeriodEndNotice')}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-2">
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
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              <span>{t('billing.subscription.renewAction')}</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
