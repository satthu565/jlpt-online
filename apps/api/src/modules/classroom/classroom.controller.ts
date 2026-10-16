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
import { ClassroomService } from './classroom.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import type {
  CreateClassAssignmentDto,
  CreateClassDto,
  CreateClassInvitationDto,
  CreateOrganizationDto,
  CreateSupplementDto,
  ExportClassGradesDto,
  TeacherApplicationDto,
  UpdateOrganizationDto,
} from './classroom.types.js';

@Controller()
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  // ---------------------------------------------------------------------------
  // Teacher Onboarding & Organizations (TEA-01, TEA-12, TEA-13)
  // ---------------------------------------------------------------------------

  @Post('teacher-applications')
  @HttpCode(HttpStatus.OK)
  async submitTeacherApplication(
    @CurrentUser() user: AuthUserContext,
    @Body() body: TeacherApplicationDto,
  ) {
    return this.classroomService.submitTeacherApplication(user.userId, body);
  }

  @Get('organizations')
  async listOrganizations(@CurrentUser() user: AuthUserContext) {
    return this.classroomService.listOrganizations(user);
  }

  @Post('organizations')
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @CurrentUser() user: AuthUserContext,
    @Body() body: CreateOrganizationDto,
  ) {
    return this.classroomService.createOrganization(user.userId, body);
  }

  @Get('organizations/:id')
  async getOrganization(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.classroomService.getOrganization(id, user);
  }

  @Patch('organizations/:id')
  async updateOrganization(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
    @Body() body: UpdateOrganizationDto,
  ) {
    return this.classroomService.updateOrganization(id, user, body);
  }

  // ---------------------------------------------------------------------------
  // Classes & Members (TEA-02, TEA-03, TEA-07, TEA-12, TEA-13)
  // ---------------------------------------------------------------------------

  @Get('organizations/:id/classes')
  async listOrganizationClasses(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.classroomService.listOrganizationClasses(id, user);
  }

  @Post('organizations/:id/classes')
  @HttpCode(HttpStatus.CREATED)
  async createClass(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
    @Body() body: CreateClassDto,
  ) {
    return this.classroomService.createClass(id, user, body);
  }

  @Post('classes/:id/invitations')
  @HttpCode(HttpStatus.CREATED)
  async createClassInvitation(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
    @Body() body: CreateClassInvitationDto,
  ) {
    return this.classroomService.createClassInvitation(id, user, body);
  }

  @Post('class-invitations/:token/join')
  @HttpCode(HttpStatus.OK)
  async joinClassByInvitation(
    @Param('token') token: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.classroomService.joinClassByInvitation(token, user);
  }

  @Get('classes/:id/members')
  async listClassMembers(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.classroomService.listClassMembers(id, user);
  }

  @Delete('classes/:id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeClassMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    await this.classroomService.removeClassMember(id, targetUserId, user);
  }

  // ---------------------------------------------------------------------------
  // Assignments, Submissions & Analytics (TEA-04..11)
  // ---------------------------------------------------------------------------

  @Post('classes/:id/assignments')
  @HttpCode(HttpStatus.CREATED)
  async createClassAssignment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
    @Body() body: CreateClassAssignmentDto,
  ) {
    return this.classroomService.createClassAssignment(id, user, body);
  }

  @Get('assignments/:id')
  async getAssignment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.classroomService.getAssignment(id, user);
  }

  @Get('assignments/:id/submissions')
  async listAssignmentSubmissions(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.classroomService.listAssignmentSubmissions(id, user);
  }

  @Get('assignments/:id/analytics')
  async getAssignmentAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.classroomService.getAssignmentAnalytics(id, user);
  }

  @Post('assignments/:id/supplements')
  @HttpCode(HttpStatus.CREATED)
  async createSupplementAssignment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
    @Body() body: CreateSupplementDto,
  ) {
    return this.classroomService.createSupplementAssignment(id, user, body);
  }

  @Post('classes/:id/grade-exports')
  @HttpCode(HttpStatus.OK)
  async exportClassGrades(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
    @Body() body: ExportClassGradesDto,
  ) {
    return this.classroomService.exportClassGrades(id, user, body);
  }
}
