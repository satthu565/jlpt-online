'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Alert } from '@jlpt/ui';
import type { Plan, CouponDiscount, CheckoutSession } from '../types';
import { CouponInput } from './coupon-input';
import { useI18n } from '../../../lib/i18n';

export interface CheckoutCardProps {
  plan: Plan;
  onApplyCoupon: (code: string) => Promise<CouponDiscount>;
  onCheckout: (planId: string, couponCode?: string) => Promise<CheckoutSession>;
}

export function CheckoutCard({
  plan,
  onApplyCoupon,
  onCheckout,
}: CheckoutCardProps): React.JSX.Element {
  const { t } = useI18n();

  const [appliedCoupon, setAppliedCoupon] = useState<CouponDiscount | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<CheckoutSession | null>(null);

  const originalPrice = plan.priceMinor / 100;
  const discount = appliedCoupon ? appliedCoupon.discountMinor / 100 : 0;
  const finalPrice = Math.max(0, originalPrice - discount);

  const handleCheckout = async () => {
    setCheckingOut(true);
    setError(null);
    try {
      const session = await onCheckout(plan.id, appliedCoupon?.code);
      setCreatedSession(session);
      // If valid checkoutUrl, navigate
      if (session.checkoutUrl && typeof window !== 'undefined') {
        window.location.href = session.checkoutUrl;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('billing.checkout.error'));
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <Card data-testid="checkout-card" style={{ maxWidth: '480px', margin: '0 auto' }}>
      <CardHeader>
        <CardTitle>{t('billing.checkout.title')}</CardTitle>
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Plan summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              {plan.name}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block' }}>
              ({plan.interval})
            </span>
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>
            {originalPrice.toLocaleString('vi-VN')}₫
          </span>
        </div>

        {/* Coupon Section */}
        <div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>
            {t('billing.coupon.sectionTitle')}
          </span>
          <CouponInput
            appliedCoupon={appliedCoupon}
            onApplyCoupon={async (code) => {
              const res = await onApplyCoupon(code);
              setAppliedCoupon(res);
              return res;
            }}
            onRemoveCoupon={() => setAppliedCoupon(null)}
          />
        </div>

        {/* Price Breakdown */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('billing.checkout.subtotal')}:</span>
            <span>{originalPrice.toLocaleString('vi-VN')}₫</span>
          </div>

          {appliedCoupon && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success, #16a34a)' }}>
              <span>{t('billing.checkout.discount')}:</span>
              <span>-{discount.toLocaleString('vi-VN')}₫</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: '1.125rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.5rem',
              marginTop: '0.25rem',
            }}
          >
            <span>{t('billing.checkout.total')}:</span>
            <span style={{ color: 'var(--color-primary)' }} data-testid="checkout-final-price">
              {finalPrice.toLocaleString('vi-VN')}₫
            </span>
          </div>
        </div>

        {/* Redirect Notice or Success */}
        {createdSession && (
          <Alert variant="success">
            {t('billing.checkout.sessionCreated', { orderId: createdSession.orderId })}
          </Alert>
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={handleCheckout}
          loading={checkingOut}
          data-testid="confirm-checkout-button"
          style={{ width: '100%' }}
        >
          🔒 {t('billing.checkout.payNowButton')}
        </Button>
      </CardContent>
    </Card>
  );
}
