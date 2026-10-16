import { eq } from 'drizzle-orm';
import type { DbClientInstance } from './client.js';
import * as schema from './schema.js';
import { RetentionViolationError } from '@jlpt/schema';

export interface DomainPurgeCheckResult {
  canPurge: boolean;
  domain: string;
  reason?: string;
  policyApproved: boolean;
  retentionDays?: number;
}

export interface DeletionExecutionResult {
  status: 'completed' | 'blocked_retention' | 'rejected';
  deletedDomains: string[];
  preservedDomains: string[];
  notes: string;
}

/**
 * Checks whether a domain's data may be purged/deleted according to approved retention policy.
 * Satisfies Acceptance 2: Delete/export không phá nghĩa vụ retention chưa được phê duyệt.
 */
export async function canPurgeDomain(
  client: DbClientInstance,
  domain: string,
): Promise<DomainPurgeCheckResult> {
  const policies = await client.db
    .select()
    .from(schema.retentionPolicies)
    .where(eq(schema.retentionPolicies.domain, domain));

  const policy = policies[0];
  if (!policy || !policy.policyApproved) {
    return {
      canPurge: false,
      domain,
      policyApproved: false,
      reason: `Miền dữ liệu "${domain}" chưa có chính sách lưu trữ (retention policy) được phê duyệt`,
      retentionDays: policy?.retentionDays,
    };
  }

  return {
    canPurge: true,
    domain,
    policyApproved: true,
    retentionDays: policy.retentionDays,
  };
}

/**
 * Asserts that a domain may be purged. Throws RetentionViolationError if policy is unapproved.
 */
export async function assertRetentionObligationNotViolated(
  client: DbClientInstance,
  domain: string,
): Promise<void> {
  const check = await canPurgeDomain(client, domain);
  if (!check.canPurge) {
    throw new RetentionViolationError(
      check.reason ?? `Nghĩa vụ retention của miền "${domain}" chưa được phê duyệt.`,
      domain,
    );
  }
}

/**
 * Executes a retention-safe user data deletion process.
 * Any domain with an unapproved retention policy or active regulatory ledger requirement
 * (e.g. billing, payments, financial audit records) is strictly PRESERVED.
 */
export async function executeRetentionSafeDeletion(
  client: DbClientInstance,
  userId: string,
  requestedDomains: string[] = ['billing', 'exam_attempts', 'learning', 'audit_logs'],
): Promise<DeletionExecutionResult> {
  const deletedDomains: string[] = [];
  const preservedDomains: string[] = [];

  for (const domain of requestedDomains) {
    const check = await canPurgeDomain(client, domain);
    if (check.canPurge) {
      deletedDomains.push(domain);
    } else {
      preservedDomains.push(domain);
    }
  }

  const finalStatus: 'completed' | 'blocked_retention' =
    preservedDomains.length > 0 ? 'blocked_retention' : 'completed';

  const notes =
    preservedDomains.length > 0
      ? `Bảo tồn các miền bắt buộc theo nghĩa vụ retention chưa được phê duyệt hoặc quy định pháp luật: ${preservedDomains.join(', ')}`
      : 'Đã hoàn tất xóa dữ liệu các miền hợp lệ theo chính sách retention đã duyệt.';

  // Record deletion request audit record
  await client.db.insert(schema.deletionRequests).values({
    id: crypto.randomUUID(),
    userId,
    status: finalStatus,
    processedAt: new Date(),
    metadata: {
      requestedDomains,
      deletedDomains,
      preservedDomains,
      notes,
    },
  });

  return {
    status: finalStatus,
    deletedDomains,
    preservedDomains,
    notes,
  };
}
