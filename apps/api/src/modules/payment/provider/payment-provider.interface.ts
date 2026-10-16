export interface CreateCheckoutSessionParams {
  orderId: string;
  amountMinor: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  buyerEmail?: string;
  buyerName?: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  providerPaymentRef: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventId?: string;
  eventType?: string;
  orderId?: string;
  amountMinor?: number;
  currency?: string;
  status?: 'PAID' | 'FAILED' | 'CANCELLED';
  rawPayload?: Record<string, unknown>;
  error?: string;
}

export interface RefundPaymentParams {
  paymentRef: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  reason: string;
}

export interface RefundResult {
  success: boolean;
  providerRefundRef: string;
  status: 'successful' | 'pending' | 'failed';
  error?: string;
}

export interface IPaymentProvider {
  readonly name: string;
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult>;
  verifyWebhook(
    rawBody: string | Buffer | Record<string, unknown>,
    signature?: string,
    headers?: Record<string, string | string[] | undefined>,
  ): Promise<WebhookVerificationResult>;
  refundPayment(params: RefundPaymentParams): Promise<RefundResult>;
  isLive(): boolean;
  getProviderStatus(): {
    configured: boolean;
    isLive: boolean;
    missingPrerequisites?: string[];
  };
}
