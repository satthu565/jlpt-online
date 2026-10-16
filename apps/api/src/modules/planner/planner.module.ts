import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { PlannerController } from './planner.controller.js';
import { PlannerService } from './planner.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PlannerController],
  providers: [PlannerService],
  exports: [PlannerService],
})
export class PlannerModule {}
