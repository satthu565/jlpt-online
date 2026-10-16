import crypto from 'node:crypto';
import type {
  CheckoutSessionResult,
  CreateCheckoutSessionParams,
  IPaymentProvider,
  RefundPaymentParams,
  RefundResult,
  WebhookVerificationResult,
} from './payment-provider.interface.js';

export class PayOSAdapter implements IPaymentProvider {
  readonly name = 'payos';

  private readonly clientId: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly checksumKey: string | undefined;
  private readonly isLiveMode: boolean;

  constructor(options?: {
    clientId?: string;
    apiKey?: string;
    checksumKey?: string;
    isLive?: boolean;
  }) {
    this.clientId = options?.clientId ?? process.env['PAYOS_CLIENT_ID'];
    this.apiKey = options?.apiKey ?? process.env['PAYOS_API_KEY'];
    this.checksumKey = options?.checksumKey ?? process.env['PAYOS_CHECKSUM_KEY'] ?? 'test-checksum-key-mock-unverified';
    // Live mode requires both live keys and NODE_ENV=production or explicit isLive: true
    this.isLiveMode = Boolean(
      options?.isLive ??
        (process.env['PAYOS_ENV'] === 'live' &&
          this.clientId &&
          this.apiKey &&
          process.env['NODE_ENV'] === 'production'),
    );
  }

  isLive(): boolean {
    return this.isLiveMode;
  }

  getProviderStatus(): {
    configured: boolean;
    isLive: boolean;
    missingPrerequisites?: string[];
  } {
    const missing: string[] = [];
    if (!this.clientId) missing.push('PAYOS_CLIENT_ID');
    if (!this.apiKey) missing.push('PAYOS_API_KEY');
    if (!process.env['PAYOS_CHECKSUM_KEY']) missing.push('PAYOS_CHECKSUM_KEY');

    return {
      configured: missing.length === 0,
      isLive: this.isLiveMode,
      missingPrerequisites: missing.length > 0 ? ['payment-provider', ...missing] : undefined,
    };
  }

  /**
   * Generates HMAC-SHA256 signature for PayOS data object.
   * PayOS sorts keys alphabetically and creates a query string key1=value1&key2=value2...
   */
  generateSignature(data: Record<string, unknown>, key?: string): string {
    const signingKey = key ?? this.checksumKey ?? 'test-checksum-key-mock-unverified';
    const sortedKeys = Object.keys(data)
      .filter((k) => k !== 'signature' && data[k] !== undefined && data[k] !== null)
      .sort();

    const dataString = sortedKeys
      .map((k) => {
        const val = data[k];
        if (typeof val === 'object') {
          return `${k}=${JSON.stringify(val)}`;
        }
        return `${k}=${String(val)}`;
      })
      .join('&');

    return crypto.createHmac('sha256', signingKey).update(dataString).digest('hex');
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const paymentRef = `payos_${params.orderId.replace(/-/g, '').slice(0, 16)}`;
    const checkoutUrl = `https://pay.payos.vn/web/${paymentRef}?orderId=${encodeURIComponent(params.orderId)}&amount=${params.amountMinor}&returnUrl=${encodeURIComponent(params.returnUrl)}`;

    return {
      checkoutUrl,
      providerPaymentRef: paymentRef,
    };
  }

  async verifyWebhook(
    rawBody: string | Buffer | Record<string, unknown>,
    signatureHeader?: string,
    headers?: Record<string, string | string[] | undefined>,
  ): Promise<WebhookVerificationResult> {
    let parsed: Record<string, unknown>;

    if (typeof rawBody === 'string' || Buffer.isBuffer(rawBody)) {
      try {
        parsed = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return {
          isValid: false,
          error: 'INVALID_JSON_BODY',
        };
      }
    } else if (typeof rawBody === 'object' && rawBody !== null) {
      parsed = rawBody;
    } else {
      return {
        isValid: false,
        error: 'EMPTY_OR_INVALID_BODY',
      };
    }

    // Extract signature from payload or header
    const receivedSignature =
      signatureHeader ||
      (typeof parsed['signature'] === 'string' ? parsed['signature'] : undefined) ||
      (headers?.['x-signature'] as string | undefined) ||
      (headers?.['webhook-signature'] as string | undefined);

    if (!receivedSignature) {
      return {
        isValid: false,
        error: 'MISSING_SIGNATURE',
      };
    }

    // Check data field (PayOS format) or whole payload
    const dataToSign =
      typeof parsed['data'] === 'object' && parsed['data'] !== null
        ? (parsed['data'] as Record<string, unknown>)
        : parsed;

    const expectedSignature = this.generateSignature(dataToSign);

    // Timing-safe comparison to prevent timing attacks
    const sigBufferA = Buffer.from(receivedSignature, 'hex');
    const sigBufferB = Buffer.from(expectedSignature, 'hex');

    if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
      return {
        isValid: false,
        error: 'INVALID_SIGNATURE',
      };
    }

    // Payload is cryptographically valid
    const data = (parsed['data'] as Record<string, unknown>) || parsed;
    const orderId = (data['orderId'] as string) || (data['orderCode'] ? String(data['orderCode']) : undefined);
    const amountMinor = typeof data['amount'] === 'number' ? data['amount'] : undefined;
    const currency = (data['currency'] as string) || 'VND';
    const code = String(data['code'] ?? parsed['code'] ?? '00');
    const status = code === '00' ? 'PAID' : 'FAILED';
    const eventId = (data['reference'] as string) || (data['paymentLinkId'] as string) || (data['eventId'] as string) || `evt_${receivedSignature.slice(0, 16)}`;

    return {
      isValid: true,
      eventId,
      eventType: status === 'PAID' ? 'payment.captured' : 'payment.failed',
      orderId,
      amountMinor,
      currency,
      status,
      rawPayload: parsed,
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundResult> {
    if (!this.isLiveMode && !params.paymentRef) {
      return {
        success: false,
        providerRefundRef: '',
        status: 'failed',
        error: 'INVALID_PAYMENT_REF',
      };
    }

    const providerRefundRef = `ref_payos_${crypto.randomUUID()}`;
    return {
      success: true,
      providerRefundRef,
      status: 'successful',
    };
  }
}
