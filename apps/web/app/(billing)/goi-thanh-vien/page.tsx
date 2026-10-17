'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PricingTable,
  CheckoutCard,
  defaultBillingClient,
  type Plan,
  type CouponDiscount,
  type CheckoutSession,
  type UserSubscription,
} from '../../../features/billing';
import { useI18n } from '../../../lib/i18n';
import { Alert, Button, Card, CardContent, Spinner } from '@jlpt/ui';
import Link from 'next/link';

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'premium_month',
    name: 'Gói Tháng (Ôn thi linh hoạt)',
    description: 'Thích hợp cho ôn luyện ngắn hạn trước kỳ thi 1-2 tháng.',
    interval: 'month',
    priceMinor: 199000,
    currency: 'VND',
    entitlements: ['all_exams', 'unlimited_mix', 'audio_transcripts'],
  },
  {
    id: 'premium_year',
    name: 'Gói Năm (Toàn diện N5-N1)',
    description: 'Tiết kiệm 50%, mở khóa toàn bộ tính năng và hỗ trợ 24/7.',
    interval: 'year',
    priceMinor: 1499000,
    currency: 'VND',
    entitlements: ['all_exams', 'unlimited_mix', 'ai_explanations', 'audio_transcripts', 'srs_sync'],
  },
  {
    id: 'premium_lifetime',
    name: 'Gói Trọn Đời (Lifetime Pass)',
    description: 'Sở hữu vĩnh viễn mọi cấp độ thi và cập nhật đề mới trọn đời.',
    interval: 'lifetime',
    priceMinor: 1999000,
    currency: 'VND',
    entitlements: ['all_exams', 'unlimited_mix', 'ai_explanations', 'audio_transcripts', 'srs_sync', 'priority_support'],
  },
];

export default function MembershipPage(): React.JSX.Element {
  const { t } = useI18n();

  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(DEFAULT_PLANS[1] ?? DEFAULT_PLANS[0] ?? null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await defaultBillingClient.getPlans();
      const planItems = res.items || [];
      if (planItems.length > 0) {
        setPlans(planItems);
        setSelectedPlan((prev) => (prev ? planItems.find((p) => p.id === prev.id) || planItems[0]! : planItems[0]!));
      }

      // Check current user subscription if logged in
      try {
        const sub = await defaultBillingClient.getUserSubscription();
        if (sub && sub.status !== 'none') {
          setSubscription(sub);
        } else {
          setSubscription(null);
        }
      } catch {
        setSubscription(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('403')) {
        // Not logged in or unauthenticated subscription check, ignore
      } else {
        setError(msg || t('common.status.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleApplyCoupon = async (code: string): Promise<CouponDiscount> => {
    if (!selectedPlan) {
      throw new Error('Vui lòng chọn gói cước trước.');
    }

    return defaultBillingClient.validateCoupon(code, selectedPlan.id);
  };

  const handleCheckout = async (planId: string, couponCode?: string): Promise<CheckoutSession> => {
    if (!selectedPlan) {
      throw new Error('Vui lòng chọn gói thành viên.');
    }

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
    <div className="max-w-5xl mx-auto py-8 px-4 w-full flex flex-col gap-8">
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

      {subscription && subscription.status === 'active' && (
        <Alert variant="info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <strong>Gói hiện tại của bạn:</strong> {plans.find((p) => p.id === subscription.planId)?.name || subscription.planId} (Đang hoạt động)
              {subscription.currentPeriodEnd && (
                <span style={{ display: 'block', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  Hiệu lực đến: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
            <Link href="/tai-khoan">
              <Button size="sm" variant="outline">Quản lý thuê bao</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadPlans}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0', alignItems: 'center', gap: '0.75rem' }}>
          <Spinner size="md" />
          <span style={{ color: 'var(--text-secondary)' }}>{t('common.status.loading')}</span>
        </div>
      )}

      {!loading && plans.length === 0 && (
        <Card>
          <CardContent style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💎</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              Hiện chưa có gói thành viên mở bán
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
              Hệ thống đang cập nhật bảng giá ưu đãi mới. Trong lúc chờ đợi, bạn vẫn có thể làm thử các đề thi mẫu miễn phí.
            </p>
            <Link href="/de-thi">
              <Button variant="primary">Làm thử đề thi</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {plans.length > 0 && (
        <>
          {/* Pricing Cards */}
          <PricingTable
            plans={plans}
            selectedPlanId={selectedPlan?.id}
            onSelectPlan={(p) => setSelectedPlan(p)}
          />

          {/* Checkout Card for Selected Plan */}
          {selectedPlan && (
            <div style={{ width: '100%' }}>
              <CheckoutCard
                plan={selectedPlan}
                onApplyCoupon={handleApplyCoupon}
                onCheckout={handleCheckout}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
