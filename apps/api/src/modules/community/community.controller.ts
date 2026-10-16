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
} from '@nestjs/common';
import { CommunityService } from './community.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import type {
  PostDiscussionCommentDto,
  ReportCommentDto,
  ResolveCommunityReportDto,
  ShareAchievementDto,
} from './community.types.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller()
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ---------------------------------------------------------------------------
  // GAME-07: Chia sẻ thành tích cá nhân
  // ---------------------------------------------------------------------------

  @Post('me/achievement-shares')
  @HttpCode(HttpStatus.OK)
  async shareAchievement(
    @CurrentUser() user: AuthUserContext,
    @Body() body: ShareAchievementDto,
  ) {
    return this.communityService.shareAchievement(user.userId, body);
  }

  // ---------------------------------------------------------------------------
  // GAME-08: Thảo luận về câu hỏi sau khi hoàn thành bài
  // ---------------------------------------------------------------------------

  @Get('questions/:id/discussions')
  async listQuestionDiscussions(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.communityService.listQuestionDiscussions(id, user);
  }

  @Post('questions/:id/discussions')
  @HttpCode(HttpStatus.CREATED)
  async postQuestionComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
    @Body() body: PostDiscussionCommentDto,
  ) {
    return this.communityService.postQuestionComment(id, user, body);
  }

  // ---------------------------------------------------------------------------
  // GAME-09: Báo cáo vi phạm và kiểm duyệt bình luận
  // ---------------------------------------------------------------------------

  @Post('comments/:id/reports')
  @HttpCode(HttpStatus.OK)
  async reportComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
    @Body() body: ReportCommentDto,
  ) {
    return this.communityService.reportComment(id, user, body);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.communityService.deleteComment(id, user);
  }

  @Roles('admin', 'moderator')
  @Get('admin/community-reports')
  async adminListCommunityReports(@CurrentUser() user: AuthUserContext) {
    return this.communityService.adminListCommunityReports(user);
  }

  @Roles('admin', 'moderator')
  @Patch('admin/community-reports/:id')
  async adminResolveCommunityReport(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
    @Body() body: ResolveCommunityReportDto,
  ) {
    return this.communityService.adminResolveCommunityReport(id, user, body);
  }
}
