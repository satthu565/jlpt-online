import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { CsvExportService } from './csv-export.service.js';
import { FlashcardService } from './flashcard.service.js';
import type {
  CreateNotebookItemDto,
  DueCardsQueryDto,
  GenerateCardsDto,
  NotebookExportRequestDto,
  NotebookQueryDto,
  NotebookQuizRequestDto,
  SubmitReviewDto,
  TTSRequestDto,
  UpdateNotebookItemDto,
} from './learning.types.js';
import { NotebookService } from './notebook.service.js';
import { QuizService } from './quiz.service.js';
import { SrsService } from './srs.service.js';
import { TTSService } from './tts.service.js';

@Controller()
export class LearningController {
  constructor(
    private readonly notebookService: NotebookService,
    private readonly flashcardService: FlashcardService,
    private readonly srsService: SrsService,
    private readonly quizService: QuizService,
    private readonly csvExportService: CsvExportService,
    private readonly ttsService: TTSService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Notebook Items CRUD (VOC-06, VOC-07, VOC-08, VOC-09, VOC-12, VOC-13)
  // ---------------------------------------------------------------------------

  @Get(['me/notebook-items', 'api/v1/me/notebook-items'])
  async listNotebookItems(
    @CurrentUser() user: AuthUserContext,
    @Query() query: NotebookQueryDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.notebookService.listItems(userId, query);
  }

  @Post(['me/notebook-items', 'api/v1/me/notebook-items'])
  @HttpCode(HttpStatus.CREATED)
  async createNotebookItem(
    @CurrentUser() user: AuthUserContext,
    @Body() dto: CreateNotebookItemDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.notebookService.createItem(userId, dto);
  }

  @Get(['me/notebook-items/:id', 'api/v1/me/notebook-items/:id'])
  async getNotebookItem(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.notebookService.getItem(userId, id);
  }

  @Patch(['me/notebook-items/:id', 'api/v1/me/notebook-items/:id'])
  async updateNotebookItem(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body() dto: UpdateNotebookItemDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.notebookService.updateItem(userId, id, dto);
  }

  @Delete(['me/notebook-items/:id', 'api/v1/me/notebook-items/:id'])
  async deleteNotebookItem(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.notebookService.deleteItem(userId, id);
  }

  // ---------------------------------------------------------------------------
  // 2. Question Examples from Question Bank (VOC-17)
  // ---------------------------------------------------------------------------

  @Get(['me/notebook-items/:id/question-examples', 'api/v1/me/notebook-items/:id/question-examples'])
  async getQuestionExamples(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    const examples = await this.notebookService.findQuestionExamples(userId, id);
    return { examples };
  }

  // ---------------------------------------------------------------------------
  // 3. Flashcards Generation & Retrieval (VOC-10)
  // ---------------------------------------------------------------------------

  @Post(['me/notebook-items/:id/cards', 'api/v1/me/notebook-items/:id/cards'])
  @HttpCode(HttpStatus.CREATED)
  async generateCards(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body() dto: GenerateCardsDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.flashcardService.generateCardForNotebookItem(userId, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 4. Spaced Repetition (SRS) Review & Due Cards (VOC-11, VOC-18, Acceptance 1)
  // ---------------------------------------------------------------------------

  @Get(['me/srs/due', 'api/v1/me/srs/due'])
  async getDueCards(
    @CurrentUser() user: AuthUserContext,
    @Query() query: DueCardsQueryDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.srsService.getDueCards(userId, query.timezone, query.limit);
  }

  @Post(['me/srs/reviews', 'api/v1/me/srs/reviews'])
  async submitReview(
    @CurrentUser() user: AuthUserContext,
    @Body() dto: SubmitReviewDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.srsService.processReview(userId, dto);
  }

  // ---------------------------------------------------------------------------
  // 5. Notebook Quizzes (VOC-14)
  // ---------------------------------------------------------------------------

  @Post(['me/notebook-quizzes', 'api/v1/me/notebook-quizzes'])
  async createNotebookQuiz(
    @CurrentUser() user: AuthUserContext,
    @Body() dto: NotebookQuizRequestDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.quizService.generateNotebookQuiz(userId, dto);
  }

  // ---------------------------------------------------------------------------
  // 6. CSV Export with Formula Injection Neutralization (VOC-15, Acceptance 4)
  // ---------------------------------------------------------------------------

  @Post(['me/notebook-exports', 'api/v1/me/notebook-exports'])
  async exportNotebook(
    @CurrentUser() user: AuthUserContext,
    @Body() dto: NotebookExportRequestDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    const listResult = await this.notebookService.listItems(userId, {
      kind: dto.kind,
      tag: dto.tags?.[0],
      mastered: dto.mastered,
      limit: 10000,
    });

    const csvContent = this.csvExportService.exportNotebookItemsToCsv(listResult.items);
    return {
      filename: `jlpt-notebook-export-${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
      data: csvContent,
      rowCount: listResult.items.length,
    };
  }

  // ---------------------------------------------------------------------------
  // 7. TTS Pronunciation with License Verification (VOC-16, Acceptance 4)
  // ---------------------------------------------------------------------------

  @Post(['tts', 'api/v1/tts'])
  async synthesizePronunciation(
    @CurrentUser() user: AuthUserContext,
    @Body() dto: TTSRequestDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.ttsService.synthesizePronunciation(userId, dto);
  }

  @Get(['tts/license', 'api/v1/tts/license'])
  async getTtsLicense() {
    return this.ttsService.getLicenseMetadata();
  }

  // ---------------------------------------------------------------------------
  // 8. Dataset Gaps
  // ---------------------------------------------------------------------------

  @Get(['me/dataset-gaps', 'api/v1/me/dataset-gaps'])
  async getDatasetGaps(@CurrentUser() user: AuthUserContext) {
    const userId = user?.userId ?? 'default-user-id';
    const items = await this.notebookService.getDatasetGaps(userId);
    return { items };
  }
}
