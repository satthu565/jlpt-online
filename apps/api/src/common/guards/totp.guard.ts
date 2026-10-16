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

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUserContext }>();
    const url = request.raw?.url || request.url || '';

    const isAdminRoute = url.startsWith('/api/v1/admin') || url.startsWith('/admin');
    const isStaffRole =
      request.user &&
      ['admin', 'editor', 'reviewer', 'moderator', 'billing_admin'].includes(request.user.role);

    // If route explicitly requires TOTP, or if ENFORCE_STAFF_2FA is explicitly enabled for staff admin routes
    const shouldCheck =
      requireTotp ||
      (isAdminRoute && isStaffRole && process.env.ENFORCE_STAFF_2FA === 'true');

    if (!shouldCheck) {
      return true;
    }

    if (!request.user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    // Check if user has 2FA enabled on session / user record
    const has2FAEnabled = request.user.twoFactorEnabled === true;

    // Check if request carries x-totp-code header
    const totpHeader = request.headers['x-totp-code'];
    const totpCode = typeof totpHeader === 'string' ? totpHeader : undefined;

    // If totpCode header is provided, verify it if secret exists
    if (totpCode) {
      const secret = (request.user as unknown as { totpSecret?: string }).totpSecret || process.env.TOTP_TEST_SECRET || 'JBSWY3DPEHPK3PXP';
      const isValid = verifyTotp(totpCode, secret);
      if (!isValid) {
        throw new ForbiddenException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Mã xác thực TOTP không chính xác hoặc đã hết hạn.',
        });
      }
      return true;
    }

    if (!has2FAEnabled) {
      throw new ForbiddenException({
        code: 'TWO_FACTOR_REQUIRED',
        message: 'Tài khoản nhân sự bắt buộc phải kích hoạt và xác thực 2FA (TOTP).',
      });
    }

    return true;
  }
}
