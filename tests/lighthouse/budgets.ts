/**
 * Budgets and Evaluation Logic for JLPT Online Lighthouse Performance Gate
 * Task: D01
 * Scope:
 *  - Mobile: LCP < 2.5s (2500ms), CLS < 0.1, TBT < 200ms, initial JS <= 150KB (gzip),
 *            performance >= 70, accessibility >= 95, SEO = 100
 *  - Desktop: LCP < 2.0s (2000ms), CLS < 0.1, TBT < 150ms,
 *            performance >= 98, accessibility >= 95, SEO = 100
 */

import type { MetricBudget, PresetBudgets, PageMetrics, BudgetViolation, TargetRoute } from './types.ts';

export const DEFAULT_BUDGETS: PresetBudgets = {
  mobile: {
    lcpMs: 2500,
    cls: 0.1,
    tbtMs: 200,
    initialJsKb: 150,
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
