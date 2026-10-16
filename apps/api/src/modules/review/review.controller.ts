import {
  Body,
  Controller,
  Param,
  Post,
  UsePipes,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ReviewService } from './review.service.js';
import {
  ReviewDecisionSchema,
  ReviewParamsSchema,
  SubmitReviewSchema,
  type ReviewDecisionDto,
  type SubmitReviewDto,
} from './review.types.js';

@Controller('admin/reviews')
@Roles('admin', 'editor', 'reviewer')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('submit')
  @UsePipes(new ZodValidationPipe(SubmitReviewSchema))
  async submitForReview(
    @Body() dto: SubmitReviewDto,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const userId = user.userId || user.id || '';
    return this.reviewService.submitForReview(
      dto.targetType,
      dto.targetId,
      dto.targetVersion,
      userId,
    );
  }

  @Post(':targetType/:targetId/v:version/decision')
  async reviewDecision(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Param('version') versionStr: string,
    @Body(new ZodValidationPipe(ReviewDecisionSchema)) dto: ReviewDecisionDto,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const validatedParams = ReviewParamsSchema.parse({
      targetType,
      targetId,
      version: versionStr,
    });

    const userId = user.userId || user.id || '';
    return this.reviewService.reviewDecision(
      validatedParams.targetType,
      validatedParams.targetId,
      validatedParams.version,
      dto,
      userId,
    );
  }
}
