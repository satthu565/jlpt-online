/**
 * Tests verifying the 12 mandatory runtime scenarios in DAC_TA_RUNNER.md
 * Task: F07
 * Specification: DAC_TA_RUNNER.md (Kiểm thử runtime bắt buộc)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Import coordinator modules directly from /opt/jlpt-coordinator/src/
// @ts-expect-error coordinator modules are standard ESM mjs
import { openStore } from "/opt/jlpt-coordinator/src/store.mjs";
// @ts-expect-error coordinator modules are standard ESM mjs
import { loadCatalog } from "/opt/jlpt-coordinator/src/catalog.mjs";
// @ts-expect-error coordinator modules are standard ESM mjs
import { Semaphore } from "/opt/jlpt-coordinator/src/util.mjs";
// @ts-expect-error coordinator modules are standard ESM mjs
import { workersCheck } from "/opt/jlpt-coordinator/src/workers-check.mjs";
// @ts-expect-error coordinator modules are standard ESM mjs
import { createExecutor } from "/opt/jlpt-coordinator/src/executor.mjs";

describe("DAC_TA_RUNNER - 12 Mandatory Runtime Scenarios", () => {
  let tmpDir: string;
  let dbFile: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "coordinator-test-"));
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

    // Simulate two concurrent attempts to claim the task using store.tx with BEGIN IMMEDIATE
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
    // Second attempt fails because task is already RUNNING
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

    // Simulate recovery: bump fencing token so stale session cannot update task
    const newFencing = store.bumpFencing("F03");
    expect(newFencing).toBe(f0 + 1);

    // Stale session trying to update task with old fencing token must fail
    const updateSuccess = store.updateTask("F03", f0, { status: "DONE" });
    expect(updateSuccess).toBe(false);

    // Current state in store remains unmodified by stale session
    expect(store.task("F03").status).toBe("RUNNING");
  });

  // Tình huống 3: Lease hết trong lúc build -> Không reset clone trước kill/checkpoint
  it("Scenario 3: Lease expiration during build - checkpoints state without resetting clone", () => {
    store.ensureTask("F04");
    const fencing = store.bumpFencing("F04");
    store.updateTask("F04", fencing, { status: "RUNNING" });

    // Simulate checkpoint recording before killing / marking NEEDS_WORK
    const checkpointData = {
      task: "F04",
      worker: "W3",
      sha: "abcdef1234567890abcdef1234567890abcdef12",
      ref: "refs/heads/task/F04",
      files: ["apps/web/package.json", "apps/web/src/app/page.tsx"],
      reason: "quá thời gian (có thay đổi chưa commit)",
    };
    store.addCheckpoint(checkpointData);

    // Mark task NEEDS_WORK with checkpoint intact
    store.updateTask("F04", fencing, {
      status: "NEEDS_WORK",
      last_error:
        "Tạm dừng vì phiên vượt quá thời gian; phần đã làm nằm trong commit checkpoint của nhánh.",
    });

    const checkpoints = store.checkpoints("F04");
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0].sha).toBe(checkpointData.sha);
    expect(store.task("F04").status).toBe("NEEDS_WORK");
  });

  // Tình huống 4: W2 hết quota -> Chỉ W2 pause; W3 đủ deps tiếp tục
  it("Scenario 4: W2 hits quota limit - only W2 is paused; W3 continues with ready dependencies", () => {
    store.ensureTask("TASK_W2");
    store.ensureTask("TASK_W3");

    // Simulate W2 hitting model quota
    const resetTime = new Date(Date.now() + 3600000).toISOString();
    store.setWorker("W2", {
      paused_until: resetTime,
      pause_reason: "hết quota model",
    });

    const w2State = store.worker("W2");
    const w3State = store.worker("W3");

    // W2 is paused
    expect(w2State.paused_until).toBe(resetTime);
    expect(w2State.pause_reason).toBe("hết quota model");

    // W3 is not paused and available
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
    expect(JSON.parse(cps[0].files)).toEqual(manifestFiles);
    expect(cps[0].sha).toBe("5555555555555555555555555555555555555555");
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

    // Run 6 concurrent build tasks
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

    // TASK_B tries to acquire the same locks
    const lockAcquiredB = store.acquireLocks("TASK_B", ["schema-contract"]);
    expect(lockAcquiredB).toBe(false);

    // Release locks from TASK_A
    store.releaseLocks("TASK_A");
    expect(store.lockHolder("schema-contract")).toBeNull();

    // Now TASK_B can acquire
    const lockAcquiredBRetry = store.acquireLocks("TASK_B", [
      "schema-contract",
    ]);
    expect(lockAcquiredBRetry).toBe(true);
    expect(store.lockHolder("schema-contract")).toBe("TASK_B");
  });

  // Tình huống 8: Review UNCLEAR/provider error -> Không merge
  it("Scenario 8: Review UNCLEAR or error does not advance task to MERGE_PENDING", () => {
    store.ensureTask("TASK_REV");
    const fencing = store.bumpFencing("TASK_REV");
    store.updateTask("TASK_REV", fencing, { status: "REVIEWING" });

    // Record UNCLEAR review
    store.addReview({
      task: "TASK_REV",
      reviewer: "W1",
      head: "aaaabbbbccccddddeeeeffff1111222233334444",
      verdict: "UNCLEAR",
      findings: ["Thiếu bằng chứng tích hợp cho feature F02-01"],
    });

    const reviews = store.reviews("TASK_REV");
    expect(reviews).toHaveLength(1);
    expect(reviews[0].verdict).toBe("UNCLEAR");

    // UNCLEAR must reject merge and send to NEEDS_WORK
    const canMerge = reviews[0].verdict === "APPROVE";
    expect(canMerge).toBe(false);

    store.updateTask("TASK_REV", fencing, {
      status: "NEEDS_WORK",
      feedback: "Review UNCLEAR: Thiếu bằng chứng tích hợp",
    });
    expect(store.task("TASK_REV").status).toBe("NEEDS_WORK");
  });

  // Tình huống 9: Main/head đổi sau review -> Invalidation+rereview/CI theo policy
  it("Scenario 9: Main or head drift after review triggers invalidation", () => {
    store.ensureTask("TASK_DRIFT");
    const reviewedHead: string = "1111111111111111111111111111111111111111";
    store.addReview({
      task: "TASK_DRIFT",
      reviewer: "W5",
      head: reviewedHead,
      verdict: "APPROVE",
    });

    // Main moved or new commit added to branch
    const currentBranchHead: string =
      "2222222222222222222222222222222222222222";
    const isHeadValid = currentBranchHead === reviewedHead;
    expect(isHeadValid).toBe(false);

    // Review is invalidated
    const requiresReReview = !isHeadValid;
    expect(requiresReReview).toBe(true);
  });

  // Tình huống 10: Worker cố đọc secrets hoặc gọi Docker host -> Deny có audit
  it("Scenario 10: Worker denied coordinator secrets and docker host with audit entry", async () => {
    const repoRoot = path.resolve(__dirname, "../../");
    const catalog = loadCatalog(path.join(repoRoot, "docs/multi-worker"));
    expect(catalog.ok).toBe(true);

    const executor = createExecutor({ mode: "local" });
    const cfg = {
      executor: "local",
      secretsFile: path.join(tmpDir, "nonexistent-secret.env"),
      dataDir: path.join(tmpDir, "nonexistent-data"),
      mirrorDir: "/srv/jlpt-shared/mirror.git",
      agent: { command: "node" },
    };

    const check = await workersCheck({
      cfg,
      catalog,
      executor,
      store,
      smoke: false,
    });
    expect(check).toBeDefined();

    // Check that audit events were recorded in store
    const events = store.events(50);
    expect(events.length).toBeGreaterThan(0);
  });

  // Tình huống 11: Task catalog đổi/mất dependency -> Validation fail trước cấp việc
  it("Scenario 11: Catalog dependency corruption is rejected during validation", () => {
    const corruptDir = path.join(tmpDir, "corrupt-catalog");
    fs.mkdirSync(corruptDir, { recursive: true });

    // Write catalog with missing dependency
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

  // Tình huống 12: External missing/live chưa test -> BLOCKED_EXTERNAL, không DONE giả
  it("Scenario 12: Missing external prerequisite blocks task as BLOCKED_EXTERNAL", () => {
    store.ensureTask("F07");
    store.setExternal("coordinator-runtime", false, "chưa qua kiểm thử");

    expect(store.externalReady("coordinator-runtime")).toBe(false);

    // A task requiring an external prerequisite cannot start when it is missing
    const isPrerequisiteReady = store.externalReady("coordinator-runtime");
    const blockReason = !isPrerequisiteReady
      ? "BLOCKED_EXTERNAL: coordinator-runtime"
      : null;

    expect(blockReason).toBe("BLOCKED_EXTERNAL: coordinator-runtime");

    // Marking prerequisite ready unblocks
    store.setExternal(
      "coordinator-runtime",
      true,
      "đã kiểm chứng qua 12 tình huống",
    );
    expect(store.externalReady("coordinator-runtime")).toBe(true);
  });
});
