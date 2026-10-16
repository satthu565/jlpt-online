import type {
  AdminCouponItem,
  AdminPaymentItem,
  AdminPlanItem,
  AdminRefundItem,
  AdminRevenueReport,
  AdminSubscriptionItem,
} from './types';

export class BillingManager {
  private plans: AdminPlanItem[] = [
    {
      id: 'free',
      name: 'Gói Miễn Phí (Free)',
      description: 'Luyện thi và tra cứu từ vựng cơ bản',
      interval: 'lifetime',
      priceMinor: 0,
      currency: 'VND',
      version: 1,
      entitlements: ['basic_exams', 'practice_mode', 'vocab_flashcards'],
      isActive: true,
    },
    {
      id: 'premium_month',
      name: 'Gói Premium 1 Tháng',
      description: 'Toàn bộ đề thi chuẩn và hỗ trợ AI giải thích',
      interval: 'month',
      priceMinor: 199000,
      currency: 'VND',
      version: 1,
      entitlements: ['unlimited_exams', 'ai_explanations', 'advanced_analytics'],
      isActive: true,
    },
    {
      id: 'premium_year',
      name: 'Gói Premium 1 Năm',
      description: 'Gói năm tiết kiệm 40% chi phí',
      interval: 'year',
      priceMinor: 1499000,
      currency: 'VND',
      version: 1,
      entitlements: ['unlimited_exams', 'ai_explanations', 'advanced_analytics'],
      isActive: true,
    },
  ];

  private coupons: AdminCouponItem[] = [
    {
      code: 'JLPT2026',
      discountPercent: 20,
      discountAmount: null,
      maxRedemptions: 100,
      timesRedeemed: 15,
      validUntil: '2026-12-31T23:59:59Z',
    },
    {
      code: 'WELCOME50K',
      discountPercent: null,
      discountAmount: 50000,
      maxRedemptions: 500,
      timesRedeemed: 120,
      validUntil: '2026-12-31T23:59:59Z',
    },
  ];

  private payments: AdminPaymentItem[] = [
    {
      orderId: '0192a000-0000-7000-8000-000000000001',
      userId: '0192a000-0000-7000-8000-000000000002',
      totalAmount: 199000,
      currency: 'VND',
      status: 'paid',
      createdAt: '2026-10-15T08:00:00Z',
    },
    {
      orderId: '0192a000-0000-7000-8000-000000000003',
      userId: '0192a000-0000-7000-8000-000000000004',
      totalAmount: 1499000,
      currency: 'VND',
      status: 'paid',
      createdAt: '2026-10-15T10:30:00Z',
    },
  ];

  private subscriptions: AdminSubscriptionItem[] = [
    {
      id: '0192a000-0000-7000-8000-000000000005',
      userId: '0192a000-0000-7000-8000-000000000002',
      planId: 'premium_month',
      status: 'active',
      currentPeriodStart: '2026-10-15T08:00:00Z',
      currentPeriodEnd: '2026-11-15T08:00:00Z',
      cancelAtPeriodEnd: false,
    },
  ];

  private refunds: AdminRefundItem[] = [
    {
      id: '0192a000-0000-7000-8000-000000000006',
      orderId: '0192a000-0000-7000-8000-000000000001',
      amount: 199000,
      currency: 'VND',
      reason: 'Mua nhầm gói cần nâng cấp lên gói năm',
      status: 'requested',
      createdAt: '2026-10-15T12:00:00Z',
    },
  ];

  listPlans(): AdminPlanItem[] {
    return [...this.plans];
  }

  createPlan(input: {
    name: string;
    code: string;
    interval: string;
    priceMinor: number;
    currency?: string;
    entitlements?: string[];
  }): AdminPlanItem {
    if (input.priceMinor < 0) {
      throw new Error('Giá gói không được nhỏ hơn 0.');
    }
    const existingIndex = this.plans.findIndex((p) => p.id === input.code);
    if (existingIndex >= 0) {
      const existing = this.plans[existingIndex]!;
      const updated: AdminPlanItem = {
        ...existing,
        name: input.name,
        priceMinor: input.priceMinor,
        currency: input.currency || existing.currency,
        version: existing.version + 1,
        entitlements: input.entitlements || existing.entitlements,
      };
      this.plans[existingIndex] = updated;
      return updated;
    }

    const newPlan: AdminPlanItem = {
      id: input.code,
      name: input.name,
      description: `Gói ${input.name}`,
      interval: input.interval,
      priceMinor: input.priceMinor,
      currency: input.currency || 'VND',
      version: 1,
      entitlements: input.entitlements || [],
      isActive: true,
    };
    this.plans.push(newPlan);
    return newPlan;
  }

  listCoupons(): AdminCouponItem[] {
    return [...this.coupons];
  }

  createCoupon(input: {
    code: string;
    discountPercent?: number | null;
    discountAmount?: number | null;
    maxRedemptions: number;
    validUntil?: string | null;
  }): AdminCouponItem {
    if (input.maxRedemptions <= 0) {
      throw new Error('Số lượt sử dụng tối đa phải lớn hơn 0.');
    }
    if (!input.discountPercent && !input.discountAmount) {
      throw new Error('Cần chỉ định phần trăm giảm hoặc số tiền giảm cố định.');
    }
    if (input.discountPercent && (input.discountPercent <= 0 || input.discountPercent > 100)) {
      throw new Error('Phần trăm giảm phải từ 1 đến 100.');
    }
    const cleanCode = input.code.trim().toUpperCase();
    if (this.coupons.some((c) => c.code === cleanCode)) {
      throw new Error(`Mã giảm giá ${cleanCode} đã tồn tại.`);
    }

    const newCoupon: AdminCouponItem = {
      code: cleanCode,
      discountPercent: input.discountPercent ?? null,
      discountAmount: input.discountAmount ?? null,
      maxRedemptions: input.maxRedemptions,
      timesRedeemed: 0,
      validUntil: input.validUntil ?? null,
    };
    this.coupons.push(newCoupon);
    return newCoupon;
  }

  listPayments(): AdminPaymentItem[] {
    return [...this.payments];
  }

  listSubscriptions(): AdminSubscriptionItem[] {
    return [...this.subscriptions];
  }

  listRefunds(): AdminRefundItem[] {
    return [...this.refunds];
  }

  addRefund(refund: AdminRefundItem): AdminRefundItem {
    this.refunds.push(refund);
    return refund;
  }

  approveRefund(refundId: string): AdminRefundItem {
    const item = this.refunds.find((r) => r.id === refundId);
    if (!item) {
      throw new Error('Không tìm thấy yêu cầu hoàn tiền.');
    }
    if (item.status !== 'requested') {
      throw new Error(`Yêu cầu hoàn tiền đang ở trạng thái ${item.status}.`);
    }

    if (!item.currency) {
      const order = this.payments.find((p) => p.orderId === item.orderId);
      if (order) item.currency = order.currency;
    }

    item.status = 'refunded';
    return { ...item };
  }

  rejectRefund(refundId: string, reason?: string): AdminRefundItem {
    const item = this.refunds.find((r) => r.id === refundId);
    if (!item) {
      throw new Error('Không tìm thấy yêu cầu hoàn tiền.');
    }
    item.status = 'rejected';
    item.reason = reason ? `Từ chối: ${reason}` : item.reason;
    return { ...item };
  }

  getRevenueReport(currency = 'VND'): AdminRevenueReport {
    const targetCurrency = currency.toUpperCase();
    const gross = this.payments
      .filter((p) => p.status === 'paid' && p.currency.toUpperCase() === targetCurrency)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const refunds = this.refunds
      .filter((r) => {
        if (r.status !== 'refunded') return false;
        const refundCurr = (r.currency || this.payments.find((p) => p.orderId === r.orderId)?.currency || 'VND').toUpperCase();
        return refundCurr === targetCurrency;
      })
      .reduce((sum, r) => sum + r.amount, 0);

    const paidOrdersForCurrency = this.payments.filter(
      (p) => p.status === 'paid' && p.currency.toUpperCase() === targetCurrency,
    ).length;
    const refundedForCurrency = this.refunds.filter((r) => {
      if (r.status !== 'refunded') return false;
      const refundCurr = (r.currency || this.payments.find((p) => p.orderId === r.orderId)?.currency || 'VND').toUpperCase();
      return refundCurr === targetCurrency;
    }).length;

    return {
      grossMinor: gross,
      refundMinor: refunds,
      netMinor: gross - refunds,
      currency,
      breakdownByCurrency: {
        [currency]: {
          grossMinor: gross,
          refundMinor: refunds,
          netMinor: gross - refunds,
          orderCount: paidOrdersForCurrency,
          refundCount: refundedForCurrency,
        },
      },
    };
  }
}
