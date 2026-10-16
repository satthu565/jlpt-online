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
  UsePipes,
} from '@nestjs/common';
import { CurrentUser, CurrentGuestId } from '../../common/decorators/current-user.decorator.js';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { ReviewService, type CreateReportInput } from './review.service.js';
import type { ExplanationDraft } from '@jlpt/schema';
import {
  ReviewDecisionSchema,
  ReviewParamsSchema,
  SubmitReviewSchema,
  type ReviewDecisionDto,
  type SubmitReviewDto,
} from './review.types.js';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ---------------------------------------------------------------------------
  // Content Review & Approval (B01)
  // ---------------------------------------------------------------------------

  @Roles('admin', 'editor', 'reviewer')
  @Post('admin/reviews/submit')
  @UsePipes(new ZodValidationPipe(SubmitReviewSchema))
  async submitForReview(
    @Body() dto: SubmitReviewDto,
    @CurrentUser() user: AuthUserContext | { id?: string; userId?: string },
  ) {
    const userId = user.userId || (user as { id?: string }).id || '';
    return this.reviewService.submitForReview(
      dto.targetType,
      dto.targetId,
      dto.targetVersion,
      userId,
    );
  }

  @Roles('admin', 'editor', 'reviewer')
  @Post('admin/reviews/:targetType/:targetId/v:version/decision')
  async reviewDecision(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Param('version') versionStr: string,
    @Body(new ZodValidationPipe(ReviewDecisionSchema)) dto: ReviewDecisionDto,
    @CurrentUser() user: AuthUserContext | { id?: string; userId?: string },
  ) {
    const validatedParams = ReviewParamsSchema.parse({
      targetType,
      targetId,
      version: versionStr,
    });

    const userId = user.userId || (user as { id?: string }).id || '';
    return this.reviewService.reviewDecision(
      validatedParams.targetType,
      validatedParams.targetId,
      validatedParams.version,
      dto,
      userId,
    );
  }

  // ---------------------------------------------------------------------------
  // Explanation Management & Moderation (QB-08, EXPL-01..09, EXPL-13)
  // ---------------------------------------------------------------------------

  @Roles('admin', 'editor')
  @Post('admin/explanations')
  @HttpCode(HttpStatus.CREATED)
  async createExplanation(
    @CurrentUser() user: AuthUserContext,
    @Body() body: unknown,
  ) {
    return this.reviewService.createExplanation(user.userId, body);
  }

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/explanations')
  async listExplanations(
    @Query('questionId') questionId?: string,
    @Query('status') status?: string,
  ) {
    return this.reviewService.listExplanations({ questionId, status });
  }

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/explanations/:id')
  async getExplanation(@Param('id') id: string) {
    return this.reviewService.getExplanation(id);
  }

  @Roles('admin', 'editor')
  @Patch('admin/explanations/:id')
  async updateExplanation(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body() body: Partial<ExplanationDraft>,
  ) {
    return this.reviewService.updateExplanation(id, user.userId, body);
  }

  @Roles('admin', 'reviewer', 'editor')
  @Post('admin/explanations/:id/reviews')
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
