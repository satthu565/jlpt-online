import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ClassroomModule } from '../classroom/classroom.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { ExamModule } from '../exam/exam.module.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [DatabaseModule, EmailModule, AuditModule, ClassroomModule, NotificationModule, ExamModule],
  controllers: [AdminController],
})
export class AdminModule {}
