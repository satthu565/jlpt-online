import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

describe("Dev Services & Worker Separation (F07)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let workerEnv: any;

  beforeAll(async () => {
    const workerEnvPath = path.resolve(
      __dirname,
      "../../infra/dev/worker-env.ts",
    );
    workerEnv = await import(workerEnvPath);
  });

  it("defines 6 distinct workers W1 through W6", () => {
    expect(workerEnv.WORKER_IDS).toHaveLength(6);
    expect(workerEnv.WORKER_IDS).toEqual(["W1", "W2", "W3", "W4", "W5", "W6"]);
  });

  it("guarantees no overlapping ports among all workers", () => {
    const validation = workerEnv.validateWorkerConfigs();
    expect(validation.ok).toBe(true);
    expect(validation.errors).toHaveLength(0);

    const allPorts = new Set<number>();
    for (const wid of workerEnv.WORKER_IDS) {
      const cfg = workerEnv.WORKER_CONFIGS[wid];
      expect(allPorts.has(cfg.ports.web)).toBe(false);
      allPorts.add(cfg.ports.web);

      expect(allPorts.has(cfg.ports.admin)).toBe(false);
      allPorts.add(cfg.ports.admin);

      expect(allPorts.has(cfg.ports.api)).toBe(false);
      allPorts.add(cfg.ports.api);
    }
    // 6 workers * 3 ports = 18 unique ports
    expect(allPorts.size).toBe(18);
  });

  it("guarantees separate databases, Redis namespaces, BullMQ prefixes, and storage roots", () => {
    const dbs = new Set(
      workerEnv.WORKER_IDS.map(
        (w: string) => workerEnv.WORKER_CONFIGS[w].database,
      ),
    );
    const redisCores = new Set(
      workerEnv.WORKER_IDS.map(
        (w: string) => workerEnv.WORKER_CONFIGS[w].redisCoreNamespace,
      ),
    );
    const redisCaches = new Set(
      workerEnv.WORKER_IDS.map(
        (w: string) => workerEnv.WORKER_CONFIGS[w].redisCacheNamespace,
      ),
    );
    const bullmq = new Set(
      workerEnv.WORKER_IDS.map(
        (w: string) => workerEnv.WORKER_CONFIGS[w].bullmqPrefix,
      ),
    );
    const storage = new Set(
      workerEnv.WORKER_IDS.map(
        (w: string) => workerEnv.WORKER_CONFIGS[w].storageRoot,
      ),
    );

    expect(dbs.size).toBe(6);
    expect(redisCores.size).toBe(6);
    expect(redisCaches.size).toBe(6);
    expect(bullmq.size).toBe(6);
    expect(storage.size).toBe(6);
  });

  it("generates valid per-worker environment variables", () => {
    for (const wid of workerEnv.WORKER_IDS) {
      const env = workerEnv.getWorkerEnv(wid);
      expect(env.WORKER_ID).toBe(wid);
      expect(env.DATABASE_URL).toContain(`jlpt_${wid.toLowerCase()}`);
      expect(env.REDIS_CORE_KEY_PREFIX).toBe(`jlpt:${wid.toLowerCase()}:core:`);
      expect(env.REDIS_CACHE_KEY_PREFIX).toBe(
        `jlpt:${wid.toLowerCase()}:cache:`,
      );
      expect(env.BULLMQ_PREFIX).toBe(`jlpt-${wid.toLowerCase()}`);

      const fileContent = workerEnv.formatEnvFile(wid);
      expect(fileContent).toContain(`WORKER_ID=${wid}`);
      expect(fileContent).toContain(`DATABASE_URL=${env.DATABASE_URL}`);
    }
  });

  it("verifies init-workers-db.sql initializes 6 isolated databases and users", () => {
    const repoRoot = path.resolve(__dirname, "../../");
    const sqlPath = path.resolve(repoRoot, "infra/dev/init-workers-db.sql");
    expect(fs.existsSync(sqlPath)).toBe(true);

    const sql = fs.readFileSync(sqlPath, "utf8");
    for (const wid of workerEnv.WORKER_IDS) {
      const dbName = `jlpt_${wid.toLowerCase()}`;
      expect(sql).toContain(dbName);
      expect(sql).toContain(
        `REVOKE CONNECT ON DATABASE ${dbName} FROM PUBLIC;`,
      );
      expect(sql).toContain(
        `GRANT CONNECT ON DATABASE ${dbName} TO ${dbName};`,
      );
    }
  });

  it("verifies infra/dev/compose.dev.yml defines postgres, redis-core, redis-cache, and mailpit", () => {
    const repoRoot = path.resolve(__dirname, "../../");
    const composePath = path.resolve(repoRoot, "infra/dev/compose.dev.yml");
    expect(fs.existsSync(composePath)).toBe(true);

    const compose = fs.readFileSync(composePath, "utf8");
    expect(compose).toContain("postgres:");
    expect(compose).toContain("redis-core:");
    expect(compose).toContain("redis-cache:");
    expect(compose).toContain("mailpit:");
    expect(compose).toContain("127.0.0.1:5432:5432");
    expect(compose).toContain("127.0.0.1:6379:6379");
    expect(compose).toContain("127.0.0.1:6380:6379");
  });
});
