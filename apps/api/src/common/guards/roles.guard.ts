import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { Role } from '@jlpt/schema';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthUserContext } from '../types/auth.types.js';

const STAFF_ROLES: Role[] = [
  'admin',
  'editor',
  'reviewer',
  'moderator',
  'billing_admin',
];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthUserContext }>();
    const user = request.user;
    const url = request.raw.url || '';

    // Check admin host constraint if accessing admin routes
    if (url.includes('/api/v1/admin')) {
      if (!user) {
        throw new UnauthorizedException({
          code: 'UNAUTHENTICATED',
          message: 'Yêu cầu đăng nhập tài khoản nhân sự.',
        });
      }

      if (!STAFF_ROLES.includes(user.role)) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Tài khoản không thuộc quyền quản trị.',
        });
      }

      const adminHost = process.env.ADMIN_HOST;
      const hostHeader = (request.headers.host || '').toLowerCase();
      if (adminHost && !hostHeader.includes(adminHost.toLowerCase())) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Khu vực quản trị chỉ được phép truy cập qua ADMIN_HOST.',
        });
      }

      // 2FA requirement for staff
      if (user.twoFactorEnabled === false && process.env.ENFORCE_STAFF_2FA === 'true') {
        throw new ForbiddenException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Nhân sự bắt buộc phải kích hoạt xác thực hai yếu tố (2FA).',
        });
      }
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    // Admin role has superuser access
    if (user.role === 'admin') {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền hạn cần thiết để thực hiện thao tác này.',
      });
    }

    return true;
  }
}
