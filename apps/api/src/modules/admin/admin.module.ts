import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [AuditModule],
  controllers: [AdminController],
})
export class AdminModule {}
