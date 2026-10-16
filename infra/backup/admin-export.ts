/**
 * JLPT Online - Admin Backup, Restore & Data Export Management
 * Feature: ADM-20 ("Sao lưu, phục hồi và xuất dữ liệu quản trị")
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AdminExportOptions {
  includeAuditLogs?: boolean;
  includeExamAttempts?: boolean;
  includeConfigSnapshots?: boolean;
  sanitizePii?: boolean;
}

export interface AdminExportBundle {
  schemaVersion: string;
  exportedAtUTC: string;
  system: {
    nodeEnv: string;
    profile: string;
  };
  auditLogs: Array<{
    id: string;
    actorId: string;
    action: string;
    details: unknown;
    createdAt: string;
  }>;
  examAttempts: Array<{
    id: string;
    examId: string;
    userId?: string;
    mode: string;
    status: string;
    startedAt: string;
    submittedAt?: string;
  }>;
  configSnapshots: Record<string, string>;
}

export class AdminExportManager {
  private outputDir: string;

  constructor(outputDir: string = '/opt/jlpt/backups/admin-export') {
    this.outputDir = outputDir;
  }

  public createExportBundle(
    data: {
      auditLogs: AdminExportBundle['auditLogs'];
      examAttempts: AdminExportBundle['examAttempts'];
      configSnapshots?: Record<string, string>;
    },
    options: AdminExportOptions = {},
  ): AdminExportBundle {
    const sanitize = options.sanitizePii ?? false;

    const sanitizedAudit = (data.auditLogs || []).map((log) => ({
      ...log,
      actorId: sanitize ? `anonymized-actor-${log.actorId.slice(-4)}` : log.actorId,
    }));

    const sanitizedAttempts = (data.examAttempts || []).map((att) => ({
      ...att,
      userId: att.userId && sanitize ? `anonymized-user-${att.userId.slice(-4)}` : att.userId,
    }));

    return {
      schemaVersion: '1.0.0',
      exportedAtUTC: new Date().toISOString(),
      system: {
        nodeEnv: process.env['NODE_ENV'] || 'production',
        profile: process.env['PROFILE'] || 'small',
      },
      auditLogs: options.includeAuditLogs !== false ? sanitizedAudit : [],
      examAttempts: options.includeExamAttempts !== false ? sanitizedAttempts : [],
      configSnapshots: options.includeConfigSnapshots !== false ? (data.configSnapshots || {}) : {},
    };
  }

  public saveBundleToFile(bundle: AdminExportBundle, fileName?: string): string {
    const targetName = fileName ?? `admin_export_${Date.now()}.json`;
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    const fullPath = path.join(this.outputDir, targetName);
    fs.writeFileSync(fullPath, JSON.stringify(bundle, null, 2), 'utf-8');
    return fullPath;
  }

  public validateBundle(bundle: unknown): bundle is AdminExportBundle {
    if (!bundle || typeof bundle !== 'object') return false;
    const b = bundle as Partial<AdminExportBundle>;
    return (
      typeof b.schemaVersion === 'string' &&
      typeof b.exportedAtUTC === 'string' &&
      Array.isArray(b.auditLogs) &&
      Array.isArray(b.examAttempts)
    );
  }
}
