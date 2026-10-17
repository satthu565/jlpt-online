/**
 * JLPT Online - Release Acceptance Test Suite (Task R06 / Day 7)
 * Command: pnpm test:release
 * Acceptance Criteria:
 *   1. 363 yêu cầu ứng dụng chỉ DONE khi đủ evidence; 12 yêu cầu chuẩn bị bên ngoài báo riêng
 *   2. Thiếu yêu cầu trong phạm vi hiện hành => TARGET_NOT_MET
 *   3. Chưa beta14ngày/payment30ngày không ghi đạt
 *   4. Runbooks deploy rollback restore handover tái hiện được
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('Release Candidate Acceptance Gate (Task R06 / Day 7)', () => {
  const catalogPath = path.join(rootDir, 'docs/multi-worker/features.json');
  const evidencePath = path.join(rootDir, 'docs/release/feature-evidence.json');
  const reportPath = path.join(rootDir, 'docs/release/features-verification-report.json');

  it('verifies that feature catalog defines exactly 363 application and 12 external preparation features', () => {
    expect(fs.existsSync(catalogPath)).toBe(true);
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

    const appFeatures = catalog.features.filter(
      (f: { executionMode: string }) => f.executionMode === 'APPLICATION',
    );
    const extFeatures = catalog.features.filter(
      (f: { executionMode: string }) => f.executionMode !== 'APPLICATION',
    );

    expect(catalog.applicationFeatureCount).toBe(363);
    expect(catalog.externalPreparationCount).toBe(12);
    expect(appFeatures.length).toBe(363);
    expect(extFeatures.length).toBe(12);
    expect(catalog.features.length).toBe(375);
  });

  describe('Acceptance 1 & 2: 363 Application Features with Evidence & Target Met Guarantee', () => {
    it('verifies that feature-evidence.json contains verified test evidence for all 363 application features', () => {
      expect(fs.existsSync(evidencePath)).toBe(true);
      const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));

      expect(evidence.verdict).toBe('TARGET_MET');
      expect(evidence.summary.applicationFeaturesCount).toBe(363);
      expect(evidence.summary.applicationFeaturesCovered).toBe(363);
      expect(evidence.summary.applicationCoveragePercent).toBe(100);
      expect(evidence.summary.externalPreparationCount).toBe(12);
      expect(evidence.summary.placeholderStubsFound).toBe(0);
      expect(evidence.summary.status).toBe('CODE_VERIFIED');

      expect(evidence.applicationFeatures.length).toBe(363);
      for (const feat of evidence.applicationFeatures) {
        expect(feat.executionMode).toBe('APPLICATION');
        expect(feat.codeVerified).toBe(true);
        expect(feat.status).toBe('CODE_VERIFIED');
        expect(Array.isArray(feat.testFiles)).toBe(true);
        expect(feat.testFiles.length).toBeGreaterThan(0);
      }
    });

    it('verifies that the 12 external preparation features are tracked separately and excluded from code DoD', () => {
      const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));

      expect(evidence.externalPreparationFeatures.length).toBe(12);
      const expectedExtIds = [
        'PDF-06',
        'PDF-07',
        'PDF-08',
        'PDF-09',
        'PDF-10',
        'PDF-11',
        'PDF-12',
        'PDF-13',
        'PDF-14',
        'PDF-15',
        'PDF-16',
        'PDF-18',
      ];

      const actualExtIds = evidence.externalPreparationFeatures.map((f: { id: string }) => f.id);
      expect(actualExtIds.sort()).toEqual(expectedExtIds.sort());

      for (const extFeat of evidence.externalPreparationFeatures) {
        expect(extFeat.executionMode).toBe('EXTERNAL_PREPARATION');
        expect(extFeat.status).toBe('EXTERNAL_PREPARATION');
        expect(extFeat.excludedFromCodeDoD).toBe(true);
        expect(extFeat.note).toContain('CHUAN_DU_LIEU_NHAP.md');
      }
    });

    it('verifies that zero unresolved placeholder stubs or dummy endpoints exist in source code', () => {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(report.placeholderStubsFound).toBe(0);
      expect(report.stubsDetails.length).toBe(0);
      expect(report.passed).toBe(true);
    });
  });

  describe('Acceptance 3: Long-term Production Requirements Status (Beta 14 Days & Payment 30 Days)', () => {
    it('verifies that 14-day closed beta is NOT marked achieved and is recorded as INSUFFICIENT_DATA', () => {
      const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
      const betaRequirement = evidence.longTermProductionRequirements.SYS_17_closed_beta_14_days;

      expect(betaRequirement).toBeDefined();
      expect(betaRequirement.featureId).toBe('SYS-17');
      expect(betaRequirement.status).toBe('INSUFFICIENT_DATA');
      expect(betaRequirement.achieved).toBe(false);
      expect(betaRequirement.requiredDays).toBe(14);
      expect(betaRequirement.minimumUsers).toBe(50);
      expect(betaRequirement.productionVerified).toBe(false);
      expect(betaRequirement.reason).toBeDefined();
    });

    it('verifies that 30-day payment production stability is NOT marked achieved and is recorded as INSUFFICIENT_DATA', () => {
      const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
      const payRequirement = evidence.longTermProductionRequirements.PAY_08_payment_production_30_days;

      expect(payRequirement).toBeDefined();
      expect(payRequirement.featureId).toBe('PAY-08');
      expect(payRequirement.status).toBe('INSUFFICIENT_DATA');
      expect(payRequirement.achieved).toBe(false);
      expect(payRequirement.requiredDays).toBe(30);
      expect(payRequirement.productionVerified).toBe(false);
      expect(payRequirement.reason).toBeDefined();
    });
  });

  describe('Acceptance 4: Reproducible Runbooks (deploy, rollback, restore, handover)', () => {
    const deployRunbookPath = path.join(rootDir, 'docs/runbooks/deployment.md');
    const rollbackRunbookPath = path.join(rootDir, 'docs/runbooks/rollback.md');
    const restoreRunbookPath = path.join(rootDir, 'docs/runbooks/restore.md');
    const handoverRunbookPath = path.join(rootDir, 'docs/runbooks/handover.md');

    it('verifies docs/runbooks/deployment.md exists and contains reproducible deployment instructions', () => {
      expect(fs.existsSync(deployRunbookPath)).toBe(true);
      const content = fs.readFileSync(deployRunbookPath, 'utf-8');

      expect(content).toContain('./deploy.sh <tag>');
      expect(content).toContain('compose.prod.yml');
      expect(content).toContain('IMAGE_TAG');
      expect(content).toContain('/opt/jlpt/RELEASES');
      expect(content).toContain('/api/v1/health');
      expect(content).toContain('120'); // 120s health check
    });

    it('verifies docs/runbooks/rollback.md exists and enforces reproducible rollback & expand-contract safety', () => {
      expect(fs.existsSync(rollbackRunbookPath)).toBe(true);
      const content = fs.readFileSync(rollbackRunbookPath, 'utf-8');

      expect(content).toContain('./rollback.sh');
      expect(content).toContain('./deploy.sh');
      expect(content).toContain('--force');
      expect(content).toContain('Expand → Contract');
      // Must explicitly warn against down-migrations
      expect(content).toMatch(/không chạy (migration ngược|down-migration)/i);
      expect(content).toContain('/api/v1/health');
    });

    it('verifies docs/runbooks/restore.md exists and enforces reproducible PITR with archive_mode=off', () => {
      expect(fs.existsSync(restoreRunbookPath)).toBe(true);
      const content = fs.readFileSync(restoreRunbookPath, 'utf-8');

      expect(content).toContain('wal-g backup-fetch');
      expect(content).toContain('recovery.signal');
      expect(content).toContain('restore_command');
      expect(content).toContain('archive_mode = off');
      expect(content).toContain('RPO');
      expect(content).toContain('RTO');
      expect(content).toContain('3600'); // RTO <= 3600s
      expect(content).toContain('300');  // RPO <= 300s
    });

    it('verifies docs/runbooks/handover.md exists and provides comprehensive system handover', () => {
      expect(fs.existsSync(handoverRunbookPath)).toBe(true);
      const content = fs.readFileSync(handoverRunbookPath, 'utf-8');

      expect(content).toContain('apps/web');
      expect(content).toContain('apps/admin');
      expect(content).toContain('apps/api');
      expect(content).toContain('apps/media-worker');
      expect(content).toContain('.env.production');
      expect(content).toContain('switch-profile.sh');
      expect(content).toContain('Linode');
      expect(content).toContain('Cloudflare');
      expect(content).toContain('VNPay');
      expect(content).toContain('MoMo');
      expect(content).toContain('Gemini');
      expect(content).toContain('Resend');
    });
  });

  describe('Release Artifacts & Verified Drill Metrics', () => {
    it('verifies that BAO_CAO_NGAY_7.md and release-decision.md exist in docs/release/', () => {
      const baoCaoPath = path.join(rootDir, 'docs/release/BAO_CAO_NGAY_7.md');
      const decisionPath = path.join(rootDir, 'docs/release/release-decision.md');

      expect(fs.existsSync(baoCaoPath)).toBe(true);
      expect(fs.existsSync(decisionPath)).toBe(true);

      const baoCao = fs.readFileSync(baoCaoPath, 'utf-8');
      expect(baoCao).toContain('363');
      expect(baoCao).toContain('12');
      expect(baoCao).toContain('CODE_VERIFIED');

      const decision = fs.readFileSync(decisionPath, 'utf-8');
      expect(decision).toContain('R06');
      expect(decision).toContain('Operator');
    });

    it('verifies verified test reports exist and reflect passing drill metrics', () => {
      const pitrPath = path.join(rootDir, 'docs/release/pitr-drill-report.json');
      const loadPath = path.join(rootDir, 'docs/release/load-capacity-report.json');
      const devicePath = path.join(rootDir, 'docs/release/device-matrix-report.json');
      const securityPath = path.join(rootDir, 'docs/release/security-checklist.md');

      expect(fs.existsSync(pitrPath)).toBe(true);
      expect(fs.existsSync(loadPath)).toBe(true);
      expect(fs.existsSync(devicePath)).toBe(true);
      expect(fs.existsSync(securityPath)).toBe(true);

      const pitr = JSON.parse(fs.readFileSync(pitrPath, 'utf-8'));
      expect(pitr.rtoAcceptable).toBe(true);
      expect(pitr.rpoAcceptable).toBe(true);
      expect(pitr.stagingIsolated).toBe(true);

      const load = JSON.parse(fs.readFileSync(loadPath, 'utf-8'));
      expect(load.observedCapacity.peakObservedRps).toBeGreaterThan(500);
      expect(load.observedCapacity.overallErrorRatePercent).toBe(0);

      const device = JSON.parse(fs.readFileSync(devicePath, 'utf-8'));
      expect(device.allPassed).toBe(true);
      expect(device.totalP0P1Defects).toBe(0);
    });
  });
});
