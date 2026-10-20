'use client';

import React, { useState } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Alert } from '@jlpt/ui/components/alert';
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
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          border: '1px solid var(--color-success, #16a34a)',
        }}
        data-testid="applied-coupon-card"
      >
        <div>
          <span style={{ fontWeight: 700, color: 'var(--color-success, #16a34a)' }}>
            🏷️ {appliedCoupon.code}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
            ({t('billing.coupon.appliedDiscount', { amount: `${appliedCoupon.discountMinor.toLocaleString('vi-VN')}₫` })})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemoveCoupon}
          aria-label={t('billing.coupon.remove')}
          data-testid="remove-coupon-button"
        >
          ✕ {t('billing.coupon.remove')}
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <form onSubmit={handleApply} style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
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
