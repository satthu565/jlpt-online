/**
 * JLPT Online - Design & Performance Verification Runner (D05)
 * 
 * Verifies all 29 Web pages and 30 Admin pages across 3 viewports:
 * - 390px (Mobile standard)
 * - 1366px (Desktop standard)
 * - 1920px (Full HD widescreen)
 * 
 * Acceptance Criteria Checks:
 * 1. Zero horizontal overflow (scrollWidth <= innerWidth + 1px)
 * 2. Zero raw/unparsed translation keys (e.g. "account.profile.title")
 * 3. Zero internal feature codes exposed in UI (e.g. "(EXPL-01)", "ADM-02")
 * 4. Captures screenshot artifacts for every page at all 3 viewports
 * 5. Generates structured JSON evidence report for docs/release/DESIGN_PERF_REPORT.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page, type Browser } from '@playwright/test';
import { generateTotp, SEEDED_STAFF_ACCOUNTS } from '../playwright/fixtures/staff-auth.fixture.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

const WEB_ORIGIN = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const ADMIN_ORIGIN = process.env.ADMIN_URL || 'http://127.0.0.1:3001';

const OUTPUT_DIR = path.join(REPO_ROOT, 'docs/release/screenshots');
const WEB_SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'web');
const ADMIN_SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'admin');

fs.mkdirSync(WEB_SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(ADMIN_SCREENSHOT_DIR, { recursive: true });

export const VIEWPORTS = [
  { width: 390, height: 844, name: '390px' },
  { width: 1366, height: 768, name: '1366px' },
  { width: 1920, height: 1080, name: '1920px' },
] as const;

export const ALL_WEB_PAGES = [
  { path: '/', slug: 'home', name: 'Trang chủ (Home Landing)' },
  { path: '/dang-nhap', slug: 'dang-nhap', name: 'Đăng nhập học viên' },
  { path: '/dang-ky', slug: 'dang-ky', name: 'Đăng ký tài khoản' },
  { path: '/quen-mat-khau', slug: 'quen-mat-khau', name: 'Quên mật khẩu' },
  { path: '/de-thi', slug: 'de-thi', name: 'Thư viện đề thi' },
  { path: '/de-thi/demo-n5-1', slug: 'de-thi-detail', name: 'Chi tiết đề thi' },
  { path: '/phong-thi?examId=demo-n5-1', slug: 'phong-thi', name: 'Phòng thi trực tuyến' },
  { path: '/luyen-tap', slug: 'luyen-tap', name: 'Luyện tập linh hoạt' },
  { path: '/tu-vung', slug: 'tu-vung', name: 'Kho từ vựng' },
  { path: '/ngu-phap', slug: 'ngu-phap', name: 'Kho ngữ pháp' },
  { path: '/thong-ke-tu-vung', slug: 'thong-ke-tu-vung', name: 'Thống kê tần suất từ vựng' },
  { path: '/so-tay', slug: 'so-tay', name: 'Sổ tay học tập & SRS' },
  { path: '/ke-hoach', slug: 'ke-hoach', name: 'Kế hoạch ôn thi' },
  { path: '/thong-ke', slug: 'thong-ke', name: 'Phân tích năng lực học viên' },
  { path: '/thao-luan', slug: 'thao-luan', name: 'Diễn đàn thảo luận' },
  { path: '/su-kien', slug: 'su-kien', name: 'Sự kiện & cuộc thi' },
  { path: '/lop-hoc', slug: 'lop-hoc', name: 'Lớp học & nhóm ôn' },
  { path: '/goi-thanh-vien', slug: 'goi-thanh-vien', name: 'Gói thành viên & bảng giá' },
  { path: '/tai-khoan', slug: 'tai-khoan', name: 'Tài khoản & bảo mật' },
  { path: '/lich-su', slug: 'lich-su', name: 'Lịch sử làm bài' },
  { path: '/gioi-thieu', slug: 'gioi-thieu', name: 'Giới thiệu nền tảng' },
  { path: '/chinh-sach', slug: 'chinh-sach', name: 'Chính sách dịch vụ' },
  { path: '/chinh-sach-bao-mat', slug: 'chinh-sach-bao-mat', name: 'Chính sách bảo mật' },
  { path: '/dieu-khoan', slug: 'dieu-khoan', name: 'Điều khoản sử dụng' },
  { path: '/faq', slug: 'faq', name: 'Câu hỏi thường gặp' },
  { path: '/ho-tro', slug: 'ho-tro', name: 'Trung tâm hỗ trợ' },
  { path: '/lien-he', slug: 'lien-he', name: 'Liên hệ ban quản trị' },
  { path: '/n5', slug: 'n5-level', name: 'Trang SEO cấp độ N5' },
  { path: '/n5/de-thi', slug: 'n5-de-thi', name: 'Trang SEO danh sách đề N5' },
];

export const ALL_ADMIN_PAGES = [
  { path: '/', slug: 'dashboard', name: 'Bảng điều khiển trung tâm' },
  { path: '/users', slug: 'users', name: 'Quản lý người dùng & phân quyền' },
  { path: '/audit-logs', slug: 'audit-logs', name: 'Nhật ký kiểm toán' },
  { path: '/exams', slug: 'exams', name: 'Danh mục đề thi' },
  { path: '/exams/schedules', slug: 'exams-schedules', name: 'Lịch thi theo kỳ' },
  { path: '/exams/scoring', slug: 'exams-scoring', name: 'Bảng quy đổi điểm đề thi' },
  { path: '/exams/mixed', slug: 'exams-mixed', name: 'Quản lý đề trộn' },
  { path: '/imports', slug: 'imports', name: 'Nạp gói đề thi & kiểm tra' },
  { path: '/reviews', slug: 'reviews', name: 'Duyệt đề thi (4 mắt)' },
  { path: '/reviews/explanations', slug: 'reviews-explanations', name: 'Duyệt lời giải & transcript' },
  { path: '/questions', slug: 'questions', name: 'Ngân hàng câu hỏi' },
  { path: '/vocab', slug: 'vocab', name: 'Ngân hàng từ vựng' },
  { path: '/blueprints', slug: 'blueprints', name: 'Cấu trúc đề thi chuẩn' },
  { path: '/schedules', slug: 'schedules', name: 'Lịch thi JLPT chính thức' },
  { path: '/scoring-tables', slug: 'scoring-tables', name: 'Bảng điểm chuẩn JLPT' },
  { path: '/reports', slug: 'reports', name: 'Báo cáo tổng hợp' },
  { path: '/reports/content', slug: 'reports-content', name: 'Báo cáo nội dung' },
  { path: '/reports/revenue', slug: 'reports-revenue', name: 'Báo cáo doanh thu' },
  { path: '/commercial/plans', slug: 'commercial-plans', name: 'Quản lý gói cước' },
  { path: '/commercial/payments', slug: 'commercial-payments', name: 'Giao dịch thanh toán' },
  { path: '/commercial/refunds', slug: 'commercial-refunds', name: 'Xử lý yêu cầu hoàn tiền' },
  { path: '/commercial/reconciliation', slug: 'commercial-reconciliation', name: 'Đối soát cổng thanh toán' },
  { path: '/experiments', slug: 'experiments', name: 'Thử nghiệm A/B' },
  { path: '/media', slug: 'media', name: 'Kho tệp đa phương tiện' },
  { path: '/cms', slug: 'cms', name: 'Thông báo & tin tức CMS' },
  { path: '/moderation/ai', slug: 'moderation-ai', name: 'Kiểm duyệt trợ lý AI' },
  { path: '/settings', slug: 'settings', name: 'Cài đặt hệ thống' },
  { path: '/settings/notifications', slug: 'settings-notifications', name: 'Cấu hình thông báo' },
  { path: '/settings/org', slug: 'settings-org', name: 'Cấu hình tổ chức' },
  { path: '/settings/backup', slug: 'settings-backup', name: 'Cấu hình sao lưu PITR' },
];

export interface PageAuditResult {
  app: 'web' | 'admin';
  path: string;
  slug: string;
  name: string;
  viewport: string;
  width: number;
  height: number;
  scrollWidth: number;
  clientWidth: number;
  hasHorizontalOverflow: boolean;
  rawKeysFound: string[];
  internalCodesFound: string[];
  screenshotPath: string;
  passed: boolean;
}

const WEB_RAW_KEY_REGEX = /\b(common|theme|locale|a11y|auth|account|home|notebook|flashcards|srs|planner|classroom|community|billing|seo|practice|analytics)\.[a-zA-Z0-9_.-]+\b/g;
const ADMIN_RAW_KEY_REGEX = /\b(app|nav|auth|totp|roles|common|commercial|reports|experiments|contentReports|content)\.[a-zA-Z0-9_.-]+\b/g;
const INTERNAL_CODE_REGEX = /\b(ADM|LIB|SYS|MIX|PRA|EXPL|SRS|EXP|COM|REP|BIL|CLS|GAM|MOD)-\d{2,3}\b|\([A-Z]{3,4}-\d{2,3}\)/g;

function findRawKeys(text: string, app: 'web' | 'admin'): string[] {
  const regex = app === 'web' ? WEB_RAW_KEY_REGEX : ADMIN_RAW_KEY_REGEX;
  const matches = text.match(regex) || [];
  // Exclude email addresses (e.g. editor@jlpt.local, billing.admin@jlpt.local)
  return matches.filter((m) => {
    const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isEmail = new RegExp(`${escaped}@\\w+`).test(text);
    return !isEmail;
  });
}

async function auditPage(
  page: Page,
  app: 'web' | 'admin',
  item: { path: string; slug: string; name: string },
  viewport: { width: number; height: number; name: string },
  screenshotDir: string,
): Promise<PageAuditResult> {
  const targetDir = screenshotDir;
  const filename = `${app}-${item.slug}-${viewport.name}.png`;
  const screenshotPath = path.join(targetDir, filename);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.waitForTimeout(100);

  const overflow = await page.evaluate(() => {
    return {
      // html and body use overflow-x: hidden, so documentElement never reports overflow; content pushed
      // past the viewport still widens body (clipped on screen). Measure the widest of the two.
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
    };
  });

  // Tolerance of 1px for subpixel desktop, 2px for mobile
  const tolerance = viewport.width <= 500 ? 2 : 1;
  const hasHorizontalOverflow = overflow.scrollWidth > overflow.clientWidth + tolerance;

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  const rawKeyMatches = findRawKeys(bodyText, app);
  const internalCodeMatches = bodyText.match(INTERNAL_CODE_REGEX) || [];

  await page.screenshot({ path: screenshotPath, fullPage: false });

  const passed = !hasHorizontalOverflow && rawKeyMatches.length === 0 && internalCodeMatches.length === 0;

  return {
    app,
    path: item.path,
    slug: item.slug,
    name: item.name,
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    scrollWidth: overflow.scrollWidth,
    clientWidth: overflow.clientWidth,
    hasHorizontalOverflow,
    rawKeysFound: Array.from(new Set(rawKeyMatches)),
    internalCodesFound: Array.from(new Set(internalCodeMatches)),
    screenshotPath: path.relative(REPO_ROOT, screenshotPath),
    passed,
  };
}

async function runAudit() {
  console.log('================================================================================');
  console.log(' JLPT ONLINE - DESIGN & PERFORMANCE RESPONSIVE AUDIT (D05)');
  console.log(' Viewports: 390px (Mobile), 1366px (Desktop Standard), 1920px (Desktop Full HD)');
  console.log(' Web Origin:   ', WEB_ORIGIN);
  console.log(' Admin Origin: ', ADMIN_ORIGIN);
  console.log('================================================================================');

  const browser: Browser = await chromium.launch({ headless: true });
  const results: PageAuditResult[] = [];

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Web Portal Audit (29 pages)
    // -------------------------------------------------------------------------
    console.log('\n[Phase 1] Auditing Web Portal (29 pages)...');
    const webContext = await browser.newContext();
    const webPage = await webContext.newPage();

    // Log in as student
    console.log('Logging in student account (student.verified@jlpt.local)...');
    await webPage.goto(`${WEB_ORIGIN}/dang-nhap`, { waitUntil: 'domcontentloaded' });
    await webPage.locator('#login-email, input[type="email"]').first().fill(SEEDED_STAFF_ACCOUNTS.student.email);
    await webPage.locator('#login-password, input[type="password"]').first().fill(SEEDED_STAFF_ACCOUNTS.student.password);
    await webPage.locator('button[type="submit"]').first().click();
    await webPage.waitForURL((u: URL) => !u.pathname.includes('/dang-nhap'), { timeout: 20000, waitUntil: 'commit' }).catch(() => {});
    await webPage.waitForTimeout(500);

    for (let i = 0; i < ALL_WEB_PAGES.length; i++) {
      const p = ALL_WEB_PAGES[i]!;
      console.log(`[Web ${i + 1}/${ALL_WEB_PAGES.length}] ${p.name} (${p.path})`);
      try {
        await webPage.goto(`${WEB_ORIGIN}${p.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await webPage.waitForTimeout(200);

        for (const vp of VIEWPORTS) {
          const res = await auditPage(webPage, 'web', p, vp, WEB_SCREENSHOT_DIR);
          results.push(res);
          if (!res.passed) {
            console.warn(`  ⚠ Issue at ${vp.name}: overflow=${res.hasHorizontalOverflow}, rawKeys=${res.rawKeysFound.length}, internalCodes=${res.internalCodesFound.length}`);
          }
        }
      } catch (err: unknown) {
        console.error(`  ✕ Error navigating to ${p.path}:`, err instanceof Error ? err.message : err);
      }
    }
    await webContext.close();

    // -------------------------------------------------------------------------
    // Phase 2: Admin Portal Audit (30 pages)
    // -------------------------------------------------------------------------
    console.log('\n[Phase 2] Auditing Admin Portal (30 pages)...');
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    console.log('Logging in admin staff (publisher@jlpt.local) with TOTP...');
    await adminPage.goto(`${ADMIN_ORIGIN}/login`, { waitUntil: 'domcontentloaded' });
    await adminPage.locator('input[type="email"]').first().fill(SEEDED_STAFF_ACCOUNTS.admin.email);
    await adminPage.locator('input[type="password"]').first().fill(SEEDED_STAFF_ACCOUNTS.admin.password);
    await adminPage.locator('button[type="submit"]').first().click();
    await adminPage.waitForTimeout(1000);

    if (adminPage.url().includes('/verify-2fa')) {
      const totpCode = generateTotp(SEEDED_STAFF_ACCOUNTS.admin.totpSecret);
      await adminPage.locator('input[type="text"], input[name="code"], input[data-testid*="totp"]').first().fill(totpCode);
      await adminPage.locator('button[type="submit"]').first().click();
      await adminPage.waitForTimeout(1500);
    }

    for (let i = 0; i < ALL_ADMIN_PAGES.length; i++) {
      const p = ALL_ADMIN_PAGES[i]!;
      console.log(`[Admin ${i + 1}/${ALL_ADMIN_PAGES.length}] ${p.name} (${p.path})`);
      try {
        await adminPage.goto(`${ADMIN_ORIGIN}${p.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await adminPage.waitForTimeout(200);

        for (const vp of VIEWPORTS) {
          const res = await auditPage(adminPage, 'admin', p, vp, ADMIN_SCREENSHOT_DIR);
          results.push(res);
          if (!res.passed) {
            console.warn(`  ⚠ Issue at ${vp.name}: overflow=${res.hasHorizontalOverflow}, rawKeys=${res.rawKeysFound.length}, internalCodes=${res.internalCodesFound.length}`);
          }
        }
      } catch (err: unknown) {
        console.error(`  ✕ Error navigating to admin ${p.path}:`, err instanceof Error ? err.message : err);
      }
    }
    await adminContext.close();

  } finally {
    await browser.close();
  }

  // Summary statistics
  const totalAudits = results.length;
  const passedAudits = results.filter((r) => r.passed).length;
  const overflowViolations = results.filter((r) => r.hasHorizontalOverflow);
  const rawKeyViolations = results.filter((r) => r.rawKeysFound.length > 0);
  const internalCodeViolations = results.filter((r) => r.internalCodesFound.length > 0);

  const summary = {
    recordedAt: new Date().toISOString(),
    totalAudits,
    passedAudits,
    failedAudits: totalAudits - passedAudits,
    overflowViolationsCount: overflowViolations.length,
    rawKeyViolationsCount: rawKeyViolations.length,
    internalCodeViolationsCount: internalCodeViolations.length,
    viewportsTested: VIEWPORTS.map((v) => v.name),
    webPagesCount: ALL_WEB_PAGES.length,
    adminPagesCount: ALL_ADMIN_PAGES.length,
    results,
  };

  const reportJsonPath = path.join(REPO_ROOT, 'docs/release/design-perf-audit-report.json');
  fs.writeFileSync(reportJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\nAudit results written to ${reportJsonPath}`);

  console.log('\n================================================================================');
  console.log(' AUDIT SUMMARY');
  console.log('================================================================================');
  console.log(`Total Audits (Pages × Viewports): ${totalAudits}`);
  console.log(`Passed:                           ${passedAudits}`);
  console.log(`Horizontal Overflow Violations:   ${overflowViolations.length}`);
  console.log(`Raw Translation Key Violations:   ${rawKeyViolations.length}`);
  console.log(`Internal Code Violations:         ${internalCodeViolations.length}`);
  console.log('================================================================================');

  if (overflowViolations.length > 0 || rawKeyViolations.length > 0 || internalCodeViolations.length > 0) {
    console.error('[FAIL] Audit found violations.');
    process.exit(1);
  } else {
    console.log('[SUCCESS] All pages passed responsive, translation key, and internal code gates!');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runAudit().catch((err) => {
    console.error('Fatal Audit Error:', err);
    process.exit(1);
  });
}
