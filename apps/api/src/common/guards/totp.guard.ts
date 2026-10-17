import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { REQUIRE_TOTP_KEY } from '../decorators/require-totp.decorator.js';
import type { AuthUserContext } from '../types/auth.types.js';
import { verifyTotp } from '../utils/totp.js';

@Injectable()
export class TotpGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireTotp = this.reflector.getAllAndOverride<boolean>(REQUIRE_TOTP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthUserContext }>();
    const url = request.raw?.url || request.url || '';

    const isAdminRoute =
      url.startsWith('/api/v1/admin') || url.startsWith('/admin');
    const isStaffRole =
      Boolean(request.user) &&
      ['admin', 'editor', 'reviewer', 'moderator', 'billing_admin'].includes(
        request.user!.role,
      );

    const isEnforced =
      process.env.ENFORCE_STAFF_2FA === 'true' ||
      process.env.NODE_ENV === 'production';

    const shouldCheck =
      requireTotp ||
      (isAdminRoute && isStaffRole);

    if (!shouldCheck) {
      return true;
    }

    if (!request.user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    // Check if request carries x-totp-code header
    const totpHeader = request.headers['x-totp-code'];
    const totpCode = typeof totpHeader === 'string' ? totpHeader : undefined;

    // 1. Endpoints explicitly marked with @RequireTotp() require TOTP verification
    if (requireTotp) {
      if (!totpCode) {
        throw new ForbiddenException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Thao tác này yêu cầu nhập mã xác thực TOTP.',
        });
      }

      const secret = request.user.totpSecret;
      if (!secret) {
        throw new ForbiddenException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Tài khoản chưa thiết lập mã xác thực hai bước (TOTP).',
        });
      }

      const isValid = verifyTotp(totpCode, secret);
      if (!isValid) {
        throw new ForbiddenException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Mã xác thực TOTP không chính xác hoặc đã hết hạn.',
        });
      }

      return true;
    }

    // 2. Admin routes with x-totp-code header: verify against user's secret
    if (totpCode) {
      const secret = request.user.totpSecret;
      if (!secret) {
        throw new ForbiddenException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Tài khoản chưa thiết lập mã xác thực hai bước (TOTP).',
        });
      }

      const isValid = verifyTotp(totpCode, secret);
      if (!isValid) {
        throw new ForbiddenException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Mã xác thực TOTP không chính xác hoặc đã hết hạn.',
        });
      }

      return true;
    }

    // 3. Admin routes without x-totp-code header:
    // When enforcement is active (staging/production) or user has enabled 2FA:
    if (isEnforced) {
      if (request.user.twoFactorEnabled !== true) {
        throw new ForbiddenException({
          code: 'TWO_FACTOR_REQUIRED',
          message:
            'Tài khoản nhân sự bắt buộc phải kích hoạt và xác thực 2FA (TOTP).',
        });
      }

      if (request.user.twoFactorVerified !== true) {
        throw new ForbiddenException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Yêu cầu xác thực hai bước (TOTP).',
        });
      }
    }

    return true;
  }
}
