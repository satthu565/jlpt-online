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

/**
 * Resolves the rate limit namespace based on the running environment.
 * Ensures strict isolation between staging, production, and individual worker environments.
 */
export function getRateLimitNamespace(): string {
  // 1. Explicit rate-limit namespace override
  if (process.env.RATE_LIMIT_NAMESPACE && process.env.RATE_LIMIT_NAMESPACE.trim()) {
    return process.env.RATE_LIMIT_NAMESPACE.trim();
  }

  // 2. Redis cache key prefix (e.g. "jlpt:w2:cache:", "jlpt:staging:cache:")
  if (process.env.REDIS_CACHE_KEY_PREFIX && process.env.REDIS_CACHE_KEY_PREFIX.trim()) {
    const raw = process.env.REDIS_CACHE_KEY_PREFIX.trim();
    return raw.replace(/:+$/, '');
  }

  // 3. Worker environment separation (W1..W6 -> "worker:w1" .. "worker:w6")
  if (process.env.WORKER_ID && process.env.WORKER_ID.trim()) {
    return `worker:${process.env.WORKER_ID.trim().toLowerCase()}`;
  }

  // 4. Staging / Production environment (e.g. APP_ENV=staging -> "staging")
  if (process.env.APP_ENV && process.env.APP_ENV.trim()) {
    return process.env.APP_ENV.trim().toLowerCase();
  }

  // 5. Node env test fallback
  if (process.env.NODE_ENV === 'test') {
    return 'test:isolated';
  }

  return 'global:default';
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, RateLimitRecord>();

  constructor(private readonly reflector: Reflector) {}

  public getNamespace(): string {
    return getRateLimitNamespace();
  }

  public getRateLimitKey(prefix: string, clientIp: string): string {
    const ns = this.getNamespace();
    return `${ns}:${prefix}:${clientIp}`;
  }

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
    const key = this.getRateLimitKey(prefix, clientIp);

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
            namespace: this.getNamespace(),
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
    const ns = this.getNamespace();
    for (const key of this.hits.keys()) {
      if (key.startsWith(`${ns}:${keyPrefix}`) || key.startsWith(keyPrefix)) {
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

