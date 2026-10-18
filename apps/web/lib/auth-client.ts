/**
 * Auth & Account Client connecting directly to F03 API endpoints
 * Feature IDs: ACC-01, ACC-02, ACC-04, ACC-05, ACC-07, ACC-10, ACC-12
 * Acceptance: Đăng ký đăng nhập reset xác minh nối API trong F03 trước DONE
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'editor' | 'reviewer' | 'moderator' | 'admin';
  emailVerified: boolean;
  targetLevel?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | null;
  completedExams?: number;
}

export interface Session {
  id: string;
  token?: string;
  userId?: string;
  expiresAt?: string;
}

export interface SessionItem {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  isCurrent?: boolean;
}

export interface AuthResponse {
  user: User;
  session: Session;
  message?: string;
}

export interface ProfileResponse {
  user: User;
}

export interface AuthErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

export class AuthClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(code: string, message: string, statusCode = 400, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AuthClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private authToken?: string;

  constructor(options: { baseUrl?: string; fetchFn?: typeof fetch; authToken?: string } = {}) {
    const isBrowser = typeof window !== 'undefined';
    let defaultUrl = options.baseUrl;
    if (!defaultUrl) {
      if (isBrowser) {
        defaultUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      } else {
        const publicUrl = process.env.NEXT_PUBLIC_API_URL;
        if (publicUrl && (publicUrl.startsWith('http://') || publicUrl.startsWith('https://'))) {
          defaultUrl = publicUrl;
        } else {
          defaultUrl = process.env.API_INTERNAL_URL || process.env.STAGING_API_URL || 'http://127.0.0.1:4000/api/v1';
        }
      }
    }
    this.baseUrl = defaultUrl.replace(/\/$/, '');
    this.fetchFn = options.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    let token = options.authToken;
    if (!token && isBrowser) {
      try {
        token = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token') || undefined;
      } catch {
        // Ignore storage access error
      }
    }
    this.authToken = token;
  }

  public setAuthToken(token?: string): void {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      try {
        if (token) {
          localStorage.setItem('jlpt_auth_token', token);
        } else {
          localStorage.removeItem('jlpt_auth_token');
        }
      } catch {
        // Ignore storage access error
      }
    }
  }

  public getAuthToken(): string | undefined {
    return this.authToken;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
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
      credentials: 'include', // Include HTTP-only cookie
    });

    if (response.status === 204) {
      return {} as T;
    }

    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch {
      responseData = {};
    }

    if (!response.ok) {
      const err = responseData as AuthErrorResponse;
      throw new AuthClientError(
        err.code || 'UNKNOWN_ERROR',
        err.message || `Request failed with status ${response.status}`,
        response.status,
        err.details || {},
      );
    }

    return responseData as T;
  }

  /**
   * ACC-01: Đăng ký tài khoản
   */
  public async signUpEmail(data: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('POST', '/auth/sign-up/email', data);
    if (res.session?.token) {
      this.setAuthToken(res.session.token);
    }
    return res;
  }

  /**
   * ACC-02: Đăng nhập
   */
  public async signInEmail(data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('POST', '/auth/sign-in/email', data);
    if (res.session?.token) {
      this.setAuthToken(res.session.token);
    }
    return res;
  }

  /**
   * ACC-02: Đăng xuất
   */
  public async signOut(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.request<{ success: boolean; message: string }>('POST', '/auth/sign-out');
      this.setAuthToken(undefined);
      return res;
    } catch {
      this.setAuthToken(undefined);
      return { success: true, message: 'Đăng xuất thành công.' };
    }
  }

  /**
   * ACC-05: Xác minh email qua token
   */
  public async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      'GET',
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
    );
  }

  /**
   * ACC-04: Quên mật khẩu
   */
  public async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('POST', '/auth/forgot-password', {
      email,
    });
  }

  /**
   * ACC-04: Đặt lại mật khẩu bằng token một lần
   */
  public async resetPassword(data: {
    token: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('POST', '/auth/reset-password', data);
  }

  /**
   * Lấy thông tin phiên hiện tại
   */
  public async getSession(): Promise<{ user: User | null; session: Session | null }> {
    return this.request<{ user: User | null; session: Session | null }>('GET', '/auth/session');
  }

  /**
   * ACC-07 & ACC-10: Lấy profile và số đề đã làm
   */
  public async getProfile(): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('GET', '/me');
  }

  /**
   * ACC-07: Cập nhật trình độ JLPT đang ôn và tên
   */
  public async updateProfile(data: {
    name?: string;
    targetLevel?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  }): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('PATCH', '/me', data);
  }

  /**
   * ACC-12: Quản lý thiết bị & danh sách phiên
   */
  public async getSessions(): Promise<{ items: SessionItem[] }> {
    return this.request<{ items: SessionItem[] }>('GET', '/me/sessions');
  }

  /**
   * ACC-12: Hủy một phiên cụ thể
   */
  public async revokeSession(sessionId: string): Promise<void> {
    await this.request<void>('DELETE', `/me/sessions/${encodeURIComponent(sessionId)}`);
  }

  /**
   * ACC-12: Hủy tất cả các phiên khác
   */
  public async revokeAllOtherSessions(): Promise<{ success: boolean; count?: number }> {
    return this.request<{ success: boolean; count?: number }>('DELETE', '/me/sessions');
  }
}

export const defaultAuthClient = new AuthClient();
