import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { ScoringModule } from '../scoring/scoring.module.js';
import { EmailModule } from '../email/email.module.js';
import { OutboxService } from './outbox.service.js';

@Global()
@Module({
  imports: [DatabaseModule, ScoringModule, EmailModule],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
