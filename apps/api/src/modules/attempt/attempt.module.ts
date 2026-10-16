import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { ScoringModule } from '../scoring/scoring.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { TurnstileModule } from '../turnstile/turnstile.module.js';
import { AttemptService } from './attempt.service.js';
import { AttemptController } from './attempt.controller.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';

@Module({
  imports: [DatabaseModule, ScoringModule, OutboxModule, TurnstileModule],
  controllers: [AttemptController],
  providers: [AttemptService, RateLimitGuard],
  exports: [AttemptService],
})
export class AttemptModule {}
