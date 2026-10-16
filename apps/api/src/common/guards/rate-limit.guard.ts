import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { RATE_LIMIT_KEY, type RateLimitOptions } from '../decorators/rate-limit.decorator.js';

interface RateLimitRecord {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, RateLimitRecord>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no custom rate limit is set, default to 120 req/min for general protection
    const limit = options?.limit ?? (process.env.NODE_ENV === 'test' ? 1000 : 120);
    const windowMs = (options?.windowSec ?? 60) * 1000;
    const prefix = options?.keyPrefix ?? 'global';

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const clientIp = this.getClientIp(request);
    const key = `${prefix}:${clientIp}`;

    const now = Date.now();
    let record = this.hits.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.hits.set(key, record);
    }

    // Filter out timestamps outside window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= limit) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
          details: {
            limit,
            retryAfterSec: Math.ceil((record.timestamps[0]! + windowMs - now) / 1000),
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.timestamps.push(now);
    return true;
  }

  public reset(keyPrefix?: string): void {
    if (!keyPrefix) {
      this.hits.clear();
      return;
    }
    for (const key of this.hits.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.hits.delete(key);
      }
    }
  }

  private getClientIp(request: FastifyRequest): string {
    const cfIp = request.headers['cf-connecting-ip'];
    if (cfIp && typeof cfIp === 'string') return cfIp;

    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor && typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0]?.trim() || '127.0.0.1';
    }

    return request.ip || '127.0.0.1';
  }
}
