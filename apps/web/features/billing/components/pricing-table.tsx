'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Check } from 'lucide-react';
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
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      data-testid="pricing-table"
    >
      {plans.map((plan) => {
        const isSelected = selectedPlanId === plan.id;
        const isPopular = plan.interval === 'yearly' || plan.interval === 'year';

        return (
          <Card
            key={plan.id}
            className={`relative transition-all ${
              isSelected
                ? 'border-2 border-[var(--color-primary)] shadow-md'
                : isPopular
                ? 'border-2 border-[var(--color-primary)]/80 shadow-md'
                : 'border border-[var(--border-subtle)] shadow-sm'
            }`}
            data-testid={`pricing-card-${plan.id}`}
          >
            {isPopular && (
              <div className="absolute -top-3 right-5">
                <Badge variant="primary">{t('billing.pricing.mostPopular')}</Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-xl mb-2">
                {plan.name}
              </CardTitle>
              {plan.description && (
                <p className="m-0 text-sm text-[var(--text-secondary)]">
                  {plan.description}
                </p>
              )}
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              <div>
                <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                  {formatPrice(plan.priceMinor, plan.currency)}
                </span>
                <span className="text-sm text-[var(--text-muted)] ml-1.5">
                  / {getPlanIntervalLabel(plan.interval)}
                </span>
              </div>

              {/* Features Matrix */}
              <ul className="list-none p-0 m-0 flex flex-col gap-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[var(--color-success,#16a34a)] shrink-0" />
                  <span>{t('billing.features.unlimitedExams')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[var(--color-success,#16a34a)] shrink-0" />
                  <span>{t('billing.features.intelligentMix')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[var(--color-success,#16a34a)] shrink-0" />
                  <span>{t('billing.features.aiExplanations')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[var(--color-success,#16a34a)] shrink-0" />
                  <span>{t('billing.features.audioTranscripts')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[var(--color-success,#16a34a)] shrink-0" />
                  <span>{t('billing.features.srsSync')}</span>
                </li>
              </ul>

              <Button
                variant={isSelected ? 'primary' : isPopular ? 'primary' : 'outline'}
                onClick={() => onSelectPlan(plan)}
                aria-label={t('billing.pricing.selectPlanAria', { name: plan.name })}
                data-testid={`select-plan-${plan.id}`}
                className="w-full flex items-center justify-center gap-1.5"
              >
                {isSelected && <Check className="size-4" />}
                <span>{isSelected ? t('billing.pricing.selected') : t('billing.pricing.selectPlan')}</span>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
