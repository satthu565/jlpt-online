import type { Role } from '@jlpt/schema';
import type { StaffUser } from './auth-context';
import { isStaffRole } from './navigation';
import {
  generateBase32Secret,
  formatSecret,
  generateOtpAuthUri,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
  verifyAndConsumeRecoveryCode,
} from './totp';
import { generateQrMatrix } from './qrcode';

export type GuardErrorCode = 'UNAUTHENTICATED' | 'TWO_FACTOR_REQUIRED' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'NETWORK_ERROR';

export class AdminClientGuardError extends Error {
  public readonly code: GuardErrorCode;
  public readonly status: number;
  public readonly details: Record<string, unknown>;

  constructor(code: GuardErrorCode, message: string, status = 403, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AdminClientGuardError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface AdminApiClientOptions {
  baseUrl?: string;
  adminHost?: string;
  token?: string | null;
  user?: StaffUser | null;
  fetchFn?: typeof fetch;
  mode?: 'real' | 'mock';
}

export interface Setup2faResponse {
  secret: string;
  formattedSecret: string;
  otpauthUri: string;
  recoveryCodes: string[];
  qrSvg: string;
}

export class AdminApiClient {
  private baseUrl: string;
  private adminHost: string;
  private token: string | null;
  private user: StaffUser | null;
  private fetchFn: typeof fetch;
  private mode: 'real' | 'mock';

  // In-memory mock store for offline development and local unit verification
  private mockHashedRecoveryCodes: string[] = [];
  private mockActiveSecret: string | null = null;

  constructor(options: AdminApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl || process.env.API_INTERNAL_URL || 'http://localhost:4000').replace(/\/$/, '');
    this.adminHost = options.adminHost || process.env.ADMIN_HOST || 'admin.jlpt.local';
    this.token = options.token ?? null;
    this.user = options.user ?? null;
    this.fetchFn = options.fetchFn ?? (typeof fetch !== 'undefined' ? fetch : (async () => { throw new Error('fetch not available'); }) as unknown as typeof fetch);
    this.mode = options.mode ?? 'real';
  }

  public setAuth(user: StaffUser | null, token: string | null): void {
    this.user = user;
    this.token = token;
  }

  public getUser(): StaffUser | null {
    return this.user;
  }

  public getToken(): string | null {
    return this.token;
  }

  /**
   * UI Guard enforcement method.
   * Throws AdminClientGuardError if user is not authenticated, 2FA is pending, or role lacks permission.
   */
  public enforceGuard(requiredRoles?: Role[]): void {
    if (!this.user || !this.token) {
      throw new AdminClientGuardError('UNAUTHENTICATED', 'Yêu cầu đăng nhập tài khoản nhân sự.', 401);
    }

    if (!isStaffRole(this.user.role)) {
      throw new AdminClientGuardError('FORBIDDEN', 'Tài khoản không thuộc quyền quản trị.', 403);
    }

    if (this.user.twoFactorStatus !== 'verified' || !this.user.twoFactorEnabled) {
      throw new AdminClientGuardError(
        'TWO_FACTOR_REQUIRED',
        'Nhân sự bắt buộc phải hoàn thành xác thực hai yếu tố (2FA) trước khi truy cập tài nguyên quản trị.',
        403,
      );
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (this.user.role !== 'admin' && !requiredRoles.includes(this.user.role)) {
        throw new AdminClientGuardError(
          'FORBIDDEN',
          `Vai trò ${this.user.role} không có thẩm quyền truy cập tài nguyên này.`,
          403,
          { requiredRoles, userRole: this.user.role },
        );
      }
    }
  }

  /**
   * Internal HTTP request handler.
   * Applies headers, checks Host constraint, and handles server 401 / 403 errors.
   */
  public async request<T = unknown>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      requiredRoles?: Role[];
      headers?: Record<string, string>;
      skipGuard?: boolean;
    } = {},
  ): Promise<T> {
    if (!options.skipGuard) {
      this.enforceGuard(options.requiredRoles);
    }

    if (this.mode === 'mock') {
      return this.handleMockRequest<T>(method, path, options.body);
    }

    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Host: this.adminHost,
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let res: Response;
    try {
      res = await this.fetchFn(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (err: unknown) {
      throw new AdminClientGuardError('NETWORK_ERROR', (err as Error).message || 'Lỗi kết nối tới máy chủ.', 500);
    }

    if (!res.ok) {
      let errorData: { error?: { code?: string; message?: string; details?: Record<string, unknown> } } = {};
      try {
        errorData = (await res.json()) as typeof errorData;
      } catch {
        // Non-json response
      }

      const code = (errorData.error?.code as GuardErrorCode) || (res.status === 401 ? 'UNAUTHENTICATED' : res.status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR');
      const message = errorData.error?.message || `API error with status ${res.status}`;
      throw new AdminClientGuardError(code, message, res.status, errorData.error?.details || {});
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  }

  // --- Auth & TOTP Methods ---

  public async login(
    email: string,
    role: Role = 'editor',
    twoFactorEnabled = false,
  ): Promise<{ user: StaffUser; token: string; nextStep: 'dashboard' | 'setup_2fa' | 'verify_2fa' }> {
    if (!isStaffRole(role)) {
      throw new AdminClientGuardError('FORBIDDEN', 'Chỉ tài khoản nhân sự mới được phép đăng nhập.', 403);
    }

    const token = `admin_tok_${Date.now()}`;
    const staffUser: StaffUser = {
      id: `usr_${Date.now()}`,
      email,
      name: email.split('@')[0] ?? 'Staff',
      role,
      twoFactorEnabled,
      twoFactorStatus: twoFactorEnabled ? 'challenge_required' : 'setup_required',
    };

    this.user = staffUser;
    this.token = token;

    return {
      user: staffUser,
      token,
      nextStep: twoFactorEnabled ? 'verify_2fa' : 'setup_2fa',
    };
  }

  public initiate2faSetup(): Setup2faResponse {
    if (!this.user || !this.token) {
      throw new AdminClientGuardError('UNAUTHENTICATED', 'Yêu cầu đăng nhập trước khi thiết lập 2FA.', 401);
    }

    const secret = generateBase32Secret(20);
    const formattedSecret = formatSecret(secret);
    const otpauthUri = generateOtpAuthUri({
      issuer: 'JLPT Admin',
      accountName: this.user.email,
      secret,
    });
    const recoveryCodes = generateRecoveryCodes(8);
    const qrResult = generateQrMatrix(otpauthUri);

    this.mockActiveSecret = secret;
    this.mockHashedRecoveryCodes = recoveryCodes.map(hashRecoveryCode);

    return {
      secret,
      formattedSecret,
      otpauthUri,
      recoveryCodes,
      qrSvg: qrResult.svg,
    };
  }

  public confirm2faSetup(secret: string, code: string): boolean {
    if (!this.user || !this.token) {
      throw new AdminClientGuardError('UNAUTHENTICATED', 'Phiên làm việc không hợp lệ.', 401);
    }

    const isValid = verifyTotp(code, secret);
    if (!isValid) {
      throw new AdminClientGuardError('VALIDATION_ERROR', 'Mã xác thực 6 số không chính xác.', 400);
    }

    this.user = {
      ...this.user,
      twoFactorEnabled: true,
      twoFactorStatus: 'verified',
    };

    return true;
  }

  public verify2faChallenge(secret: string, code: string): boolean {
    if (!this.user || !this.token) {
      throw new AdminClientGuardError('UNAUTHENTICATED', 'Phiên làm việc không hợp lệ.', 401);
    }

    const isValid = verifyTotp(code, secret);
    if (!isValid) {
      throw new AdminClientGuardError('VALIDATION_ERROR', 'Mã xác thực không hợp lệ.', 400);
    }

    this.user = {
      ...this.user,
      twoFactorStatus: 'verified',
    };

    return true;
  }

  public verifyRecoveryCode(code: string): boolean {
    if (!this.user || !this.token) {
      throw new AdminClientGuardError('UNAUTHENTICATED', 'Phiên làm việc không hợp lệ.', 401);
    }

    const result = verifyAndConsumeRecoveryCode(code, this.mockHashedRecoveryCodes);
    if (!result.valid) {
      throw new AdminClientGuardError('VALIDATION_ERROR', 'Mã khôi phục không hợp lệ hoặc đã qua sử dụng.', 400);
    }

    this.mockHashedRecoveryCodes = result.remainingHashedCodes;
    this.user = {
      ...this.user,
      twoFactorStatus: 'verified',
    };

    return true;
  }

  // --- Domain Methods (Protected by UI Guard) ---

  public async listQuestions(query?: Record<string, string>): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/groups', {
      requiredRoles: ['editor', 'admin'],
      headers: query ? { 'X-Query': JSON.stringify(query) } : undefined,
    });
  }

  public async getQuestionGroup(id: string): Promise<unknown> {
    return this.request('GET', `/api/v1/admin/groups/${encodeURIComponent(id)}`, {
      requiredRoles: ['editor', 'admin'],
    });
  }

  public async createQuestionGroup(data: unknown): Promise<{ id: string; success: boolean }> {
    return this.request<{ id: string; success: boolean }>('POST', '/api/v1/admin/groups', {
      requiredRoles: ['editor', 'admin'],
      body: data,
    });
  }

  public async submitForReview(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', `/api/v1/admin/groups/${encodeURIComponent(id)}/submit-review`, {
      requiredRoles: ['editor', 'admin'],
    });
  }

  public async listPendingReviews(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/reviews', {
      requiredRoles: ['reviewer', 'admin'],
    });
  }

  public async reviewGroup(id: string, decision: 'approved' | 'rejected', comments?: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', `/api/v1/admin/groups/${encodeURIComponent(id)}/reviews`, {
      requiredRoles: ['reviewer', 'admin'],
      body: { decision, comments },
    });
  }

  public async listExams(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/exams', {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async publishExam(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', `/api/v1/admin/exams/${encodeURIComponent(id)}/publish`, {
      requiredRoles: ['admin'],
    });
  }

  public async listUsers(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/users', {
      requiredRoles: ['admin'],
    });
  }

  public async listAuditLogs(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/audit-logs', {
      requiredRoles: ['admin'],
    });
  }

  public async listPlans(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/plans', {
      requiredRoles: ['billing_admin', 'admin'],
    });
  }

  public async getRevenueReport(): Promise<{ totalRevenue: number; currency: string }> {
    return this.request<{ totalRevenue: number; currency: string }>('GET', '/api/v1/admin/reports/revenue', {
      requiredRoles: ['billing_admin', 'admin'],
    });
  }

  // --- Mock Request Dispatcher ---
  private handleMockRequest<T>(_method: string, path: string, _body?: unknown): T {
    if (path.includes('/groups')) {
      return { items: [{ id: 'grp_01', title: 'Mondai 1 Kanji Reading', status: 'draft' }] } as T;
    }
    if (path.includes('/reviews')) {
      return { items: [{ id: 'rev_01', groupId: 'grp_01', status: 'pending' }] } as T;
    }
    if (path.includes('/exams')) {
      return { items: [{ id: 'ex_01', title: 'JLPT N1 Full Test 2026', published: false }] } as T;
    }
    if (path.includes('/audit-logs')) {
      return { items: [{ id: 'aud_01', action: 'update_role', user: 'admin@jlpt.local' }] } as T;
    }
    if (path.includes('/reports/revenue')) {
      return { totalRevenue: 154000000, currency: 'VND' } as T;
    }
    return { success: true } as T;
  }
}
