'use client';

import React, { useState, useEffect } from 'react';
import {
  PricingTable,
  CheckoutCard,
  defaultBillingClient,
  type Plan,
  type CouponDiscount,
  type CheckoutSession,
} from '../../../features/billing';
import { useI18n } from '../../../lib/i18n';

const SAMPLE_PLANS: Plan[] = [
  {
    id: 'premium_month',
    name: 'Gói Tháng (Ôn thi linh hoạt)',
    description: 'Thích hợp cho ôn luyện ngắn hạn trước kỳ thi 1-2 tháng.',
    interval: 'month',
    priceMinor: 199000, // 199.000₫
    currency: 'VND',
    entitlements: ['all_exams', 'unlimited_mix', 'audio_transcripts'],
  },
  {
    id: 'premium_year',
    name: 'Gói Năm (Toàn diện N5-N1)',
    description: 'Tiết kiệm 50%, mở khóa toàn bộ tính năng và hỗ trợ 24/7.',
    interval: 'year',
    priceMinor: 1499000, // 1.499.000₫
    currency: 'VND',
    entitlements: ['all_exams', 'unlimited_mix', 'ai_explanations', 'audio_transcripts', 'srs_sync'],
  },
  {
    id: 'plan-lifetime',
    name: 'Gói Trọn Đời (Lifetime Pass)',
    description: 'Sở hữu vĩnh viễn mọi cấp độ thi và cập nhật đề mới trọn đời.',
    interval: 'lifetime',
    priceMinor: 1999000, // 1.999.000₫
    currency: 'VND',
    entitlements: ['all_exams', 'unlimited_mix', 'ai_explanations', 'audio_transcripts', 'srs_sync', 'priority_support'],
  },
];

export default function MembershipPage(): React.JSX.Element {
  const { t } = useI18n();

  const [plans, setPlans] = useState<Plan[]>(SAMPLE_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(SAMPLE_PLANS[1] ?? SAMPLE_PLANS[0]!); // Yearly default

  const loadPlans = async () => {
    try {
      const res = await defaultBillingClient.getPlans();
      if (res.items && res.items.length > 0 && res.items[0]) {
        setPlans(res.items);
        setSelectedPlan(res.items[0]);
      }
    } catch {
      // Use fallback
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleApplyCoupon = async (code: string): Promise<CouponDiscount> => {
    // Validate coupon code
    const validCodes: Record<string, { discountPercent: number; discountMinor: number }> = {
      JLPT2026: { discountPercent: 20, discountMinor: Math.round(selectedPlan.priceMinor * 0.2) },
      CHAOHE: { discountPercent: 30, discountMinor: Math.round(selectedPlan.priceMinor * 0.3) },
      VIP50: { discountPercent: 50, discountMinor: Math.round(selectedPlan.priceMinor * 0.5) },
    };

    const match = validCodes[code.toUpperCase()];
    if (!match) {
      throw new Error(t('billing.coupon.invalidErrorCode', { code }));
    }

    return {
      code: code.toUpperCase(),
      discountMinor: match.discountMinor,
      discountPercent: match.discountPercent,
    };
  };

  const handleCheckout = async (planId: string, couponCode?: string): Promise<CheckoutSession> => {
    const term: 'month' | 'quarter' | 'year' =
      selectedPlan.interval === 'quarter'
        ? 'quarter'
        : selectedPlan.interval === 'yearly' || selectedPlan.interval === 'year' || selectedPlan.interval === 'lifetime'
        ? 'year'
        : 'month';

    const returnPath = typeof window !== 'undefined'
      ? `${window.location.pathname}?checkout=completed`
      : '/goi-thanh-vien?checkout=completed';

    return defaultBillingClient.createCheckoutSession({
      planId,
      term,
      quantity: 1,
      couponCode: couponCode || undefined,
      returnPath,
    });
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.75rem 0',
          }}
        >
          {t('billing.page.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', margin: 0 }}>
          {t('billing.page.subtitle')}
        </p>
      </div>

      {/* Pricing Cards */}
      <PricingTable
        plans={plans}
        selectedPlanId={selectedPlan.id}
        onSelectPlan={(p) => setSelectedPlan(p)}
      />

      {/* Checkout Card for Selected Plan */}
      <div style={{ width: '100%' }}>
        <CheckoutCard
          plan={selectedPlan}
          onApplyCoupon={handleApplyCoupon}
          onCheckout={handleCheckout}
        />
      </div>
    </div>
  );
}
