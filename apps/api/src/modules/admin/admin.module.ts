import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [DatabaseModule, EmailModule, AuditModule],
  controllers: [AdminController],
})
export class AdminModule {}
