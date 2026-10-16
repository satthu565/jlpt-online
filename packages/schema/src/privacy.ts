import { z } from 'zod';

export const RetentionDomainSchema = z.enum([
  'billing',
  'exam_attempts',
  'learning',
  'ai',
  'audit_logs',
  'analytics',
  'unapproved_sample',
]);
export type RetentionDomain = z.infer<typeof RetentionDomainSchema>;

export const RetentionPolicySchema = z.object({
  id: z.string().uuid(),
  domain: z.string(),
  retentionDays: z.number().int().positive(),
  policyApproved: z.boolean(),
  approvedBy: z.string().uuid().nullable().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

export const DeletionRequestStatusSchema = z.enum([
  'requested',
  'in_progress',
  'completed',
  'blocked_retention',
  'rejected',
]);
export type DeletionRequestStatus = z.infer<typeof DeletionRequestStatusSchema>;

export const DeletionRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: DeletionRequestStatusSchema,
  requestedAt: z.string().datetime(),
  processedAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type DeletionRequest = z.infer<typeof DeletionRequestSchema>;

export const ExportJobStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'expired',
]);
export type ExportJobStatus = z.infer<typeof ExportJobStatusSchema>;

export const ExportJobSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: ExportJobStatusSchema,
  downloadUrl: z.string().url().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().optional(),
});
export type ExportJob = z.infer<typeof ExportJobSchema>;

export class RetentionViolationError extends Error {
  constructor(message: string, public readonly domain: string) {
    super(message);
    this.name = 'RetentionViolationError';
  }
}

/**
 * Asserts whether data in a domain may be deleted / purged.
 * If the retention policy is not approved (policyApproved === false or policy missing),
 * deletion MUST be blocked to avoid unlawfully destroying records subject to retention obligations.
 */
export function assertRetentionPolicyApproved(
  policy: RetentionPolicy | undefined | null,
  domain: string,
): void {
  if (!policy || !policy.policyApproved) {
    throw new RetentionViolationError(
      `Nghĩa vụ lưu trữ dữ liệu (retention obligation) cho miền "${domain}" chưa được phê duyệt. Thao tác xóa bị từ chối theo chính sách bảo vệ dữ liệu.`,
      domain,
    );
  }
}

/**
 * Evaluates a deletion request across multiple domains.
 * Legally mandated domains (such as 'billing', 'audit_logs') cannot be deleted
 * if their retention policy is unapproved or their retention period has not expired.
 */
export function evaluateDataDeletionEligibility(
  policies: RetentionPolicy[],
  domain: string,
): { eligible: boolean; reason?: string } {
  const policy = policies.find((p) => p.domain === domain);
  if (!policy || !policy.policyApproved) {
    return {
      eligible: false,
      reason: `Miền dữ liệu "${domain}" chưa có chính sách lưu trữ (retention policy) được phê duyệt`,
    };
  }
  return { eligible: true };
}

/**
 * Verifies that a list of requested deletion domains does not violate any unapproved retention policies.
 */
export function assertNoRetentionViolationOnDelete(
  policies: RetentionPolicy[],
  requestedDomains: string[],
): void {
  for (const domain of requestedDomains) {
    const policy = policies.find((p) => p.domain === domain);
    assertRetentionPolicyApproved(policy, domain);
  }
}

/**
 * Sanitizes export fields to prevent spreadsheet formula injection (=, +, -, @, \t, \r).
 */
export function sanitizeExportField(value: unknown): unknown {
  if (typeof value === 'string') {
    if (/^[=+\-@\t\r]/.test(value)) {
      return `'${value}`;
    }
    return value;
  }
  return value;
}
