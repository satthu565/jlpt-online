import {
  BadRequestException,
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
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { QuestionBankService } from './question-bank.service.js';
import type {
  CreateQuestionGroupDto,
  GroupSearchFilters,
  HideGroupDto,
  QuestionSearchFilters,
  ReviewDecisionDto,
  UpdateQuestionGroupDto,
} from './question-bank.types.js';

@Controller()
export class QuestionBankController {
  constructor(private readonly qbService: QuestionBankService) {}

  // ---------------------------------------------------------------------------
  // Admin Routes (Staff roles: admin, editor, reviewer)
  // ---------------------------------------------------------------------------

  @Roles('admin', 'editor')
  @Post('admin/groups')
  async createGroup(
    @Body() dto: CreateQuestionGroupDto,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.qbService.createGroup(dto, user?.userId || 'admin-author');
  }

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/groups')
  async listGroups(@Query() filters: GroupSearchFilters) {
    return { items: await this.qbService.searchGroups(filters) };
  }

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/groups/:id')
  async getGroup(@Param('id') id: string) {
    return this.qbService.getGroup(id);
  }

  @Roles('admin', 'editor')
  @Delete('admin/groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    await this.qbService.deleteGroup(id, user?.userId || 'admin');
  }

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/groups/:id/versions')
  async listGroupVersions(@Param('id') id: string) {
    return this.qbService.listGroupVersions(id);
  }

  @Roles('admin', 'editor')
  @Patch('admin/groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionGroupDto,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.qbService.updateGroup(id, dto, user?.userId || 'admin-editor');
  }

  @Roles('admin', 'editor')
  @Post('admin/groups/:id/submit-review')
  async submitForReview(
    @Param('id') id: string,
    @Body('expectedVersion') expectedVersion: number,
    @CurrentUser() user: AuthUserContext,
  ) {
    if (!expectedVersion) {
      throw new BadRequestException('Yêu cầu expectedVersion');
    }
    return this.qbService.submitForReview(id, expectedVersion, user?.userId || 'editor');
  }

  @Roles('admin', 'reviewer')
  @Post('admin/groups/:id/reviews')
  async reviewGroup(
    @Param('id') id: string,
    @Body() dto: ReviewDecisionDto,
    @CurrentUser() user: AuthUserContext,
  ) {
    if (!dto.expectedVersion) {
      throw new BadRequestException('Yêu cầu expectedVersion');
    }
    return this.qbService.reviewGroup(
      id,
      dto.expectedVersion,
      dto,
      user?.userId || 'reviewer',
    );
  }

  @Roles('admin', 'reviewer')
  @Post('admin/groups/:id/hide')
  async hideGroup(
    @Param('id') id: string,
    @Body() dto: HideGroupDto,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.qbService.hideGroup(id, dto, user?.userId || 'moderator');
  }

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/questions')
  async searchQuestions(@Query() filters: QuestionSearchFilters) {
    return this.qbService.searchQuestions(filters);
  }


  // ---------------------------------------------------------------------------
  // Public Route (Student preview: strictly no answer leaks)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('groups/:id/preview')
  async getPublicPreview(
    @Param('id') id: string,
    @Query('version') version?: string,
  ) {
    const versionNum = version ? parseInt(version, 10) : undefined;
    return this.qbService.getGroupPublicPreview(id, versionNum);
  }
}
