export interface ReportQueryDto {
  from?: string;
  to?: string;
  level?: string;
  limit?: number;
}

export interface OperationalReportDto {
  kind: string;
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  metrics: Record<string, unknown>;
  sampleSize?: number;
  cohortMaturity?: string;
  dataMode?: 'observed' | 'synthetic';
}
