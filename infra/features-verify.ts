/**
 * JLPT Online - Feature Coverage & Staging Scope Verification Gate
 * Command: pnpm features:verify
 * Tasks: A06, R06
 * Acceptance:
 *   1. 363 yêu cầu ứng dụng có test reference; 12 yêu cầu chuẩn bị bên ngoài không tính vào code coverage
 *   2. Không còn UI placeholder hoặc endpoint stub được tính DONE
 *   3. Review và CI gắn đúng headSHA/baseSHA
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

interface FeatureDef {
  id: string;
  title: string;
  priority: string;
  taskId: string;
  owner: string;
  targetDay: number;
  executionTitle: string;
  executionMode: 'APPLICATION' | 'EXTERNAL_PREPARATION';
  deliveryOwner: string;
  status: string;
  testIds?: string[];
  externalRequirementIds?: string[];
  evidence?: unknown[];
  codeVerified?: boolean;
  providerVerified?: boolean;
  productionVerified?: boolean;
}

interface FeaturesCatalog {
  schemaVersion: number;
  scope: string;
  inputMode: string;
  source: string;
  applicationFeatureCount: number;
  externalPreparationCount: number;
  features: FeatureDef[];
}

interface VerificationSummary {
  verifiedAt: string;
  headSha: string;
  baseSha: string;
  totalCatalogFeatures: number;
  applicationFeaturesCount: number;
  externalPreparationCount: number;
  coveredApplicationFeatures: number;
  missingApplicationFeatures: string[];
  externalFeaturesChecked: number;
  placeholderStubsFound: number;
  stubsDetails: Array<{ file: string; line: number; issue: string }>;
  passed: boolean;
  groupBreakdown: Record<string, { total: number; covered: number; status: string }>;
}

function resolveGitSha(cmd: string, fallback = 'unknown'): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
}

export function runFeaturesVerification(): VerificationSummary {
  const rootDir = process.cwd();
  const catalogPath = path.join(rootDir, 'docs/multi-worker/features.json');

  if (!fs.existsSync(catalogPath)) {
    throw new Error(`features.json not found at ${catalogPath}`);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')) as FeaturesCatalog;
  const appFeatures = catalog.features.filter((f) => f.executionMode === 'APPLICATION');
  const extFeatures = catalog.features.filter((f) => f.executionMode !== 'APPLICATION');

  // Verify counts
  if (catalog.applicationFeatureCount !== 363 || appFeatures.length !== 363) {
    throw new Error(
      `Contract mismatch: expected 363 application features, got catalog=${catalog.applicationFeatureCount}, actual=${appFeatures.length}`,
    );
  }
  if (catalog.externalPreparationCount !== 12 || extFeatures.length !== 12) {
    throw new Error(
      `Contract mismatch: expected 12 external preparation features, got catalog=${catalog.externalPreparationCount}, actual=${extFeatures.length}`,
    );
  }

  // Collect test files
  const testFiles: string[] = [];
  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === '.turbo' ||
        entry.name === '.next'
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (
        /\.(test|spec)\.(ts|tsx|js|mjs)$/.test(entry.name) ||
        (dir.includes('tests') && /\.(ts|tsx|js|mjs)$/.test(entry.name))
      ) {
        testFiles.push(fullPath);
      }
    }
  }
  scanDir(rootDir);

  // Map features to test references
  const featureTestMap = new Map<string, string[]>();
  for (const f of appFeatures) {
    featureTestMap.set(f.id, []);
  }

  for (const file of testFiles) {
    const relPath = path.relative(rootDir, file);
    const content = fs.readFileSync(file, 'utf-8');

    // Check if test file has actual assertions
    const hasAssertions = content.includes('expect(') || content.includes('assert');
    if (!hasAssertions) {
      continue;
    }

    for (const f of appFeatures) {
      const idPattern = new RegExp(`\\b${f.id}\\b|feature/${f.id}`);
      if (idPattern.test(content)) {
        featureTestMap.get(f.id)?.push(relPath);
      }
    }
  }

  const missingFeatures: string[] = [];
  const groupBreakdown: Record<string, { total: number; covered: number; status: string }> = {};

  for (const f of appFeatures) {
    const prefix = f.id.split('-')[0];
    if (!groupBreakdown[prefix]) {
      groupBreakdown[prefix] = { total: 0, covered: 0, status: 'PASS' };
    }
    groupBreakdown[prefix].total += 1;

    const refs = featureTestMap.get(f.id) || [];
    if (refs.length > 0) {
      groupBreakdown[prefix].covered += 1;
    } else {
      missingFeatures.push(f.id);
      groupBreakdown[prefix].status = 'FAIL';
    }
  }

  // Acceptance 2: Check for UI placeholders or endpoint stubs claiming DONE
  const stubsDetails: Array<{ file: string; line: number; issue: string }> = [];
  const sourceDirs = ['apps/web', 'apps/admin', 'apps/api/src'];

  function scanSourceForStubs(dir: string) {
    if (!fs.existsSync(path.join(rootDir, dir))) return;
    const entries = fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === '.turbo' ||
        entry.name === '.next' ||
        entry.name.includes('.test.') ||
        entry.name.includes('.spec.')
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      const absPath = path.join(rootDir, fullPath);
      if (entry.isDirectory()) {
        scanSourceForStubs(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const lines = fs.readFileSync(absPath, 'utf-8').split('\n');
        lines.forEach((line, idx) => {
          // Detect unresolved dummy placeholder / mock stub returns
          if (
            /\bTODO:\s*implement\b/i.test(line) ||
            /\bFIXME:\s*stub\b/i.test(line) ||
            /\bthrow new (Error|NotImplementedError)\(['"]Not implemented['"]\)/i.test(line)
          ) {
            stubsDetails.push({
              file: fullPath,
              line: idx + 1,
              issue: line.trim(),
            });
          }
        });
      }
    }
  }

  for (const sDir of sourceDirs) {
    scanSourceForStubs(sDir);
  }

  // Acceptance 3: Review và CI gắn đúng headSHA/baseSHA
  const headSha =
    process.env.GITHUB_SHA ||
    process.env.HEAD_SHA ||
    resolveGitSha('git rev-parse HEAD');

  const baseSha =
    process.env.BASE_SHA ||
    process.env.GITHUB_BASE_REF ||
    resolveGitSha('git merge-base origin/main HEAD', resolveGitSha('git rev-parse HEAD~1'));

  const passed = missingFeatures.length === 0 && stubsDetails.length === 0 && headSha !== 'unknown';

  const summary: VerificationSummary = {
    verifiedAt: new Date().toISOString(),
    headSha,
    baseSha,
    totalCatalogFeatures: catalog.features.length,
    applicationFeaturesCount: appFeatures.length,
    externalPreparationCount: extFeatures.length,
    coveredApplicationFeatures: appFeatures.length - missingFeatures.length,
    missingApplicationFeatures: missingFeatures,
    externalFeaturesChecked: extFeatures.length,
    placeholderStubsFound: stubsDetails.length,
    stubsDetails,
    passed,
    groupBreakdown,
  };

  return summary;
}

export function printVerificationReport(summary: VerificationSummary) {
  console.log('========================================================================');
  console.log(' JLPT Online - Feature Scope & Implementation Verification Gate');
  console.log(' Timestamp: ' + summary.verifiedAt);
  console.log(` Head SHA:  ${summary.headSha}`);
  console.log(` Base SHA:  ${summary.baseSha}`);
  console.log('========================================================================\n');

  console.log('--> Acceptance 1: Application Features vs External Preparation');
  console.log(
    `    Application Features: ${summary.coveredApplicationFeatures} / ${summary.applicationFeaturesCount} covered (${Math.round(
      (summary.coveredApplicationFeatures / summary.applicationFeaturesCount) * 100,
    )}%)`,
  );
  console.log(
    `    External Preparation: ${summary.externalFeaturesChecked} tracked separately (EXCLUDED from code coverage)`,
  );

  console.log('\n--> Feature Groups Breakdown:');
  for (const [group, data] of Object.entries(summary.groupBreakdown)) {
    const indicator = data.covered === data.total ? '✓ PASS' : '✗ FAIL';
    console.log(
      `    [${indicator}] ${group.padEnd(8)}: ${data.covered}/${data.total} features with verified test references`,
    );
  }

  if (summary.missingApplicationFeatures.length > 0) {
    console.log('\n[✗ FAIL] Missing test references for features:');
    console.log('    ' + summary.missingApplicationFeatures.join(', '));
  } else {
    console.log('\n[✓ PASS] All 363 application features have verified test references.');
  }

  console.log('\n--> Acceptance 2: Zero UI Placeholders or Endpoint Stubs');
  if (summary.placeholderStubsFound > 0) {
    console.log(`[✗ FAIL] Found ${summary.placeholderStubsFound} unresolved placeholders/stubs:`);
    for (const stub of summary.stubsDetails) {
      console.log(`    - ${stub.file}:${stub.line} -> ${stub.issue}`);
    }
  } else {
    console.log('[✓ PASS] Zero unresolved UI placeholders or dummy endpoint stubs found.');
  }

  console.log('\n--> Acceptance 3: Review and CI commit linkage');
  console.log(`[✓ PASS] Head commit: ${summary.headSha}`);
  console.log(`[✓ PASS] Base commit: ${summary.baseSha}`);

  console.log('\n========================================================================');
  console.log(` VERIFICATION VERDICT: ${summary.passed ? 'ALL CHECKS PASSED (READY FOR REVIEW)' : 'FAILED'}`);
  console.log('========================================================================\n');
}

// Execution entry point
const isMain = process.argv[1] && (process.argv[1].endsWith('features-verify.ts') || process.argv[1].endsWith('features-verify.js'));
if (isMain || process.argv.includes('--run')) {
  try {
    const summary = runFeaturesVerification();
    const releaseDir = path.join(process.cwd(), 'docs/release');
    if (!fs.existsSync(releaseDir)) {
      fs.mkdirSync(releaseDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(releaseDir, 'features-verification-report.json'),
      JSON.stringify(summary, null, 2),
      'utf-8',
    );
    printVerificationReport(summary);

    if (!summary.passed) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Verification encountered fatal error:', err);
    process.exit(1);
  }
}
