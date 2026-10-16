import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUserContext } from '../types/auth.types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const CurrentGuestId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.guestId;
  },
);

