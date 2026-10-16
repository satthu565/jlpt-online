import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AuthService } from '../../modules/auth/auth.service.js';
import type { AuthUserContext } from '../types/auth.types.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUserContext }>();
    const url = request.raw?.url || request.url || '';

    // 1. Health check endpoints are publicly accessible per specification
    if (url === '/health' || url === '/api/v1/health' || url.startsWith('/health?') || url.startsWith('/api/v1/health?')) {
      return true;
    }

    // 2. Check if route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 3. Default deny: all other endpoints require valid authentication
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    const sessionUser = await this.authService.getSession(token);
    if (!sessionUser) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.',
      });
    }

    // Attach user context to request
    request.user = sessionUser;
    return true;
  }

  private extractTokenFromRequest(request: FastifyRequest): string | null {
    // 1. Bearer token in Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0]?.toLowerCase() === 'bearer') {
        return parts[1] ?? null;
      }
    }

    // 2. Session cookie
    const cookieHeader = request.headers.cookie;
    if (cookieHeader && typeof cookieHeader === 'string') {
      const cookies = cookieHeader.split(';').map((c) => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith('auth_token=')) {
          return decodeURIComponent(cookie.substring('auth_token='.length));
        }
        if (cookie.startsWith('better-auth.session_token=')) {
          return decodeURIComponent(cookie.substring('better-auth.session_token='.length));
        }
      }
    }

    return null;
  }
}
