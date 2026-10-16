import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, CurrentGuestId } from '../../common/decorators/current-user.decorator.js';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { ReviewService, type CreateReportInput } from './review.service.js';
import type { ExplanationDraft } from '@jlpt/schema';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ---------------------------------------------------------------------------
  // Explanation Management & Moderation (QB-08, EXPL-01..09, EXPL-13)
  // ---------------------------------------------------------------------------

  @Roles('admin', 'editor')
  @Post('explanations')
  @HttpCode(HttpStatus.CREATED)
  async createExplanation(
    @CurrentUser() user: AuthUserContext,
    @Body() body: unknown,
  ) {
    return this.reviewService.createExplanation(user.userId, body);
  }

  @Get('explanations')
  async listExplanations(
    @Query('questionId') questionId?: string,
    @Query('status') status?: string,
  ) {
    return this.reviewService.listExplanations({ questionId, status });
  }

  @Get('explanations/:id')
  async getExplanation(@Param('id') id: string) {
    return this.reviewService.getExplanation(id);
  }

  @Roles('admin', 'editor')
  @Patch('explanations/:id')
  async updateExplanation(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body() body: Partial<ExplanationDraft>,
  ) {
    return this.reviewService.updateExplanation(id, user.userId, body);
  }

  @Roles('admin', 'reviewer', 'editor')
  @Post('explanations/:id/reviews')
  @HttpCode(HttpStatus.OK)
  async reviewExplanation(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body() body: { decision: 'approved' | 'rejected'; comments?: string },
  ) {
    if (!body || !body.decision) {
      throw new BadRequestException('Yêu cầu quyết định duyệt (decision).');
    }
    return this.reviewService.reviewExplanation(
      id,
      user.userId,
      body.decision,
      body.comments,
    );
  }

  // ---------------------------------------------------------------------------
  // Learner Explanation View (EXPL-01..09, AUDIO-08, AUDIO-09)
  // ---------------------------------------------------------------------------

  @AllowGuest()
  @Get('attempts/:id/explanations/:index')
  async getAttemptExplanation(
    @Param('id') attemptId: string,
    @Param('index') indexStr: string,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
  ) {
    const index = Number.parseInt(indexStr, 10);
    return this.reviewService.getLearnerExplanation(
      attemptId,
      index,
      user?.userId,
      guestId,
    );
  }

  // ---------------------------------------------------------------------------
  // Content Reports (EXPL-12)
  // ---------------------------------------------------------------------------

  @Post('content-reports')
  @HttpCode(HttpStatus.CREATED)
  async createReport(
    @CurrentUser() user: AuthUserContext,
    @Body() body: CreateReportInput,
  ) {
    return this.reviewService.createReport(user.userId, body);
  }

  @Roles('admin', 'reviewer', 'editor')
  @Get('admin/content-reports')
  async listReports(
    @Query('status') status?: string,
    @Query('questionId') questionId?: string,
  ) {
    return this.reviewService.listReports({ status, questionId });
  }

  @Roles('admin', 'reviewer', 'editor')
  @Patch('admin/content-reports/:id')
  async updateReport(
    @Param('id') id: string,
    @Body() body: { status: 'in_review' | 'resolved' | 'dismissed'; notes?: string },
  ) {
    return this.reviewService.updateReport(id, body);
  }
}
