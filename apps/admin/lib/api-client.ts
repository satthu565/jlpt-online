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

export type GuardErrorCode =
  | 'UNAUTHENTICATED'
  | 'TWO_FACTOR_REQUIRED'
  | 'INVALID_RECOVERY_CODE'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR';

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
  totpCode?: string | null;
  user?: StaffUser | null;
  fetchFn?: typeof fetch;
  mode?: string;
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
  private totpCode: string | null;
  private user: StaffUser | null;
  private fetchFn?: typeof fetch;
  private mode: string;

  // In-memory credential store for 2FA enrollment verification in unit tests
  private activeRecoveryHashes: string[] = [];
  private activeTotpSecret: string | null = null;

  constructor(options: AdminApiClientOptions = {}) {
    if (options.baseUrl) {
      this.baseUrl = options.baseUrl.replace(/\/$/, '');
    } else if (typeof window !== 'undefined') {
      this.baseUrl = '';
    } else {
      this.baseUrl = (process.env.API_INTERNAL_URL || 'http://localhost:4000').replace(/\/$/, '');
    }
    this.adminHost = options.adminHost || process.env.ADMIN_HOST || 'admin.jlpt.local';
    this.token = options.token ?? null;
    this.totpCode = options.totpCode ?? null;
    this.user = options.user ?? null;
    this.fetchFn = options.fetchFn;
    this.mode = options.mode || 'network';
  }

  public setAuth(user: StaffUser | null, token: string | null): void {
    this.user = user;
    this.token = token;
  }

  public setUser(user: StaffUser | null): void {
    this.user = user;
  }

  public getUser(): StaffUser | null {
    if (this.user) return this.user;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('jlpt_admin_auth_state_v1');
        if (raw) {
          const parsed = JSON.parse(raw) as { user?: StaffUser };
          if (parsed?.user) {
            this.user = parsed.user;
            return parsed.user;
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  public getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('jlpt_admin_auth_state_v1');
        if (raw) {
          const parsed = JSON.parse(raw) as { token?: string };
          if (parsed?.token) {
            this.token = parsed.token;
            return parsed.token;
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  public setTotpCode(code: string | null): void {
    this.totpCode = code;
  }

  public getTotpCode(): string | null {
    return this.totpCode;
  }

  /**
   * UI Guard enforcement method.
   * Throws AdminClientGuardError if user is not authenticated, 2FA is pending, or role lacks permission.
   */
  public enforceGuard(requiredRoles?: Role[]): void {
    const user = this.getUser();
    const token = this.getToken();

    if (!user || !token) {
      throw new AdminClientGuardError('UNAUTHENTICATED', 'Yêu cầu đăng nhập tài khoản nhân sự.', 401);
    }

    if (!isStaffRole(user.role)) {
      throw new AdminClientGuardError('FORBIDDEN', 'Tài khoản không thuộc quyền quản trị.', 403);
    }

    if (user.twoFactorStatus !== 'verified' || !user.twoFactorEnabled) {
      throw new AdminClientGuardError(
        'TWO_FACTOR_REQUIRED',
        'Nhân sự bắt buộc phải hoàn thành xác thực hai yếu tố (2FA) trước khi truy cập tài nguyên quản trị.',
        403,
      );
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (user.role !== 'admin' && !requiredRoles.includes(user.role)) {
        throw new AdminClientGuardError(
          'FORBIDDEN',
          `Vai trò ${user.role} không có thẩm quyền truy cập tài nguyên này.`,
          403,
          { requiredRoles, userRole: user.role },
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
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const hasBody = options.body !== undefined;
    const headers: Record<string, string> = {
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    };
    if (isFormData) {
      delete headers['Content-Type'];
    }
    if (typeof window === 'undefined') {
      headers['Host'] = this.adminHost;
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (this.totpCode) {
      headers['x-totp-code'] = this.totpCode;
    }

    let res: Response;
    try {
      res = await (this.fetchFn ?? fetch)(url, {
        method,
        headers,
        credentials: 'include',
        body: isFormData
          ? (options.body as FormData)
          : options.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
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

    const token = `sess_staff_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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

  public async loginWithPassword(
    email: string,
    password: string,
  ): Promise<{ user: StaffUser; token: string; nextStep: 'dashboard' | 'setup_2fa' | 'verify_2fa' }> {
    const url = `${this.baseUrl}/api/v1/auth/sign-in/email`;
    const res = await (this.fetchFn ?? fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!res.ok) {
      let errJson: { error?: { code?: string; message?: string }; message?: string } = {};
      try {
        errJson = (await res.json()) as typeof errJson;
      } catch {
        // Non-json response
      }
      throw new AdminClientGuardError(
        (errJson.error?.code as GuardErrorCode) || 'UNAUTHENTICATED',
        errJson.message || errJson.error?.message || 'Sai địa chỉ email hoặc mật khẩu không chính xác.',
        res.status,
      );
    }

    const data = (await res.json()) as {
      user: { id: string; email: string; name?: string | null; role: Role; emailVerified: boolean; twoFactorEnabled?: boolean };
      session: { id: string; token: string; twoFactorVerified?: boolean };
    };

    if (!isStaffRole(data.user.role)) {
      throw new AdminClientGuardError('FORBIDDEN', 'Chỉ tài khoản nhân sự mới được phép đăng nhập.', 403);
    }

    const staffUser: StaffUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name ?? data.user.email.split('@')[0] ?? 'Staff',
      role: data.user.role,
      twoFactorEnabled: true,
      twoFactorStatus: 'challenge_required',
    };

    this.user = staffUser;
    this.token = data.session.token;

    return {
      user: staffUser,
      token: data.session.token,
      nextStep: 'verify_2fa',
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

    this.activeTotpSecret = secret;
    this.activeRecoveryHashes = recoveryCodes.map(hashRecoveryCode);

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
      throw new AdminClientGuardError('VALIDATION_ERROR', 'Mã xác thực không hợp lệ.', 400);
    }

    this.user = {
      ...this.user,
      twoFactorEnabled: true,
      twoFactorStatus: 'verified',
    };

    return true;
  }

  public async verify2faChallenge(code: string): Promise<{ success: boolean; verified: boolean }>;
  public verify2faChallenge(secret: string, code: string): boolean;
  public verify2faChallenge(
    first: string,
    second?: string,
  ): boolean | Promise<{ success: boolean; verified: boolean }> {
    if (!this.user || !this.token) {
      throw new AdminClientGuardError('UNAUTHENTICATED', 'Phiên làm việc không hợp lệ.', 401);
    }

    if (second !== undefined) {
      const isValid = verifyTotp(second, first);
      if (!isValid) {
        throw new AdminClientGuardError('TWO_FACTOR_REQUIRED', 'Mã xác thực không hợp lệ.', 403);
      }

      this.user = {
        ...this.user,
        twoFactorStatus: 'verified',
      };

      return true;
    }

    return this.request<{ success: boolean; verified: boolean }>('POST', '/api/v1/auth/totp/challenge', {
      body: { code: first },
      headers: { 'x-totp-code': first },
      skipGuard: true,
    }).then((res) => {
      this.user = {
        ...this.user!,
        twoFactorStatus: 'verified',
      };
      this.totpCode = first;
      return res;
    });
  }

  public verifyRecoveryCode(code: string): boolean | Promise<{ success: boolean; verified: boolean }> {
    if (!this.user || !this.token) {
      throw new AdminClientGuardError('UNAUTHENTICATED', 'Phiên làm việc không hợp lệ.', 401);
    }

    if (this.activeRecoveryHashes && this.activeRecoveryHashes.length > 0) {
      const result = verifyAndConsumeRecoveryCode(code, this.activeRecoveryHashes);
      if (!result.valid) {
        throw new AdminClientGuardError('INVALID_RECOVERY_CODE', 'Mã khôi phục không hợp lệ hoặc đã qua sử dụng.', 403);
      }

      this.activeRecoveryHashes = result.remainingHashedCodes;
      this.user = {
        ...this.user,
        twoFactorStatus: 'verified',
      };

      return true;
    }

    return this.request<{ success: boolean; verified: boolean }>('POST', '/api/v1/auth/totp/recovery', {
      body: { code },
      skipGuard: true,
    }).then((res) => {
      this.user = {
        ...this.user!,
        twoFactorStatus: 'verified',
      };
      return res;
    });
  }

  // --- Domain Methods (Protected by UI Guard) ---

  public async listQuestions(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/questions', {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async listQuestionGroups(params?: { level?: string; status?: string }): Promise<{ items: unknown[] }> {
    const q = new URLSearchParams();
    if (params?.level) q.set('level', params.level);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return this.request<{ items: unknown[] }>('GET', `/api/v1/admin/groups${qs ? `?${qs}` : ''}`, {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async createQuestionGroup(data: unknown): Promise<{ id: string }> {
    return this.request<{ id: string }>('POST', '/api/v1/admin/groups', {
      requiredRoles: ['editor', 'admin'],
      body: data,
    });
  }

  public async submitForReview(id: string, expectedVersion = 1): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', `/api/v1/admin/groups/${encodeURIComponent(id)}/submit-review`, {
      requiredRoles: ['editor', 'admin'],
      body: { expectedVersion },
    });
  }

  public async submitTargetForReview(
    targetType: string,
    targetId: string,
    targetVersion = 1,
  ): Promise<{ status: string }> {
    return this.request<{ status: string }>('POST', '/api/v1/admin/reviews/submit', {
      requiredRoles: ['editor', 'admin', 'reviewer'],
      body: { targetType, targetId, targetVersion },
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

  public async listExams(params?: { level?: string; kind?: string; status?: string }): Promise<{ items: unknown[] }> {
    const q = new URLSearchParams();
    if (params?.level) q.set('level', params.level);
    if (params?.kind) q.set('kind', params.kind);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return this.request<{ items: unknown[] }>('GET', `/api/v1/admin/exams${qs ? `?${qs}` : ''}`, {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async updateQuestionGroup(id: string, data: unknown): Promise<{ updated: boolean }> {
    return this.request<{ updated: boolean }>('PATCH', `/api/v1/admin/groups/${encodeURIComponent(id)}`, {
      requiredRoles: ['editor', 'admin'],
      body: data,
    });
  }

  public async listBlueprints(level?: string): Promise<{ items: unknown[] }> {
    const qs = level ? `?level=${encodeURIComponent(level)}` : '';
    return this.request<{ items: unknown[] }>('GET', `/api/v1/admin/blueprints${qs}`, {
      requiredRoles: ['editor', 'admin'],
    });
  }

  public async createBlueprint(data: unknown): Promise<{ id: string }> {
    return this.request<{ id: string }>('POST', '/api/v1/admin/blueprints', {
      requiredRoles: ['editor', 'admin'],
      body: data,
    });
  }

  public async createBlueprintVersion(id: string, data: unknown): Promise<{ version: number }> {
    return this.request<{ version: number }>('POST', `/api/v1/admin/blueprints/${encodeURIComponent(id)}/versions`, {
      requiredRoles: ['editor', 'admin'],
      body: data,
    });
  }

  public async activateBlueprint(id: string, confirmation?: unknown): Promise<{ active: boolean }> {
    return this.request<{ active: boolean }>('POST', `/api/v1/admin/blueprints/${encodeURIComponent(id)}/activate`, {
      requiredRoles: ['admin'],
      body: confirmation,
    });
  }

  public async getExam(id: string): Promise<unknown> {
    return this.request('GET', `/api/v1/admin/exams/${encodeURIComponent(id)}`, {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async createExam(data: unknown): Promise<{ id: string }> {
    return this.request<{ id: string }>('POST', '/api/v1/admin/exams', {
      requiredRoles: ['editor', 'admin'],
      body: data,
    });
  }

  public async updateExam(id: string, data: unknown): Promise<{ updated: boolean }> {
    return this.request<{ updated: boolean }>('PATCH', `/api/v1/admin/exams/${encodeURIComponent(id)}`, {
      requiredRoles: ['editor', 'admin'],
      body: data,
    });
  }

  public async validateExam(id: string): Promise<{ valid: boolean; violations: string[] }> {
    return this.request<{ valid: boolean; violations: string[] }>('POST', `/api/v1/admin/exams/${encodeURIComponent(id)}/validate`, {
      requiredRoles: ['editor', 'admin'],
    });
  }

  public async publishExam(id: string): Promise<{ success: boolean; version?: number }> {
    return this.request<{ success: boolean; version?: number }>('POST', `/api/v1/admin/exams/${encodeURIComponent(id)}/publish`, {
      requiredRoles: ['admin'],
    });
  }

  public async listUsers(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/users', {
      requiredRoles: ['admin'],
    });
  }

  public async getUserById(id: string): Promise<unknown> {
    return this.request('GET', `/api/v1/admin/users/${encodeURIComponent(id)}`, {
      requiredRoles: ['admin'],
    });
  }

  public async updateUserRole(userId: string, newRole: Role): Promise<{ success: boolean }> {
    // Client-side guard: Prevent editor from self-elevating to admin
    if (this.user?.id === userId && newRole === 'admin' && this.user.role !== 'admin') {
      throw new AdminClientGuardError('FORBIDDEN', 'Biên tập viên không thể tự nâng quyền lên Quản trị viên.', 403);
    }

    return this.request<{ success: boolean }>('PATCH', `/api/v1/admin/users/${encodeURIComponent(userId)}`, {
      requiredRoles: ['admin'],
      body: { roles: [newRole] },
    });
  }

  public async setUserBlocked(userId: string, isBlocked: boolean, blockReason?: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('PATCH', `/api/v1/admin/users/${encodeURIComponent(userId)}`, {
      requiredRoles: ['admin'],
      body: { isBlocked, blockReason },
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

  public async getDashboard(): Promise<{
    metrics: {
      totalUsers: number;
      totalExams: number;
      overallCompletionRate: number;
      openReportsCount: number;
      grossRevenueVnd: number;
      activeDau: number;
    };
    activities: Array<{ id: string; title: string; time: string; type: string }>;
  }> {
    return this.request('GET', '/api/v1/admin/dashboard');
  }

  public async getNotificationSettings(): Promise<{
    items: Array<{
      id: string;
      key: string;
      name: string;
      channel: 'email' | 'in_app' | 'push';
      subject: string;
      bodyTemplate: string;
      isActive: boolean;
      variables: string[];
    }>;
  }> {
    return this.request('GET', '/api/v1/admin/settings/notifications');
  }

  public async updateNotificationTemplate(
    id: string,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; item: unknown }> {
    return this.request('PATCH', `/api/v1/admin/settings/notifications/${encodeURIComponent(id)}`, {
      requiredRoles: ['admin'],
      body: data,
    });
  }

  public async getOrgSettings(): Promise<{
    applications: Array<{
      id: string;
      applicantName: string;
      email: string;
      currentOrg: string;
      jlptCertificate: string;
      yearsOfExperience: number;
      status: 'pending' | 'approved' | 'rejected';
      appliedAt: string;
    }>;
    organizations: unknown[];
  }> {
    return this.request('GET', '/api/v1/admin/settings/org');
  }

  public async approveTeacherApplication(id: string): Promise<{ success: boolean }> {
    return this.request('POST', `/api/v1/admin/settings/org/${encodeURIComponent(id)}/approve`, {
      requiredRoles: ['admin'],
    });
  }

  public async rejectTeacherApplication(id: string): Promise<{ success: boolean }> {
    return this.request('POST', `/api/v1/admin/settings/org/${encodeURIComponent(id)}/reject`, {
      requiredRoles: ['admin'],
    });
  }

  public async getBackupJobs(): Promise<{ items: unknown[] }> {
    return this.request('GET', '/api/v1/admin/settings/backup/jobs', {
      requiredRoles: ['admin'],
    });
  }

  public async triggerBackupJob(
    jobType: string,
    configSnapshot?: Record<string, string>,
  ): Promise<{ success: boolean; job: unknown }> {
    return this.request('POST', '/api/v1/admin/settings/backup/jobs', {
      requiredRoles: ['admin'],
      body: {
        jobType,
        ...(configSnapshot ? { configSnapshot } : {}),
      },
    });
  }

  public async unpublishExam(id: string, reason = 'Admin unpublish'): Promise<{ status: string }> {
    return this.request<{ status: string }>('POST', `/api/v1/admin/exams/${encodeURIComponent(id)}/unpublish`, {
      requiredRoles: ['admin'],
      body: { reason },
    });
  }

  public async listImportJobs(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/imports', {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async uploadImportPackage(
    fileOrBase64: File | string,
    fileName?: string,
    options?: { mode?: 'draft' | 'ready' },
  ): Promise<unknown> {
    const mode = options?.mode ?? 'ready';
    if (typeof FormData !== 'undefined' && typeof fileOrBase64 !== 'string') {
      const formData = new FormData();
      formData.append('mode', mode);
      formData.append('file', fileOrBase64, fileName || fileOrBase64.name);
      return this.request('POST', `/api/v1/admin/imports?mode=${encodeURIComponent(mode)}`, {
        requiredRoles: ['editor', 'admin'],
        body: formData,
      });
    }

    let dataBase64: string;
    let name = fileName || 'package.zip';
    if (typeof fileOrBase64 === 'string') {
      dataBase64 = fileOrBase64;
    } else {
      name = fileOrBase64.name;
      const arrayBuffer = await fileOrBase64.arrayBuffer();
      if (typeof Buffer !== 'undefined') {
        dataBase64 = Buffer.from(arrayBuffer).toString('base64');
      } else {
        const bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
        }
        dataBase64 = btoa(binary);
      }
    }
    return this.request('POST', `/api/v1/admin/imports?mode=${encodeURIComponent(mode)}`, {
      requiredRoles: ['editor', 'admin'],
      body: { dataBase64, fileName: name, mode },
    });
  }

  public async submitReviewDecision(
    targetType: string,
    targetId: string,
    version: number,
    decision: 'approved' | 'rejected',
    comments?: string,
  ): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>(
      'POST',
      `/api/v1/admin/reviews/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/v${version}/decision`,
      {
        requiredRoles: ['reviewer', 'admin'],
        body: { decision, comments },
      },
    );
  }

  public async listExplanations(query?: { questionId?: string; status?: string }): Promise<{ items: unknown[] }> {
    const searchParams = new URLSearchParams();
    if (query?.questionId) searchParams.set('questionId', query.questionId);
    if (query?.status) searchParams.set('status', query.status);
    const qs = searchParams.toString();
    const path = `/api/v1/admin/explanations${qs ? `?${qs}` : ''}`;
    return this.request<{ items: unknown[] }>('GET', path, {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async reviewExplanation(
    id: string,
    decision: 'approved' | 'rejected',
    comments?: string,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      'POST',
      `/api/v1/admin/explanations/${encodeURIComponent(id)}/reviews`,
      {
        requiredRoles: ['reviewer', 'admin'],
        body: { decision, comments },
      },
    );
  }

  public async listMedia(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>('GET', '/api/v1/admin/media', {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async uploadMedia(
    fileOrData: File | { filename: string; dataBase64: string; mimeType?: string },
    optionalKey?: string,
  ): Promise<{ success: boolean; asset: unknown }> {
    let payload: { filename: string; dataBase64: string; mimeType?: string };
    if ('dataBase64' in fileOrData) {
      payload = fileOrData;
    } else {
      const arrayBuffer = await fileOrData.arrayBuffer();
      let dataBase64 = '';
      if (typeof Buffer !== 'undefined') {
        dataBase64 = Buffer.from(arrayBuffer).toString('base64');
      } else {
        const bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          dataBase64 += btoa(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize))));
        }
      }
      payload = {
        filename: optionalKey || fileOrData.name,
        dataBase64,
        mimeType: fileOrData.type || 'application/octet-stream',
      };
    }
    return this.request<{ success: boolean; asset: unknown }>('POST', '/api/v1/admin/media', {
      requiredRoles: ['editor', 'reviewer', 'admin'],
      body: payload,
    });
  }

  public async listVocab(
    datasetId = 'official-corpus',
    query?: Record<string, string>,
  ): Promise<{ items: unknown[] } | unknown[]> {
    const searchParams = new URLSearchParams(query);
    const qs = searchParams.toString();
    const path = `/api/v1/datasets/${encodeURIComponent(datasetId)}/vocabulary${qs ? `?${qs}` : ''}`;
    return this.request('GET', path, {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async listArticles(locale?: string): Promise<{ items: unknown[] } | unknown[]> {
    const qs = locale ? `?locale=${encodeURIComponent(locale)}` : '';
    return this.request('GET', `/api/v1/cms/articles${qs}`, {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async createArticle(data: unknown): Promise<{ id: string }> {
    return this.request<{ id: string }>('POST', '/api/v1/cms/articles', {
      requiredRoles: ['editor', 'admin'],
      body: data,
    });
  }

  public async updateArticle(id: string, data: unknown): Promise<{ updated: boolean }> {
    return this.request<{ updated: boolean }>('PUT', `/api/v1/cms/articles/${encodeURIComponent(id)}`, {
      requiredRoles: ['editor', 'admin'],
      body: data,
    });
  }

  public async listContentReports(query?: { status?: string; questionId?: string }): Promise<{ items: unknown[] } | unknown[]> {
    const searchParams = new URLSearchParams();
    if (query?.status) searchParams.set('status', query.status);
    if (query?.questionId) searchParams.set('questionId', query.questionId);
    const qs = searchParams.toString();
    return this.request('GET', `/api/v1/admin/content-reports${qs ? `?${qs}` : ''}`, {
      requiredRoles: ['reviewer', 'editor', 'admin'],
    });
  }

  public async updateContentReport(
    id: string,
    data: { status: 'in_review' | 'resolved' | 'dismissed'; notes?: string },
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      'PATCH',
      `/api/v1/admin/content-reports/${encodeURIComponent(id)}`,
      {
        requiredRoles: ['reviewer', 'editor', 'admin'],
        body: data,
      },
    );
  }

  public async getContentReport(kind = 'content'): Promise<unknown> {
    return this.request('GET', `/api/v1/admin/reports/${encodeURIComponent(kind)}`, {
      requiredRoles: ['editor', 'reviewer', 'admin'],
    });
  }

  public async reviewAiContent(
    id: string,
    approvalStatus: 'approved' | 'rejected',
    reviewNotes?: string,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      'POST',
      `/api/v1/admin/ai-content/${encodeURIComponent(id)}/reviews`,
      {
        requiredRoles: ['reviewer', 'admin'],
        body: { approvalStatus, reviewNotes },
      },
    );
  }

  private handleMockRequest<T>(_method: string, path: string, _body?: unknown): T {
    if (path.includes('/groups') || path.includes('/questions')) {
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
    if (path.includes('/blueprints')) {
      return { items: [{ id: 'bp_N1', level: 'N1', version: 1, status: 'active' }] } as T;
    }
    if (path.includes('/users')) {
      return { items: [{ id: 'usr_01', email: 'user@jlpt.local', role: 'student' }] } as T;
    }
    if (path.includes('/validate')) {
      return { valid: true, violations: [] } as T;
    }
    return { success: true } as T;
  }
}

export const apiClient = new AdminApiClient();

