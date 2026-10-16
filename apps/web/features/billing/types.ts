export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type OrderStatus = 'created' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type RefundStatus = 'requested' | 'approved' | 'processing' | 'refunded' | 'rejected';

export interface Plan {
  id: string;
  name: string;
  description?: string | null;
  interval: 'monthly' | 'yearly' | 'lifetime' | string;
  priceMinor: number;
  currency: string;
  entitlements?: string[];
  isActive?: boolean;
}

export interface CouponDiscount {
  code: string;
  discountMinor: number;
  discountPercent?: number;
}

export interface CreateCheckoutSessionInput {
  planId: string;
  term: 'month' | 'quarter' | 'year';
  quantity?: number;
  couponCode?: string;
  returnPath: string;
  provider?: string;
}

export interface CheckoutSession {
  orderId: string;
  checkoutUrl: string;
  amountMinor: number;
  currency: string;
  couponApplied?: {
    code: string;
    discountMinor: number;
  };
}

export interface UserSubscription {
  planId?: string | null;
  status: SubscriptionStatus;
  expiresAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface TransactionItem {
  orderId: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  planId?: string | null;
  paymentAttemptId?: string | null;
  refundStatus?: RefundStatus;
}

export interface RefundRequestInput {
  transactionId: string;
  reason: string;
  amountMinor?: number;
}

export interface RefundRequestResponse {
  refundId: string;
  status: string;
}
