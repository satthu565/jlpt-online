import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { ScoringService } from './scoring.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
