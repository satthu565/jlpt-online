import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { LicenseModule } from '../license/license.module.js';
import { ExamService } from './exam.service.js';
import { ExamController } from './exam.controller.js';
import { PracticeService } from './practice.service.js';
import { MixService } from './mix.service.js';
import { PracticeMixController } from './practice-mix.controller.js';

@Module({
  imports: [DatabaseModule, LicenseModule],
  controllers: [ExamController, PracticeMixController],
  providers: [ExamService, PracticeService, MixService],
  exports: [ExamService, PracticeService, MixService],
})
export class ExamModule {}
