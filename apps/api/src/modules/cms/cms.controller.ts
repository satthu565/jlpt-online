import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CmsService } from './cms.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import type {
  CreateExamInput,
  CreateGroupInput,
  UpdateExamInput,
  UpdateGroupInput,
} from './cms.types.js';
import type { Blueprint } from '@jlpt/schema';

@Controller('admin')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // -------------------------------------------------------------------------
  // Question Groups
  // -------------------------------------------------------------------------

  @Post('groups')
  @Roles('editor', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createGroup(
    @Body() body: CreateGroupInput,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.cmsService.createQuestionGroup(body, user.userId);
  }

  @Patch('groups/:id')
  @Roles('editor', 'admin')
  async updateGroup(
    @Param('id') id: string,
    @Body() body: UpdateGroupInput,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.cmsService.updateQuestionGroup(id, body, user.userId);
  }

  @Post('groups/:id/reviews')
  @Roles('reviewer', 'admin')
  async reviewGroup(
    @Param('id') id: string,
    @Body() body: { decision: 'approved' | 'rejected'; comments?: string },
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.cmsService.reviewQuestionGroup(id, body.decision, body.comments, user.userId);
  }

  // -------------------------------------------------------------------------
  // Blueprints
  // -------------------------------------------------------------------------

  @Post('blueprints')
  @Roles('editor', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createBlueprint(
    @Body() body: Blueprint,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.cmsService.createBlueprint(body, user.userId);
  }

  @Post('blueprints/:id/versions')
  @Roles('editor', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createBlueprintVersion(
    @Param('id') id: string,
    @Body() body: Partial<Blueprint>,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.cmsService.createBlueprintVersion(id, body, user.userId);
  }

  @Post('blueprints/:id/activate')
  @Roles('admin')
  async activateBlueprint(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.cmsService.activateBlueprint(id, {
      confirmedBy: user.userId,
      notes: body?.notes,
    });
  }

  // -------------------------------------------------------------------------
  // Exams
  // -------------------------------------------------------------------------

  @Post('exams')
  @Roles('editor', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createExam(
    @Body() body: CreateExamInput,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.cmsService.createExam(body, user.userId);
  }

  @Patch('exams/:id')
  @Roles('editor', 'admin')
  async updateExam(
    @Param('id') id: string,
    @Body() body: UpdateExamInput,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.cmsService.updateExam(id, body, user.userId);
  }

  @Post('exams/:id/publish')
  @Roles('admin')
  async publishExam(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.cmsService.publishExam(id, user.userId);
  }
}
