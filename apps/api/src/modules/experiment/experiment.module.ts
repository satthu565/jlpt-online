import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { ExperimentService } from './experiment.service.js';
import { ExperimentController } from './experiment.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ExperimentController],
  providers: [ExperimentService],
  exports: [ExperimentService],
})
export class ExperimentModule {}
