import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  limit: number;
  windowSec: number;
  keyPrefix?: string;
}

export const RATE_LIMIT_KEY = 'rateLimitOptions';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
