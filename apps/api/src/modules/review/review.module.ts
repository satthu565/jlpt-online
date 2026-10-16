import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { LicenseModule } from '../license/license.module.js';
import { ReviewService } from './review.service.js';
import { ReviewController } from './review.controller.js';

@Global()
@Module({
  imports: [DatabaseModule, OutboxModule, LicenseModule],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
