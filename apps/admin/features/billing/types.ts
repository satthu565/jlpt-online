export interface AdminPlanItem {
  id: string;
  name: string;
  description?: string | null;
  interval: string;
  priceMinor: number;
  currency: string;
  version: number;
  entitlements: string[];
  isActive: boolean;
}

export interface AdminCouponItem {
  code: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  maxRedemptions: number;
  timesRedeemed: number;
  validUntil?: string | null;
}

export interface AdminPaymentItem {
  orderId: string;
  userId: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface AdminSubscriptionItem {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface AdminRefundItem {
  id: string;
  orderId: string;
  amount: number;
  reason?: string | null;
  status: 'requested' | 'approved' | 'rejected' | 'refunded';
  createdAt: string;
}

export interface AdminRevenueReport {
  grossMinor: number;
  refundMinor: number;
  netMinor: number;
  currency: string;
  breakdownByCurrency?: Record<string, {
    grossMinor: number;
    refundMinor: number;
    netMinor: number;
    orderCount: number;
    refundCount: number;
  }>;
}
