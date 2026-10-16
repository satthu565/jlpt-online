import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = (request.raw?.method || request.method || '').toUpperCase();

    // Only inspect state-changing requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const origin = request.headers.origin;
    if (!origin || typeof origin !== 'string') {
      // If no Origin header is sent (e.g. server-to-server or direct curl), allow if no Sec-Fetch-Site: cross-site
      const secFetchSite = request.headers['sec-fetch-site'];
      if (secFetchSite === 'cross-site') {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Cross-site request blocked by CSRF policy.',
        });
      }
      return true;
    }

    let originHost: string;
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Origin header malformed.',
      });
    }

    const hostHeader = (request.headers.host || '').toLowerCase();
    const adminHost = (process.env.ADMIN_HOST || '').toLowerCase();
    const allowedHosts = new Set<string>();

    if (hostHeader) {
      allowedHosts.add(hostHeader);
      // Also host without port if port was included
      allowedHosts.add(hostHeader.split(':')[0]!);
    }
    if (adminHost) {
      allowedHosts.add(adminHost);
      allowedHosts.add(adminHost.split(':')[0]!);
    }

    // Standard dev/test fallbacks
    allowedHosts.add('localhost');
    allowedHosts.add('127.0.0.1');

    // Extract bare origin host without port
    const bareOriginHost = originHost.split(':')[0]!;

    const isAllowed = allowedHosts.has(originHost) || allowedHosts.has(bareOriginHost);

    if (!isAllowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Yêu cầu ghi bị từ chối do Origin không khớp host máy chủ (CSRF Protection).',
      });
    }

    return true;
  }
}
