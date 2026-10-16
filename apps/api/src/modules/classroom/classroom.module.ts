import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { AttemptModule } from '../attempt/attempt.module.js';
import { ClassroomController } from './classroom.controller.js';
import { ClassroomService } from './classroom.service.js';
import { ExamEventController } from './exam-event.controller.js';
import { ExamEventService } from './exam-event.service.js';

@Module({
  imports: [DatabaseModule, OutboxModule, AttemptModule],
  controllers: [ClassroomController, ExamEventController],
  providers: [ClassroomService, ExamEventService],
  exports: [ClassroomService, ExamEventService],
})
export class ClassroomModule {}
