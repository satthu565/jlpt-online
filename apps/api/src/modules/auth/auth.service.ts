import crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { maskEmail } from '../../common/utils/pii.js';
import { EmailService } from '../email/email.service.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';

export interface SignUpEmailInput {
  email: string;
  password: string;
  name?: string;
}

export interface SignInEmailInput {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface GoogleOAuthCallbackInput {
  code: string;
  state: string;
  expectedState: string;
  redirectUrl?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly client: DbClientInstance,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Validates if a redirect URL belongs to the allowed origin whitelist.
   * Acceptance 2: OAuth callback kiểm tra state và redirect allowlist.
   */
  isAllowedRedirectUrl(redirectUrl: string): boolean {
    if (!redirectUrl) return true;

    // Allow relative paths
    if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
      return true;
    }

    try {
      const parsed = new URL(redirectUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      const host = parsed.host.toLowerCase();
      const allowedHosts = new Set<string>([
        'localhost:3000',
        'localhost:3001',
        'localhost:4000',
        '127.0.0.1:3000',
        '127.0.0.1:3001',
        '127.0.0.1:4000',
      ]);

      if (process.env.PUBLIC_HOST) {
        allowedHosts.add(process.env.PUBLIC_HOST.toLowerCase());
      }
      if (process.env.ADMIN_HOST) {
        allowedHosts.add(process.env.ADMIN_HOST.toLowerCase());
      }

      return allowedHosts.has(host);
    } catch {
      return false;
    }
  }

  /**
   * ACC-01: Đăng ký tài khoản bằng email
   * NOTI-01: Gửi email xác minh tài khoản
   */
  async signUpEmail(input: SignUpEmailInput) {
    const email = input.email.toLowerCase().trim();
    if (!email || !email.includes('@')) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Địa chỉ email không hợp lệ.',
      });
    }

    if (!input.password || input.password.length < 8) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mật khẩu phải có ít nhất 8 ký tự.',
      });
    }

    // Check duplicate email
    const existing = await this.client.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Email này đã được sử dụng.',
      });
    }

    const userId = generateUuidV7();
    const accountId = generateUuidV7();
    const hashedPassword = await hashPassword(input.password);
    const name = input.name?.trim() || email.split('@')[0] || 'User';

    // Insert user
    await this.client.db.insert(schema.users).values({
      id: userId,
      email,
      name,
      emailVerified: false,
      role: 'student',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });

    // Insert credential account
    await this.client.db.insert(schema.accounts).values({
      id: accountId,
      userId,
      accountId: userId,
      providerId: 'credential',
      password: hashedPassword,
    });

    // Create verification token (valid 24h)
    const verificationId = generateUuidV7();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.client.db.insert(schema.verifications).values({
      id: verificationId,
      identifier: email,
      value: verificationToken,
      expiresAt,
    });

    // Dispatch verification email (NOTI-01)
    const publicUrl = process.env.PUBLIC_HOST
      ? `http://${process.env.PUBLIC_HOST}`
      : 'http://localhost:3000';
    const verificationUrl = `${publicUrl}/auth/verify-email?token=${verificationToken}`;

    await this.emailService.sendVerificationEmail(email, verificationUrl, name);

    return {
      user: {
        id: userId,
        email,
        name,
        emailVerified: false,
      },
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.',
    };
  }

  /**
   * ACC-05: Xác minh email
   */
  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã xác minh không được để trống.',
      });
    }

    const records = await this.client.db
      .select()
      .from(schema.verifications)
      .where(and(eq(schema.verifications.value, token), gt(schema.verifications.expiresAt, new Date())))
      .limit(1);

    const record = records[0];
    if (!record) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã xác minh không hợp lệ hoặc đã hết hạn.',
      });
    }

    // Mark email verified
    await this.client.db
      .update(schema.users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(schema.users.email, record.identifier));

    // Delete token (single-use)
    await this.client.db
      .delete(schema.verifications)
      .where(eq(schema.verifications.id, record.id));

    this.logger.log(`Email verified successfully for ${maskEmail(record.identifier)}`);

    return {
      verified: true,
      email: record.identifier,
      message: 'Xác minh email thành công.',
    };
  }

  /**
   * ACC-02: Đăng nhập
   */
  async signInEmail(input: SignInEmailInput) {
    const email = input.email.toLowerCase().trim();

    const users = await this.client.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    const user = users[0];
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    if (user.blockedAt) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Tài khoản của bạn đã bị khóa.',
      });
    }

    // Check account password
    const accounts = await this.client.db
      .select()
      .from(schema.accounts)
      .where(and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, 'credential')))
      .limit(1);

    const account = accounts[0];
    if (!account || !account.password) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    const isValidPassword = await verifyPassword({
      hash: account.password,
      password: input.password,
    });

    if (!isValidPassword) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    // Enforce email verification if required
    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Vui lòng xác minh địa chỉ email trước khi đăng nhập.',
      });
    }

    // Create session (valid for 7 days)
    const sessionId = generateUuidV7();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.client.db.insert(schema.sessions).values({
      id: sessionId,
      userId: user.id,
      token: sessionToken,
      expiresAt,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      session: {
        id: sessionId,
        token: sessionToken,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  /**
   * ACC-02: Đăng xuất
   */
  async signOut(sessionToken: string) {
    if (!sessionToken) {
      return { success: true };
    }

    await this.client.db
      .delete(schema.sessions)
      .where(eq(schema.sessions.token, sessionToken));

    return { success: true };
  }

  /**
   * ACC-04: Quên mật khẩu
   * NOTI-02: Gửi email đặt lại mật khẩu
   */
  async forgotPassword(emailInput: string) {
    const email = emailInput.toLowerCase().trim();

    const users = await this.client.db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    const user = users[0];
    if (user) {
      // Remove any existing active reset tokens for this email to avoid stale collision
      await this.client.db
        .delete(schema.verifications)
        .where(eq(schema.verifications.identifier, `reset_${email}`));

      const resetToken = crypto.randomBytes(32).toString('hex');
      const verificationId = generateUuidV7();
      // Valid for 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.client.db.insert(schema.verifications).values({
        id: verificationId,
        identifier: `reset_${email}`,
        value: resetToken,
        expiresAt,
      });

      const publicUrl = process.env.PUBLIC_HOST
        ? `http://${process.env.PUBLIC_HOST}`
        : 'http://localhost:3000';
      const resetUrl = `${publicUrl}/auth/reset-password?token=${resetToken}`;

      await this.emailService.sendPasswordResetEmail(email, resetUrl, user.name || undefined);
    }

    // Always return success to prevent user enumeration
    return {
      success: true,
      message: 'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.',
    };
  }

  /**
   * ACC-04: Đặt lại mật khẩu (Một lần duy nhất)
   * Acceptance 1: reset một lần chạy thật
   */
  async resetPassword(token: string, newPassword: string) {
    if (!token) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã đặt lại mật khẩu không được để trống.',
      });
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mật khẩu mới phải có ít nhất 8 ký tự.',
      });
    }

    // Look for reset token
    const verifications = await this.client.db
      .select()
      .from(schema.verifications)
      .where(and(eq(schema.verifications.value, token), gt(schema.verifications.expiresAt, new Date())))
      .limit(1);

    const verification = verifications[0];
    if (!verification || !verification.identifier.startsWith('reset_')) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      });
    }

    const email = verification.identifier.replace(/^reset_/, '');

    const users = await this.client.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    const user = users[0];
    if (!user) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Người dùng không tồn tại.',
      });
    }

    // Hash new password and update credential account
    const newHashedPassword = await hashPassword(newPassword);

    await this.client.db
      .update(schema.accounts)
      .set({
        password: newHashedPassword,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, 'credential')));

    // Delete token immediately so it CANNOT be reused ("reset một lần")
    await this.client.db
      .delete(schema.verifications)
      .where(eq(schema.verifications.id, verification.id));

    // Revoke all existing sessions for this user for security
    await this.client.db
      .delete(schema.sessions)
      .where(eq(schema.sessions.userId, user.id));

    this.logger.log(`Password reset completed for ${maskEmail(email)}`);

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới.',
    };
  }

  /**
   * ACC-03: Google OAuth initiate
   * Acceptance 2: OAuth callback kiểm tra state và redirect allowlist
   */
  async initiateGoogleOAuth(redirectUrl?: string) {
    if (redirectUrl && !this.isAllowedRedirectUrl(redirectUrl)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'URL chuyển hướng không nằm trong danh sách cho phép.',
      });
    }

    const state = crypto.randomBytes(24).toString('hex');
    const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
    const defaultRedirect = process.env.PUBLIC_HOST
      ? `http://${process.env.PUBLIC_HOST}/auth/callback`
      : 'http://localhost:3000/auth/callback';

    const targetRedirect = redirectUrl || defaultRedirect;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&scope=openid%20email%20profile&redirect_uri=${encodeURIComponent(targetRedirect)}&state=${state}`;

    return {
      authUrl,
      state,
      redirectUrl: targetRedirect,
    };
  }

  /**
   * ACC-03: Google OAuth callback handler
   * Acceptance 2: OAuth callback kiểm tra state và redirect allowlist
   */
  async handleGoogleOAuthCallback(input: GoogleOAuthCallbackInput) {
    // 1. Kiểm tra state parameter
    if (!input.state || !input.expectedState || input.state !== input.expectedState) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'OAuth state không hợp lệ hoặc không trùng khớp.',
      });
    }

    // 2. Kiểm tra redirect allowlist
    if (input.redirectUrl && !this.isAllowedRedirectUrl(input.redirectUrl)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'URL chuyển hướng không được phép.',
      });
    }

    return {
      success: true,
      code: input.code,
      targetUrl: input.redirectUrl || 'http://localhost:3000/dashboard',
      message: 'OAuth callback validated successfully.',
    };
  }

  /**
   * Validates a session token and returns the current user context.
   */
  async getSession(token: string): Promise<AuthUserContext | null> {
    if (!token) return null;

    const rows = await this.client.db
      .select({
        sessionId: schema.sessions.id,
        sessionToken: schema.sessions.token,
        sessionExpiresAt: schema.sessions.expiresAt,
        userId: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
        emailVerified: schema.users.emailVerified,
        blockedAt: schema.users.blockedAt,
      })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
      .where(and(eq(schema.sessions.token, token), gt(schema.sessions.expiresAt, new Date())))
      .limit(1);

    const row = rows[0];
    if (!row || row.blockedAt) {
      return null;
    }

    return {
      userId: row.userId,
      email: row.email,
      name: row.name,
      role: row.role as AuthUserContext['role'],
      sessionId: row.sessionId,
      sessionToken: row.sessionToken,
      emailVerified: row.emailVerified,
    };
  }
}
