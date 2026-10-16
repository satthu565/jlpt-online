import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ExamService } from './exam.service.js';
import type { ExamFilterQuery } from './exam.types.js';

@Controller('api/v1')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Public()
  @Get('exams')
  async listPublicExams(@Query() query: ExamFilterQuery) {
    return { items: await this.examService.listPublicExams(query) };
  }

  @Public()
  @Get('exams/:slug')
  async getPublicExamBySlug(@Param('slug') slug: string) {
    return this.examService.getPublicExamBySlug(slug);
  }

  @Post('admin/exams/:id/publish')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  async publishExam(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.examService.publishExam(id, user.id);
  }

  @Post('admin/exams/:id/unpublish')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  async unpublishExam(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.examService.unpublishExam(id, user.id, reason);
  }
}
