import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { PlannerService } from './planner.service.js';
import type {
  CompleteSessionDto,
  CreateStudyPlanDto,
  ReplanRequestDto,
} from './planner.types.js';

@Controller()
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Post(['me/study-plans', 'api/v1/me/study-plans'])
  @HttpCode(HttpStatus.CREATED)
  async createStudyPlan(
    @CurrentUser() user: AuthUserContext,
    @Body() dto: CreateStudyPlanDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.plannerService.createStudyPlan(userId, dto);
  }

  @Get(['me/study-plans/:id', 'api/v1/me/study-plans/:id'])
  async getStudyPlan(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.plannerService.getStudyPlan(userId, id);
  }

  @Post(['me/study-plans/:id/replan', 'api/v1/me/study-plans/:id/replan'])
  async replanStudyPlan(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body() dto: ReplanRequestDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.plannerService.replanMissedSessions(userId, id, dto);
  }

  @Get(['me/study-sessions/today', 'api/v1/me/study-sessions/today'])
  async getTodaySessions(
    @CurrentUser() user: AuthUserContext,
    @Query('timezone') timezone?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.plannerService.getTodayRecommendations(userId, timezone, asOfDate);
  }

  @Put(['me/study-sessions/:id/completion', 'api/v1/me/study-sessions/:id/completion'])
  async completeStudySession(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body() dto: CompleteSessionDto,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.plannerService.completeStudySession(userId, id, dto);
  }

  @Get(['me/study-plans/:id/reminders', 'api/v1/me/study-plans/:id/reminders'])
  async getPlanReminders(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
  ) {
    const userId = user?.userId ?? 'default-user-id';
    return this.plannerService.getPlanReminders(userId, id);
  }
}
