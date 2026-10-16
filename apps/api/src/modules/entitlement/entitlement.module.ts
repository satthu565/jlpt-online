import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { EntitlementController } from './entitlement.controller.js';
import { EntitlementService } from './entitlement.service.js';

@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [EntitlementController],
  providers: [EntitlementService],
  exports: [EntitlementService],
})
export class EntitlementModule {}
