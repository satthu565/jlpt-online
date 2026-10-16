import { SetMetadata } from '@nestjs/common';

export const REQUIRE_TOTP_KEY = 'requireTotp';
export const RequireTotp = () => SetMetadata(REQUIRE_TOTP_KEY, true);
