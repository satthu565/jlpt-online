import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { PracticeService } from './practice.service.js';
import { MixService } from './mix.service.js';
import type { Level } from '@jlpt/schema';

@Controller()
export class PracticeMixController {
  constructor(
    private readonly practiceService: PracticeService,
    private readonly mixService: MixService,
  ) {}

  // ---------------------------------------------------------------------------
  // Practice Exam Endpoints (PRA-10..PRA-17)
  // ---------------------------------------------------------------------------

  @Post('practice-exams')
  @HttpCode(HttpStatus.CREATED)
  async createPracticeExam(
    @CurrentUser() user: AuthUserContext,
    @Body() body: unknown,
  ) {
    return this.practiceService.generatePracticeExam(user.userId, body);
  }

  @Get('me/practice-sessions/in-progress')
  async getInProgressPractice(@CurrentUser() user: AuthUserContext) {
    return this.practiceService.listInProgressPractice(user.userId);
  }

  // ---------------------------------------------------------------------------
  // Mixed Exam Endpoints (MIX-13..MIX-17)
  // ---------------------------------------------------------------------------

  @Post('mixed-exams')
  @HttpCode(HttpStatus.CREATED)
  async createMixedExam(
    @CurrentUser() user: AuthUserContext,
    @Body() body: unknown,
  ) {
    return this.mixService.generateMixedExam(user.userId, body);
  }

  @Post('mixed-exams/quick')
  @HttpCode(HttpStatus.CREATED)
  async createQuickMixedExam(
    @CurrentUser() user: AuthUserContext,
    @Body('level') level?: Level,
  ) {
    return this.mixService.quickMix(user.userId, level);
  }

  @Get('generated-exams')
  async listGeneratedExams(@CurrentUser() user: AuthUserContext) {
    return this.mixService.listGeneratedExams(user.userId);
  }

  @Get('generated-exams/:id')
  async getGeneratedExam(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
  ) {
    return this.mixService.getGeneratedExam(user.userId, id);
  }

  @Post('generated-exams/:id/regenerate')
  @HttpCode(HttpStatus.CREATED)
  async regenerateExam(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body('newSeed') newSeed?: number,
  ) {
    return this.mixService.regenerateExam(user.userId, id, newSeed);
  }

  @Post('generated-exams/:id/shares')
  @HttpCode(HttpStatus.CREATED)
  async shareExam(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body('expiresAt') expiresAt?: string,
  ) {
    const expiresDate = expiresAt ? new Date(expiresAt) : undefined;
    return this.mixService.shareExam(user.userId, id, expiresDate);
  }

  @Public()
  @Get('shared-exams/:token')
  async getSharedExam(@Param('token') token: string) {
    return this.mixService.getSharedExam(token);
  }

  // ---------------------------------------------------------------------------
  // Question Marks (PRA-13, EXPL-10)
  // ---------------------------------------------------------------------------

  @Put('me/question-marks/:id')
  async markQuestion(
    @CurrentUser() user: AuthUserContext,
    @Param('id') questionId: string,
    @Body('markType') markType?: string,
  ) {
    return this.mixService.markQuestion(user.userId, questionId, markType);
  }

  @Delete('me/question-marks/:id')
  @HttpCode(HttpStatus.OK)
  async unmarkQuestion(
    @CurrentUser() user: AuthUserContext,
    @Param('id') questionId: string,
    @Query('markType') markType?: string,
  ) {
    return this.mixService.unmarkQuestion(user.userId, questionId, markType);
  }

  @Get('me/question-marks')
  async listMarkedQuestions(@CurrentUser() user: AuthUserContext) {
    return this.mixService.listMarkedQuestions(user.userId);
  }

  // ---------------------------------------------------------------------------
  // Exam Favorites
  // ---------------------------------------------------------------------------

  @Put('me/favorite-exams/:id')
  async favoriteExam(
    @CurrentUser() user: AuthUserContext,
    @Param('id') examId: string,
  ) {
    return this.mixService.favoriteExam(user.userId, examId);
  }

  @Delete('me/favorite-exams/:id')
  @HttpCode(HttpStatus.OK)
  async unfavoriteExam(
    @CurrentUser() user: AuthUserContext,
    @Param('id') examId: string,
  ) {
    return this.mixService.unfavoriteExam(user.userId, examId);
  }

  @Get('me/favorite-exams')
  async listFavoriteExams(@CurrentUser() user: AuthUserContext) {
    return this.mixService.listFavoriteExams(user.userId);
  }
}
