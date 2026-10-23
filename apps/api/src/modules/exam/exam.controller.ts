import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { validateMediaAccess } from '@jlpt/media-token';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { ExamService } from './exam.service.js';
import { AuthService } from '../auth/auth.service.js';
import { Optional } from '@nestjs/common';
import type { Level, ExamKind, Session } from '@jlpt/schema';
import { extractTokenFromRequest } from '../../common/guards/auth.guard.js';

@Controller()
@RateLimit({ limit: 1000, windowSec: 60, keyPrefix: 'exams' })
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    @Optional() private readonly authService?: AuthService,
  ) {}

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
  @Get([
    'exams/:id/v:version/snapshot.json',
    'exams/:id/:version/snapshot.json',
    'media/exams/:id/v:version/snapshot.json',
    'media/exams/:id/:version/snapshot.json',
  ])
  async getExamSnapshot(
    @Param('id') id: string,
    @Param('version') versionStr: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    let version = Number.parseInt((versionStr || '').replace(/^v/i, ''), 10);
    if (isNaN(version) || version <= 0) {
      const match = (req.url || '').match(/\/v?(\d+)\/snapshot\.json/);
      if (match && match[1]) {
        version = Number.parseInt(match[1], 10);
      }
    }
    if (isNaN(version) || version <= 0) {
      throw new BadRequestException('Phiên bản đề thi không hợp lệ');
    }

    const query = req.query as Record<string, string | undefined> | undefined;
    const token = query?.t || query?.token;

    if (token) {
      const secret =
        process.env.MEDIA_TOKEN_SECRET ||
        'staging_media_token_secret_for_reproducible_smoke_tests';
      const cleanPath = `exams/${id}/v${version}/snapshot.json`;
      let validation = await validateMediaAccess(token, secret, cleanPath);
      if (!validation.valid && !process.env.MEDIA_TOKEN_SECRET) {
        validation = await validateMediaAccess(token, 'test_media_token_secret_32_bytes_long_ok', cleanPath);
      }
      if (!validation.valid) {
        throw new ForbiddenException({
          code: 'FORBIDDEN_SNAPSHOT',
          message: `Token truy cập snapshot không hợp lệ hoặc đã hết hạn: ${validation.reason}`,
        });
      }
    } else {
      // If no media token, require valid authentication and staff role (admin/editor/reviewer)
      const authToken = extractTokenFromRequest(req);

      if (!authToken) {
        throw new ForbiddenException({
          code: 'TOKEN_REQUIRED',
          message: 'Yêu cầu token truy cập snapshot đề thi.',
        });
      }

      const sessionUser = this.authService
        ? await this.authService.getSession(authToken)
        : null;
      const staffRoles = ['admin', 'editor', 'reviewer'];
      if (!sessionUser || !staffRoles.includes(sessionUser.role)) {
        throw new ForbiddenException({
          code: 'FORBIDDEN_SNAPSHOT',
          message: 'Yêu cầu quyền nhân sự (admin/editor/reviewer) hoặc token truy cập hợp lệ để tải snapshot đề thi.',
        });
      }
    }

    const snapshot = await this.examService.getExamSnapshot(id, version);
    reply
      .status(200)
      .header('Content-Type', 'application/json')
      .header('Cache-Control', 'public, max-age=3600, immutable')
      .send(snapshot);
  }

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/exams')
  async listAdminExams(
    @Query('level') level?: Level,
    @Query('kind') kind?: ExamKind,
    @Query('status') status?: string,
  ) {
    return this.examService.listAdminExams({ level, kind, status });
  }

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/exams/:id')
  async getAdminExam(@Param('id') id: string) {
    return this.examService.getAdminExam(id);
  }

  /** Public snapshot of the exam as it stands now (draft included), without answers, for staff to review. */
  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/exams/:id/preview')
  async getAdminExamPreview(@Param('id') id: string) {
    return this.examService.getAdminExamPreview(id);
  }

  @Roles('admin', 'editor')
  @Post('admin/exams')
  async createAdminExam(
    @Body()
    body: {
      title: string;
      level: Level;
      kind: ExamKind;
      year?: number;
      session?: Session;
      description?: string;
      slug?: string;
    },
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const userId = user.userId || user.id || 'admin';
    return this.examService.createAdminExam(body, userId);
  }

  @Roles('admin', 'editor')
  @Patch('admin/exams/:id')
  async updateAdminExam(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      level?: Level;
      kind?: ExamKind;
      year?: number;
      session?: Session;
      description?: string;
    },
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const userId = user.userId || user.id || 'admin';
    return this.examService.updateAdminExam(id, body, userId);
  }

  @Roles('admin', 'editor')
  @Post('admin/exams/:id/validate')
  async validateAdminExam(@Param('id') id: string) {
    return this.examService.validateAdminExam(id);
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

  @Post('admin/exams/:id/approve-and-publish')
  @Roles('admin')
  async approveAndPublishExam(
    @Param('id') id: string,
    @CurrentUser() user: { id?: string; userId?: string; role?: string },
  ) {
    if (user.role && user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin được duyệt và xuất bản cả đề');
    }
    const userId = user.userId || user.id || '';
    return this.examService.approveAndPublishExam(id, userId);
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

  @Post('admin/exams/:id/delete')
  @Roles('admin')
  async deleteExam(
    @Param('id') id: string,
    @Body('confirmSlug') confirmSlug: string,
    @CurrentUser() user: { id?: string; userId?: string; role?: string },
  ) {
    if (user.role && user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin được xóa đề');
    }
    return this.examService.deleteExam(id, user.userId || user.id || '', confirmSlug);
  }
}

