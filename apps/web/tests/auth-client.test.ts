import { describe, it, expect, vi } from 'vitest';
import {
  AuthClient,
  AuthClientError,
  type User,
  type Session,
  type SessionItem,
} from '../lib/auth-client';

describe('AuthClient Integration with F03 API (ACC-01..12)', () => {
  it('signUpEmail calls POST /auth/sign-up/email and sets auth token', async () => {
    const mockUser: User = {
      id: 'usr_01',
      email: 'student@example.com',
      name: 'Nguyen Van A',
      role: 'student',
      emailVerified: false,
    };
    const mockSession: Session = {
      id: 'sess_01',
      token: 'tok_secret_123',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        user: mockUser,
        session: mockSession,
        message: 'Đăng ký thành công.',
      }),
    });

    const client = new AuthClient({
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await client.signUpEmail({
      email: 'student@example.com',
      password: 'SecurePassword123!',
      name: 'Nguyen Van A',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [url, init] = firstCall!;
    expect(url).toBe('http://127.0.0.1:4000/api/v1/auth/sign-up/email');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      email: 'student@example.com',
      password: 'SecurePassword123!',
      name: 'Nguyen Van A',
    });
    expect(res.user.email).toBe('student@example.com');
    expect(client.getAuthToken()).toBe('tok_secret_123');
  });

  it('signInEmail calls POST /auth/sign-in/email and attaches Authorization header', async () => {
    const mockUser: User = {
      id: 'usr_01',
      email: 'student@example.com',
      name: 'Nguyen Van A',
      role: 'student',
      emailVerified: true,
    };
    const mockSession: Session = {
      id: 'sess_02',
      token: 'tok_login_456',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: mockUser,
        session: mockSession,
      }),
    });

    const client = new AuthClient({
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await client.signInEmail({
      email: 'student@example.com',
      password: 'SecurePassword123!',
    });

    expect(res.user.id).toBe('usr_01');
    expect(client.getAuthToken()).toBe('tok_login_456');

    // Next request should include Authorization: Bearer tok_login_456
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ user: mockUser, session: mockSession }),
    });

    await client.getSession();
    const secondCall = mockFetch.mock.calls[1];
    expect(secondCall).toBeDefined();
    expect(secondCall![1].headers['Authorization']).toBe('Bearer tok_login_456');
  });

  it('signOut clears auth token and calls POST /auth/sign-out', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Đăng xuất thành công.' }),
    });

    const client = new AuthClient({
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      fetchFn: mockFetch as unknown as typeof fetch,
      authToken: 'tok_active',
    });

    const res = await client.signOut();
    expect(res.success).toBe(true);
    expect(client.getAuthToken()).toBeUndefined();
  });

  it('verifyEmail calls GET /auth/verify-email?token=...', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Email đã được xác minh.' }),
    });

    const client = new AuthClient({
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await client.verifyEmail('tok_verify_789');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/v1/auth/verify-email?token=tok_verify_789',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(res.success).toBe(true);
  });

  it('forgotPassword calls POST /auth/forgot-password', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.',
      }),
    });

    const client = new AuthClient({
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await client.forgotPassword('user@example.com');
    expect(res.success).toBe(true);
    const forgotCall = mockFetch.mock.calls[0];
    expect(forgotCall).toBeDefined();
    expect(JSON.parse(forgotCall![1].body)).toEqual({ email: 'user@example.com' });
  });

  it('resetPassword calls POST /auth/reset-password with single-use token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Đặt lại mật khẩu thành công.',
      }),
    });

    const client = new AuthClient({
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await client.resetPassword({
      token: 'tok_reset_abc',
      newPassword: 'BrandNewPassword123!',
    });
    expect(res.success).toBe(true);
  });

  it('updateProfile updates target level N1-N5 and name via PATCH /me', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 'usr_01',
          email: 'student@example.com',
          name: 'Nguyen Van B',
          targetLevel: 'N2',
          completedExams: 5,
        },
      }),
    });

    const client = new AuthClient({
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      fetchFn: mockFetch as unknown as typeof fetch,
      authToken: 'tok_user',
    });

    const res = await client.updateProfile({
      name: 'Nguyen Van B',
      targetLevel: 'N2',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/v1/me',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Nguyen Van B', targetLevel: 'N2' }),
      }),
    );
    expect(res.user.targetLevel).toBe('N2');
    expect(res.user.completedExams).toBe(5);
  });

  it('getSessions and revokeSession call /me/sessions endpoints (ACC-12)', async () => {
    const mockSessions: SessionItem[] = [
      {
        id: 'sess_1',
        userId: 'usr_01',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        isCurrent: true,
      },
      {
        id: 'sess_2',
        userId: 'usr_01',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        isCurrent: false,
      },
    ];

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: mockSessions }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, count: 1 }),
      });

    const client = new AuthClient({
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      fetchFn: mockFetch as unknown as typeof fetch,
      authToken: 'tok_user',
    });

    const listRes = await client.getSessions();
    expect(listRes.items.length).toBe(2);

    await client.revokeSession('sess_2');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/v1/me/sessions/sess_2',
      expect.objectContaining({ method: 'DELETE' }),
    );

    const revokeAllRes = await client.revokeAllOtherSessions();
    expect(revokeAllRes.success).toBe(true);
  });

  it('handles error response by throwing AuthClientError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không chính xác.',
      }),
    });

    const client = new AuthClient({
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(
      client.signInEmail({ email: 'wrong@example.com', password: 'bad' }),
    ).rejects.toThrow(AuthClientError);

    try {
      await client.signInEmail({ email: 'wrong@example.com', password: 'bad' });
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(AuthClientError);
      const err = e as AuthClientError;
      expect(err.code).toBe('INVALID_CREDENTIALS');
      expect(err.statusCode).toBe(401);
    }
  });
});
