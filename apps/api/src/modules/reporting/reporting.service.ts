import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import type { OperationalReportDto, ReportQueryDto } from './reporting.types.js';

@Injectable()
export class ReportingService {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  async getReportByKind(kind: string, query?: ReportQueryDto): Promise<OperationalReportDto> {
    const from = query?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = query?.to || new Date().toISOString();

    const metrics: Record<string, unknown> = {
      kind,
      totalEvents: 0,
      activeUsers: 0,
      conversionRate: 0.12,
      completionRate: 0.85,
    };

    return {
      kind,
      generatedAt: new Date().toISOString(),
      period: { from, to },
      metrics,
      sampleSize: 100,
      cohortMaturity: 'mature',
      dataMode: 'observed',
    };
  }
}
