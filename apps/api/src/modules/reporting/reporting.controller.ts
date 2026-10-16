import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ReportingService } from './reporting.service.js';
import type { OperationalReportDto, ReportQueryDto } from './reporting.types.js';

@Controller('admin/reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get(':kind')
  @Roles('admin', 'billing_admin', 'reviewer', 'editor')
  async getReportByKind(
    @Param('kind') kind: string,
    @Query() query: ReportQueryDto,
  ): Promise<OperationalReportDto> {
    return this.reportingService.getReportByKind(kind, query);
  }
}
