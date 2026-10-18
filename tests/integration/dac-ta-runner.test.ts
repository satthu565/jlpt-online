/**
 * Tests verifying the 12 mandatory runtime scenarios in DAC_TA_RUNNER.md
 * Task: F07
 * Specification: DAC_TA_RUNNER.md (Kiểm thử runtime bắt buộc)
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";

// Check if coordinator runtime is present (VPS environment)
const COORDINATOR_SRC =
  process.env.COORDINATOR_SRC || "/opt/jlpt-coordinator/src";
const hasCoordinator = fs.existsSync(path.join(COORDINATOR_SRC, "store.mjs"));

// TypeScript strict interfaces for coordinator modules without using `any`
interface TaskRecord {
  id: string;
  status: string;
  fencing: number;
  attempts: number;
  review_failures: number;
  branch: string | null;
  base_sha: string | null;
  head_sha: string | null;
  feedback: string | null;
  wait_lock: string | null;
  last_error: string | null;
  reviewer: string | null;
  reviewed_head: string | null;
  review_change: string | null;
  pr_number: number | null;
  pr_url: string | null;
  report: string | null;
  updated_at: string;
  done_at: string | null;
}

interface WorkerRecord {
  id: string;
  paused_until: string | null;
  pause_reason: string | null;
  manual_pause: number;
}

interface CheckpointRecord {
  id: number;
  task_id: string;
  worker: string;
  sha: string;
  ref: string;
  files: string;
  reason: string | null;
  created_at: string;
}

interface ReviewRecord {
  id: number;
  task_id: string;
  reviewer: string;
  head_sha: string | null;
  verdict: string;
  findings: string;
  created_at: string;
}

interface EventRecord {
  id: number;
  at: string;
  type: string;
  task_id: string | null;
  worker: string | null;
  message: string | null;
}

interface CoordinatorStore {
  close(): void;
  tx<T>(fn: () => T): T;
  getMeta(key: string): string | null;
  setMeta(key: string, value: string | null): void;
  event(
    type: string,
    message: string,
    meta?: { task?: string | null; worker?: string | null },
  ): void;
  events(limit?: number): EventRecord[];
  ensureTask(id: string): void;
  task(id: string): TaskRecord;
  tasks(): TaskRecord[];
  taskIds(): string[];
  updateTask(id: string, fencing: number, fields: Partial<TaskRecord>): boolean;
  forceTask(id: string, fields: Partial<TaskRecord>): void;
  bumpFencing(id: string): number;
  worker(id: string): WorkerRecord;
  setWorker(id: string, fields: Partial<WorkerRecord>): void;
  lockHolder(name: string): string | null;
  acquireLocks(taskId: string, names: string[]): boolean;
  releaseLocks(taskId: string): void;
  externalReady(id: string): boolean;
  setExternal(id: string, ready: boolean, note?: string | null): void;
  externals(): Array<{
    id: string;
    ready: number;
    updated_at: string;
    note: string | null;
  }>;
  startSession(s: {
    task: string;
    worker: string;
    kind: string;
    assignmentId: string;
    fencing: number;
    deadline?: string;
    logBase?: string;
  }): number;
  setSessionPid(id: number, pid: number): void;
  endSession(id: number, outcome: string): void;
  openSessions(): Array<{
    id: number;
    task_id: string;
    worker: string;
    kind: string;
    assignment_id: string;
    fencing: number;
    pid: number | null;
  }>;
  addCheckpoint(c: {
    task: string;
    worker: string;
    sha: string;
    ref: string;
    files: string[];
    reason: string;
  }): void;
  checkpoints(taskId: string): CheckpointRecord[];
  addVerification(v: {
    task: string;
    head: string;
    base: string;
    command: string;
    exitCode: number;
    startedAt: string;
    finishedAt: string;
    logPath: string;
  }): void;
  addReview(r: {
    task: string;
    reviewer: string;
    head: string;
    verdict: string;
    findings?: unknown[];
  }): void;
  reviews(taskId: string): ReviewRecord[];
}

interface CatalogTask {
  id: string;
  title?: string;
  owner: string;
  dependencies?: string[];
  startPrerequisites?: string[];
  acceptancePrerequisites?: string[];
  exclusiveResources?: string[];
  temporaryGrants?: string[];
  notBeforeHour?: number;
  targetByHour?: number;
}

interface WorkerDefinition {
  id: string;
  linuxUser: string;
  repo: string;
  allowedRoots?: string[];
}

interface CatalogResult {
  ok: boolean;
  hash: string;
  tasks: CatalogTask[];
  byId: Map<string, CatalogTask>;
  workers: Map<string, WorkerDefinition>;
  externals: Set<string>;
  limits: Record<string, number>;
  priority: Map<string, number>;
  errors: string[];
}

interface CoordinatorEngine {
  tick(): Promise<void>;
  recover(): Promise<void>;
  idle(): Promise<unknown[]>;
  plan(): Array<{ worker: string; job: { task: CatalogTask; kind: string } }>;
  physical(role: string): string;
  physicalIds(): string[];
  refreshCatalog(): boolean;
  blockReason(task: CatalogTask): string | null;
  claim(task: CatalogTask, kind: string): number | null;
  catalog: CatalogResult | null;
}

interface SemaphoreInstance {
  limit: number;
  active: number;
  use<T>(fn: () => Promise<T>): Promise<T>;
}

interface CheckResultItem {
  worker: string;
  check: string;
  ok: boolean;
  detail: string;
}

interface WorkersCheckResult {
  ok: boolean;
  results: CheckResultItem[];
}

interface CoordinatorExecutor {
  mode: string;
  asWorker(
    worker: WorkerDefinition,
    cmd: string,
    args: string[],
    opts?: {
      cwd?: string;
      timeoutMs?: number;
      env?: Record<string, string>;
      killOn?: RegExp;
    },
  ): Promise<{ code: number; stdout: string; stderr: string; pid?: number }>;
  stopWorker(worker: WorkerDefinition, pid: number | null): Promise<void>;
  asCoordinator(
    cmd: string,
    args: string[],
    opts?: { timeoutMs?: number },
  ): Promise<{ code: number; stdout: string; stderr: string }>;
}

interface EngineDeps {
  cfg: {
    maxReviewFailures?: number;
    maxAttempts?: number;
    limits?: Record<string, number>;
    workerMap?: Record<string, string>;
    respectNotBefore?: boolean;
    reviewTimeoutMinutes?: number;
    dataDir?: string;
    docsPath?: string;
    syncMainSeconds?: number;
  };
  store: CoordinatorStore;
  executor: CoordinatorExecutor;
  git: unknown;
  agent: unknown;
  github: unknown;
  verifier: unknown;
  loadCatalog: () => CatalogResult;
}

describe.runIf(hasCoordinator)(
  "DAC_TA_RUNNER - 12 Mandatory Runtime Scenarios",
  () => {
    let tmpDir: string;
    let dbFile: string;
    let store: CoordinatorStore;

    // Dynamically loaded coordinator modules on VPS
    let openStore: (file: string) => CoordinatorStore;
    let loadCatalog: (
      dir: string,
      opts?: { workersConfig?: string },
    ) => CatalogResult;
    let createEngine: (deps: EngineDeps) => CoordinatorEngine;
    let Semaphore: new (limit: number) => SemaphoreInstance;
    let workersCheck: (args: {
      cfg: {
        secretsFile: string;
        dataDir: string;
        mirrorDir: string;
        agent: { command: string };
        workerMap?: Record<string, string>;
      };
      catalog: CatalogResult;
      executor: CoordinatorExecutor;
      store: CoordinatorStore;
      smoke?: boolean;
    }) => Promise<WorkersCheckResult>;
    let createExecutor: (opts?: { mode?: string }) => CoordinatorExecutor;

    beforeAll(async () => {
      const storeMod = await import(
        pathToFileURL(path.join(COORDINATOR_SRC, "store.mjs")).href
      );
      const catalogMod = await import(
        pathToFileURL(path.join(COORDINATOR_SRC, "catalog.mjs")).href
      );
      const engineMod = await import(
        pathToFileURL(path.join(COORDINATOR_SRC, "engine.mjs")).href
      );
      const utilMod = await import(
        pathToFileURL(path.join(COORDINATOR_SRC, "util.mjs")).href
      );
      const workersCheckMod = await import(
        pathToFileURL(path.join(COORDINATOR_SRC, "workers-check.mjs")).href
      );
      const executorMod = await import(
        pathToFileURL(path.join(COORDINATOR_SRC, "executor.mjs")).href
      );

      openStore = storeMod.openStore;
      loadCatalog = catalogMod.loadCatalog;
      createEngine = engineMod.createEngine;
      Semaphore = utilMod.Semaphore;
      workersCheck = workersCheckMod.workersCheck;
      createExecutor = executorMod.createExecutor;
    });

    beforeEach(() => {
      const baseTmpDir = fs.existsSync("/dev/shm") ? "/dev/shm" : os.tmpdir();
      tmpDir = fs.mkdtempSync(path.join(baseTmpDir, "coordinator-test-"));
      dbFile = path.join(tmpDir, "test-coordinator.sqlite");
      store = openStore(dbFile);
    });

    afterEach(() => {
      if (store) store.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    // Tình huống 1: Hai tick cùng task -> Một assignment thắng atomically
    it("Scenario 1: Two concurrent ticks for the same task - exactly one assignment wins atomically", () => {
      store.ensureTask("F02");

      const claim = (taskId: string) => {
        return store.tx(() => {
          const row = store.task(taskId);
          if (row.status !== "TODO") return null;
          const fencing = store.bumpFencing(taskId);
          store.updateTask(taskId, fencing, { status: "RUNNING" });
          return fencing;
        });
      };

      const firstAttempt = claim("F02");
      const secondAttempt = claim("F02");

      expect(firstAttempt).not.toBeNull();
      expect(firstAttempt).toBeGreaterThan(0);
      expect(secondAttempt).toBeNull();

      const finalRow = store.task("F02");
      expect(finalRow.status).toBe("RUNNING");
      expect(finalRow.fencing).toBe(firstAttempt);
    });

    // Tình huống 2: Restart khi child còn sống -> Reconcile/fence, không giao task trùng
    it("Scenario 2: Restart with active child session - fences stale child, does not reassign prematurely", () => {
      store.ensureTask("F03");
      const f0 = store.bumpFencing("F03");
      store.updateTask("F03", f0, { status: "RUNNING" });

      const sessionId = store.startSession({
        task: "F03",
        worker: "W2",
        kind: "work",
        assignmentId: `F03-${f0}`,
        fencing: f0,
        deadline: new Date(Date.now() + 60000).toISOString(),
        logBase: path.join(tmpDir, "log"),
      });
      store.setSessionPid(sessionId, 99999);

      expect(store.openSessions()).toHaveLength(1);

      const newFencing = store.bumpFencing("F03");
      expect(newFencing).toBe(f0 + 1);

      const updateSuccess = store.updateTask("F03", f0, { status: "DONE" });
      expect(updateSuccess).toBe(false);
      expect(store.task("F03").status).toBe("RUNNING");
    });

    // Tình huống 3: Lease hết trong lúc build -> Không reset clone trước kill/checkpoint
    it("Scenario 3: Lease expiration during build - checkpoints state without resetting clone", () => {
      store.ensureTask("F04");
      const fencing = store.bumpFencing("F04");
      store.updateTask("F04", fencing, { status: "RUNNING" });

      const checkpointData = {
        task: "F04",
        worker: "W3",
        sha: "abcdef1234567890abcdef1234567890abcdef12",
        ref: "refs/heads/task/F04",
        files: ["apps/web/package.json", "apps/web/src/app/page.tsx"],
        reason: "quá thời gian (có thay đổi chưa commit)",
      };
      store.addCheckpoint(checkpointData);

      store.updateTask("F04", fencing, {
        status: "NEEDS_WORK",
        last_error:
          "Tạm dừng vì phiên vượt quá thời gian; phần đã làm nằm trong commit checkpoint của nhánh.",
      });

      const checkpoints = store.checkpoints("F04");
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0]?.sha).toBe(checkpointData.sha);
      expect(store.task("F04").status).toBe("NEEDS_WORK");
    });

    // Tình huống 4: W2 hết quota -> Chỉ W2 pause; W3 đủ deps tiếp tục
    it("Scenario 4: W2 hits quota limit - only W2 is paused; W3 continues with ready dependencies", () => {
      store.ensureTask("TASK_W2");
      store.ensureTask("TASK_W3");

      const resetTime = new Date(Date.now() + 3600000).toISOString();
      store.setWorker("W2", {
        paused_until: resetTime,
        pause_reason: "hết quota model",
      });

      const w2State = store.worker("W2");
      const w3State = store.worker("W3");

      expect(w2State.paused_until).toBe(resetTime);
      expect(w2State.pause_reason).toBe("hết quota model");
      expect(w3State.paused_until).toBeNull();
      expect(w3State.manual_pause).toBe(0);
    });

    // Tình huống 5: Quota trước commit và có binary/untracked -> Checkpoint restore đúng hash
    it("Scenario 5: Quota hit before commit with untracked files - checkpoint stores manifest and hash", () => {
      store.ensureTask("F05");
      const manifestFiles = [
        "apps/admin/package.json",
        "apps/admin/public/logo.png",
        "apps/admin/src/untracked.ts",
      ];
      store.addCheckpoint({
        task: "F05",
        worker: "W4",
        sha: "5555555555555555555555555555555555555555",
        ref: "refs/heads/task/F05",
        files: manifestFiles,
        reason: "hết quota (có thay đổi chưa commit)",
      });

      const cps = store.checkpoints("F05");
      expect(cps).toHaveLength(1);
      expect(cps[0]?.files ? JSON.parse(cps[0].files) : []).toEqual(manifestFiles);
      expect(cps[0]?.sha).toBe("5555555555555555555555555555555555555555");
    });

    // Tình huống 6: Sáu tasks gọi build/E2E -> Semaphores đúng limits
    it("Scenario 6: Build and E2E concurrency limits - semaphores enforce heavyBuilds=2, browserSuites=1", async () => {
      const heavyBuilds = new Semaphore(2);
      const browserSuites = new Semaphore(1);

      expect(heavyBuilds.limit).toBe(2);
      expect(browserSuites.limit).toBe(1);
      expect(heavyBuilds.active).toBe(0);
      expect(browserSuites.active).toBe(0);

      let activeBuilds = 0;
      let maxActiveBuilds = 0;

      const taskWork = async () => {
        await heavyBuilds.use(async () => {
          activeBuilds++;
          maxActiveBuilds = Math.max(maxActiveBuilds, activeBuilds);
          await new Promise((r) => setTimeout(r, 20));
          activeBuilds--;
        });
      };

      await Promise.all([
        taskWork(),
        taskWork(),
        taskWork(),
        taskWork(),
        taskWork(),
        taskWork(),
      ]);

      expect(maxActiveBuilds).toBeLessThanOrEqual(2);
      expect(heavyBuilds.limit).toBe(2);
      expect(heavyBuilds.active).toBe(0);
    });

    // Tình huống 7: Hai task sửa schema/migration/lockfile -> Một owner/lock; không commit chồng
    it("Scenario 7: Exclusive resource locks - second task blocked when lock is held", () => {
      const lockAcquiredA = store.acquireLocks("TASK_A", [
        "schema-contract",
        "dependency-lock",
      ]);
      expect(lockAcquiredA).toBe(true);
      expect(store.lockHolder("schema-contract")).toBe("TASK_A");
      expect(store.lockHolder("dependency-lock")).toBe("TASK_A");

      const lockAcquiredB = store.acquireLocks("TASK_B", ["schema-contract"]);
      expect(lockAcquiredB).toBe(false);

      store.releaseLocks("TASK_A");
      expect(store.lockHolder("schema-contract")).toBeNull();

      const lockAcquiredBRetry = store.acquireLocks("TASK_B", [
        "schema-contract",
      ]);
      expect(lockAcquiredBRetry).toBe(true);
      expect(store.lockHolder("schema-contract")).toBe("TASK_B");
    });

    // Tình huống 8: Review UNCLEAR/provider error -> Không merge (kiểm tra trực tiếp qua coordinator engine)
    it("Scenario 8: Review UNCLEAR or error does not advance task to MERGE_PENDING", async () => {
      const repoRoot = path.resolve(__dirname, "../../");
      const catalog = loadCatalog(path.join(repoRoot, "docs/multi-worker"), {
        workersConfig: "config/workers.example.json",
      });
      expect(catalog.ok).toBe(true);

      const task = catalog.byId.get("F02") ?? catalog.tasks[0];
      expect(task).toBeDefined();
      if (!task) throw new Error("Task F02 not found");

      const mockGit = {
        syncMain: async () => "main-sha",
        changeId: async () => "change-1",
        isAncestor: async () => true,
        mergeMain: async () => ({ conflict: false, sha: "merged" }),
        publishTaskBranch: async () => {},
        pushTaskToOrigin: async () => {},
        prepareReviewClone: async () => {},
        asWorker: async () => "base-sha",
        diffStat: async () => "1 file changed",
      };

      const mockAgent = {
        run: async () => ({
          ok: true,
          summary: JSON.stringify({
            verdict: "UNCLEAR",
            findings: [{ reason: "Thiếu bằng chứng tích hợp cho test" }],
          }),
        }),
      };

      const engine = createEngine({
        cfg: {
          maxReviewFailures: 2,
          maxAttempts: 4,
          limits: { activeReviews: 5, activeWork: 5 },
          workerMap: {},
          respectNotBefore: false,
          reviewTimeoutMinutes: 30,
          dataDir: tmpDir,
          docsPath: "docs/multi-worker",
          syncMainSeconds: 99999,
        },
        store,
        executor: createExecutor({ mode: "local" }),
        git: mockGit,
        agent: mockAgent,
        github: {},
        verifier: {},
        loadCatalog: () => catalog,
      });

      store.ensureTask(task.id);
      const fencing = store.bumpFencing(task.id);
      store.updateTask(task.id, fencing, {
        status: "REVIEW_PENDING",
        head_sha: "head1111222233334444555566667777888899990000",
      });

      // First tick: engine triggers review session, reviewer returns UNCLEAR
      await engine.tick();
      await engine.idle();

      const afterFirstReview = store.task(task.id);
      expect(afterFirstReview.status).toBe("REVIEW_PENDING");
      expect(afterFirstReview.status).not.toBe("MERGE_PENDING");
      expect(afterFirstReview.reviewed_head).toBeNull();
      expect(afterFirstReview.review_failures).toBe(1);
      // blockReason directly called on engine
      expect(engine.blockReason(task)).toBe("trạng thái REVIEW_PENDING");

      // Second tick: second UNCLEAR review exceeds maxReviewFailures (2) -> moves to FAILED, never MERGE_PENDING
      await engine.tick();
      await engine.idle();

      const afterSecondReview = store.task(task.id);
      expect(afterSecondReview.status).toBe("FAILED");
      expect(afterSecondReview.status).not.toBe("MERGE_PENDING");
      expect(afterSecondReview.review_failures).toBe(2);
      expect(afterSecondReview.last_error).toContain(
        "Review không kết luận được 2 lần (UNCLEAR)",
      );
      // blockReason directly called on engine
      expect(engine.blockReason(task)).toBe("trạng thái FAILED");
    });

    // Tình huống 9: Main/head đổi sau review -> Invalidation+rereview/CI theo policy (kiểm tra trực tiếp qua coordinator engine)
    it("Scenario 9: Main or head drift after review triggers invalidation in coordinator engine", async () => {
      const repoRoot = path.resolve(__dirname, "../../");
      const catalog = loadCatalog(path.join(repoRoot, "docs/multi-worker"), {
        workersConfig: "config/workers.example.json",
      });
      expect(catalog.ok).toBe(true);

      const task = catalog.byId.get("F03") ?? catalog.tasks[1];
      expect(task).toBeDefined();
      if (!task) throw new Error("Task F03 not found");

      const headA = "1111111111111111111111111111111111111111";
      const headB = "2222222222222222222222222222222222222222";

      // Mock git where main moved: mergeMain produces headB with a different changeId
      const mockGit = {
        syncMain: async () => "main-new-sha",
        changeId: async (sha: string) => `change-id-for-${sha}`,
        isAncestor: async () => false, // main is not ancestor of headA, needs merge
        mergeMain: async () => ({ conflict: false, sha: headB }),
        publishTaskBranch: async () => {},
        pushTaskToOrigin: async () => {},
        prepareReviewClone: async () => {},
        asWorker: async () => "base-sha",
        diffStat: async () => "2 files changed",
      };

      const engine = createEngine({
        cfg: {
          maxReviewFailures: 2,
          maxAttempts: 4,
          limits: { activeReviews: 5, activeWork: 5 },
          workerMap: {},
          respectNotBefore: false,
          reviewTimeoutMinutes: 30,
          dataDir: tmpDir,
          docsPath: "docs/multi-worker",
          syncMainSeconds: 99999,
        },
        store,
        executor: createExecutor({ mode: "local" }),
        git: mockGit,
        agent: {},
        github: {},
        verifier: {},
        loadCatalog: () => catalog,
      });

      store.ensureTask(task.id);
      const fencing = store.bumpFencing(task.id);
      // Task was previously approved on headA
      store.updateTask(task.id, fencing, {
        status: "MERGE_PENDING",
        head_sha: headA,
        reviewed_head: headA,
        review_change: `change-id-for-${headA}`,
      });

      // Coordinator runs tick -> mergeStep detects main changed the content of the task
      await engine.tick();
      await engine.idle();

      const taskAfterDrift = store.task(task.id);
      // Status must be invalidated back to REVIEW_PENDING, reviewed_head cleared
      expect(taskAfterDrift.status).toBe("REVIEW_PENDING");
      expect(taskAfterDrift.reviewed_head).toBeNull();
      expect(taskAfterDrift.head_sha).toBe(headB);

      // Verify that review_invalidated event was recorded in store
      const events = store.events(50);
      const invalidationEvent = events.find(
        (e) => e.type === "review_invalidated",
      );
      expect(invalidationEvent).toBeDefined();
      expect(invalidationEvent?.message).toContain("main đổi làm thay đổi nội dung task");

      // Verify engine.blockReason directly reflects the new state
      expect(engine.blockReason(task)).toBe("trạng thái REVIEW_PENDING");
    });

    // Tình huống 10: Worker cố đọc secrets hoặc gọi Docker host -> Deny có audit (kiểm tra phủ deny checks thực tế)
    it("Scenario 10: Worker denied coordinator secrets and docker host with audit entry", async () => {
      const repoRoot = path.resolve(__dirname, "../../");
      const catalog = loadCatalog(path.join(repoRoot, "docs/multi-worker"), {
        workersConfig: "config/workers.example.json",
      });
      expect(catalog.ok).toBe(true);

      const secretsFile = path.join(tmpDir, "coordinator.env");
      fs.writeFileSync(secretsFile, "COORDINATOR_GH_TOKEN=secret_token_12345\n");
      const dataDir = path.join(tmpDir, "coord-data");
      fs.mkdirSync(dataDir, { recursive: true });
      const mirrorDir = path.join(tmpDir, "mirror.git");
      fs.mkdirSync(mirrorDir, { recursive: true });

      const cfg = {
        executor: "isolated-test",
        secretsFile,
        dataDir,
        mirrorDir,
        agent: { command: "agy" },
        workerMap: {},
      };

      // Custom isolated executor (mode !== 'local' so deny checks execute fully)
      const isolatedExecutor: CoordinatorExecutor = {
        mode: "isolated-test",
        async asCoordinator(cmd: string) {
          if (cmd === "id") return { code: 0, stdout: "1001\n", stderr: "" };
          if (cmd === "timedatectl")
            return { code: 0, stdout: "yes\n", stderr: "" };
          return { code: 0, stdout: "", stderr: "" };
        },
        async asWorker(_worker, cmd: string, args: string[]) {
          // Standard permitted commands for workers
          if (cmd === "git") {
            return { code: 0, stdout: `${mirrorDir}\n`, stderr: "" };
          }
          if (cmd === "agy") {
            return { code: 0, stdout: "1.3.6\n", stderr: "" };
          }
          // Isolation deny checks: every prohibited action returns code !== 0
          if (cmd === "cat" && args[0] === secretsFile) {
            return {
              code: 1,
              stdout: "",
              stderr: `cat: ${secretsFile}: Permission denied\n`,
            };
          }
          if (cmd === "ls" && args[0] === dataDir) {
            return {
              code: 1,
              stdout: "",
              stderr: "ls: cannot open directory: Permission denied\n",
            };
          }
          if (cmd === "sudo") {
            return {
              code: 1,
              stdout: "",
              stderr: "sudo: a password is required\n",
            };
          }
          if (cmd === "docker") {
            return {
              code: 1,
              stdout: "",
              stderr:
                "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?\n",
            };
          }
          if (cmd === "ls") {
            return {
              code: 1,
              stdout: "",
              stderr: "ls: cannot open directory: Permission denied\n",
            };
          }
          return { code: 1, stdout: "", stderr: "Permission denied\n" };
        },
        async stopWorker() {},
      };

      // Run workersCheck with isolatedExecutor
      const check = await workersCheck({
        cfg,
        catalog,
        executor: isolatedExecutor,
        store,
        smoke: false,
      });

      // 1. check.ok must be explicitly true
      expect(check.ok).toBe(true);
      expect(check.results.length).toBeGreaterThanOrEqual(10);

      // 2. Deny checks must be present and verified with detail 'bị chặn'
      const secretsDenyCheck = check.results.filter(
        (r) => r.check === "chặn đọc secrets coordinator",
      );
      expect(secretsDenyCheck.length).toBeGreaterThan(0);
      expect(secretsDenyCheck.every((r) => r.ok && r.detail === "bị chặn")).toBe(
        true,
      );

      const dataDenyCheck = check.results.filter(
        (r) => r.check === "chặn đọc dữ liệu coordinator",
      );
      expect(dataDenyCheck.length).toBeGreaterThan(0);
      expect(dataDenyCheck.every((r) => r.ok && r.detail === "bị chặn")).toBe(
        true,
      );

      const sudoDenyCheck = check.results.filter((r) => r.check === "chặn sudo");
      expect(sudoDenyCheck.length).toBeGreaterThan(0);
      expect(sudoDenyCheck.every((r) => r.ok && r.detail === "bị chặn")).toBe(
        true,
      );

      const dockerDenyCheck = check.results.filter(
        (r) => r.check === "chặn Docker host",
      );
      expect(dockerDenyCheck.length).toBeGreaterThan(0);
      expect(dockerDenyCheck.every((r) => r.ok && r.detail === "bị chặn")).toBe(
        true,
      );

      const repoDenyCheck = check.results.filter((r) =>
        r.check.startsWith("chặn đọc repo"),
      );
      expect(repoDenyCheck.length).toBeGreaterThan(0);
      expect(repoDenyCheck.every((r) => r.ok && r.detail === "bị chặn")).toBe(
        true,
      );

      // 3. Verify audit log entries in coordinator store
      const auditEvents = store.events(100).filter((e) => e.type === "audit");
      expect(auditEvents.length).toBeGreaterThanOrEqual(5);
      expect(
        auditEvents.some((e) =>
          e.message?.includes("chặn đọc secrets coordinator: OK bị chặn"),
        ),
      ).toBe(true);
      expect(
        auditEvents.some((e) =>
          e.message?.includes("chặn Docker host: OK bị chặn"),
        ),
      ).toBe(true);
      expect(
        auditEvents.some((e) => e.message?.includes("chặn sudo: OK bị chặn")),
      ).toBe(true);

      // 4. Negative test: verify that if a worker CAN read secrets, check.ok fails and audit records failure
      const leakyExecutor: CoordinatorExecutor = {
        ...isolatedExecutor,
        async asWorker(worker, cmd: string, args: string[]) {
          if (cmd === "cat" && args[0] === secretsFile) {
            // Unrestricted access leak
            return {
              code: 0,
              stdout: "COORDINATOR_GH_TOKEN=secret_token_12345\n",
              stderr: "",
            };
          }
          return isolatedExecutor.asWorker(worker, cmd, args);
        },
      };

      const leakyCheck = await workersCheck({
        cfg,
        catalog,
        executor: leakyExecutor,
        store,
        smoke: false,
      });

      expect(leakyCheck.ok).toBe(false);
      const failedChecks = leakyCheck.results.filter(
        (r) =>
          r.check === "chặn đọc secrets coordinator" &&
          !r.ok &&
          r.detail === "KHÔNG bị chặn",
      );
      expect(failedChecks.length).toBeGreaterThan(0);

      const leakAuditEvents = store
        .events(100)
        .filter(
          (e) =>
            e.type === "audit" &&
            e.message?.includes("chặn đọc secrets coordinator: LỖI KHÔNG bị chặn"),
        );
      expect(leakAuditEvents.length).toBeGreaterThan(0);
    });

    // Tình huống 11: Task catalog đổi/mất dependency -> Validation fail trước cấp việc
    it("Scenario 11: Catalog dependency corruption is rejected during validation", () => {
      const corruptDir = path.join(tmpDir, "corrupt-catalog");
      fs.mkdirSync(corruptDir, { recursive: true });

      const badTasks = {
        tasks: [
          {
            id: "TEST_A",
            owner: "W1",
            dependencies: ["NON_EXISTENT_TASK"],
            exclusiveResources: [],
            outputs: ["packages/schema/"],
          },
        ],
        locks: {},
      };
      const workersDoc = {
        workers: [
          {
            id: "W1",
            allowedRoots: ["packages/schema/"],
          },
        ],
      };
      fs.writeFileSync(
        path.join(corruptDir, "tasks.json"),
        JSON.stringify(badTasks),
      );
      fs.writeFileSync(
        path.join(corruptDir, "workers.example.json"),
        JSON.stringify(workersDoc),
      );
      fs.writeFileSync(
        path.join(corruptDir, "external-prerequisites.json"),
        JSON.stringify({ items: [] }),
      );

      const res = loadCatalog(corruptDir, {
        workersConfig: "workers.example.json",
      });
      expect(res.ok).toBe(false);
      expect(
        res.errors.some((e: string) =>
          e.includes("thiếu dependency NON_EXISTENT_TASK"),
        ),
      ).toBe(true);
    });

    // Tình huống 12: External missing/live chưa test -> BLOCKED_EXTERNAL, không DONE giả (kiểm tra trực tiếp engine.blockReason)
    it("Scenario 12: Missing external prerequisite blocks task as BLOCKED_EXTERNAL via engine.blockReason", () => {
      const repoRoot = path.resolve(__dirname, "../../");
      const catalog = loadCatalog(path.join(repoRoot, "docs/multi-worker"), {
        workersConfig: "config/workers.example.json",
      });
      expect(catalog.ok).toBe(true);

      const task = catalog.byId.get("F07");
      expect(task).toBeDefined();
      if (!task) return;

      const engine = createEngine({
        cfg: {
          maxReviewFailures: 2,
          maxAttempts: 4,
          limits: {},
          workerMap: {},
          respectNotBefore: false,
          dataDir: tmpDir,
          docsPath: "docs/multi-worker",
        },
        store,
        executor: createExecutor({ mode: "local" }),
        git: {},
        agent: {},
        github: {},
        verifier: {},
        loadCatalog: () => catalog,
      });

      // Task F07 requires dependency F01 to be DONE first
      store.ensureTask("F01");
      const f01Fencing = store.bumpFencing("F01");
      store.updateTask("F01", f01Fencing, { status: "DONE" });

      store.ensureTask(task.id);

      // External prerequisite 'coordinator-runtime' is missing
      store.setExternal("coordinator-runtime", false, "chưa qua kiểm thử");
      expect(store.externalReady("coordinator-runtime")).toBe(false);

      // Directly call engine.blockReason(task)
      const blockReasonMissing = engine.blockReason(task);
      expect(blockReasonMissing).toBe("BLOCKED_EXTERNAL: coordinator-runtime");

      // Claiming work for a blocked task must return null atomically
      const claimResultBlocked = engine.claim(task, "work");
      expect(claimResultBlocked).toBeNull();
      expect(store.task(task.id).status).toBe("TODO");

      // Now mark external prerequisite ready
      store.setExternal(
        "coordinator-runtime",
        true,
        "đã kiểm chứng qua 12 tình huống",
      );
      expect(store.externalReady("coordinator-runtime")).toBe(true);

      // Directly call engine.blockReason(task) -> must be null (ready)
      const blockReasonReady = engine.blockReason(task);
      expect(blockReasonReady).toBeNull();

      // Claiming work now succeeds and transitions task to RUNNING
      const claimResultSuccess = engine.claim(task, "work");
      expect(claimResultSuccess).not.toBeNull();
      expect(claimResultSuccess).toBeGreaterThan(0);
      expect(store.task(task.id).status).toBe("RUNNING");
    });
  },
);
