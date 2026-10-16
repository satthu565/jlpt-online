import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './modules/health/health.controller.js';
import { DatabaseModule } from './common/database/database.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AuthGuard } from './common/guards/auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { TenantGuard } from './common/guards/tenant.guard.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { PiiMaskingInterceptor } from './common/interceptors/pii-masking.interceptor.js';

@Module({
  imports: [DatabaseModule, EmailModule, AuthModule, UserModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PiiMaskingInterceptor,
    },
  ],
})
export class AppModule {}
