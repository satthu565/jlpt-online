import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { BlueprintModule } from '../blueprint/blueprint.module.js';
import { LicenseModule } from '../license/license.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ExamService } from './exam.service.js';
import { ExamController } from './exam.controller.js';
import { PracticeService } from './practice.service.js';
import { MixService } from './mix.service.js';
import { PracticeMixController } from './practice-mix.controller.js';
import { JlptScheduleService } from './jlpt-schedule.service.js';
import { JlptScheduleController } from './jlpt-schedule.controller.js';

@Global()
@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    OutboxModule,
    BlueprintModule,
    LicenseModule,
    AuditModule,
  ],
  controllers: [ExamController, PracticeMixController, JlptScheduleController],
  providers: [ExamService, PracticeService, MixService, JlptScheduleService],
  exports: [ExamService, PracticeService, MixService, JlptScheduleService],
})
export class ExamModule {}

