import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { ExamService } from './exam.service.js';
import type { Level, ExamKind, Session } from '@jlpt/schema';

@Controller()
@RateLimit({ limit: 1000, windowSec: 60, keyPrefix: 'exams' })
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Public()
  @Get('exams')
  async listExams(
    @Query('level') level?: Level,
    @Query('year') year?: string,
    @Query('session') session?: Session,
    @Query('kind') kind?: ExamKind,
  ) {
    const parsedYear = year ? Number.parseInt(year, 10) : undefined;
    return this.examService.listExams({
      level,
      year: parsedYear,
      session,
      kind,
    });
  }

  @Public()
  @Get('exams/:slug')
  async getExamBySlug(@Param('slug') slug: string) {
    return this.examService.getExamBySlug(slug);
  }

  @Get('me/exam-status')
  async getMyExamStatus(
    @CurrentUser() user: AuthUserContext,
    @Query('level') level?: Level,
  ) {
    return this.examService.getUserExamStatus(user.userId, level);
  }

  @Post('admin/exams/:id/publish')
  @Roles('admin')
  async publishExam(
    @Param('id') id: string,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const userId = user.userId || user.id || '';
    try {
      return await this.examService.publishExam(id, userId);
    } catch (err) {
      console.error(`[ExamController.publishExam] Lỗi xuất bản đề thi ${id} bởi ${userId}:`, err);
      throw err;
    }
  }

  @Post('admin/exams/:id/unpublish')
  @Roles('admin')
  async unpublishExam(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const userId = user.userId || user.id || '';
    try {
      return await this.examService.unpublishExam(id, userId, reason);
    } catch (err) {
      console.error(`[ExamController.unpublishExam] Lỗi gỡ xuất bản đề thi ${id} bởi ${userId}:`, err);
      throw err;
    }
  }
}
