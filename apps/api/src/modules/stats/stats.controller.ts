import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Level } from '@jlpt/schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { StatsService } from './stats.service.js';
import type { ReadinessQueryDto } from './stats.types.js';

@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get(['me/analytics', 'api/v1/me/analytics'])
  async getAnalytics(
    @CurrentUser() user: AuthUserContext,
    @Query('targetLevel') targetLevel?: string,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.statsService.getAnalyticsReport(userId, (targetLevel as Level) ?? 'N3');
  }

  @Get(['me/readiness', 'api/v1/me/readiness'])
  async getReadiness(
    @CurrentUser() user: AuthUserContext,
    @Query() query: ReadinessQueryDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.statsService.evaluateReadiness(userId, query.targetLevel ?? 'N3');
  }

  @Get(['questions/:id/difficulty-stats', 'api/v1/questions/:id/difficulty-stats'])
  async getQuestionDifficulty(@Param('id') questionId: string) {
    return this.statsService.getQuestionDifficultyStats(questionId);
  }
}
