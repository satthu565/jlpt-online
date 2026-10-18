/**
 * Tests for Lighthouse Performance Runner on Staging CI
 * Task: D01
 * Features: SYS-10, SYS-14, D01 Acceptance
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TARGET_ROUTES, resolveTargetUrl } from '../lighthouse/targets.ts';
import { DEFAULT_BUDGETS, evaluateMetrics } from '../lighthouse/budgets.ts';
import {
  parseCliArgs,
  runLighthouseAudit,
  probeStagingServers,
  DEFAULT_BASELINE_FILE,
  REPO_ROOT,
} from '../lighthouse/runner.ts';
import type { PageMetrics, TargetRoute } from '../lighthouse/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('D01: Lighthouse Performance Gate on Staging CI', () => {
  describe('Target Routes and URLs', () => {
    it('defines the 6 required core routes across web and admin', () => {
      const paths = TARGET_ROUTES.map((t) => t.path);
      expect(paths).toContain('/');
      expect(paths).toContain('/de-thi');
      expect(paths).toContain('/phong-thi');
      expect(paths).toContain('/n5');
      expect(paths).toContain('/dang-nhap');
      expect(paths).toContain('/login');
      expect(TARGET_ROUTES.length).toBe(6);
    });

    it('assigns web routes to port 3000 and admin routes to port 3001 by default', () => {
      const webRoutes = TARGET_ROUTES.filter((t) => t.app === 'web');
      const adminRoutes = TARGET_ROUTES.filter((t) => t.app === 'admin');

      expect(webRoutes.length).toBe(5);
      expect(adminRoutes.length).toBe(1);

      for (const t of webRoutes) {
        const url = resolveTargetUrl(t);
        expect(url).toContain(':3000');
        expect(url.endsWith(t.path)).toBe(true);
      }

      for (const t of adminRoutes) {
        const url = resolveTargetUrl(t);
        expect(url).toContain(':3001');
        expect(url.endsWith(t.path)).toBe(true);
      }
    });

    it('respects URL overrides from environment or options', () => {
      const home = TARGET_ROUTES.find((t) => t.path === '/')!;
      const adminLogin = TARGET_ROUTES.find((t) => t.path === '/login')!;

      const customWeb = 'https://staging.jlpt.example.com';
      const customAdmin = 'https://admin-staging.jlpt.example.com';

      const homeUrl = resolveTargetUrl(home, { webUrl: customWeb, adminUrl: customAdmin });
      const adminUrl = resolveTargetUrl(adminLogin, { webUrl: customWeb, adminUrl: customAdmin });

      expect(homeUrl).toBe('https://staging.jlpt.example.com/');
      expect(adminUrl).toBe('https://admin-staging.jlpt.example.com/login');
    });
  });

  describe('Budgets and Evaluation Logic', () => {
    const dummyTarget: TargetRoute = {
      id: 'web_home',
      name: 'Trang chủ',
      app: 'web',
      path: '/',
    };

    it('validates mobile budgets according to specification (LCP < 2.5s, CLS < 0.1, TBT < 200ms, JS <= 150KB)', () => {
      const b = DEFAULT_BUDGETS.mobile;
      expect(b.lcpMs).toBe(2500);
      expect(b.cls).toBe(0.1);
      expect(b.tbtMs).toBe(200);
      expect(b.initialJsKb).toBe(150);
      expect(b.minPerformance).toBe(70);
      expect(b.minAccessibility).toBe(95);
      expect(b.minSeo).toBe(100);
    });

    it('validates desktop budgets according to specification (perf >= 98, a11y >= 95, seo = 100)', () => {
      const b = DEFAULT_BUDGETS.desktop;
      expect(b.minPerformance).toBe(98);
      expect(b.minAccessibility).toBe(95);
      expect(b.minSeo).toBe(100);
      expect(b.lcpMs).toBe(2000);
      expect(b.cls).toBe(0.1);
      expect(b.tbtMs).toBe(150);
    });

    it('passes when metrics satisfy all budget criteria', () => {
      const metrics: PageMetrics = {
        url: 'http://127.0.0.1:3000/',
        formFactor: 'mobile',
        performance: 85,
        accessibility: 98,
        seo: 100,
        lcpMs: 2100,
        cls: 0.05,
        tbtMs: 120,
        initialJsKb: 135,
      };

      const violations = evaluateMetrics(metrics, DEFAULT_BUDGETS.mobile, dummyTarget);
      expect(violations).toHaveLength(0);
    });

    it('detects LCP violation when LCP > 2500ms on mobile', () => {
      const metrics: PageMetrics = {
        url: 'http://127.0.0.1:3000/',
        formFactor: 'mobile',
        performance: 85,
        accessibility: 98,
        seo: 100,
        lcpMs: 2850, // Exceeds 2500ms
        cls: 0.05,
        tbtMs: 120,
      };

      const violations = evaluateMetrics(metrics, DEFAULT_BUDGETS.mobile, dummyTarget);
      expect(violations.length).toBeGreaterThan(0);
      const lcpViolation = violations.find((v) => v.metric === 'LCP');
      expect(lcpViolation).toBeDefined();
      expect(lcpViolation?.actual).toBe(2850);
      expect(lcpViolation?.expected).toBe(2500);
      expect(lcpViolation?.message).toContain('exceeded budget 2500 ms');
    });

    it('detects CLS violation when CLS > 0.1', () => {
      const metrics: PageMetrics = {
        url: 'http://127.0.0.1:3000/',
        formFactor: 'mobile',
        performance: 85,
        accessibility: 98,
        seo: 100,
        lcpMs: 2000,
        cls: 0.15, // Exceeds 0.1
        tbtMs: 100,
      };

      const violations = evaluateMetrics(metrics, DEFAULT_BUDGETS.mobile, dummyTarget);
      const clsViolation = violations.find((v) => v.metric === 'CLS');
      expect(clsViolation).toBeDefined();
      expect(clsViolation?.actual).toBe(0.15);
    });

    it('detects TBT violation when TBT > 200ms on mobile', () => {
      const metrics: PageMetrics = {
        url: 'http://127.0.0.1:3000/',
        formFactor: 'mobile',
        performance: 85,
        accessibility: 98,
        seo: 100,
        lcpMs: 2000,
        cls: 0.02,
        tbtMs: 340, // Exceeds 200ms
      };

      const violations = evaluateMetrics(metrics, DEFAULT_BUDGETS.mobile, dummyTarget);
      const tbtViolation = violations.find((v) => v.metric === 'TBT');
      expect(tbtViolation).toBeDefined();
      expect(tbtViolation?.actual).toBe(340);
    });

    it('detects Initial JS size ceiling violation when initial JS > 150KB on mobile', () => {
      const metrics: PageMetrics = {
        url: 'http://127.0.0.1:3000/',
        formFactor: 'mobile',
        performance: 85,
        accessibility: 98,
        seo: 100,
        lcpMs: 2000,
        cls: 0.02,
        tbtMs: 100,
        initialJsKb: 185.4, // Exceeds 150 KB
      };

      const violations = evaluateMetrics(metrics, DEFAULT_BUDGETS.mobile, dummyTarget);
      const jsViolation = violations.find((v) => v.metric === 'InitialJS');
      expect(jsViolation).toBeDefined();
      expect(jsViolation?.actual).toBe(185.4);
    });

    it('detects Desktop performance score violation when performance < 98', () => {
      const metrics: PageMetrics = {
        url: 'http://127.0.0.1:3000/',
        formFactor: 'desktop',
        performance: 94, // Exceeds budget (requires >= 98)
        accessibility: 98,
        seo: 100,
        lcpMs: 1200,
        cls: 0.01,
        tbtMs: 50,
      };

      const violations = evaluateMetrics(metrics, DEFAULT_BUDGETS.desktop, dummyTarget);
      const scoreViolation = violations.find((v) => v.metric === 'PerformanceScore');
      expect(scoreViolation).toBeDefined();
      expect(scoreViolation?.actual).toBe(94);
    });
  });

  describe('CLI Options and Commands', () => {
    it('executes "pnpm test:lighthouse -- --list" and exits 0 with complete target and budget listing', () => {
      const output = execSync('pnpm test:lighthouse -- --list', {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });

      expect(output).toContain('JLPT ONLINE - LIGHTHOUSE CI PERFORMANCE AUDIT TARGETS & BUDGETS');
      expect(output).toContain('Trang chủ (Home)');
      expect(output).toContain('Thư viện đề thi (Library)');
      expect(output).toContain('Phòng thi trực tuyến (Exam Room)');
      expect(output).toContain('Trang cấp độ N5 (SEO Landing)');
      expect(output).toContain('Đăng nhập học viên (Student Login)');
      expect(output).toContain('Đăng nhập nhân sự (Staff Admin Login)');
      expect(output).toContain('LCP (Largest Contentful Paint): < 2500 ms');
      expect(output).toContain('CLS (Cumulative Layout Shift):  < 0.1');
      expect(output).toContain('TBT (Total Blocking Time):      < 200 ms');
      expect(output).toContain('Initial JS size (per page):     <= 150 KB');
      expect(output).toContain('Preset Desktop:');
      expect(output).toContain('Performance score:              >= 98');
    });

    it('parses CLI arguments correctly (--list, --enforce, --warn, --mock, --preset)', () => {
      const opts1 = parseCliArgs(['--list']);
      expect(opts1.listOnly).toBe(true);

      const opts2 = parseCliArgs(['--enforce']);
      expect(opts2.budgetMode).toBe('error');

      const opts3 = parseCliArgs(['--warn']);
      expect(opts3.budgetMode).toBe('warn');

      const opts4 = parseCliArgs(['--mock', '--preset=mobile', '--route=/n5']);
      expect(opts4.mock).toBe(true);
      expect(opts4.presetFilter).toBe('mobile');
      expect(opts4.routeFilter).toBe('/n5');
    });

    it('defaults budgetMode to "warn" initially, and switches to "error" when LIGHTHOUSE_ENFORCE_BUDGET=1', () => {
      const defaultOpts = parseCliArgs([]);
      expect(defaultOpts.budgetMode).toBe('warn');

      process.env.LIGHTHOUSE_ENFORCE_BUDGET = '1';
      const enforcedOpts = parseCliArgs([]);
      expect(enforcedOpts.budgetMode).toBe('error');
      delete process.env.LIGHTHOUSE_ENFORCE_BUDGET;
    });
  });

  describe('Performance Baseline Storage (docs/release/performance-baseline.json)', () => {
    it('stores baseline metrics accompanied by commit SHA and explicit disclaimer', () => {
      expect(fs.existsSync(DEFAULT_BASELINE_FILE)).toBe(true);
      const raw = fs.readFileSync(DEFAULT_BASELINE_FILE, 'utf8');
      const baseline = JSON.parse(raw);

      // Acceptance: "Số đo gốc lưu kèm commit SHA; không lấy số máy ảo làm số production"
      expect(baseline.commitSha).toBeDefined();
      expect(typeof baseline.commitSha).toBe('string');
      expect(baseline.commitSha.length).toBeGreaterThanOrEqual(7);

      expect(baseline.disclaimer).toBeDefined();
      expect(baseline.disclaimer).toContain('Số đo hiệu năng gốc lưu kèm commit SHA');
      expect(baseline.disclaimer).toContain('Không lấy số đo máy ảo/lab CI làm số production thật');

      // Acceptance: "Ngân sách ban đầu ở chế độ cảnh báo, D04 chuyển thành chặn"
      expect(baseline.budgetMode).toBe('warn');
      expect(baseline.budgetEnforcedIn).toBe('D04');

      // Contains all 6 target routes
      expect(baseline.routes.web_home).toBeDefined();
      expect(baseline.routes['web_de-thi']).toBeDefined();
      expect(baseline.routes['web_phong-thi']).toBeDefined();
      expect(baseline.routes.web_n5).toBeDefined();
      expect(baseline.routes['web_dang-nhap']).toBeDefined();
      expect(baseline.routes.admin_login).toBeDefined();

      // Mobile metrics have LCP, CLS, TBT, JS size
      const homeMobile = baseline.routes.web_home.mobile;
      expect(homeMobile.lcpMs).toBeGreaterThan(0);
      expect(homeMobile.cls).toBeGreaterThanOrEqual(0);
      expect(homeMobile.tbtMs).toBeGreaterThanOrEqual(0);
      expect(homeMobile.initialJsKb).toBeGreaterThan(0);
      expect(homeMobile.performance).toBeGreaterThanOrEqual(70);
      expect(homeMobile.accessibility).toBeGreaterThanOrEqual(95);
      expect(homeMobile.seo).toBe(100);
    });
  });

  describe('Lighthouse Execution & Artifact Generation', () => {
    let testServer: http.Server;
    let testPort: number;

    beforeAll(async () => {
      testServer = http.createServer((req, res) => {
        if (req.url === '/healthz') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }
        if (req.url === '/robots.txt') {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('User-agent: *\nAllow: /\n');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JLPT Online Staging Test Page</title>
  <meta name="description" content="JLPT Online Staging Performance Test">
  <link rel="canonical" href="http://127.0.0.1:${testPort}/">
</head>
<body>
  <header>
    <h1>JLPT Online - Luyện thi tiếng Nhật</h1>
  </header>
  <main>
    <p>Nội dung kiểm tra hiệu năng Lighthouse.</p>
    <a href="/robots.txt">Xem robots.txt</a>
  </main>
</body>
</html>`);
      });

      await new Promise<void>((resolve) => {
        testServer.listen(0, '127.0.0.1', () => {
          const addr = testServer.address() as AddressInfo;
          testPort = addr.port;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    });

    it('probes both web and admin staging healthz endpoints and fails if either is down', async () => {
      // 1. When both web and admin are online on testPort
      const healthyResult = await probeStagingServers({
        webUrl: `http://127.0.0.1:${testPort}`,
        adminUrl: `http://127.0.0.1:${testPort}`,
      });
      expect(healthyResult.webOk).toBe(true);
      expect(healthyResult.adminOk).toBe(true);

      // 2. When admin is unreachable (simulating admin container crash on port 3001)
      const adminDownResult = await probeStagingServers({
        webUrl: `http://127.0.0.1:${testPort}`,
        adminUrl: 'http://127.0.0.1:59999', // Port with no server
      });
      expect(adminDownResult.webOk).toBe(true);
      expect(adminDownResult.adminOk).toBe(false);

      // 3. When web is unreachable (simulating web container crash on port 3000)
      const webDownResult = await probeStagingServers({
        webUrl: 'http://127.0.0.1:59998',
        adminUrl: `http://127.0.0.1:${testPort}`,
      });
      expect(webDownResult.webOk).toBe(false);
      expect(webDownResult.adminOk).toBe(true);
    });

    it('aborts with exit code 1 and fatal error log when staging servers are offline without --mock', () => {
      const runnerScript = path.join(REPO_ROOT, 'tests/lighthouse/runner.ts');
      let exitCode: number | null = 0;
      let stderrOutput = '';

      try {
        execSync(
          `node --no-warnings --experimental-strip-types "${runnerScript}" --web-url=http://127.0.0.1:59998 --admin-url=http://127.0.0.1:59999`,
          { stdio: 'pipe' },
        );
      } catch (err: unknown) {
        const spawnErr = err as { status?: number; stderr?: Buffer | string };
        exitCode = spawnErr.status ?? null;
        stderrOutput = spawnErr.stderr ? spawnErr.stderr.toString() : '';
      }

      // Must fail with exitCode 1 and must NOT fall back to mock
      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('[FATAL] Staging server pre-flight health probe failed:');
      expect(stderrOutput).toContain('Cannot run real Lighthouse audit without responding staging servers');
      expect(stderrOutput).toContain('Automated fallback to mock mode is disabled');
    });

    it('generates HTML and JSON report artifacts upon audit completion', async () => {
      const tempOutputDir = path.join(REPO_ROOT, 'docs/release/lighthouse/test-artifacts');
      fs.mkdirSync(tempOutputDir, { recursive: true });

      const summary = await runLighthouseAudit({
        webUrl: `http://127.0.0.1:${testPort}`,
        adminUrl: `http://127.0.0.1:${testPort}`,
        routeFilter: '/',
        presetFilter: 'desktop',
        outputDir: tempOutputDir,
      });

      expect(summary.totalAudits).toBe(1);
      expect(summary.results.length).toBe(1);

      const audit = summary.results[0]!;
      expect(audit.metrics.lcpMs).toBeGreaterThan(0);
      expect(audit.metrics.performance).toBeGreaterThanOrEqual(90);
      expect(audit.metrics.accessibility).toBeGreaterThanOrEqual(90);

      // Verify artifacts exist
      expect(fs.existsSync(audit.htmlReportFile!)).toBe(true);
      expect(fs.existsSync(audit.jsonReportFile!)).toBe(true);
      expect(fs.existsSync(path.join(tempOutputDir, 'summary.json'))).toBe(true);

      const htmlContent = fs.readFileSync(audit.htmlReportFile!, 'utf8');
      expect(htmlContent).toContain('Lighthouse');

      // Cleanup temp test directory
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }, 45000);

    it('correctly reports failure and violations when running with strict enforcement', async () => {
      // Mock audit with an artificially exceeded budget to test failure behavior
      const testOutputDir = path.join(REPO_ROOT, 'docs/release/lighthouse/test-fail');
      fs.mkdirSync(testOutputDir, { recursive: true });

      const customTarget: TargetRoute = {
        id: 'web_home',
        name: 'Trang chủ',
        app: 'web',
        path: '/',
      };

      const failingMetrics: PageMetrics = {
        url: 'http://127.0.0.1:3000/',
        formFactor: 'mobile',
        performance: 65, // Below 70
        accessibility: 90, // Below 95
        seo: 90, // Below 100
        lcpMs: 3400, // Exceeds 2500ms
        cls: 0.18, // Exceeds 0.1
        tbtMs: 450, // Exceeds 200ms
        initialJsKb: 180, // Exceeds 150KB
      };

      const violations = evaluateMetrics(failingMetrics, DEFAULT_BUDGETS.mobile, customTarget);
      expect(violations.length).toBe(7); // All 7 metrics violated

      // Execute runner CLI with --enforce and verify exit code 1
      const runnerScript = path.join(REPO_ROOT, 'tests/lighthouse/runner.ts');
      let enforceExitCode: number | null = 0;
      let enforceStderr = '';
      try {
        execSync(
          `node --no-warnings --experimental-strip-types "${runnerScript}" --mock --mock-failing --enforce --route=/ --preset=mobile --output-dir="${testOutputDir}"`,
          { stdio: 'pipe' },
        );
      } catch (err: unknown) {
        const spawnErr = err as { status?: number; stderr?: Buffer | string };
        enforceExitCode = spawnErr.status ?? null;
        enforceStderr = spawnErr.stderr ? spawnErr.stderr.toString() : '';
      }

      expect(enforceExitCode).toBe(1);
      expect(enforceStderr).toContain('[FAIL] Lighthouse audit failed');
      expect(enforceStderr).toContain('budget violation(s) under budgetMode=error (blocking)');

      // In warn mode (initial D01 mode), violations are reported as warnings and process exits 0
      const warnOutput = execSync(
        `node --no-warnings --experimental-strip-types "${runnerScript}" --mock --mock-failing --warn --route=/ --preset=mobile --output-dir="${testOutputDir}"`,
        { encoding: 'utf8' },
      );
      expect(warnOutput).toContain('[WARN]');
      expect(warnOutput).toContain('budget violation(s) reported under budgetMode=warn');

      fs.rmSync(testOutputDir, { recursive: true, force: true });
    });
  });
});
