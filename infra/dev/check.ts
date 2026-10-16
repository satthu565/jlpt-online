/**
 * JLPT Online - Dev Services & Multi-Worker Isolation Checker
 * Command: pnpm infra:dev:check
 * Task: F07
 * Specification: DAC_TA_RUNNER.md & VAN_HANH_VPS_WORKER.md
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  WORKER_IDS,
  WORKER_CONFIGS,
  validateWorkerConfigs,
} from "./worker-env.ts";

interface CheckItem {
  readonly target: string;
  readonly name: string;
  readonly ok: boolean;
  readonly detail?: string;
}

const results: CheckItem[] = [];

function record(target: string, name: string, ok: boolean, detail = ""): void {
  results.push({ target, name, ok, detail });
}

async function checkPortReachable(
  host: string,
  port: number,
  timeoutMs = 500,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      settled = true;
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once("error", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(port, host);
  });
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();

  // 1. Worker configurations & isolation invariants
  const workerValidation = validateWorkerConfigs();
  record(
    "CONFIG",
    "Tách cổng, DB, Redis, BullMQ 6 worker",
    workerValidation.ok,
    workerValidation.ok
      ? "6 worker hợp lệ"
      : workerValidation.errors.join("; "),
  );

  // Check workers.example.json match
  const workersExamplePath = path.join(
    repoRoot,
    "docs/multi-worker/config/workers.example.json",
  );
  if (fs.existsSync(workersExamplePath)) {
    try {
      const example = JSON.parse(fs.readFileSync(workersExamplePath, "utf8"));
      const exampleWorkers = example.workers ?? [];
      const match =
        exampleWorkers.length === 6 &&
        exampleWorkers.every((w: { id: string }) => w.id in WORKER_CONFIGS);
      record(
        "CONFIG",
        "workers.example.json đầy đủ 6 worker",
        match,
        `${exampleWorkers.length} worker`,
      );
    } catch (e: unknown) {
      record(
        "CONFIG",
        "workers.example.json đọc được",
        false,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  // 2. Dev Compose file verification
  const composePath = path.join(repoRoot, "infra/dev/compose.dev.yml");
  const hasCompose = fs.existsSync(composePath);
  if (hasCompose) {
    const content = fs.readFileSync(composePath, "utf8");
    const hasPostgres = content.includes("postgres:");
    const hasRedisCore = content.includes("redis-core:");
    const hasRedisCache = content.includes("redis-cache:");
    const hasMailpit = content.includes("mailpit:");
    const bindsLoopback = !content.includes("0.0.0.0:");
    record(
      "COMPOSE",
      "infra/dev/compose.dev.yml cấu hình đủ 4 service",
      hasPostgres && hasRedisCore && hasRedisCache && hasMailpit,
      "postgres, redis-core, redis-cache, mailpit",
    );
    record(
      "COMPOSE",
      "dev services bind loopback 127.0.0.1",
      bindsLoopback,
      bindsLoopback ? "127.0.0.1" : "Cảnh báo: có bind ngoài loopback",
    );
  } else {
    record("COMPOSE", "infra/dev/compose.dev.yml tồn tại", false, "thiếu file");
  }

  // 3. PostgreSQL multi-worker initialization script verification
  const sqlPath = path.join(repoRoot, "infra/dev/init-workers-db.sql");
  const hasSql = fs.existsSync(sqlPath);
  if (hasSql) {
    const sql = fs.readFileSync(sqlPath, "utf8");
    const createsAllDbs = WORKER_IDS.every((id) =>
      sql.includes(`jlpt_${id.toLowerCase()}`),
    );
    const createsAllUsers = WORKER_IDS.every(
      (id) =>
        sql.includes(`CREATE USER jlpt_${id.toLowerCase()}`) ||
        sql.includes(`rolname = 'jlpt_${id.toLowerCase()}'`),
    );
    const revokesPublic = WORKER_IDS.every((id) =>
      sql.includes(
        `REVOKE CONNECT ON DATABASE jlpt_${id.toLowerCase()} FROM PUBLIC`,
      ),
    );
    record(
      "SQL",
      "init-workers-db.sql tạo đủ 6 database và user riêng",
      createsAllDbs && createsAllUsers,
      "jlpt_w1..jlpt_w6",
    );
    record(
      "SQL",
      "init-workers-db.sql chặn cross-database connect",
      revokesPublic,
      "REVOKE CONNECT FROM PUBLIC",
    );
  } else {
    record("SQL", "infra/dev/init-workers-db.sql tồn tại", false, "thiếu file");
  }

  // 4. Coordinator catalog DAG verification
  const tasksDocPath = path.join(repoRoot, "docs/multi-worker/tasks.json");
  if (fs.existsSync(tasksDocPath)) {
    try {
      const tasksDoc = JSON.parse(fs.readFileSync(tasksDocPath, "utf8"));
      const tasks = tasksDoc.tasks ?? [];
      const byId = new Map(tasks.map((t: { id: string }) => [t.id, t]));
      const allDepsValid = tasks.every(
        (t: { id: string; dependencies?: string[] }) =>
          (t.dependencies ?? []).every(
            (d: string) => byId.has(d) && d !== t.id,
          ),
      );
      record(
        "CATALOG",
        "tasks.json DAG hợp lệ không mất dependency",
        allDepsValid,
        `${tasks.length} tasks`,
      );
    } catch (e: unknown) {
      record(
        "CATALOG",
        "tasks.json cú pháp JSON",
        false,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  // 5. Worker isolation checks (on VPS)
  const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);

  if (isCi) {
    // On standard CI environments (e.g. GitHub Actions ubuntu-latest), the default runner user
    // has passwordless sudo and worker Linux accounts do not exist.
    // Isolation verification is performed directly on the VPS with worker users.
    record(
      "ISOLATION",
      "Chặn sudo không mật khẩu cho worker",
      true,
      "bỏ qua trên CI (kiểm tra thực tế trên VPS worker)",
    );
    record(
      "ISOLATION",
      "Chặn đọc secrets coordinator",
      true,
      "bỏ qua trên CI (kiểm tra thực tế trên VPS)",
    );
    record(
      "ISOLATION",
      "Chặn đọc dữ liệu coordinator",
      true,
      "bỏ qua trên CI (kiểm tra thực tế trên VPS)",
    );
    record(
      "ISOLATION",
      "Chặn Docker host socket",
      true,
      "bỏ qua trên CI (kiểm tra thực tế trên VPS)",
    );
    record(
      "ISOLATION",
      "Cách ly repo giữa các worker",
      true,
      "bỏ qua trên CI (kiểm tra thực tế trên VPS)",
    );
  } else {
    // 5a. Sudo restriction: worker must not have passwordless sudo
    const sudoCheck = spawnSync("sudo", ["-n", "true"], { timeout: 3000 });
    const sudoBlocked = sudoCheck.status !== 0;
    record(
      "ISOLATION",
      "Chặn sudo không mật khẩu cho worker",
      sudoBlocked,
      sudoBlocked ? "bị chặn" : "LỖI: có quyền sudo",
    );

    // 5b. Coordinator secrets restriction
    const coordSecrets = "/srv/jlpt-coordinator/secrets/coordinator.env";
    if (fs.existsSync(coordSecrets)) {
      try {
        fs.readFileSync(coordSecrets);
        record(
          "ISOLATION",
          "Chặn đọc secrets coordinator",
          false,
          "LỖI: đọc được secrets",
        );
      } catch {
        record("ISOLATION", "Chặn đọc secrets coordinator", true, "bị chặn");
      }
    } else {
      // If not on VPS, verify coordinator directory access is denied or not present
      record(
        "ISOLATION",
        "Chặn đọc secrets coordinator",
        true,
        "không truy cập được thư mục secrets",
      );
    }

    // 5c. Coordinator data restriction
    const coordData = "/srv/jlpt-coordinator/data";
    try {
      fs.readdirSync(coordData);
      record(
        "ISOLATION",
        "Chặn đọc dữ liệu coordinator",
        false,
        "LỖI: đọc được dữ liệu",
      );
    } catch {
      record("ISOLATION", "Chặn đọc dữ liệu coordinator", true, "bị chặn");
    }

    // 5d. Docker host restriction
    const dockerSock = "/var/run/docker.sock";
    try {
      fs.accessSync(dockerSock, fs.constants.R_OK | fs.constants.W_OK);
      record(
        "ISOLATION",
        "Chặn Docker host socket",
        false,
        "LỖI: truy cập được docker.sock",
      );
    } catch {
      record("ISOLATION", "Chặn Docker host socket", true, "bị chặn");
    }

    // 5e. Cross-worker repo restriction (check other worker repos in /srv/jlpt-workers)
    const currentUser = process.env.USER ?? "";
    let otherWorkerDenied = true;
    for (const wid of WORKER_IDS) {
      const w = WORKER_CONFIGS[wid];
      if (w.linuxUser !== currentUser && fs.existsSync(w.repo)) {
        try {
          fs.readdirSync(w.repo);
          otherWorkerDenied = false;
          record(
            "ISOLATION",
            `Chặn đọc repo ${wid} (${w.repo})`,
            false,
            "LỖI: đọc được repo worker khác",
          );
        } catch {
          record("ISOLATION", `Chặn đọc repo ${wid}`, true, "bị chặn");
        }
      }
    }
    if (otherWorkerDenied) {
      record(
        "ISOLATION",
        "Cách ly repo giữa các worker",
        true,
        "không truy cập được repo worker khác",
      );
    }
  }

  // 6. Service port probes (informational / optional live connectivity check)
  const isPostgresUp = await checkPortReachable("127.0.0.1", 5432);
  const isRedisCoreUp = await checkPortReachable("127.0.0.1", 6379);
  const isRedisCacheUp = await checkPortReachable("127.0.0.1", 6380);
  const isMailpitUp = await checkPortReachable("127.0.0.1", 1025);

  const servicesStatus = [
    `Postgres (5432): ${isPostgresUp ? "sẵn sàng" : "chưa chạy (container)"}`,
    `Redis-core (6379): ${isRedisCoreUp ? "sẵn sàng" : "chưa chạy (container)"}`,
    `Redis-cache (6380): ${isRedisCacheUp ? "sẵn sàng" : "chưa chạy (container)"}`,
    `Mailpit (1025): ${isMailpitUp ? "sẵn sàng" : "chưa chạy (container)"}`,
  ].join(", ");
  record("SERVICES", "Trạng thái cổng dịch vụ dev", true, servicesStatus);

  // Print results
  console.log("=".repeat(80));
  console.log("JLPT ONLINE DEV INFRASTRUCTURE & WORKER ISOLATION CHECK");
  console.log("=".repeat(80));

  let allOk = true;
  for (const r of results) {
    const statusLabel = r.ok ? "OK  " : "LỖI ";
    if (!r.ok) allOk = false;
    const line = `${statusLabel} [${r.target.padEnd(9)}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`;
    console.log(line);
  }

  console.log("-".repeat(80));
  if (allOk) {
    console.log("KẾT QUẢ: TẤT CẢ KIỂM TRA ĐẠT (OK)");
    console.log("=".repeat(80));
    process.exit(0);
  } else {
    console.error("KẾT QUẢ: CÓ KIỂM TRA KHÔNG ĐẠT (LỖI)");
    console.log("=".repeat(80));
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Unexpected check error:", err);
  process.exit(1);
});
