import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { BlueprintModule } from '../blueprint/blueprint.module.js';
import { ExamService } from './exam.service.js';
import { ExamController } from './exam.controller.js';

@Global()
@Module({
  imports: [DatabaseModule, StorageModule, OutboxModule, BlueprintModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
