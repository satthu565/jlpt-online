'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import type { Plan } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface PricingTableProps {
  plans: Plan[];
  selectedPlanId?: string;
  onSelectPlan: (plan: Plan) => void;
}

export function PricingTable({
  plans,
  selectedPlanId,
  onSelectPlan,
}: PricingTableProps): React.JSX.Element {
  const { t } = useI18n();

  const formatPrice = (priceMinor: number, currency: string) => {
    if (priceMinor === 0) return t('billing.pricing.free');
    if (currency === 'VND') {
      return `${priceMinor.toLocaleString('vi-VN')}₫`;
    }
    const amount = priceMinor / 100;
    return `${amount.toLocaleString()} ${currency}`;
  };

  const getPlanIntervalLabel = (interval: string) => {
    switch (interval) {
      case 'month':
      case 'monthly':
        return t('billing.pricing.monthly');
      case 'quarter':
        return t('billing.pricing.quarterly');
      case 'year':
      case 'yearly':
        return t('billing.pricing.yearly');
      case 'lifetime':
        return t('billing.pricing.lifetime');
      default:
        return interval;
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.5rem',
      }}
      data-testid="pricing-table"
    >
      {plans.map((plan) => {
        const isSelected = selectedPlanId === plan.id;
        const isPopular = plan.interval === 'yearly' || plan.interval === 'year';

        return (
          <Card
            key={plan.id}
            style={{
              position: 'relative',
              borderColor: isSelected
                ? 'var(--color-primary)'
                : isPopular
                ? 'var(--color-primary)'
                : 'var(--border-subtle)',
              borderWidth: isSelected || isPopular ? '2px' : '1px',
              boxShadow: isPopular ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
            }}
            data-testid={`pricing-card-${plan.id}`}
          >
            {isPopular && (
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '20px',
                }}
              >
                <Badge variant="primary">{t('billing.pricing.mostPopular')}</Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle style={{ fontSize: '1.375rem', margin: '0 0 0.5rem 0' }}>
                {plan.name}
              </CardTitle>
              {plan.description && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {plan.description}
                </p>
              )}
            </CardHeader>

            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {formatPrice(plan.priceMinor, plan.currency)}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '0.375rem' }}>
                  / {getPlanIntervalLabel(plan.interval)}
                </span>
              </div>

              {/* Features Matrix */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success, #16a34a)' }}>✓</span>
                  <span>{t('billing.features.unlimitedExams')}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success, #16a34a)' }}>✓</span>
                  <span>{t('billing.features.intelligentMix')}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success, #16a34a)' }}>✓</span>
                  <span>{t('billing.features.aiExplanations')}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success, #16a34a)' }}>✓</span>
                  <span>{t('billing.features.audioTranscripts')}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success, #16a34a)' }}>✓</span>
                  <span>{t('billing.features.srsSync')}</span>
                </li>
              </ul>

              <Button
                variant={isSelected ? 'primary' : isPopular ? 'primary' : 'outline'}
                onClick={() => onSelectPlan(plan)}
                aria-label={t('billing.pricing.selectPlanAria', { name: plan.name })}
                data-testid={`select-plan-${plan.id}`}
                style={{ width: '100%' }}
              >
                {isSelected ? `✓ ${t('billing.pricing.selected')}` : t('billing.pricing.selectPlan')}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
