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

import { StorageModule } from './modules/storage/storage.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { LicenseModule } from './modules/license/license.module.js';
import { QuestionBankModule } from './modules/question-bank/question-bank.module.js';
import { ScoringModule } from './modules/scoring/scoring.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { BlueprintModule } from './modules/blueprint/blueprint.module.js';
import { ReviewModule } from './modules/review/review.module.js';
import { ImportModule } from './modules/import/import.module.js';
import { TurnstileModule } from './modules/turnstile/turnstile.module.js';
import { AttemptModule } from './modules/attempt/attempt.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { ExamModule } from './modules/exam/exam.module.js';
import { OriginGuard } from './common/guards/origin.guard.js';
import { TotpGuard } from './common/guards/totp.guard.js';
import { RateLimitGuard } from './common/guards/rate-limit.guard.js';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    AuthModule,
    UserModule,
    StorageModule,
    MediaModule,
    LicenseModule,
    QuestionBankModule,
    ScoringModule,
    OutboxModule,
    BlueprintModule,
    ReviewModule,
    ImportModule,
    TurnstileModule,
    AttemptModule,
    AuditModule,
    AdminModule,
    ExamModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: OriginGuard,
    },
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
      useClass: TotpGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
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
