/**
 * Budgets and Evaluation Logic for JLPT Online Lighthouse Performance Gate
 * Task: D01
 * Scope:
 *  - Mobile: LCP < 3.3s (3300ms, simulated; see DEFAULT_BUDGETS), CLS < 0.1, TBT < 200ms, initial JS <= 200KB (gzip; chủ dự án duyệt nâng từ 150KB ngày 2026-10-20, từ 180KB ngày 2026-10-31),
 *            performance >= 70, accessibility >= 95, SEO = 100
 *  - Desktop: LCP < 2.0s (2000ms), CLS < 0.1, TBT < 150ms,
 *            performance >= 98, accessibility >= 95, SEO = 100
 */

import type { MetricBudget, PresetBudgets, PageMetrics, BudgetViolation, TargetRoute } from './types.ts';

export const DEFAULT_BUDGETS: PresetBudgets = {
  mobile: {
    // Lighthouse "simulate" counts every script requested before the LCP paint as blocking, so a
    // server-rendered text LCP on Next.js is estimated at 2.6-3.1 s while applied (devtools) throttling
    // measures 1.9 s (docs/release/DESIGN_PERF_REPORT.md). 3.3 s blocks regressions on the simulated scale.
    // Chủ dự án chọn ngưỡng này ngày 2026-10-21 (D05).
    lcpMs: 3300,
    cls: 0.1,
    tbtMs: 200,
    initialJsKb: 200,
    minPerformance: 70,
    minAccessibility: 95,
    minSeo: 100,
  },
  desktop: {
    lcpMs: 2000,
    cls: 0.1,
    tbtMs: 150,
    initialJsKb: 200,
    minPerformance: 98,
    minAccessibility: 95,
    minSeo: 100,
  },
};

/**
 * Chỉ số chỉ cảnh báo, không làm trượt CI khi budgetMode=error.
 * D05 đã bỏ LCP khỏi danh sách: mọi vi phạm ngân sách đều chặn CI khi budgetMode=error.
 */
export const WARN_ONLY_METRICS: ReadonlySet<string> = new Set<string>();

/** Vi phạm làm trượt CI khi budgetMode=error (không tính các chỉ số trong WARN_ONLY_METRICS). */
export function blockingViolations(violations: BudgetViolation[]): BudgetViolation[] {
  return violations.filter((v) => !WARN_ONLY_METRICS.has(v.metric));
}

/**
 * Evaluates measured metrics against the specified budget.
 * Returns an array of violations found.
 */
export function evaluateMetrics(
  metrics: PageMetrics,
  budget: MetricBudget,
  target: TargetRoute,
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];

  // LCP Check
  if (metrics.lcpMs > budget.lcpMs) {
    violations.push({
      targetId: target.id,
      targetName: target.name,
      url: metrics.url,
      formFactor: metrics.formFactor,
      metric: 'LCP',
      actual: metrics.lcpMs,
      expected: budget.lcpMs,
      operator: '<',
      message: `LCP ${metrics.lcpMs.toFixed(1)} ms exceeded budget ${budget.lcpMs} ms`,
    });
  }

  // CLS Check
  if (metrics.cls > budget.cls) {
    violations.push({
      targetId: target.id,
      targetName: target.name,
      url: metrics.url,
      formFactor: metrics.formFactor,
      metric: 'CLS',
      actual: metrics.cls,
      expected: budget.cls,
      operator: '<',
      message: `CLS ${metrics.cls.toFixed(3)} exceeded budget ${budget.cls}`,
    });
  }

  // TBT Check
  if (metrics.tbtMs > budget.tbtMs) {
    violations.push({
      targetId: target.id,
      targetName: target.name,
      url: metrics.url,
      formFactor: metrics.formFactor,
      metric: 'TBT',
      actual: metrics.tbtMs,
      expected: budget.tbtMs,
      operator: '<',
      message: `TBT ${metrics.tbtMs.toFixed(1)} ms exceeded budget ${budget.tbtMs} ms`,
    });
  }

  // Initial JS Size Check (if recorded and budgeted)
  if (budget.initialJsKb && metrics.initialJsKb && metrics.initialJsKb > budget.initialJsKb) {
    violations.push({
      targetId: target.id,
      targetName: target.name,
      url: metrics.url,
      formFactor: metrics.formFactor,
      metric: 'InitialJS',
      actual: metrics.initialJsKb,
      expected: budget.initialJsKb,
      operator: '<=',
      message: `Initial JS ${metrics.initialJsKb.toFixed(1)} KB exceeded budget ${budget.initialJsKb} KB`,
    });
  }

  // Performance Score Check (0-100)
  if (metrics.performance < budget.minPerformance) {
    violations.push({
      targetId: target.id,
      targetName: target.name,
      url: metrics.url,
      formFactor: metrics.formFactor,
      metric: 'PerformanceScore',
      actual: metrics.performance,
      expected: budget.minPerformance,
      operator: '>=',
      message: `Performance score ${metrics.performance} is below minimum requirement ${budget.minPerformance}`,
    });
  }

  // Accessibility Score Check (0-100)
  if (metrics.accessibility < budget.minAccessibility) {
    violations.push({
      targetId: target.id,
      targetName: target.name,
      url: metrics.url,
      formFactor: metrics.formFactor,
      metric: 'AccessibilityScore',
      actual: metrics.accessibility,
      expected: budget.minAccessibility,
      operator: '>=',
      message: `Accessibility score ${metrics.accessibility} is below minimum requirement ${budget.minAccessibility}`,
    });
  }

  // SEO Score Check (0-100)
  if (metrics.seo < budget.minSeo) {
    violations.push({
      targetId: target.id,
      targetName: target.name,
      url: metrics.url,
      formFactor: metrics.formFactor,
      metric: 'SEOScore',
      actual: metrics.seo,
      expected: budget.minSeo,
      operator: '>=',
      message: `SEO score ${metrics.seo} is below minimum requirement ${budget.minSeo}`,
    });
  }

  return violations;
}
