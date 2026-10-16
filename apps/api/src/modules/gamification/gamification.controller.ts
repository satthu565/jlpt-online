import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { GamificationService } from './gamification.service.js';
import type {
  AchievementDto,
  AchievementShareDto,
  ChallengeDto,
  ClassGamificationStatsDto,
  LeaderboardEntryDto,
  LeaderboardOptInDto,
  LeaderboardQueryDto,
  RecordStreakActivityDto,
  StreakResponseDto,
} from './gamification.types.js';

@Controller('api/v1')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  // ---------------------------------------------------------------------------
  // 1. Streak (GAME-01)
  // ---------------------------------------------------------------------------

  @Get('me/streak')
  async getMyStreak(
    @CurrentUser() user: AuthUserContext | undefined,
    @Query('timezone') timezone?: string,
  ): Promise<StreakResponseDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required for streak.');
    }
    return this.gamificationService.getStreak(user.userId, timezone);
  }

  @Post('me/streak/activity')
  async recordActivity(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() dto: RecordStreakActivityDto,
  ): Promise<StreakResponseDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.gamificationService.recordActivity(user.userId, dto);
  }

  // ---------------------------------------------------------------------------
  // 2. Achievements (GAME-02, GAME-03)
  // ---------------------------------------------------------------------------

  @Get('me/achievements')
  async getMyAchievements(
    @CurrentUser() user: AuthUserContext | undefined,
  ): Promise<AchievementDto[]> {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.gamificationService.getAchievements(user.userId);
  }

  @Post('me/achievement-shares')
  async shareAchievement(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: { achievementId: string },
  ): Promise<AchievementShareDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.gamificationService.shareAchievement(user.userId, body.achievementId);
  }

  // ---------------------------------------------------------------------------
  // 3. Challenges (GAME-05)
  // ---------------------------------------------------------------------------

  @Get('challenges')
  async listChallenges(
    @CurrentUser() user: AuthUserContext | undefined,
  ): Promise<ChallengeDto[]> {
    return this.gamificationService.listChallenges(user?.userId);
  }

  @Post('challenges/:id/join')
  async joinChallenge(
    @CurrentUser() user: AuthUserContext | undefined,
    @Param('id') challengeId: string,
  ): Promise<ChallengeDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.gamificationService.joinChallenge(user.userId, challengeId);
  }

  // ---------------------------------------------------------------------------
  // 4. Voluntary Separate Leaderboards (GAME-04)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('leaderboards')
  async getLeaderboard(
    @Query() query: LeaderboardQueryDto,
    @CurrentUser() user?: AuthUserContext,
  ): Promise<LeaderboardEntryDto[]> {
    return this.gamificationService.getLeaderboard(query, user?.userId);
  }

  @Patch('me/leaderboard-opt-in')
  async updateOptIn(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() dto: LeaderboardOptInDto,
  ): Promise<{ optIn: boolean }> {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    await this.gamificationService.setLeaderboardOptIn(user.userId, dto);
    return { optIn: dto.optIn };
  }

  // ---------------------------------------------------------------------------
  // 5. Class / Cohort Statistics (GAME-10)
  // ---------------------------------------------------------------------------

  @Get('classes/:id/gamification-stats')
  async getClassStats(
    @Param('id') classId: string,
  ): Promise<ClassGamificationStatsDto> {
    return this.gamificationService.getClassGamificationStats(classId);
  }
}
