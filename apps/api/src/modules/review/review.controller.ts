import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ReviewService } from './review.service.js';
import type { ReviewDecisionDto, SubmitReviewDto } from './review.types.js';

@Controller('api/v1/admin/reviews')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'editor', 'reviewer')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('submit')
  async submitForReview(
    @Body() dto: SubmitReviewDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviewService.submitForReview(
      dto.targetType,
      dto.targetId,
      dto.targetVersion,
      user.id,
    );
  }

  @Post(':targetType/:targetId/v:version/decision')
  async reviewDecision(
    @Param('targetType') targetType: any,
    @Param('targetId') targetId: string,
    @Param('version') versionStr: string,
    @Body() dto: ReviewDecisionDto,
    @CurrentUser() user: { id: string },
  ) {
    const version = parseInt(versionStr, 10);
    return this.reviewService.reviewDecision(
      targetType,
      targetId,
      version,
      dto,
      user.id,
    );
  }
}
