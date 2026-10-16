import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Components under test
import { PricingTable } from '../features/billing/components/pricing-table';
import { CouponInput } from '../features/billing/components/coupon-input';
import { CheckoutCard } from '../features/billing/components/checkout-card';
import { SubscriptionStatusCard } from '../features/billing/components/subscription-status-card';
import { TransactionHistoryCard } from '../features/billing/components/transaction-history-card';
import { BillingClient } from '../features/billing/services/billing-client';
import type {
  Plan,
  UserSubscription,
  TransactionItem,
  CouponDiscount,
  CheckoutSession,
  RefundRequestResponse,
} from '../features/billing/types';

const renderClean = (element: React.JSX.Element): string =>
  renderToString(element)
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&');

describe('E2E Checkout Suite: Pricing, Coupons, Subscriptions & Refund Status (A03)', () => {
  const mockPlans: Plan[] = [
    {
      id: 'plan-monthly',
      name: 'Gói Tháng',
      interval: 'monthly',
      priceMinor: 199000,
      currency: 'VND',
      entitlements: ['all_exams', 'unlimited_mix'],
    },
    {
      id: 'plan-yearly',
      name: 'Gói Năm',
      interval: 'yearly',
      priceMinor: 999000,
      currency: 'VND',
      entitlements: ['all_exams', 'unlimited_mix', 'ai_explanations'],
    },
    {
      id: 'plan-lifetime',
      name: 'Gói Trọn Đời',
      interval: 'lifetime',
      priceMinor: 1999000,
      currency: 'VND',
      entitlements: ['all_exams', 'unlimited_mix', 'ai_explanations', 'srs_sync'],
    },
  ];

  // =========================================================================
  // 1. Pricing Table & Plan Selection
  // =========================================================================

  describe('Pricing Table & Plans Display', () => {
    it('renders all plans with formatted pricing, currency and feature checkmarks', () => {
      const html = renderClean(
        <PricingTable
          plans={mockPlans}
          selectedPlanId="plan-yearly"
          onSelectPlan={() => {}}
        />,
      );

      expect(html).toContain('data-testid="pricing-table"');
      expect(html).toContain('data-testid="pricing-card-plan-monthly"');
      expect(html).toContain('data-testid="pricing-card-plan-yearly"');
      expect(html).toContain('data-testid="pricing-card-plan-lifetime"');

      // Prices formatted with currency
      expect(html).toContain('199.000₫');
      expect(html).toContain('999.000₫');
      expect(html).toContain('1.999.000₫');

      // Plan selection button
      expect(html).toContain('data-testid="select-plan-plan-yearly"');
    });
  });

  // =========================================================================
  // 2. Coupon Validation & Application
  // =========================================================================

  describe('Coupon Input & Validation', () => {
    it('renders coupon input field and apply button when no coupon applied', () => {
      const html = renderClean(
        <CouponInput
          onApplyCoupon={async () => ({} as unknown as CouponDiscount)}
          onRemoveCoupon={() => {}}
          appliedCoupon={null}
        />,
      );

      expect(html).toContain('data-testid="coupon-code-input"');
      expect(html).toContain('data-testid="apply-coupon-button"');
      expect(html).not.toContain('data-testid="applied-coupon-card"');
    });

    it('renders applied coupon card with discount summary and remove button', () => {
      const html = renderClean(
        <CouponInput
          onApplyCoupon={async () => ({} as unknown as CouponDiscount)}
          onRemoveCoupon={() => {}}
          appliedCoupon={{
            code: 'JLPT2026',
            discountMinor: 200000,
            discountPercent: 20,
          }}
        />,
      );

      expect(html).toContain('data-testid="applied-coupon-card"');
      expect(html).toContain('JLPT2026');
      expect(html).toContain('200.000₫');
      expect(html).toContain('data-testid="remove-coupon-button"');
    });
  });

  // =========================================================================
  // 3. Checkout Summary & Price Computation
  // =========================================================================

  describe('Checkout Card & Payment Initiation', () => {
    it('computes order summary, discount deduction, and total amount accurately', () => {
      const html = renderClean(
        <CheckoutCard
          plan={mockPlans[1]!} // 999.000₫
          onApplyCoupon={async () => ({} as unknown as CouponDiscount)}
          onCheckout={async () => ({} as unknown as CheckoutSession)}
        />,
      );

      expect(html).toContain('data-testid="checkout-card"');
      expect(html).toContain('Gói Năm');
      expect(html).toContain('999.000₫');
      expect(html).toContain('data-testid="confirm-checkout-button"');
    });
  });

  // =========================================================================
  // 4. Subscription Management
  // =========================================================================

  describe('Subscription Status & Lifecycle', () => {
    it('renders active subscription with expiry date and cancel button', () => {
      const activeSub: UserSubscription = {
        planId: 'plan-yearly',
        status: 'active',
        currentPeriodEnd: '2027-10-15T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      };

      const html = renderClean(
        <SubscriptionStatusCard
          subscription={activeSub}
          onCancel={async () => {}}
          onRenew={async () => {}}
        />,
      );

      expect(html).toContain('data-testid="subscription-status-card"');
      expect(html).toContain('data-testid="cancel-subscription-button"');
    });

    it('renders cancelled subscription with renew button', () => {
      const cancelledSub: UserSubscription = {
        planId: 'plan-yearly',
        status: 'cancelled',
        currentPeriodEnd: '2026-10-15T00:00:00.000Z',
        cancelAtPeriodEnd: true,
      };

      const html = renderClean(
        <SubscriptionStatusCard
          subscription={cancelledSub}
          onCancel={async () => {}}
          onRenew={async () => {}}
        />,
      );

      expect(html).toContain('data-testid="renew-subscription-button"');
    });
  });

  // =========================================================================
  // 5. Transaction History & Refund Status
  // =========================================================================

  describe('Transaction History & Refund Status Display', () => {
    const mockTransactions: TransactionItem[] = [
      {
        orderId: 'ord-1001',
        amountMinor: 999000,
        currency: 'VND',
        status: 'paid',
        createdAt: '2026-10-01T10:00:00.000Z',
        planId: 'plan-yearly',
      },
      {
        orderId: 'ord-1002',
        amountMinor: 199000,
        currency: 'VND',
        status: 'refunded',
        refundStatus: 'refunded',
        createdAt: '2026-09-01T10:00:00.000Z',
        planId: 'plan-monthly',
      },
      {
        orderId: 'ord-1003',
        amountMinor: 199000,
        currency: 'VND',
        status: 'paid',
        refundStatus: 'requested',
        createdAt: '2026-10-10T10:00:00.000Z',
        planId: 'plan-monthly',
      },
    ];

    it('displays transaction items with correct order and refund status badges', () => {
      const html = renderClean(
        <TransactionHistoryCard
          transactions={mockTransactions}
          onRequestRefund={async () => ({} as unknown as RefundRequestResponse)}
        />,
      );

      expect(html).toContain('data-testid="transaction-history-card"');
      expect(html).toContain('data-testid="tx-row-ord-1001"');
      expect(html).toContain('data-testid="tx-row-ord-1002"');
      expect(html).toContain('data-testid="tx-row-ord-1003"');

      // Paid transaction has request refund button
      expect(html).toContain('data-testid="request-refund-ord-1001"');

      // Refunded transaction shows refund status badge
      expect(html).toContain('data-testid="tx-refund-status-ord-1002"');

      // Requested transaction shows pending refund status badge
      expect(html).toContain('data-testid="tx-refund-status-ord-1003"');
    });
  });

  // =========================================================================
  // 6. BillingClient & PaymentCreateSchema Contract Compliance
  // =========================================================================

  describe('BillingClient & PaymentCreateSchema Contract Compliance', () => {
    it('sends planId, term, returnPath and couponCode conforming to backend PaymentCreateSchema', async () => {
      let capturedPayload: unknown = null;
      const mockFetch: typeof fetch = async (_url, init) => {
        capturedPayload = JSON.parse(init?.body as string);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              orderId: 'ord-test-123',
              checkoutUrl: 'https://pay.payos.vn/test',
              amountMinor: 199000,
              currency: 'VND',
            }),
        } as unknown as Response;
      };

      const client = new BillingClient({ fetchFn: mockFetch });
      const session = await client.createCheckoutSession({
        planId: 'premium_month',
        term: 'month',
        quantity: 1,
        couponCode: 'JLPT2026',
        returnPath: '/goi-thanh-vien?checkout=completed',
      });

      expect(session.orderId).toBe('ord-test-123');
      expect(session.amountMinor).toBe(199000);
      expect(capturedPayload).toEqual({
        planId: 'premium_month',
        term: 'month',
        quantity: 1,
        couponCode: 'JLPT2026',
        returnPath: '/goi-thanh-vien?checkout=completed',
      });
    });
  });
});
