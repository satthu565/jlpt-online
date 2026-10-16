import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AuthUserContext } from '../types/auth.types.js';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthUserContext; params?: Record<string, string> }>();
    const user = request.user;

    // Admin has cross-tenant access for operations
    if (user?.role === 'admin') {
      return true;
    }

    const orgIdHeader = request.headers['x-organization-id'] as string | undefined;
    const orgIdParam = request.params?.orgId || request.params?.organizationId;
    const targetTenantId = orgIdHeader || orgIdParam;

    if (targetTenantId && user) {
      if (user.tenantId && user.tenantId !== targetTenantId) {
        throw new ForbiddenException({
          code: 'TENANT_FORBIDDEN',
          message: 'Không có quyền truy cập tổ chức hoặc lớp học này.',
        });
      }
    }

    return true;
  }
}
