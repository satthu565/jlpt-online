import {
  Controller,
  Get,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { AuditService } from '../audit/audit.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly auditService: AuditService) {}

  @Get('audit-logs')
  @Roles('admin', 'editor', 'reviewer', 'billing_admin')
  async getAuditLogs(
    @CurrentUser() user: AuthUserContext,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('operatorId') operatorId?: string,
    @Query('targetResource') targetResource?: string,
    @Query('action') action?: string,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    const parsedLimit = limit ? Number.parseInt(limit, 10) : 20;

    return this.auditService.queryLogs({
      cursor,
      limit: parsedLimit,
      operatorId,
      targetResource,
      action,
    });
  }
}
