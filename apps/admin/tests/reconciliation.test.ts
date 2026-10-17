import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BackupService, ALLOWED_OPERATOR_JOBS, BackupManagerView } from '../features/backup';
import { AuditLogService } from '../features/users/audit-service';
import { AuditLogTimeline } from '../features/users/user-components';
import { BillingManager } from '../features/billing/billing-service';
import { ReconciliationManager } from '../features/billing/reconciliation-manager';
import type { StaffUser } from '../lib/auth-context';

describe('V04 Admin Reconciliation, Operator Backup & Audit Security', () => {
  const adminUser: StaffUser = {
    id: 'usr_admin_01',
    email: 'admin@jlpt.local',
    name: 'Quản trị viên Hệ thống',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const editorUser: StaffUser = {
    id: 'usr_editor_01',
    email: 'editor@jlpt.local',
    name: 'Biên tập viên',
    role: 'editor',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  describe('Acceptance 2: Admin backup không giữ raw secrets trong browser', () => {
    it('chỉ cho phép kích hoạt các operator job đã được phê duyệt (base-backup, export-bundle, restore-pitr)', () => {
      const backupService = new BackupService();

      expect(ALLOWED_OPERATOR_JOBS).toEqual(['base-backup', 'export-bundle', 'restore-pitr']);

      // Allowed jobs succeed
      const jobBase = backupService.triggerJob('base-backup', adminUser);
      expect(jobBase.jobType).toBe('base-backup');
      expect(jobBase.status).toBe('completed');

      const jobExport = backupService.triggerJob('export-bundle', adminUser);
      expect(jobExport.jobType).toBe('export-bundle');

      const jobPitr = backupService.triggerJob('restore-pitr', adminUser);
      expect(jobPitr.jobType).toBe('restore-pitr');
    });

    it('từ chối hoàn toàn lệnh shell injection hoặc operator job không thuộc danh mục cho phép', () => {
      const backupService = new BackupService();

      expect(() => {
        backupService.triggerJob('rm -rf /var/lib/postgresql', adminUser);
      }).toThrowError(/Từ chối lệnh trái phép/);

      expect(() => {
        backupService.triggerJob('arbitrary_sql_dump', adminUser);
      }).toThrowError(/Từ chối lệnh trái phép/);
    });

    it('từ chối người dùng không phải Admin kích hoạt operator backup jobs', () => {
      const backupService = new BackupService();

      expect(() => {
        backupService.triggerJob('base-backup', editorUser);
      }).toThrowError(/Chỉ quản trị viên cấp cao \(Admin\)/);
    });

    it('bảo vệ bí mật: trung hòa toàn bộ mật khẩu và secrets trước khi gửi hoặc lưu trong state trình duyệt', () => {
      const backupService = new BackupService();
      const rawSecretsConfig = {
        POSTGRES_PASSWORD: 'super_secret_db_password_123',
        WALG_S3_SECRET_KEY: 'walg_super_secret_access_key',
        PAYOS_CHECKSUM_KEY: 'payos_secret_checksum_key',
        JWT_AUTH_SECRET: 'jwt_signing_secret_xyz',
        NODE_ENV: 'production',
        PROFILE: 'small',
      };

      const sanitized = backupService.sanitizeConfig(rawSecretsConfig);

      // Sensitive values are completely masked
      expect(sanitized['POSTGRES_PASSWORD']).toBe('[REDACTED_SECRET]');
      expect(sanitized['WALG_S3_SECRET_KEY']).toBe('[REDACTED_SECRET]');
      expect(sanitized['PAYOS_CHECKSUM_KEY']).toBe('[REDACTED_SECRET]');
      expect(sanitized['JWT_AUTH_SECRET']).toBe('[REDACTED_SECRET]');

      // Non-sensitive values are preserved
      expect(sanitized['NODE_ENV']).toBe('production');
      expect(sanitized['PROFILE']).toBe('small');
    });

    it('BackupManagerView hiển thị an toàn và KHÔNG BAO GIỜ rò rỉ raw secrets vào HTML/DOM', () => {
      const backupService = new BackupService();
      const html = renderToStaticMarkup(
        React.createElement(BackupManagerView, { backupService, currentUser: adminUser }),
      );

      // Verify essential UI elements
      expect(html).toContain('data-testid="backup-management-panel"');
      expect(html).toContain('data-testid="backup-security-notice"');
      expect(html).toContain('data-testid="btn-trigger-base-backup"');
      expect(html).toContain('data-testid="btn-trigger-export-bundle"');
      expect(html).toContain('data-testid="btn-trigger-restore-pitr"');
      expect(html).toContain('data-testid="backup-jobs-table"');

      // ABSOLUTE INVARIANT: No raw secrets in markup
      expect(html).not.toContain('super_secret_db_password_123');
      expect(html).not.toContain('walg_secret_key_abc_xyz');
      expect(html).not.toContain('test_checksum_key_unleaked');
    });
  });

  describe('Acceptance 3: Mọi action audit có actor và tenant', () => {
    it('ghi nhận audit log bắt buộc phải có actor (id, email) và tenant (tenantId)', () => {
      const auditService = new AuditLogService();

      const entry = auditService.recordAction(
        {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          tenantId: 'tenant_hn_01',
        },
        'backup_job_trigger',
        'backup_jobs',
        'job_123',
        { jobType: 'base-backup' },
      );

      expect(entry.operatorId).toBe(adminUser.id);
      expect(entry.operatorEmail).toBe(adminUser.email);
      expect(entry.tenantId).toBe('tenant_hn_01');
      expect(entry.details['tenantId']).toBe('tenant_hn_01');
    });

    it('khi không truyền tenantId thì mặc định ghi nhận tenantId global (không bị null hay undefined)', () => {
      const auditService = new AuditLogService();

      const entry = auditService.recordAction(
        {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
        'role_change',
        'users',
        'usr_002',
      );

      expect(entry.tenantId).toBe('global');
      expect(entry.details['tenantId']).toBe('global');
    });

    it('AuditLogTimeline hiển thị đầy đủ thông tin Actor và Tenant cho mỗi dòng kiểm toán', () => {
      const auditService = new AuditLogService();
      auditService.recordAction(
        {
          id: 'u_admin_audit',
          email: 'audit_officer@jlpt.local',
          role: 'admin',
          tenantId: 'tenant_tokyo_center',
        },
        'backup_job_trigger',
        'backup_jobs',
        'job_pitr_drill',
      );

      const logs = auditService.listLogs(adminUser);
      const html = renderToStaticMarkup(React.createElement(AuditLogTimeline, { logs }));

      expect(html).toContain('audit_officer@jlpt.local');
      expect(html).toContain('tenant_tokyo_center');
      expect(html).toContain('Người thực hiện (Actor):');
      expect(html).toContain('Đơn vị (Tenant):');
    });

    it('cho phép lọc nhật ký kiểm toán theo tenantId', () => {
      const auditService = new AuditLogService();
      auditService.recordAction(
        { id: 'u1', email: 'a@test.local', role: 'admin', tenantId: 'tenant_A' },
        'role_change',
        'users',
        'target1',
      );
      auditService.recordAction(
        { id: 'u2', email: 'b@test.local', role: 'admin', tenantId: 'tenant_B' },
        'role_change',
        'users',
        'target2',
      );

      const logsA = auditService.listLogs(adminUser, { tenantId: 'tenant_A' });
      expect(logsA.length).toBe(1);
      expect(logsA[0]!.tenantId).toBe('tenant_A');

      const logsB = auditService.listLogs(adminUser, { tenantId: 'tenant_B' });
      expect(logsB.length).toBe(1);
      expect(logsB[0]!.tenantId).toBe('tenant_B');
    });
  });

  describe('Admin Commercial Reconciliation UI & Workflows', () => {
    it('BillingManager thực hiện đối soát và phát hiện đúng sai lệch số tiền', () => {
      const billingManager = new BillingManager();

      const externalStatements = [
        {
          reference: 'PAYOS_STMT_001',
          orderId: '0192a000-0000-7000-8000-000000000001',
          amountMinor: 150000, // Discrepancy! Internal order is 199.000
          currency: 'VND',
          status: 'PAID' as const,
        },
      ];

      const run = billingManager.runReconciliation('payos', externalStatements);
      expect(run.status).toBe('discrepancy_detected');
      expect(run.discrepanciesFound).toBe(1);
      expect(run.discrepancies?.[0]?.type).toBe('amount_mismatch');
    });

    it('ReconciliationManager hiển thị bảng phiên đối soát và nút chạy đối soát', () => {
      const billingManager = new BillingManager();
      const html = renderToStaticMarkup(
        React.createElement(ReconciliationManager, { billingManager, currentUser: adminUser }),
      );

      expect(html).toContain('data-testid="reconciliation-panel"');
      expect(html).toContain('data-testid="btn-run-reconciliation"');
      expect(html).toContain('data-testid="reconciliation-runs-table"');
      expect(html).toContain('rec_run_sample_1');
      expect(html).toContain('Khớp hoàn toàn');
    });
  });
});
