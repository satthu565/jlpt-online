import { describe, it, expect } from 'vitest';
import { AdminExportManager } from '../../infra/backup/admin-export.ts';

describe('Admin Operational Data Export (ADM-20)', () => {
  it('creates, sanitizes, and validates an admin export bundle', () => {
    const manager = new AdminExportManager();

    const sampleAudit = [
      {
        id: 'aud-1',
        actorId: 'usr-admin-secret-9999',
        action: 'exam_published',
        details: { examId: 'n3-2024-07' },
        createdAt: '2026-10-16T03:00:00.000Z',
      },
    ];

    const sampleAttempts = [
      {
        id: 'att-100',
        examId: 'n3-2024-07',
        userId: 'usr-sensitive-student-1234',
        mode: 'real',
        status: 'submitted',
        startedAt: '2026-10-16T02:00:00.000Z',
        submittedAt: '2026-10-16T03:45:00.000Z',
      },
    ];

    // Non-sanitized export
    const rawBundle = manager.createExportBundle({
      auditLogs: sampleAudit,
      examAttempts: sampleAttempts,
    });

    expect(manager.validateBundle(rawBundle)).toBe(true);
    expect(rawBundle.auditLogs[0]?.actorId).toBe('usr-admin-secret-9999');
    expect(rawBundle.examAttempts[0]?.userId).toBe('usr-sensitive-student-1234');

    // Sanitized PII export
    const sanitizedBundle = manager.createExportBundle(
      {
        auditLogs: sampleAudit,
        examAttempts: sampleAttempts,
      },
      { sanitizePii: true },
    );

    expect(manager.validateBundle(sanitizedBundle)).toBe(true);
    expect(sanitizedBundle.auditLogs[0]?.actorId).toContain('anonymized-actor-9999');
    expect(sanitizedBundle.examAttempts[0]?.userId).toContain('anonymized-user-1234');
  });
});
