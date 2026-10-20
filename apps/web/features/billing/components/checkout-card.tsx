'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { Lock } from 'lucide-react';
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

  const originalPrice = plan.currency === 'VND' ? plan.priceMinor : plan.priceMinor / 100;
  const discount = appliedCoupon
    ? (plan.currency === 'VND' ? appliedCoupon.discountMinor : appliedCoupon.discountMinor / 100)
    : 0;
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
    <Card data-testid="checkout-card" className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{t('billing.checkout.title')}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Plan summary */}
        <div className="flex justify-between items-center">
          <div>
            <span className="font-bold text-lg text-[var(--text-primary)]">
              {plan.name}
            </span>
            <span className="text-sm text-[var(--text-muted)] block">
              ({plan.interval})
            </span>
          </div>
          <span className="font-bold text-lg">
            {originalPrice.toLocaleString('vi-VN')}₫
          </span>
        </div>

        {/* Coupon Section */}
        <div>
          <span className="text-sm font-semibold block mb-1.5">
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
        <div className="p-4 rounded-lg bg-[var(--bg-muted)] flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">{t('billing.checkout.subtotal')}:</span>
            <span>{originalPrice.toLocaleString('vi-VN')}₫</span>
          </div>

          {appliedCoupon && (
            <div className="flex justify-between text-[var(--color-success,#16a34a)]">
              <span>{t('billing.checkout.discount')}:</span>
              <span>-{discount.toLocaleString('vi-VN')}₫</span>
            </div>
          )}

          <div className="flex justify-between font-extrabold text-lg border-t border-[var(--border-subtle)] pt-2 mt-1">
            <span>{t('billing.checkout.total')}:</span>
            <span className="text-[var(--color-primary)]" data-testid="checkout-final-price">
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
          className="w-full flex items-center justify-center gap-2"
        >
          <Lock className="size-4" />
          <span>{t('billing.checkout.payNowButton')}</span>
        </Button>
      </CardContent>
    </Card>
  );
}
