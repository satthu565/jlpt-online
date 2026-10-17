export type ReportKind =
  | 'acquisition'
  | 'activity'
  | 'exam-completion'
  | 'abandonment'
  | 'levels'
  | 'exams'
  | 'session-duration'
  | 'retention'
  | 'funnel'
  | 'content-review'
  | 'content-incidents'
  | 'mix-usage'
  | 'conversion'
  | 'provider-costs'
  | 'experiments'
  | 'revenue'
  | 'corpus';

export interface ReportQueryDto {
  from?: string;
  to?: string;
  timezone?: string;
  level?: string;
  cohortMode?: string;
}

export interface AcquisitionReportDto {
  totalNewUsers: number;
  byPeriod: { period: string; count: number }[];
  byRole: Record<string, number>;
  byLocale: Record<string, number>;
}

export interface ActivityReportDto {
  dau: number;
  mau: number;
  dailyActiveUsers: { date: string; count: number }[];
}

export interface ExamCompletionReportDto {
  started: number;
  completed: number;
  inProgress: number;
  completionRate: number;
}

export interface AbandonmentReportDto {
  started: number;
  completed: number;
  abandoned: number;
  abandonmentRate: number;
}

export interface LevelStatItem {
  level: string;
  attempts: number;
  completed: number;
  avgScore: number;
  passRate: number;
}

export interface LevelsReportDto {
  levels: LevelStatItem[];
  totalAttempts: number;
}

export interface PopularExamItem {
  examId: string;
  title: string;
  level: string;
  attempts: number;
  completions: number;
  avgScore: number;
  passRate: number;
}

export interface PopularExamsReportDto {
  popularExams: PopularExamItem[];
  totalExamsEvaluated: number;
}

export interface SessionDurationReportDto {
  avgDurationSeconds: number;
  medianDurationSeconds: number;
  distribution: { range: string; count: number; percentage: number }[];
  totalSessions: number;
}

export interface CohortRetentionItem {
  cohortDate: string;
  cohortSize: number;
  daysSinceCohort: number;
  d7Status: 'sufficient' | 'insufficient_data';
  d7Rate: number | null;
  d30Status: 'sufficient' | 'insufficient_data';
  d30Rate: number | null;
}

export interface RetentionReportDto {
  dataStatus: 'sufficient' | 'insufficient_data';
  cohorts: CohortRetentionItem[];
  summaryD7: number | null;
  summaryD30: number | null;
  message: string;
}

export interface FunnelStepDto {
  step: string;
  name: string;
  users: number;
  conversionFromPrevious: number;
  overallConversion: number;
}

export interface FunnelReportDto {
  steps: FunnelStepDto[];
  overallConversionRate: number;
}

export interface ContentReviewReportDto {
  totalPackages: number;
  byStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  recentJobs: {
    id: string;
    status: string;
    source: string;
    totalQuestions: number;
    createdAt: string;
  }[];
}

export interface ContentIncidentsReportDto {
  totalIncidents: number;
  questionReportsCount: number;
  audioIncidentsCount: number;
  importValidationWarnings: number;
  byIssueType: Record<string, number>;
  notes: string;
}

export interface MixUsageReportDto {
  totalMixedExams: number;
  byLevel: Record<string, number>;
  byMode: Record<string, number>;
  avgQuestionCount: number;
}

export interface ConversionReportDto {
  totalFreeUsers: number;
  paidUsers: number;
  conversionRate: number;
  totalOrders: number;
  grossRevenueMinor: number;
  netRevenueMinor: number;
  currency: string;
  arpuMinor: number;
}

export interface ProviderCostsReportDto {
  aiRequestsCount: number;
  aiTokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedAiCostUsd: number;
  estimatedAiCostVnd: number;
  storageAssetsCount: number;
  storageSizeMb: number;
  estimatedStorageCostVnd: number;
  totalEstimatedCostVnd: number;
}

export interface ExperimentVariantStat {
  variant: string;
  exposures: number;
  conversions: number;
  conversionRate: number;
}

export interface ExperimentStatItem {
  experimentId: string;
  name: string;
  isActive: boolean;
  variants: ExperimentVariantStat[];
  hasStatisticalSignificance: boolean;
  sampleSize: number;
  minSampleSize: number;
}

export interface ExperimentPerformanceReportDto {
  experiments: ExperimentStatItem[];
}

export interface DashboardOverviewDto {
  totalUsers: number;
  activeUsers30d: number;
  totalExams: number;
  totalAttempts: number;
  overallCompletionRate: number;
  openReportsCount: number;
  grossRevenueVnd: number;
  recentActivities: {
    id: string;
    type: 'attempt' | 'order' | 'report' | 'import';
    title: string;
    timestamp: string;
  }[];
}

export interface CorpusLevelAggregate {
  level: string;
  vocabCount: number;
  grammarCount: number;
  kanjiCount: number;
}

export interface CorpusReportDto {
  totalDatasets: number;
  totalDocuments: number;
  totalVocabOccurrences: number;
  totalGrammarOccurrences: number;
  totalKanjiOccurrences: number;
  levelAggregates: CorpusLevelAggregate[];
  lastCalculatedAt: string | null;
  corpusHealthStatus: 'healthy' | 'empty';
}

