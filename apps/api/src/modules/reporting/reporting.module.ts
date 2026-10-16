import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { ReportingController } from './reporting.controller.js';
import { ReportingService } from './reporting.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
