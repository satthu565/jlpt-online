import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { ExamService } from './exam.service.js';
import type { Level, ExamKind, Session } from '@jlpt/schema';

@Controller()
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Get('exams')
  @Public()
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

  @Get('exams/:slug')
  @Public()
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
}
