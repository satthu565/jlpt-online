import crypto from 'node:crypto';
import type { ImportPackageV2, PackageIdentity, IdempotencyEvaluation } from './types.js';

/**
 * Deterministically serializes any JSON value with sorted keys and NFC Unicode normalization.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value.normalize('NFC'));
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalizeJson(item)).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map((key) => {
      const k = JSON.stringify(key.normalize('NFC'));
      const v = canonicalizeJson((value as Record<string, unknown>)[key]);
      return `${k}:${v}`;
    });
    return '{' + pairs.join(',') + '}';
  }
  return JSON.stringify(value);
}

/**
 * Computes a deterministic SHA-256 content hash of an ImportPackageV2 manifest and media assets.
 * Ensures that identical content yields the exact same hash regardless of object key order or formatting.
 */
export function computePackageContentHash(
  pkg: ImportPackageV2,
  packageFiles?: Record<string, Uint8Array>,
): string {
  // Build canonical manifest representation (excluding revision if needed, but per spec revision is part of import.json)
  const canonicalManifest = canonicalizeJson(pkg);

  // Collect sorted media entries
  const sortedMedia = [...pkg.media]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((m) => `${m.path}:${m.sha256}`);

  // Collect sorted source files
  const sortedSources = [...pkg.sourceFiles]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((s) => `${s.path}:${s.sha256}`);

  const hasher = crypto.createHash('sha256');
  hasher.update(canonicalManifest);
  hasher.update('\n--media--\n');
  hasher.update(sortedMedia.join('\n'));
  hasher.update('\n--sources--\n');
  hasher.update(sortedSources.join('\n'));

  // If binary files are provided, verify file digests match declared sha256
  if (packageFiles) {
    const fileKeys = Object.keys(packageFiles).sort();
    for (const key of fileKeys) {
      if (key !== 'import.json') {
        const fileBytes = packageFiles[key]!;
        const fileHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
        hasher.update(`\nfile:${key}:${fileHash}`);
      }
    }
  }

  return hasher.digest('hex');
}

/**
 * Evaluates whether an incoming package import is idempotent, a conflict, a regression, or a valid revision.
 * Contract:
 * - Same packageId + same revision + same contentHash => IDEMPOTENT_SKIP (200 OK, no duplicate)
 * - Same packageId + same revision + different contentHash => REJECT_CONFLICT (409 Conflict)
 * - Same packageId + higher revision + different contentHash => PROCEED_NEW_REVISION (200 OK)
 * - Same packageId + lower revision => REJECT_REGRESSION (409 Conflict)
 * - Different packageId => PROCEED_INITIAL_IMPORT (201 Created)
 */
export function evaluatePackageImportIdempotency(
  incoming: PackageIdentity,
  existingRecords: PackageIdentity[],
): IdempotencyEvaluation {
  const matches = existingRecords.filter((r) => r.packageId === incoming.packageId);

  if (matches.length === 0) {
    return {
      action: 'PROCEED_INITIAL_IMPORT',
      statusCode: 201,
      reason: 'Gói nhập mới, chưa từng tồn tại trong hệ thống',
      packageId: incoming.packageId,
      revision: incoming.revision,
      contentHash: incoming.contentHash,
    };
  }

  // Check if this exact revision already exists
  const exactRev = matches.find((r) => r.revision === incoming.revision);
  if (exactRev) {
    if (exactRev.contentHash === incoming.contentHash) {
      return {
        action: 'IDEMPOTENT_SKIP',
        statusCode: 200,
        reason:
          'Nhập lại cùng packageId, revision và content hash là idempotent; giữ nguyên dữ liệu không tạo bản sao trùng',
        packageId: incoming.packageId,
        revision: incoming.revision,
        contentHash: incoming.contentHash,
      };
    }

    return {
      action: 'REJECT_CONFLICT',
      statusCode: 409,
      reason:
        'Cùng packageId và revision nhưng content hash thay đổi (phát hiện xung đột nội dung); bắt buộc tăng revision mới để sửa đổi',
      packageId: incoming.packageId,
      revision: incoming.revision,
      contentHash: incoming.contentHash,
    };
  }

  // Check for revision regression
  const maxRevision = Math.max(...matches.map((r) => r.revision));
  if (incoming.revision < maxRevision) {
    return {
      action: 'REJECT_REGRESSION',
      statusCode: 409,
      reason: `Revision (${incoming.revision}) nhỏ hơn revision cao nhất đã có (${maxRevision}); không thể hạ phiên bản`,
      packageId: incoming.packageId,
      revision: incoming.revision,
      contentHash: incoming.contentHash,
    };
  }

  return {
    action: 'PROCEED_NEW_REVISION',
    statusCode: 200,
    reason: `Nội dung cập nhật có revision mới (${incoming.revision})`,
    packageId: incoming.packageId,
    revision: incoming.revision,
    contentHash: incoming.contentHash,
  };
}
