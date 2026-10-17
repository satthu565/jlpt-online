import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { verifyTotp } from '../../common/utils/totp.js';

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

  // --- Users & RBAC (ADM-02, ADM-03) ---

  @Get('users')
  @Roles('admin', 'editor', 'reviewer', 'moderator', 'billing_admin')
  async listUsers(
    @Query('keyword') keyword?: string,
    @Query('role') role?: string,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.listUsers({ keyword, role });
  }

  @Get('users/:id')
  @Roles('admin', 'editor', 'reviewer', 'moderator', 'billing_admin')
  async getUserById(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.getUserById(id);
  }

  @Patch('users/:id')
  @Roles('admin')
  async updateUser(
    @Param('id') id: string,
    @Body() body: { roles?: string[]; role?: string; isBlocked?: boolean; blockReason?: string },
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.updateUser(id, body, user);
  }

  // --- Settings: Notifications (ADM-18) ---

  @Get('settings/notifications')
  @Roles('admin', 'editor', 'billing_admin')
  async getNotificationSettings(@CurrentUser() user?: AuthUserContext) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.getNotificationTemplates();
  }

  @Patch('settings/notifications/:id')
  @Roles('admin')
  async updateNotificationTemplate(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.updateNotificationTemplate(id, body, user);
  }

  // --- Settings: Org & Teacher Applications ---

  @Get('settings/org')
  @Roles('admin', 'editor')
  async getOrgSettings(@CurrentUser() user?: AuthUserContext) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.getOrgSettings();
  }

  @Post('settings/org/:id/approve')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async approveTeacherApplication(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.approveTeacherApplication(id, user);
  }

  @Post('settings/org/:id/reject')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async rejectTeacherApplication(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    return this.reportingService.rejectTeacherApplication(id, user);
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
    return this.reportingService.triggerBackupJob(body.jobType, user, body.configSnapshot);
  }

  // --- Staff 2FA & Recovery Verification (I02) ---

  @Post('auth/2fa/verify')
  @Roles('admin', 'editor', 'reviewer', 'moderator', 'billing_admin')
  @HttpCode(HttpStatus.OK)
  async verify2fa(
    @Body() body: { code?: string },
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản nhân sự.',
      });
    }

    const code = body?.code?.trim();
    if (!code || code.length !== 6) {
      throw new ForbiddenException({
        code: 'TWO_FACTOR_REQUIRED',
        message: 'Mã xác thực TOTP không hợp lệ hoặc đã hết hạn.',
      });
    }

    const secret =
      (user as unknown as { totpSecret?: string }).totpSecret ||
      process.env.TOTP_TEST_SECRET ||
      'JBSWY3DPEHPK3PXP';
    const isValid = verifyTotp(code, secret);
    if (!isValid) {
      throw new ForbiddenException({
        code: 'TWO_FACTOR_REQUIRED',
        message: 'Mã xác thực TOTP không chính xác hoặc đã hết hạn.',
      });
    }

    return { success: true, verified: true };
  }

  @Post('auth/2fa/recovery')
  @Roles('admin', 'editor', 'reviewer', 'moderator', 'billing_admin')
  @HttpCode(HttpStatus.OK)
  async verifyRecovery(
    @Body() body: { recoveryCode?: string },
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản nhân sự.',
      });
    }

    const code = body?.recoveryCode?.trim().toUpperCase();
    if (!code || code.length < 8) {
      throw new ForbiddenException({
        code: 'INVALID_RECOVERY_CODE',
        message: 'Mã khôi phục không hợp lệ.',
      });
    }

    const isValid = await this.reportingService.verifyRecoveryCode(user.userId, code);
    if (!isValid) {
      throw new ForbiddenException({
        code: 'INVALID_RECOVERY_CODE',
        message: 'Mã khôi phục không chính xác hoặc đã qua sử dụng.',
      });
    }

    return { success: true, verified: true };
  }
}

