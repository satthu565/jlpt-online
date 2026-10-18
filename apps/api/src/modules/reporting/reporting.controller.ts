import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { ReportingService } from './reporting.service.js';
import type { ReportQueryDto } from './reporting.types.js';

@Controller('admin')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @Roles('admin', 'editor', 'reviewer', 'moderator', 'billing_admin')
  async getDashboard(@CurrentUser() user?: AuthUserContext) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản nhân sự.',
      });
    }
    return this.reportingService.getDashboardOverview();
  }

  @Get('reports/:kind')
  @Roles('admin', 'editor', 'reviewer', 'moderator', 'billing_admin')
  async getReport(
    @Param('kind') kind: string,
    @Query() query: ReportQueryDto,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản nhân sự.',
      });
    }
    return this.reportingService.getReportByKind(kind, query);
  }

  @Get('reports/:kind/export')
  @Roles('admin', 'billing_admin')
  async exportReport(
    @Param('kind') kind: string,
    @Query() query: ReportQueryDto,
    @Res() reply: FastifyReply,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản nhân sự.',
      });
    }

    const csvContent = await this.reportingService.exportReportToCsv(kind, query);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename="report-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return reply.send(csvContent);
  }

  // --- Settings: Backup & Restore (ADM-20 / SYS-08) ---

  @Get('settings/backup/jobs')
  @Roles('admin')
  async getBackupJobs(@CurrentUser() user?: AuthUserContext) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.getBackupJobs();
  }

  @Post('settings/backup/jobs')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async triggerBackupJob(
    @Body() body: { jobType: string; configSnapshot?: Record<string, string> },
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.triggerBackupJob(body?.jobType, user, body?.configSnapshot);
  }
}
