import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { ExamService } from './exam.service.js';
import { ExamController } from './exam.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
