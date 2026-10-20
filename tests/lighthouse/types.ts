/**
 * Types and interfaces for JLPT Online Lighthouse Performance Gate
 * Task: D01
 */

export type FormFactor = 'mobile' | 'desktop';
export type BudgetMode = 'warn' | 'error';

export interface TargetRoute {
  id: string;
  name: string;
  app: 'web' | 'admin';
  path: string;
}

export interface MetricBudget {
  lcpMs: number;
  cls: number;
  tbtMs: number;
  initialJsKb?: number;
  minPerformance: number;
  minAccessibility: number;
  minSeo: number;
}

export interface PresetBudgets {
  mobile: MetricBudget;
  desktop: MetricBudget;
}

export interface PageMetrics {
  url: string;
  formFactor: FormFactor;
  performance: number;
  accessibility: number;
  seo: number;
  lcpMs: number;
  cls: number;
  tbtMs: number;
  initialJsKb?: number;
  reportHtmlPath?: string;
  reportJsonPath?: string;
}

export interface BudgetViolation {
  targetId: string;
  targetName: string;
  url: string;
  formFactor: FormFactor;
  metric: string;
  actual: number;
  expected: number;
  operator: '<' | '<=' | '>=' | '>';
  message: string;
}

export interface RouteAuditResult {
  target: TargetRoute;
  formFactor: FormFactor;
  url: string;
  metrics: PageMetrics;
  violations: BudgetViolation[];
  passed: boolean;
  htmlReportFile?: string;
  jsonReportFile?: string;
}

export interface LighthouseAuditSummary {
  timestamp: string;
  commitSha: string;
  environment: string;
  budgetMode: BudgetMode;
  totalAudits: number;
  passedAudits: number;
  failedAudits: number;
  violationsCount: number;
  /** Vi phạm làm trượt CI (không tính chỉ số chỉ cảnh báo, xem WARN_ONLY_METRICS). */
  blockingViolationsCount: number;
  results: RouteAuditResult[];
  violations: BudgetViolation[];
}

export interface BaselineRouteMetrics {
  url: string;
  path: string;
  app: 'web' | 'admin';
  mobile: {
    performance: number;
    accessibility: number;
    seo: number;
    lcpMs: number;
    cls: number;
    tbtMs: number;
    initialJsKb?: number;
    budgetPassed: boolean;
  };
  desktop: {
    performance: number;
    accessibility: number;
    seo: number;
    lcpMs: number;
    cls: number;
    tbtMs: number;
    initialJsKb?: number;
    budgetPassed: boolean;
  };
}

export interface PerformanceBaseline {
  $schema?: string;
  commitSha: string;
  recordedAt: string;
  environment: string;
  disclaimer: string;
  budgetMode: BudgetMode;
  budgetEnforcedIn: string;
  budgets: PresetBudgets;
  routes: Record<string, BaselineRouteMetrics>;
}
