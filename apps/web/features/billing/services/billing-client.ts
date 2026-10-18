import type {
  Plan,
  CheckoutSession,
  UserSubscription,
  TransactionItem,
  RefundRequestInput,
  RefundRequestResponse,
  CouponDiscount,
} from '../types';

export class BillingClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private authToken?: string;

  constructor(options: { baseUrl?: string; fetchFn?: typeof fetch; authToken?: string } = {}) {
    this.baseUrl = (options.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');
    this.fetchFn = options.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    this.authToken = options.authToken;
  }

  public setAuthToken(token?: string): void {
    this.authToken = token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.authToken && !reqHeaders['Authorization']) {
      reqHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await this.fetchFn(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { text };
    }

    if (!response.ok) {
      const err = (data as { message?: string; code?: string }) || {};
      throw new Error(err.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  public async getPlans(): Promise<{ items: Plan[] }> {
    return this.request<{ items: Plan[] }>('GET', '/plans');
  }

  public async createCheckoutSession(data: {
    planId: string;
    term: 'month' | 'quarter' | 'year';
    quantity?: number;
    couponCode?: string;
    returnPath: string;
    provider?: string;
  }): Promise<CheckoutSession> {
    return this.request<CheckoutSession>('POST', '/checkout-sessions', data);
  }

  public async getUserSubscription(): Promise<UserSubscription> {
    return this.request<UserSubscription>('GET', '/me/subscription');
  }

  public async getUserTransactions(): Promise<{ items: TransactionItem[] }> {
    return this.request<{ items: TransactionItem[] }>('GET', '/me/transactions');
  }

  public async requestRefund(input: RefundRequestInput): Promise<RefundRequestResponse> {
    return this.request<RefundRequestResponse>('POST', '/me/refund-requests', input);
  }

  public async cancelSubscription(): Promise<{ success: boolean; cancelAtPeriodEnd: boolean }> {
    return this.request<{ success: boolean; cancelAtPeriodEnd: boolean }>('POST', '/me/subscription/cancel');
  }

  public async renewSubscription(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', '/me/subscription/renew');
  }

  public async validateCoupon(code: string, planId?: string): Promise<CouponDiscount> {
    return this.request<CouponDiscount>('POST', '/coupons/validate', {
      code: code.trim().toUpperCase(),
      planId,
    });
  }
}

export const defaultBillingClient = new BillingClient();
