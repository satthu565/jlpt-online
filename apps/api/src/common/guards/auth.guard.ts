import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ALLOW_GUEST_KEY } from '../decorators/allow-guest.decorator.js';
import { AuthService } from '../../modules/auth/auth.service.js';
import type { AuthUserContext } from '../types/auth.types.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUserContext; guestId?: string }>();
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

    // 3. Check if route allows Guest access
    const allowGuest = this.reflector.getAllAndOverride<boolean>(ALLOW_GUEST_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const token = this.extractTokenFromRequest(request);

    if (token) {
      const sessionUser = await this.authService.getSession(token);
      if (sessionUser) {
        request.user = sessionUser;
        return true;
      }
      // If token was provided but invalid and allowGuest is not set, reject
      if (!allowGuest) {
        throw new UnauthorizedException({
          code: 'UNAUTHENTICATED',
          message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.',
        });
      }
    }

    // 4. If AllowGuest is active and user is not authenticated, extract or assign guestId
    if (allowGuest) {
      const guestId = this.extractGuestIdFromRequest(request);
      if (guestId) {
        request.guestId = guestId;
        return true;
      }
      // Guest with no cookie/header: assign random UUID so attempt service can check exam eligibility
      request.guestId = crypto.randomUUID();
      return true;
    }

    // 5. Default deny: all other endpoints require valid authentication
    throw new UnauthorizedException({
      code: 'UNAUTHENTICATED',
      message: 'Yêu cầu đăng nhập.',
    });
  }

  private extractGuestIdFromRequest(request: FastifyRequest): string | null {
    // 1. Header x-guest-id
    const guestHeader = request.headers['x-guest-id'];
    if (guestHeader && typeof guestHeader === 'string' && guestHeader.trim()) {
      return guestHeader.trim();
    }

    // 2. Cookie __Host-guest or guest_id
    const cookieHeader = request.headers.cookie;
    if (cookieHeader && typeof cookieHeader === 'string') {
      const cookies = cookieHeader.split(';').map((c) => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith('__Host-guest=')) {
          return decodeURIComponent(cookie.substring('__Host-guest='.length));
        }
        if (cookie.startsWith('guest_id=')) {
          return decodeURIComponent(cookie.substring('guest_id='.length));
        }
      }
    }

    return null;
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

    // 2. Session cookie (__Host-session, auth_token, better-auth.session_token)
    const cookieHeader = request.headers.cookie;
    if (cookieHeader && typeof cookieHeader === 'string') {
      const cookies = cookieHeader.split(';').map((c) => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith('__Host-session=')) {
          return decodeURIComponent(cookie.substring('__Host-session='.length));
        }
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
