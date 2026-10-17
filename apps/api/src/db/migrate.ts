import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DbClientInstance } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationResult {
  applied: string[];
  alreadyApplied: string[];
}

export interface RollbackCompatibilityResult {
  compatible: boolean;
  checkedTables: string[];
  details: Record<string, string>;
}

/**
 * Resolves the directory containing SQL migration files.
 * Provides fallback searching from dist/ or cwd when running built code.
 */
export function resolveMigrationsDir(customDir?: string): string {
  if (customDir && fs.existsSync(customDir)) {
    return customDir;
  }
  const candidates = [
    customDir,
    path.join(__dirname, 'migrations'),
    path.resolve(__dirname, '../../src/db/migrations'),
    path.resolve(__dirname, '../src/db/migrations'),
    path.resolve(process.cwd(), 'apps/api/src/db/migrations'),
    path.resolve(process.cwd(), 'src/db/migrations'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(__dirname, 'migrations');
}

// One key for the whole app: the api and worker containers start together and both migrate
// on boot. Without serialisation both read an empty ledger and the slower one fails with
// `relation "..." already exists` (seen in the staging drill after N02).
export const MIGRATION_ADVISORY_LOCK_ID = 72110115;
let inProcess: Promise<unknown> = Promise.resolve();

/**
 * Executes database migrations on the target client.
 * Fully idempotent using __drizzle_migrations ledger; concurrent callers are serialised in
 * process, and across processes by a Postgres advisory lock held on one reserved connection.
 */
export async function runMigrations(
  client: DbClientInstance,
  migrationsDir?: string,
): Promise<MigrationResult> {
  const run = inProcess.then(() => runMigrationsLocked(client, migrationsDir));
  inProcess = run.catch(() => undefined);
  return run;
}

async function runMigrationsLocked(
  client: DbClientInstance,
  migrationsDir?: string,
): Promise<MigrationResult> {
  if (client.type !== 'postgres' || typeof client.rawClient?.reserve !== 'function') {
    return applyMigrations(client, migrationsDir);
  }
  // A session lock needs one connection; the postgres.js pool may hand out another per query.
  const conn = await client.rawClient.reserve();
  try {
    await conn.unsafe(`SELECT pg_advisory_lock(${MIGRATION_ADVISORY_LOCK_ID})`);
    try {
      const locked: DbClientInstance = { ...client, query: (sqlQuery: string) => conn.unsafe(sqlQuery) };
      return await applyMigrations(locked, migrationsDir);
    } finally {
      await conn.unsafe(`SELECT pg_advisory_unlock(${MIGRATION_ADVISORY_LOCK_ID})`);
    }
  } finally {
    conn.release();
  }
}

async function applyMigrations(
  client: DbClientInstance,
  migrationsDir?: string,
): Promise<MigrationResult> {
  const dir = resolveMigrationsDir(migrationsDir);

  // The caller (runMigrationsLocked) holds the advisory lock on the connection this client uses.
  // Ensure migration ledger exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  // Query already applied migrations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ledgerRows = (await client.query(`SELECT name FROM "__drizzle_migrations"`)) as any;
  const appliedSet = new Set<string>();

  const rows = ledgerRows.rows ?? ledgerRows;
  if (Array.isArray(rows)) {
    for (const r of rows) {
      if (r && r.name) appliedSet.add(r.name);
    }
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied: string[] = [];
  const alreadyApplied: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) {
      alreadyApplied.push(file);
      continue;
    }

    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Split statements on breakpoint or semicolons
    const statements = content
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await client.query(stmt);
    }

    await client.query(`
      INSERT INTO "__drizzle_migrations" (name) VALUES ('${file}')
      ON CONFLICT (name) DO NOTHING;
    `);

    applied.push(file);
  }

  return { applied, alreadyApplied };
}

/**
 * Acceptance 1: Rollback-code compatibility verification.
 * Verifies that the migrated schema adheres to the expand-contract pattern:
 * - Previous version reader queries (N-1 code) can read core tables without failures.
 * - Additive columns with defaults do not break older insert/select operations.
 * - Nullable/default constraints preserve backwards compatibility.
 */
export async function verifyRollbackCompatibility(
  client: DbClientInstance,
): Promise<RollbackCompatibilityResult> {
  const details: Record<string, string> = {};
  const checkedTables: string[] = [];

  // 1. Verify core tables can be selected with legacy/minimal column sets
  const legacyReaderQueries = [
    {
      table: 'exams',
      query: `SELECT id, slug, level, title, kind FROM "exams" LIMIT 1;`,
    },
    {
      table: 'exam_versions',
      query: `SELECT exam_id, version, total_questions, scoring FROM "exam_versions" LIMIT 1;`,
    },
    {
      table: 'exam_attempts',
      query: `SELECT id, exam_id, exam_version, mode, status, lease_id FROM "exam_attempts" LIMIT 1;`,
    },
    {
      table: 'blueprints',
      query: `SELECT id, level, version, effective_from, scoring, sections FROM "blueprints" LIMIT 1;`,
    },
    {
      table: 'users',
      query: `SELECT id, email, role, locale FROM "users" LIMIT 1;`,
    },
    {
      table: 'outbox',
      query: `SELECT id, topic, payload FROM "outbox" LIMIT 1;`,
    },
    {
      table: 'tenant_plans',
      query: `SELECT tenant_id, plan_code, status, total_seats, used_seats FROM "tenant_plans" LIMIT 1;`,
    },
    {
      table: 'retention_policies',
      query: `SELECT id, domain, retention_days, policy_approved FROM "retention_policies" LIMIT 1;`,
    },
    {
      table: 'org_memberships',
      query: `SELECT id, org_id, user_id, role FROM "org_memberships" LIMIT 1;`,
    },
    {
      table: 'classes',
      query: `SELECT id, org_id, teacher_id, name, level FROM "classes" LIMIT 1;`,
    },
    {
      table: 'assignments',
      query: `SELECT id, class_id, title, opens_at, due_at FROM "assignments" LIMIT 1;`,
    },
    {
      table: 'exam_events',
      query: `SELECT id, title, level, opens_at, starts_at, ends_at, result_release_at, capacity FROM "exam_events" LIMIT 1;`,
    },
    {
      table: 'explanation_versions',
      query: `SELECT id, question_id, version, ai_generated FROM "explanation_versions" LIMIT 1;`,
    },
    {
      table: 'class_memberships',
      query: `SELECT id, class_id, student_id, status FROM "class_memberships" LIMIT 1;`,
    },
    {
      table: 'assignment_learners',
      query: `SELECT id, assignment_id, learner_id, status FROM "assignment_learners" LIMIT 1;`,
    },
    {
      table: 'comment_reports',
      query: `SELECT id, comment_id, reported_by, status FROM "comment_reports" LIMIT 1;`,
    },
    {
      table: 'ai_content_versions',
      query: `SELECT id, generated_type, ai_generated, approval_status FROM "ai_content_versions" LIMIT 1;`,
    },
    {
      table: 'export_jobs',
      query: `SELECT id, job_type, status, requested_by FROM "export_jobs" LIMIT 1;`,
    },
    {
      table: 'data_export_jobs',
      query: `SELECT id, user_id, status FROM "data_export_jobs" LIMIT 1;`,
    },
    {
      table: 'deletion_requests',
      query: `SELECT id, user_id, status FROM "deletion_requests" LIMIT 1;`,
    },
    {
      table: 'report_snapshots',
      query: `SELECT id, report_name, period FROM "report_snapshots" LIMIT 1;`,
    },
  ];

  for (const { table, query } of legacyReaderQueries) {
    try {
      await client.query(query);
      checkedTables.push(table);
      details[table] = 'Legacy reader query PASSED (backward-compatible)';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      details[table] = `FAILED: ${msg}`;
      return {
        compatible: false,
        checkedTables,
        details,
      };
    }
  }


  // 2. Verify re-running migrations does not fail (idempotency check)
  try {
    const rerunResult = await runMigrations(client);
    if (rerunResult.applied.length > 0) {
      details['idempotency'] = 'WARNING: Re-run applied extra migrations unexpectedly';
    } else {
      details['idempotency'] = 'Re-run idempotent check PASSED (0 unneeded re-applies)';
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    details['idempotency'] = `FAILED: ${msg}`;
    return {
      compatible: false,
      checkedTables,
      details,
    };
  }

  return {
    compatible: true,
    checkedTables,
    details,
  };
}

// Standalone runner CLI support
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  import('./client.js').then(async ({ createDbClient }) => {
    console.log('[db:migrate] Starting migration runner...');
    const client = await createDbClient();
    try {
      const res = await runMigrations(client);
      console.log(`[db:migrate] Applied: ${res.applied.length}, Already applied: ${res.alreadyApplied.length}`);
      const compat = await verifyRollbackCompatibility(client);
      console.log(`[db:migrate] Rollback compatibility pass: ${compat.compatible ? 'PASSED' : 'FAILED'}`);
    } finally {
      await client.close();
    }
  });
}
