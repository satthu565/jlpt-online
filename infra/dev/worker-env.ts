/**
 * JLPT Online - Worker Environment and Services Mapping
 * Task: F07
 * Specification: docs/multi-worker/config/workers.example.json & VAN_HANH_VPS_WORKER.md
 */

export interface WorkerPorts {
  readonly web: number;
  readonly admin: number;
  readonly api: number;
}

export interface WorkerConfig {
  readonly id: string;
  readonly role: string;
  readonly linuxUser: string;
  readonly repo: string;
  readonly home: string;
  readonly database: string;
  readonly dbUser: string;
  readonly dbPassword?: string;
  readonly databaseUrl: string;
  readonly redisCoreNamespace: string;
  readonly redisCacheNamespace: string;
  readonly bullmqPrefix: string;
  readonly storageRoot: string;
  readonly ports: WorkerPorts;
  readonly allowedRoots: readonly string[];
}

export const WORKER_IDS = ["W1", "W2", "W3", "W4", "W5", "W6"] as const;
export type WorkerId = (typeof WORKER_IDS)[number];

export const WORKER_CONFIGS: Record<WorkerId, WorkerConfig> = {
  W1: {
    id: "W1",
    role: "Hợp đồng dữ liệu và logic thi",
    linuxUser: "jlpt-w1",
    repo: "/srv/jlpt-workers/w1/repo",
    home: "/home/jlpt-w1",
    database: "jlpt_w1",
    dbUser: "jlpt_w1",
    dbPassword: "jlpt_w1_pass",
    databaseUrl: "postgres://jlpt_w1:jlpt_w1_pass@127.0.0.1:5432/jlpt_w1",
    redisCoreNamespace: "jlpt:w1:core:",
    redisCacheNamespace: "jlpt:w1:cache:",
    bullmqPrefix: "jlpt-w1",
    storageRoot: "/srv/jlpt-workers/w1/data",
    ports: {
      web: 3100,
      admin: 3101,
      api: 4100,
    },
    allowedRoots: [
      "package.json",
      "packages/schema/",
      "packages/exam-engine/",
      "packages/media-token/",
      "packages/srs/",
      "packages/api-client/",
      "contracts/",
      "fixtures/contracts/",
      "apps/api/src/db/",
      "docs/decisions/",
    ],
  },
  W2: {
    id: "W2",
    role: "API tài khoản nội dung và thi",
    linuxUser: "jlpt-w2",
    repo: "/srv/jlpt-workers/w2/repo",
    home: "/home/jlpt-w2",
    database: "jlpt_w2",
    dbUser: "jlpt_w2",
    dbPassword: "jlpt_w2_pass",
    databaseUrl: "postgres://jlpt_w2:jlpt_w2_pass@127.0.0.1:5432/jlpt_w2",
    redisCoreNamespace: "jlpt:w2:core:",
    redisCacheNamespace: "jlpt:w2:cache:",
    bullmqPrefix: "jlpt-w2",
    storageRoot: "/srv/jlpt-workers/w2/data",
    ports: {
      web: 3200,
      admin: 3201,
      api: 4200,
    },
    allowedRoots: [
      "package.json",
      "apps/api/package.json",
      "apps/api/src/common/",
      "apps/api/src/modules/auth/",
      "apps/api/src/modules/user/",
      "apps/api/src/modules/exam/",
      "apps/api/src/modules/attempt/",
      "apps/api/src/modules/question-bank/",
      "apps/api/src/modules/import/",
      "apps/api/src/modules/media/",
      "apps/api/src/modules/review/",
      "apps/api/src/modules/storage/",
      "apps/api/src/modules/license/",
      "apps/api/src/modules/blueprint/",
      "apps/api/src/modules/audit/",
      "apps/api/src/modules/notification/",
      "apps/api/src/modules/community/",
      "apps/api/src/modules/classroom/",
      "apps/api/src/modules/scoring/",
      "apps/api/src/modules/outbox/",
      "apps/api/src/modules/email/",
      "apps/api/src/modules/admin/",
      "apps/api/src/modules/turnstile/",
      "apps/api/src/main.ts",
      "apps/api/src/app.module.ts",
      "docs/decisions/",
    ],
  },
  W3: {
    id: "W3",
    role: "Giao diện học viên",
    linuxUser: "jlpt-w3",
    repo: "/srv/jlpt-workers/w3/repo",
    home: "/home/jlpt-w3",
    database: "jlpt_w3",
    dbUser: "jlpt_w3",
    dbPassword: "jlpt_w3_pass",
    databaseUrl: "postgres://jlpt_w3:jlpt_w3_pass@127.0.0.1:5432/jlpt_w3",
    redisCoreNamespace: "jlpt:w3:core:",
    redisCacheNamespace: "jlpt:w3:cache:",
    bullmqPrefix: "jlpt-w3",
    storageRoot: "/srv/jlpt-workers/w3/data",
    ports: {
      web: 3300,
      admin: 3301,
      api: 4300,
    },
    allowedRoots: [
      "package.json",
      "apps/web/",
      "packages/ui/",
      "docs/decisions/",
    ],
  },
  W4: {
    id: "W4",
    role: "Quản trị báo cáo và thương mại",
    linuxUser: "jlpt-w4",
    repo: "/srv/jlpt-workers/w4/repo",
    home: "/home/jlpt-w4",
    database: "jlpt_w4",
    dbUser: "jlpt_w4",
    dbPassword: "jlpt_w4_pass",
    databaseUrl: "postgres://jlpt_w4:jlpt_w4_pass@127.0.0.1:5432/jlpt_w4",
    redisCoreNamespace: "jlpt:w4:core:",
    redisCacheNamespace: "jlpt:w4:cache:",
    bullmqPrefix: "jlpt-w4",
    storageRoot: "/srv/jlpt-workers/w4/data",
    ports: {
      web: 3400,
      admin: 3401,
      api: 4400,
    },
    allowedRoots: [
      "package.json",
      "apps/admin/",
      "apps/api/src/modules/payment/",
      "apps/api/src/modules/entitlement/",
      "apps/api/src/modules/reporting/",
      "apps/api/src/modules/cms/",
      "apps/api/src/modules/experiment/",
      "docs/decisions/",
    ],
  },
  W5: {
    id: "W5",
    role: "Chuẩn nhập liệu dữ liệu và học thông minh",
    linuxUser: "jlpt-w5",
    repo: "/srv/jlpt-workers/w5/repo",
    home: "/home/jlpt-w5",
    database: "jlpt_w5",
    dbUser: "jlpt_w5",
    dbPassword: "jlpt_w5_pass",
    databaseUrl: "postgres://jlpt_w5:jlpt_w5_pass@127.0.0.1:5432/jlpt_w5",
    redisCoreNamespace: "jlpt:w5:core:",
    redisCacheNamespace: "jlpt:w5:cache:",
    bullmqPrefix: "jlpt-w5",
    storageRoot: "/srv/jlpt-workers/w5/data",
    ports: {
      web: 3500,
      admin: 3501,
      api: 4500,
    },
    allowedRoots: [
      "package.json",
      "tools/import-data/",
      "packages/content-tools/",
      "apps/api/src/modules/ai/",
      "apps/api/src/modules/vocab/",
      "apps/api/src/modules/stats/",
      "apps/api/src/modules/planner/",
      "apps/api/src/modules/gamification/",
      "apps/api/src/modules/learning/",
      "fixtures/imports/",
      "docs/import-format/",
      "docs/decisions/",
    ],
  },
  W6: {
    id: "W6",
    role: "Hạ tầng CI và kiểm chứng",
    linuxUser: "jlpt-w6",
    repo: "/srv/jlpt-workers/w6/repo",
    home: "/home/jlpt-w6",
    database: "jlpt_w6",
    dbUser: "jlpt_w6",
    dbPassword: "jlpt_w6_pass",
    databaseUrl: "postgres://jlpt_w6:jlpt_w6_pass@127.0.0.1:5432/jlpt_w6",
    redisCoreNamespace: "jlpt:w6:core:",
    redisCacheNamespace: "jlpt:w6:cache:",
    bullmqPrefix: "jlpt-w6",
    storageRoot: "/srv/jlpt-workers/w6/data",
    ports: {
      web: 3600,
      admin: 3601,
      api: 4600,
    },
    allowedRoots: [
      "package.json",
      "pnpm-workspace.yaml",
      "pnpm-lock.yaml",
      "turbo.json",
      ".gitignore",
      ".gitattributes",
      ".nvmrc",
      ".npmrc",
      ".editorconfig",
      "README.md",
      "infra/",
      ".github/",
      "tests/",
      "packages/config/",
      "apps/media-worker/",
      "docs/runbooks/",
      "docs/release/",
      "docs/decisions/",
    ],
  },
};

/**
 * Generate environment variables dictionary for a specific worker.
 */
export function getWorkerEnv(workerId: string): Record<string, string> {
  const w = WORKER_CONFIGS[workerId as WorkerId];
  if (!w) throw new Error(`Unknown worker id: ${workerId}`);

  return {
    WORKER_ID: w.id,
    WORKER_ROLE: w.role,
    NODE_ENV: "development",
    PORT_WEB: String(w.ports.web),
    PORT_ADMIN: String(w.ports.admin),
    PORT_API: String(w.ports.api),
    PORT: String(w.ports.api),
    DATABASE_URL: w.databaseUrl,
    REDIS_CORE_URL: "redis://127.0.0.1:6379",
    REDIS_CACHE_URL: "redis://127.0.0.1:6380",
    REDIS_CORE_KEY_PREFIX: w.redisCoreNamespace,
    REDIS_CACHE_KEY_PREFIX: w.redisCacheNamespace,
    BULLMQ_PREFIX: w.bullmqPrefix,
    STORAGE_ROOT: w.storageRoot,
    MAIL_SMTP_HOST: "127.0.0.1",
    MAIL_SMTP_PORT: "1025",
    MAIL_TEST_TAG: `+${w.id.toLowerCase()}`,
  };
}

/**
 * Format environment variables into .env format.
 */
export function formatEnvFile(workerId: string): string {
  const env = getWorkerEnv(workerId);
  return (
    `# ==============================================================================\n` +
    `# JLPT Online Environment Configuration for ${workerId}\n` +
    `# Generated for local development / testing\n` +
    `# ==============================================================================\n` +
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") +
    "\n"
  );
}

/**
 * Validate that worker configurations have no overlapping ports, databases, or Redis namespaces.
 */
export function validateWorkerConfigs(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const ports = new Map<number, string>();
  const databases = new Map<string, string>();
  const redisCore = new Map<string, string>();
  const redisCache = new Map<string, string>();
  const bullmq = new Map<string, string>();
  const storage = new Map<string, string>();

  for (const id of WORKER_IDS) {
    const w = WORKER_CONFIGS[id];

    // Check ports
    const portEntries: [string, number][] = [
      ["web", w.ports.web],
      ["admin", w.ports.admin],
      ["api", w.ports.api],
    ];
    for (const [name, p] of portEntries) {
      if (ports.has(p)) {
        errors.push(`Trùng cổng ${p} giữa ${ports.get(p)} và ${id} (${name})`);
      } else {
        ports.set(p, `${id} (${name})`);
      }
    }

    // Check database
    if (databases.has(w.database)) {
      errors.push(
        `Trùng database ${w.database} giữa ${databases.get(w.database)} và ${id}`,
      );
    } else {
      databases.set(w.database, id);
    }

    // Check redis core namespace
    if (redisCore.has(w.redisCoreNamespace)) {
      errors.push(
        `Trùng redisCoreNamespace ${w.redisCoreNamespace} giữa ${redisCore.get(w.redisCoreNamespace)} và ${id}`,
      );
    } else {
      redisCore.set(w.redisCoreNamespace, id);
    }

    // Check redis cache namespace
    if (redisCache.has(w.redisCacheNamespace)) {
      errors.push(
        `Trùng redisCacheNamespace ${w.redisCacheNamespace} giữa ${redisCache.get(w.redisCacheNamespace)} và ${id}`,
      );
    } else {
      redisCache.set(w.redisCacheNamespace, id);
    }

    // Check bullmq prefix
    if (bullmq.has(w.bullmqPrefix)) {
      errors.push(
        `Trùng bullmqPrefix ${w.bullmqPrefix} giữa ${bullmq.get(w.bullmqPrefix)} và ${id}`,
      );
    } else {
      bullmq.set(w.bullmqPrefix, id);
    }

    // Check storage root
    if (storage.has(w.storageRoot)) {
      errors.push(
        `Trùng storageRoot ${w.storageRoot} giữa ${storage.get(w.storageRoot)} và ${id}`,
      );
    } else {
      storage.set(w.storageRoot, id);
    }
  }

  return { ok: errors.length === 0, errors };
}
