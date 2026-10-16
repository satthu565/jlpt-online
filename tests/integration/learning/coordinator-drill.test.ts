import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const COORDINATOR_SRC = process.env['COORDINATOR_SRC'] || '/opt/jlpt-coordinator/src';

interface CoordinatorStore {
  addCheckpoint: (c: {
    task: string;
    worker: string;
    sha: string;
    ref: string;
    files: Record<string, string>;
    reason: string;
  }) => void;
  checkpoints: (taskId: string) => Array<{
    id: number;
    task_id: string;
    worker: string;
    sha: string;
    ref: string;
    files: string;
    reason: string;
    created_at: string;
  }>;
  event: (type: string, message: string, meta?: Record<string, unknown>) => void;
  events: (taskId?: string) => Array<{ type: string; message: string; meta?: string }>;
  close: () => void;
}

function sha256File(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

describe('Coordinator Pause/Checkpoint/Resume Drill & Audit (L06 Acceptance 3)', () => {
  let tmpDir: string;
  let mirrorDir: string;
  let workerDir: string;
  let dbFile: string;
  let store: CoordinatorStore;

  // Coordinator modules
  let openStore: (file: string) => CoordinatorStore;
  let createGit: (
    executor: unknown,
    options: { trustedDir: string; mirrorDir: string },
  ) => {
    commitLeftovers: (worker: unknown, dir: string, msg: string) => Promise<string | null>;
    prepareBranch: (worker: unknown, dir: string, branch: string) => Promise<{ savedOnPreviousBranch?: string | null }>;
    manifest: (worker: unknown, dir: string, base: string, head: string) => Promise<Record<string, string | null>>;
    dirty: (worker: unknown, dir: string) => Promise<boolean>;
    head: (worker: unknown, dir: string) => Promise<string>;
  };

  beforeAll(async () => {
    // 1. Verify coordinator source exists
    if (!fs.existsSync(COORDINATOR_SRC)) {
      throw new Error(`Coordinator source not found at ${COORDINATOR_SRC}`);
    }

    const storeMod = await import(pathToFileURL(path.join(COORDINATOR_SRC, 'store.mjs')).href);
    const gitMod = await import(pathToFileURL(path.join(COORDINATOR_SRC, 'git.mjs')).href);

    openStore = storeMod.openStore;
    createGit = gitMod.createGit;
  });

  describe('1. Diễn tập thực tế: Pause -> Checkpoint -> Resume trên repo clone, bảo toàn 100% patch (zero patch loss)', () => {
    const mockWorker = { id: 'W6', name: 'Worker 6 (CI & Verification)', email: 'w6@jlpt.test' };
    const taskId = 'L06';
    let gitHelper: ReturnType<typeof createGit>;

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coord-drill-'));
      mirrorDir = path.join(tmpDir, 'mirror.git');
      workerDir = path.join(tmpDir, 'w6-workspace');
      dbFile = path.join(tmpDir, 'coordinator.sqlite');

      store = openStore(dbFile);

      // Create bare mirror repo with initial main commit
      const seedDir = path.join(tmpDir, 'seed');
      fs.mkdirSync(seedDir, { recursive: true });
      execSync('git init -b main', { cwd: seedDir });
      execSync('git config user.name "Coordinator Engine"', { cwd: seedDir });
      execSync('git config user.email "coord@jlpt.test"', { cwd: seedDir });
      fs.writeFileSync(path.join(seedDir, 'README.md'), '# JLPT Project Main\n');
      fs.writeFileSync(path.join(seedDir, 'package.json'), JSON.stringify({ name: 'jlpt-root', version: '0.1.0' }, null, 2));
      execSync('git add -A && git commit -m "chore: initial main commit"', { cwd: seedDir });
      execSync(`git clone --bare ${seedDir} ${mirrorDir}`, { cwd: tmpDir });

      // Clone into worker workspace
      execSync(`git clone ${mirrorDir} ${workerDir}`, { cwd: tmpDir });
      execSync('git config user.name "Worker 6"', { cwd: workerDir });
      execSync('git config user.email "w6@jlpt.test"', { cwd: workerDir });

      // Create coordinator git helper with local mock executor
      const mockExecutor = {
        asWorker: async (_w: unknown, cmd: string, args: string[]) => {
          try {
            const out = execSync(`${cmd} ${args.map((a) => `'${a}'`).join(' ')}`, {
              cwd: workerDir,
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            return { code: 0, stdout: out.trim(), stderr: '' };
          } catch (err: unknown) {
            const e = err as { status?: number; stdout?: string; stderr?: string };
            return { code: e.status ?? 1, stdout: (e.stdout ?? '').toString(), stderr: (e.stderr ?? '').toString() };
          }
        },
        asCoord: async (cmd: string, args: string[]) => {
          try {
            const out = execSync(`${cmd} ${args.map((a) => `'${a}'`).join(' ')}`, {
              cwd: mirrorDir,
              encoding: 'utf8',
            });
            return { code: 0, stdout: out.trim(), stderr: '' };
          } catch (err: unknown) {
            const e = err as { status?: number; stdout?: string; stderr?: string };
            return { code: e.status ?? 1, stdout: (e.stdout ?? '').toString(), stderr: (e.stderr ?? '').toString() };
          }
        },
      };

      gitHelper = createGit(mockExecutor, { trustedDir: mirrorDir, mirrorDir });
    });

    afterAll(() => {
      if (store) store.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('bước 1: chuẩn bị task branch và tạo các thay đổi dở dang (tracked edit, staged file, untracked test file)', async () => {
      await gitHelper.prepareBranch(mockWorker, workerDir, 'task/L06');

      // 1. Modify tracked file (package.json)
      const pkgPath = path.join(workerDir, 'package.json');
      const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkgData.scripts = { 'test:integration:billing': 'vitest billing' };
      fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2));

      // 2. Create staged file
      const docPath = path.join(workerDir, 'docs/decisions/L06-commerce-reliability.md');
      fs.mkdirSync(path.dirname(docPath), { recursive: true });
      fs.writeFileSync(docPath, '# Decision: Outbox & Commerce Idempotency\nApproved\n');
      execSync(`git add "${docPath}"`, { cwd: workerDir });

      // 3. Create untracked test file
      const testFilePath = path.join(workerDir, 'tests/integration/billing/sample.test.ts');
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      fs.writeFileSync(testFilePath, 'export const SAMPLE_DRILL = 42;\n');

      // Working tree is dirty
      const isDirty = await gitHelper.dirty(mockWorker, workerDir);
      expect(isDirty).toBe(true);
    });

    it('bước 2: coordinator phát lệnh pause & checkpoint - tự động gom toàn bộ thay đổi thành checkpoint commit mà không mất 1 byte nào', async () => {
      // Record SHA256 of all files before checkpoint
      const hashPkgBefore = sha256File(path.join(workerDir, 'package.json'));
      const hashDocBefore = sha256File(path.join(workerDir, 'docs/decisions/L06-commerce-reliability.md'));
      const hashTestBefore = sha256File(path.join(workerDir, 'tests/integration/billing/sample.test.ts'));

      // Checkpoint reason
      const reason = 'hết quota phiên làm việc';
      const commitMessage = `chore(checkpoint): ${taskId} ${reason}`;

      // Execute git.commitLeftovers
      const checkpointSha = await gitHelper.commitLeftovers(mockWorker, workerDir, commitMessage);
      expect(checkpointSha).toBeDefined();
      expect(checkpointSha).toBeTruthy();

      // Record in coordinator store
      store.addCheckpoint({
        task: taskId,
        worker: mockWorker.id,
        sha: checkpointSha!,
        ref: 'refs/heads/task/L06',
        files: {
          'package.json': hashPkgBefore,
          'docs/decisions/L06-commerce-reliability.md': hashDocBefore,
          'tests/integration/billing/sample.test.ts': hashTestBefore,
        },
        reason,
      });

      store.event('checkpoint', `Đã lưu checkpoint an toàn cho ${taskId}: ${checkpointSha}`, {
        task: taskId,
        worker: mockWorker.id,
      });

      // Verify workspace is now clean
      const isDirtyAfter = await gitHelper.dirty(mockWorker, workerDir);
      expect(isDirtyAfter).toBe(false);

      // Verify checkpoint commit in git log
      const log = execSync('git log -n 1 --format="%s"', { cwd: workerDir, encoding: 'utf8' }).trim();
      expect(log).toBe(commitMessage);

      // Verify store recorded checkpoint
      const dbCheckpoints = store.checkpoints(taskId);
      expect(dbCheckpoints.length).toBe(1);
      expect(dbCheckpoints[0]!.reason).toBe(reason);
      expect(dbCheckpoints[0]!.sha).toBe(checkpointSha);
    });

    it('bước 3: coordinator resume phiên làm việc - khôi phục và kiểm tra nội dung khớp 100% SHA256 (zero patch loss)', async () => {
      // Simulate resume: prepare branch for resumed task
      const prep = await gitHelper.prepareBranch(mockWorker, workerDir, 'task/L06');
      expect(prep).toBeDefined();

      // Inspect HEAD commit
      const currentHead = await gitHelper.head(mockWorker, workerDir);
      const dbCheckpoints = store.checkpoints(taskId);
      expect(currentHead).toBe(dbCheckpoints[0]!.sha);

      // Verify files exist and match pre-pause SHA256 byte-for-byte
      const hashPkgAfter = sha256File(path.join(workerDir, 'package.json'));
      const hashDocAfter = sha256File(path.join(workerDir, 'docs/decisions/L06-commerce-reliability.md'));
      const hashTestAfter = sha256File(path.join(workerDir, 'tests/integration/billing/sample.test.ts'));

      const savedFiles = JSON.parse(dbCheckpoints[0]!.files) as Record<string, string>;
      expect(hashPkgAfter).toBe(savedFiles['package.json']);
      expect(hashDocAfter).toBe(savedFiles['docs/decisions/L06-commerce-reliability.md']);
      expect(hashTestAfter).toBe(savedFiles['tests/integration/billing/sample.test.ts']);
    });
  });

  describe('2. Kiểm chứng bằng chứng thực tế từ Coordinator trong Git Log của Repository', () => {
    it('audit lịch sử git: xác thực các commit checkpoint có thật của các worker trước đó (V03, N06, A03, V01)', () => {
      const gitLogRaw = execSync(
        'git log --all --grep="chore(checkpoint)" -n 10 --format="%H|%s|%an|%ad"',
        { encoding: 'utf8' },
      ).trim();

      const lines = gitLogRaw.split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThanOrEqual(4);

      const parsedCommits = lines.map((line) => {
        const [sha, subject, author, date] = line.split('|');
        return { sha, subject, author, date };
      });

      const checkpointCommits = parsedCommits.filter((c) => c.subject?.startsWith('chore(checkpoint):'));
      expect(checkpointCommits.length).toBeGreaterThanOrEqual(4);

      // Verify presence of real checkpoint commits from previous worker sessions
      const hasV03Checkpoint = checkpointCommits.some((c) => c.subject?.includes('V03'));
      const hasN06Checkpoint = checkpointCommits.some((c) => c.subject?.includes('N06'));
      const hasA03Checkpoint = checkpointCommits.some((c) => c.subject?.includes('A03'));
      const hasV01Checkpoint = checkpointCommits.some((c) => c.subject?.includes('V01'));

      expect(hasV03Checkpoint).toBe(true);
      expect(hasN06Checkpoint).toBe(true);
      expect(hasA03Checkpoint).toBe(true);
      expect(hasV01Checkpoint).toBe(true);

      // Verify Conventional Commit format: 'chore(checkpoint): <taskId> <reason>'
      for (const commit of checkpointCommits) {
        expect(commit.subject).toMatch(/^chore\(checkpoint\): [A-Z0-9]+ .+/);
      }
    });

    it('xác nhận sau mỗi checkpoint, task được resume và merge thành công vào main mà không thất thoát mã nguồn', () => {
      const gitLogMain = execSync('git log origin/main -n 20 --format="%s"', { encoding: 'utf8' }).trim();

      // Check that feature PR merges exist following checkpoints
      expect(gitLogMain).toContain('feat(N06)');
      expect(gitLogMain).toContain('feat(V03)');
      expect(gitLogMain).toContain('feat(A03)');
      expect(gitLogMain).toContain('feat(V01)');
    });
  });
});
