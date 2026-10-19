import type {
  AdminCouponItem,
  AdminDiscrepancyItem,
  AdminPaymentItem,
  AdminPlanItem,
  AdminReconciliationRun,
  AdminRefundItem,
  AdminRevenueReport,
  AdminSubscriptionItem,
} from './types';

/**
 * Pure calculation function for reconciliation discrepancies (PAY-04, ADM-16).
 */
export function computeReconciliationDiscrepancies(
  internalPayments: Array<{ orderId: string; totalAmount: number }>,
  externalStatements?: Array<{
    reference: string;
    orderId?: string;
    amountMinor: number;
    currency: string;
    status: 'PAID' | 'REFUNDED' | 'FAILED';
  }>,
): AdminDiscrepancyItem[] {
  const discrepancies: AdminDiscrepancyItem[] = [];

  if (externalStatements && externalStatements.length > 0) {
    for (const stmt of externalStatements) {
      if (stmt.status === 'PAID') {
        const matchingOrder = internalPayments.find((p) => p.orderId === stmt.orderId);
        if (!matchingOrder) {
          discrepancies.push({
            type: 'missing_internal_order',
            providerRef: stmt.reference,
            orderId: stmt.orderId,
            actualAmountMinor: stmt.amountMinor,
            currency: stmt.currency,
            description: `Chứng từ ${stmt.reference} không tồn tại trong hệ thống đơn hàng.`,
          });
        } else if (matchingOrder.totalAmount !== stmt.amountMinor) {
          discrepancies.push({
            type: 'amount_mismatch',
            orderId: matchingOrder.orderId,
            providerRef: stmt.reference,
            expectedAmountMinor: matchingOrder.totalAmount,
            actualAmountMinor: stmt.amountMinor,
            description: `Số tiền đơn hàng ${matchingOrder.orderId} không khớp chứng từ provider.`,
          });
        }
      }
    }
  }

  return discrepancies;
}

/**
 * Pure calculation function for revenue reports partitioned by currency (PAY-12).
 */
export function calculateRevenueReport(
  payments: AdminPaymentItem[],
  refunds: AdminRefundItem[],
  currency = 'VND',
): AdminRevenueReport {
  const targetCurrency = currency.toUpperCase();
  const gross = payments
    .filter((p) => p.status === 'paid' && p.currency.toUpperCase() === targetCurrency)
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const totalRefunds = refunds
    .filter((r) => {
      if (r.status !== 'refunded') return false;
      const refundCurr = (r.currency || payments.find((p) => p.orderId === r.orderId)?.currency || 'VND').toUpperCase();
      return refundCurr === targetCurrency;
    })
    .reduce((sum, r) => sum + r.amount, 0);

  const paidOrdersForCurrency = payments.filter(
    (p) => p.status === 'paid' && p.currency.toUpperCase() === targetCurrency,
  ).length;
  const refundedForCurrency = refunds.filter((r) => {
    if (r.status !== 'refunded') return false;
    const refundCurr = (r.currency || payments.find((p) => p.orderId === r.orderId)?.currency || 'VND').toUpperCase();
    return refundCurr === targetCurrency;
  }).length;

  return {
    grossMinor: gross,
    refundMinor: totalRefunds,
    netMinor: gross - totalRefunds,
    currency,
    breakdownByCurrency: {
      [currency]: {
        grossMinor: gross,
        refundMinor: totalRefunds,
        netMinor: gross - totalRefunds,
        orderCount: paidOrdersForCurrency,
        refundCount: refundedForCurrency,
      },
    },
  };
}

export interface BillingInitialData {
  plans?: AdminPlanItem[];
  coupons?: AdminCouponItem[];
  payments?: AdminPaymentItem[];
  subscriptions?: AdminSubscriptionItem[];
  refunds?: AdminRefundItem[];
  reconciliationRuns?: AdminReconciliationRun[];
}

export class BillingManager {
  private plans: AdminPlanItem[] = [];
  private coupons: AdminCouponItem[] = [];
  private payments: AdminPaymentItem[] = [];
  private subscriptions: AdminSubscriptionItem[] = [];
  private refunds: AdminRefundItem[] = [];
  private reconciliationRuns: AdminReconciliationRun[] = [];

  constructor(initialData?: BillingInitialData) {
    if (initialData?.plans) this.plans = [...initialData.plans];
    if (initialData?.coupons) this.coupons = [...initialData.coupons];
    if (initialData?.payments) this.payments = [...initialData.payments];
    if (initialData?.subscriptions) this.subscriptions = [...initialData.subscriptions];
    if (initialData?.refunds) this.refunds = [...initialData.refunds];
    if (initialData?.reconciliationRuns) this.reconciliationRuns = [...initialData.reconciliationRuns];
  }

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
    return calculateRevenueReport(this.payments, this.refunds, currency);
  }

  listReconciliationRuns(): AdminReconciliationRun[] {
    return [...this.reconciliationRuns];
  }

  runReconciliation(
    provider = 'payos',
    externalStatements?: Array<{
      reference: string;
      orderId?: string;
      amountMinor: number;
      currency: string;
      status: 'PAID' | 'REFUNDED' | 'FAILED';
    }>,
    _operator?: { id: string; email?: string; role: string; tenantId?: string },
  ): AdminReconciliationRun {
    const discrepancies = computeReconciliationDiscrepancies(this.payments, externalStatements);
    const runId = `rec_run_${Date.now()}`;
    const newRun: AdminReconciliationRun = {
      id: runId,
      provider,
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      discrepanciesFound: discrepancies.length,
      discrepancies,
      status: discrepancies.length === 0 ? 'reconciled' : 'discrepancy_detected',
      runAt: new Date().toISOString(),
    };

    this.reconciliationRuns.unshift(newRun);
    return newRun;
  }
}
