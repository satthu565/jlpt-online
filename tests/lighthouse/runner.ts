#!/usr/bin/env node
/**
 * JLPT Online - Staging CI Lighthouse Performance Gate Runner
 * Task: D01
 * Checks: pnpm test:lighthouse -- --list
 * Budgets:
 *   - Mobile: LCP < 2,5 s, CLS < 0,1, TBT < 200 ms, initial JS <= 150 KB gzip,
 *             perf >= 70, a11y >= 95, seo = 100
 *   - Desktop: perf >= 98, a11y >= 95, seo = 100, LCP < 2,0 s, CLS < 0,1, TBT < 150 ms
 * Modes:
 *   - "warn" (default in D01): warns on budget violations, exits 0
 *   - "error" (enforced in D04, or via --enforce / LIGHTHOUSE_ENFORCE_BUDGET=1): fails with exit 1
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import process from 'node:process';
import { TARGET_ROUTES, getBaseUrls, resolveTargetUrl } from './targets.ts';
import { DEFAULT_BUDGETS, evaluateMetrics } from './budgets.ts';
import type {
  FormFactor,
  BudgetMode,
  PageMetrics,
  RouteAuditResult,
  LighthouseAuditSummary,
  BudgetViolation,
} from './types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, '../../');
export const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, 'docs/release/lighthouse');
export const DEFAULT_BASELINE_FILE = path.join(REPO_ROOT, 'docs/release/performance-baseline.json');

export interface RunnerOptions {
  listOnly?: boolean;
  budgetMode?: BudgetMode;
  mock?: boolean;
  mockFailing?: boolean;
  presetFilter?: FormFactor | 'all';
  routeFilter?: string;
  outputDir?: string;
  baselineFile?: string;
  webUrl?: string;
  adminUrl?: string;
}

export function parseCliArgs(args: string[]): RunnerOptions {
  const filtered = args.filter((a) => a !== '--');
  const options: RunnerOptions = {
    listOnly: false,
    budgetMode: 'warn',
    mock: false,
    presetFilter: 'all',
    outputDir: DEFAULT_OUTPUT_DIR,
    baselineFile: DEFAULT_BASELINE_FILE,
  };

  // Determine budget mode from environment
  if (
    process.env.LIGHTHOUSE_ENFORCE_BUDGET === '1' ||
    process.env.LIGHTHOUSE_ENFORCE_BUDGET === 'true' ||
    process.env.LIGHTHOUSE_BUDGET_MODE === 'error' ||
    process.env.LIGHTHOUSE_BUDGET_MODE === 'enforce'
  ) {
    options.budgetMode = 'error';
  }

  if (
    process.env.LIGHTHOUSE_MOCK_FAILING === '1' ||
    process.env.LIGHTHOUSE_MOCK_FAILING === 'true'
  ) {
    options.mock = true;
    options.mockFailing = true;
  }

  for (const arg of filtered) {
    if (arg === '--list' || arg === '-l') {
      options.listOnly = true;
    } else if (arg === '--enforce' || arg === '--strict' || arg === '--fail-on-budget') {
      options.budgetMode = 'error';
    } else if (arg === '--warn' || arg === '--no-enforce') {
      options.budgetMode = 'warn';
    } else if (arg === '--mock' || arg === '--dry-run') {
      options.mock = true;
    } else if (arg === '--mock-failing') {
      options.mock = true;
      options.mockFailing = true;
    } else if (arg.startsWith('--preset=')) {
      const p = arg.split('=')[1]?.toLowerCase();
      if (p === 'mobile' || p === 'desktop' || p === 'all') {
        options.presetFilter = p as FormFactor | 'all';
      }
    } else if (arg.startsWith('--route=')) {
      options.routeFilter = arg.split('=')[1];
    } else if (arg.startsWith('--output-dir=')) {
      options.outputDir = path.resolve(REPO_ROOT, arg.split('=')[1]!);
    } else if (arg.startsWith('--web-url=')) {
      options.webUrl = arg.split('=')[1];
    } else if (arg.startsWith('--admin-url=')) {
      options.adminUrl = arg.split('=')[1];
    }
  }

  return options;
}

export function printTargetsList(options?: RunnerOptions): void {
  const baseUrls = getBaseUrls();
  const mode = options?.budgetMode || (
    process.env.LIGHTHOUSE_ENFORCE_BUDGET === '1' || process.env.LIGHTHOUSE_BUDGET_MODE === 'error'
      ? 'error (enforce / blocking)'
      : 'warn (cảnh báo ban đầu, D04 chuyển thành chặn)'
  );

  console.log('================================================================================');
  console.log(' JLPT ONLINE - LIGHTHOUSE CI PERFORMANCE AUDIT TARGETS & BUDGETS');
  console.log('================================================================================');
  console.log(`Web Base URL:   ${options?.webUrl || baseUrls.webUrl}`);
  console.log(`Admin Base URL: ${options?.adminUrl || baseUrls.adminUrl}`);
  console.log(`Budget Mode:    ${mode}`);
  console.log('--------------------------------------------------------------------------------');
  console.log('TARGET ROUTES:');

  for (const t of TARGET_ROUTES) {
    const url = resolveTargetUrl(t, { webUrl: options?.webUrl, adminUrl: options?.adminUrl });
    console.log(`  • [${t.app.toUpperCase()}] ${t.name.padEnd(42)} -> ${url}`);
  }

  console.log('--------------------------------------------------------------------------------');
  console.log('PRESETS & PERFORMANCE BUDGETS:');
  console.log('  1. Preset Mobile:');
  console.log(`     - LCP (Largest Contentful Paint): < ${DEFAULT_BUDGETS.mobile.lcpMs} ms (2,5 s)`);
  console.log(`     - CLS (Cumulative Layout Shift):  < ${DEFAULT_BUDGETS.mobile.cls}`);
  console.log(`     - TBT (Total Blocking Time):      < ${DEFAULT_BUDGETS.mobile.tbtMs} ms`);
  console.log(`     - Initial JS size (per page):     <= ${DEFAULT_BUDGETS.mobile.initialJsKb} KB (gzip ceiling)`);
  console.log(`     - Minimum Performance score:      >= ${DEFAULT_BUDGETS.mobile.minPerformance}`);
  console.log(`     - Minimum Accessibility score:    >= ${DEFAULT_BUDGETS.mobile.minAccessibility}`);
  console.log(`     - Minimum SEO score:              = ${DEFAULT_BUDGETS.mobile.minSeo}`);
  console.log('  2. Preset Desktop:');
  console.log(`     - Performance score:              >= ${DEFAULT_BUDGETS.desktop.minPerformance}`);
  console.log(`     - Accessibility score:            >= ${DEFAULT_BUDGETS.desktop.minAccessibility}`);
  console.log(`     - SEO score:                      = ${DEFAULT_BUDGETS.desktop.minSeo}`);
  console.log(`     - LCP:                            < ${DEFAULT_BUDGETS.desktop.lcpMs} ms (2,0 s)`);
  console.log(`     - CLS:                            < ${DEFAULT_BUDGETS.desktop.cls}`);
  console.log(`     - TBT:                            < ${DEFAULT_BUDGETS.desktop.tbtMs} ms`);
  console.log('================================================================================');
}

async function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function findFreePort(start = 9333): Promise<number> {
  for (let port = start; port < start + 50; port++) {
    const inUse = await isPortOpen(port);
    if (!inUse) return port;
  }
  return start;
}

export async function runLighthouseAudit(options: RunnerOptions = {}): Promise<LighthouseAuditSummary> {
  const baseUrls = {
    webUrl: options.webUrl || getBaseUrls().webUrl,
    adminUrl: options.adminUrl || getBaseUrls().adminUrl,
  };

  const outputDir = options.outputDir || DEFAULT_OUTPUT_DIR;
  fs.mkdirSync(outputDir, { recursive: true });

  const presets: FormFactor[] =
    options.presetFilter === 'mobile'
      ? ['mobile']
      : options.presetFilter === 'desktop'
      ? ['desktop']
      : ['mobile', 'desktop'];

  let targets = TARGET_ROUTES;
  if (options.routeFilter) {
    targets = targets.filter(
      (t) => t.path === options.routeFilter || t.id === options.routeFilter,
    );
  }

  const results: RouteAuditResult[] = [];
  const allViolations: BudgetViolation[] = [];

  // If mock mode requested, generate synthetic baseline results
  if (options.mock) {
    for (const target of targets) {
      for (const preset of presets) {
        const url = resolveTargetUrl(target, baseUrls);
        const isMobile = preset === 'mobile';
        const budget = isMobile ? DEFAULT_BUDGETS.mobile : DEFAULT_BUDGETS.desktop;

        // Baseline numbers within realistic staging targets (or synthetic violations if mockFailing)
        const metrics: PageMetrics = options.mockFailing
          ? {
              url,
              formFactor: preset,
              performance: 65, // Below mobile 70 / desktop 98
              accessibility: 90, // Below 95
              seo: 90, // Below 100
              lcpMs: 3400, // Exceeds mobile 2500ms / desktop 2000ms
              cls: 0.18, // Exceeds 0.1
              tbtMs: 450, // Exceeds mobile 200ms / desktop 150ms
              initialJsKb: 180, // Exceeds 150KB
            }
          : {
              url,
              formFactor: preset,
              performance: isMobile ? 82 : 99,
              accessibility: isMobile ? 96 : 98,
              seo: 100,
              lcpMs: isMobile ? 2180 : 850,
              cls: isMobile ? 0.04 : 0.01,
              tbtMs: isMobile ? 160 : 45,
              initialJsKb: isMobile ? 138 : 138,
            };

        const violations = evaluateMetrics(metrics, budget, target);
        allViolations.push(...violations);

        const slug = `${preset}_${target.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const htmlReportFile = path.join(outputDir, `${slug}.html`);
        const jsonReportFile = path.join(outputDir, `${slug}.json`);

        fs.writeFileSync(
          htmlReportFile,
          `<!DOCTYPE html><html><head><title>Lighthouse Report - ${target.name} (${preset})</title></head><body><h1>${target.name} - ${preset}</h1><pre>${JSON.stringify(metrics, null, 2)}</pre></body></html>`,
          'utf8',
        );
        fs.writeFileSync(jsonReportFile, JSON.stringify(metrics, null, 2), 'utf8');

        results.push({
          target,
          formFactor: preset,
          url,
          metrics,
          violations,
          passed: violations.length === 0,
          htmlReportFile,
          jsonReportFile,
        });
      }
    }
  } else {
    // Real Chrome + Lighthouse execution
    const { chromium } = await import('@playwright/test');
    const lighthouseModule = await import('lighthouse');
    const lighthouse = lighthouseModule.default || lighthouseModule;

    const chromeExecutable = chromium.executablePath();
    const cdpPort = await findFreePort(9444);

    const browser = await chromium.launch({
      executablePath: chromeExecutable,
      args: [
        `--remote-debugging-port=${cdpPort}`,
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      for (const target of targets) {
        for (const preset of presets) {
          const url = resolveTargetUrl(target, baseUrls);
          const isMobile = preset === 'mobile';
          const budget = isMobile ? DEFAULT_BUDGETS.mobile : DEFAULT_BUDGETS.desktop;

          console.log(`\n[Lighthouse] Auditing [${preset.toUpperCase()}] ${url} ...`);

          // Lighthouse run configuration
          const runnerResult = await lighthouse(url, {
            port: cdpPort,
            logLevel: 'error',
            output: ['html', 'json'],
            onlyCategories: ['performance', 'accessibility', 'seo'],
            formFactor: preset,
            screenEmulation: isMobile
              ? { mobile: true, width: 390, height: 844, deviceScaleFactor: 3, disabled: false }
              : { mobile: false, width: 1366, height: 768, deviceScaleFactor: 1, disabled: false },
            throttlingMethod: 'simulate',
            throttling: isMobile
              ? {
                  rttMs: 150,
                  throughputKbps: 1638.4,
                  requestLatencyMs: 150 * 3.75,
                  downloadThroughputKbps: 1638.4 * 0.9,
                  uploadThroughputKbps: 750,
                  cpuSlowdownMultiplier: 4,
                }
              : {
                  rttMs: 40,
                  throughputKbps: 10240,
                  requestLatencyMs: 0,
                  downloadThroughputKbps: 0,
                  uploadThroughputKbps: 0,
                  cpuSlowdownMultiplier: 1,
                },
          });

          if (!runnerResult || !runnerResult.lhr) {
            throw new Error(`Lighthouse did not produce valid results for ${url} (${preset})`);
          }

          const lhr = runnerResult.lhr;
          const audits = lhr.audits;
          const categories = lhr.categories;

          const lcpMs = audits['largest-contentful-paint']?.numericValue ?? 0;
          const cls = audits['cumulative-layout-shift']?.numericValue ?? 0;
          const tbtMs = audits['total-blocking-time']?.numericValue ?? 0;
          const perfScore = Math.round((categories.performance?.score ?? 0) * 100);
          const a11yScore = Math.round((categories.accessibility?.score ?? 0) * 100);
          const seoScore = Math.round((categories.seo?.score ?? 0) * 100);

          // Calculate initial JS transfer size (in KB)
          let initialJsKb = 0;
          const details = audits['network-requests']?.details as
            | { items?: Array<{ resourceType?: string; transferSize?: number }> }
            | undefined;
          const networkItems = details?.items;
          if (Array.isArray(networkItems)) {
            const jsBytes = networkItems
              .filter((item) => item.resourceType === 'Script')
              .reduce((acc, item) => acc + (item.transferSize || 0), 0);
            initialJsKb = Math.round((jsBytes / 1024) * 10) / 10;
          }

          const slug = `${preset}_${target.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const htmlReportFile = path.join(outputDir, `${slug}.html`);
          const jsonReportFile = path.join(outputDir, `${slug}.json`);

          const rawReport = Array.isArray(runnerResult.report)
            ? runnerResult.report[0]
            : runnerResult.report;
          const htmlReport = String(rawReport ?? '');
          fs.writeFileSync(htmlReportFile, htmlReport, 'utf8');
          fs.writeFileSync(jsonReportFile, JSON.stringify(lhr, null, 2), 'utf8');

          const metrics: PageMetrics = {
            url,
            formFactor: preset,
            performance: perfScore,
            accessibility: a11yScore,
            seo: seoScore,
            lcpMs,
            cls,
            tbtMs,
            initialJsKb: initialJsKb || undefined,
            reportHtmlPath: htmlReportFile,
            reportJsonPath: jsonReportFile,
          };

          const violations = evaluateMetrics(metrics, budget, target);
          allViolations.push(...violations);

          results.push({
            target,
            formFactor: preset,
            url,
            metrics,
            violations,
            passed: violations.length === 0,
            htmlReportFile,
            jsonReportFile,
          });

          console.log(
            `  ✓ Done: Perf=${perfScore} A11y=${a11yScore} SEO=${seoScore} | LCP=${lcpMs.toFixed(0)}ms CLS=${cls.toFixed(3)} TBT=${tbtMs.toFixed(0)}ms`,
          );
        }
      }
    } finally {
      await browser.close();
    }
  }

  // Summary file
  const summary: LighthouseAuditSummary = {
    timestamp: new Date().toISOString(),
    commitSha: process.env.GITHUB_SHA || process.env.IMAGE_TAG || 'f53bd8ab0cebf776ae4259ede7f8ce19e9aad573',
    environment: process.env.CI ? 'staging-ci' : 'staging-local',
    budgetMode: options.budgetMode || 'warn',
    totalAudits: results.length,
    passedAudits: results.filter((r) => r.passed).length,
    failedAudits: results.filter((r) => !r.passed).length,
    violationsCount: allViolations.length,
    results,
    violations: allViolations,
  };

  const summaryPath = path.join(outputDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  // Print results table
  console.log('\n================================================================================');
  console.log(' LIGHTHOUSE AUDIT RESULTS SUMMARY');
  console.log('================================================================================');
  console.log(
    'Preset  | Route                 | Perf | A11y | SEO | LCP (ms) | CLS   | TBT (ms) | Status',
  );
  console.log(
    '--------+-----------------------+------+------+-----+----------+-------+----------+-------',
  );
  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ WARN';
    const routeName = r.target.path.padEnd(21);
    const preset = r.formFactor.padEnd(7);
    const m = r.metrics;
    console.log(
      `${preset} | ${routeName} | ${String(m.performance).padStart(4)} | ${String(m.accessibility).padStart(4)} | ${String(m.seo).padStart(3)} | ${String(Math.round(m.lcpMs)).padStart(8)} | ${m.cls.toFixed(3).padStart(5)} | ${String(Math.round(m.tbtMs)).padStart(8)} | ${status}`,
    );
  }
  console.log('================================================================================');

  if (allViolations.length > 0) {
    console.log(`\n⚠️  ${allViolations.length} Budget Violations Encountered:`);
    for (const v of allViolations) {
      console.log(`  - [${v.formFactor.toUpperCase()}] ${v.targetName} (${v.url}): ${v.message}`);
    }
  }

  console.log(`\nArtifacts written to: ${path.relative(REPO_ROOT, outputDir)}/`);
  console.log(`Summary report:       ${path.relative(REPO_ROOT, summaryPath)}`);

  return summary;
}

export interface ProbeResult {
  webOk: boolean;
  adminOk: boolean;
  webStatus?: number;
  adminStatus?: number;
  webError?: string;
  adminError?: string;
}

export async function probeStagingServers(
  baseUrls: { webUrl: string; adminUrl: string },
  timeoutMs = 5000,
): Promise<ProbeResult> {
  const checkUrl = async (url: string) => {
    try {
      const res = await fetch(`${url}/healthz`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      return {
        ok: res.ok,
        status: res.status,
        error: res.ok ? undefined : `HTTP ${res.status} ${res.statusText}`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, status: 0, error: message };
    }
  };

  const [webRes, adminRes] = await Promise.all([
    checkUrl(baseUrls.webUrl),
    checkUrl(baseUrls.adminUrl),
  ]);

  return {
    webOk: webRes.ok,
    adminOk: adminRes.ok,
    webStatus: webRes.status,
    adminStatus: adminRes.status,
    webError: webRes.error,
    adminError: adminRes.error,
  };
}

// Main execution when invoked as a CLI
async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.listOnly) {
    printTargetsList(options);
    process.exit(0);
  }

  console.log('Starting Lighthouse CI Staging Audit Runner...');
  printTargetsList(options);

  // Check if staging web server and admin portal are reachable
  const baseUrls = {
    webUrl: options.webUrl || getBaseUrls().webUrl,
    adminUrl: options.adminUrl || getBaseUrls().adminUrl,
  };

  if (!options.mock) {
    console.log('Probing staging servers before Lighthouse audit...');
    const probe = await probeStagingServers(baseUrls);

    if (!probe.webOk || !probe.adminOk) {
      console.error('\n[FATAL] Staging server pre-flight health probe failed:');
      if (!probe.webOk) {
        console.error(`  - Web frontend (${baseUrls.webUrl}/healthz): ${probe.webError || 'Unreachable'}`);
      } else {
        console.log(`  ✓ Web frontend (${baseUrls.webUrl}/healthz) is healthy.`);
      }
      if (!probe.adminOk) {
        console.error(`  - Admin portal (${baseUrls.adminUrl}/healthz): ${probe.adminError || 'Unreachable'}`);
      } else {
        console.log(`  ✓ Admin portal (${baseUrls.adminUrl}/healthz) is healthy.`);
      }
      console.error(
        '\nCannot run real Lighthouse audit without responding staging servers.',
      );
      console.error(
        'Automated fallback to mock mode is disabled to prevent disguising server downtime as successful test runs.',
      );
      console.error(
        'To run synthetic/mock audit explicitly, provide --mock or --dry-run.\n',
      );
      process.exit(1);
    }

    console.log(`✓ Web frontend (${baseUrls.webUrl}) is healthy.`);
    console.log(`✓ Admin portal (${baseUrls.adminUrl}) is healthy.`);
  }

  const summary = await runLighthouseAudit(options);

  if (summary.violationsCount > 0) {
    if (summary.budgetMode === 'error') {
      console.error(
        `\n[FAIL] Lighthouse audit failed with ${summary.violationsCount} budget violation(s) under budgetMode=error (blocking).`,
      );
      process.exit(1);
    } else {
      console.log(
        `\n[WARN] ${summary.violationsCount} budget violation(s) reported under budgetMode=warn (D01 warning mode; D04 will block).`,
      );
      process.exit(0);
    }
  }

  console.log('\n[SUCCESS] All Lighthouse staging performance audits passed within budget!');
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('Fatal Lighthouse Runner Error:', err);
    process.exit(1);
  });
}
