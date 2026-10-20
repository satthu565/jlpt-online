'use client';

import React, { useState } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Alert } from '@jlpt/ui/components/alert';
import { Tag, X } from 'lucide-react';
import type { CouponDiscount } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface CouponInputProps {
  onApplyCoupon: (code: string) => Promise<CouponDiscount>;
  onRemoveCoupon: () => void;
  appliedCoupon?: CouponDiscount | null;
}

export function CouponInput({
  onApplyCoupon,
  onRemoveCoupon,
  appliedCoupon,
}: CouponInputProps): React.JSX.Element {
  const { t } = useI18n();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onApplyCoupon(code.trim().toUpperCase());
      setCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('billing.coupon.invalidError'));
    } finally {
      setLoading(false);
    }
  };

  if (appliedCoupon) {
    return (
      <div
        className="flex justify-between items-center px-4 py-3 rounded-lg bg-[var(--color-success,#16a34a)]/10 border border-[var(--color-success,#16a34a)]"
        data-testid="applied-coupon-card"
      >
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-[var(--color-success,#16a34a)]" />
          <span className="font-bold text-[var(--color-success,#16a34a)]">
            {appliedCoupon.code}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">
            ({t('billing.coupon.appliedDiscount', { amount: `${appliedCoupon.discountMinor.toLocaleString('vi-VN')}₫` })})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemoveCoupon}
          aria-label={t('billing.coupon.remove')}
          data-testid="remove-coupon-button"
          className="flex items-center gap-1 text-[var(--text-muted)] hover:text-destructive"
        >
          <X className="size-4" />
          <span>{t('billing.coupon.remove')}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleApply} className="flex gap-2">
        <div className="flex-1">
          <Input
            id="coupon-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('billing.coupon.placeholder')}
            aria-label={t('billing.coupon.placeholder')}
            data-testid="coupon-code-input"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          loading={loading}
          data-testid="apply-coupon-button"
        >
          {t('billing.coupon.applyButton')}
        </Button>
      </form>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </div>
  );
}
