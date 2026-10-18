import type { PaymentTerm } from '@jlpt/schema';

export type OrderStatus = 'created' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type PaymentAttemptStatus = 'initiated' | 'successful' | 'failed' | 'cancelled';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type RefundStatus = 'requested' | 'approved' | 'processing' | 'refunded' | 'rejected';
export type TenantPlanStatus = 'trial' | 'active' | 'suspended' | 'expired';

export interface PlanDto {
  id: string;
  name: string;
  description?: string | null;
  interval: PaymentTerm | 'lifetime' | string;
  priceMinor: number;
  currency: string;
  version?: number;
  entitlements?: string[];
  isActive?: boolean;
}

export interface AdminPlanCreateDto {
  name: string;
  code: string;
  term?: PaymentTerm | 'lifetime' | string;
  interval?: PaymentTerm | 'lifetime' | string;
  priceMinor: number;
  currency?: string;
  entitlements?: string[];
  maxUses?: number;
  active?: boolean;
}

export interface CheckoutSessionDto {
  orderId: string;
  checkoutUrl: string;
  amountMinor: number;
  currency: string;
  couponApplied?: {
    code: string;
    discountMinor: number;
  };
}

export interface UserSubscriptionDto {
  planId?: string | null;
  status: SubscriptionStatus;
  expiresAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface TransactionItemDto {
  orderId: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  planId?: string | null;
  paymentAttemptId?: string | null;
}

export interface RefundRequestDto {
  transactionId: string;
  reason: string;
  amountMinor?: number;
}

export interface AdminCouponCreateDto {
  code: string;
  discountPercent?: number | null;
  discountMinor?: number | null;
  discountAmount?: number | null;
  maxUses?: number;
  maxRedemptions?: number;
  expiresAt?: string;
  validUntil?: string;
  scope?: string;
}

export interface RevenueReportDto {
  grossMinor: number;
  refundMinor: number;
  netMinor: number;
  currency: string;
  periodStart?: string;
  periodEnd?: string;
  breakdownByCurrency?: Record<string, {
    grossMinor: number;
    refundMinor: number;
    netMinor: number;
    orderCount: number;
    refundCount: number;
  }>;
}

export interface SubscriptionChangeResultDto {
  updated: boolean;
  requiresPayment?: boolean;
  checkoutUrl?: string;
  orderId?: string;
  prorationMinor?: number;
}

export interface ProviderStatementItem {
  reference: string;
  orderId?: string;
  amountMinor: number;
  currency: string;
  status: 'PAID' | 'REFUNDED' | 'FAILED';
  timestamp: string;
}

export type DiscrepancyType =
  | 'amount_mismatch'
  | 'missing_internal_order'
  | 'missing_provider_settlement'
  | 'refund_amount_mismatch'
  | 'unprocessed_refund'
  | 'duplicate_provider_ref';

export interface ReconciliationDiscrepancyItem {
  type: DiscrepancyType;
  orderId?: string;
  providerRef?: string;
  expectedAmountMinor?: number;
  actualAmountMinor?: number;
  currency?: string;
  description: string;
}

export interface ReconciliationSummaryDto {
  runId: string;
  provider: string;
  periodStart: string;
  periodEnd: string;
  totalOrdersChecked: number;
  totalRefundsChecked: number;
  matchedOrdersCount: number;
  matchedRefundsCount: number;
  grossSettledMinor: number;
  refundSettledMinor: number;
  netSettledMinor: number;
  discrepanciesCount: number;
  discrepancies: ReconciliationDiscrepancyItem[];
  status: 'reconciled' | 'discrepancy_detected';
  runAt: string;
}

export interface ProviderReadinessDto {
  provider: string;
  isLive: boolean;
  mode: 'sandbox' | 'live';
  configured: boolean;
  missingPrerequisites?: string[];
  webhookVerifiedInSandbox: boolean;
  evidence: {
    sandboxTested: boolean;
    signatureAlgorithm: 'HMAC-SHA256';
    replayProtected: boolean;
    outOfOrderProtected: boolean;
    reconciliationReady: boolean;
  };
}

export interface AdminSubscriptionItemDto {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface AdminPaymentItemDto {
  id: string;
  orderId: string;
  userId: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface AdminRefundItemDto {
  id: string;
  orderId: string;
  transactionId: string;
  amount: number;
  reason: string | null;
  status: string;
  createdAt: string;
}



