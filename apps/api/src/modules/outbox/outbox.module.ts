import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { OutboxService } from './outbox.service.js';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
