import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { GamificationController } from './gamification.controller.js';
import { GamificationService } from './gamification.service.js';

@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
