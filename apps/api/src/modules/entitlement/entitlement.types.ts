export type TenantPlanStatus = 'trial' | 'active' | 'suspended' | 'expired';

export interface UserEntitlementItem {
  entitlement: string;
  active: boolean;
  expiresAt?: string | null;
}

export interface FeatureCheckResult {
  allowed: boolean;
  code?: string;
  reason?: string;
  limit?: number;
  remaining?: number;
}

export interface TenantPlanDetails {
  tenantId: string;
  planCode: string;
  status: TenantPlanStatus;
  totalSeats: number;
  usedSeats: number;
  maxClasses: number;
  expiresAt?: string | null;
  features: string[];
}

export interface AIQuotaReserveParams {
  userId: string;
  estimatedTokens: number;
  taskType: string;
}

export interface AIQuotaReserveResult {
  reservationId: string;
  estimatedTokens: number;
  reservedAt: string;
}

export interface AIQuotaSettleParams {
  reservationId: string;
  actualTokens: number;
  costMicroUsd: number;
  aiRequestId?: string;
}

export interface AIQuotaRefundResult {
  refunded: boolean;
  reservationId: string;
}
