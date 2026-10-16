import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { CsvExportService } from './csv-export.service.js';
import { FlashcardService } from './flashcard.service.js';
import { LearningController } from './learning.controller.js';
import { NotebookService } from './notebook.service.js';
import { QuizService } from './quiz.service.js';
import { SrsService } from './srs.service.js';
import { TTSService } from './tts.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [LearningController],
  providers: [
    NotebookService,
    FlashcardService,
    SrsService,
    QuizService,
    CsvExportService,
    TTSService,
  ],
  exports: [
    NotebookService,
    FlashcardService,
    SrsService,
    QuizService,
    CsvExportService,
    TTSService,
  ],
})
export class LearningModule {}
