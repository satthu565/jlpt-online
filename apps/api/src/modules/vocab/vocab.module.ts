import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { CorpusService } from './corpus.service.js';
import { VocabController } from './vocab.controller.js';
import { VocabService } from './vocab.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [VocabController],
  providers: [VocabService, CorpusService],
  exports: [VocabService, CorpusService],
})
export class VocabModule {}
