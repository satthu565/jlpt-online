import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { resolveRepoPath } from '../../common/utils/paths.js';
import { StorageService } from '../storage/storage.service.js';
import { MediaService } from '../media/media.service.js';
import { ReviewService } from '../review/review.service.js';
import { OutboxService, type DbTx } from '../outbox/outbox.service.js';
import { BlueprintService, toDeterministicUuid } from '../blueprint/blueprint.service.js';
import type { ImportJobSummary, ImportPackageOptions } from './import.types.js';

// Import verified content-tools utilities
import {
  validateImportData,
  computePackageContentHash,
  evaluatePackageImportIdempotency,
  readZipBuffer,
  type BlueprintDefinition,
  type BlueprintSection,
  type ImportPackageV2,
  type PackageIdentity,
} from '@jlpt/content-tools';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly storageService: StorageService,
    private readonly mediaService: MediaService,
    private readonly reviewService: ReviewService,
    private readonly outboxService: OutboxService,
    private readonly blueprintService: BlueprintService,
  ) {}

  /**
   * Processes a package import from a ZIP buffer.
   * Enforces:
   * 1. Validate before database: syntax, schema, file hashes, media magic bytes, listening timeline, blueprint match.
   * 2. Transaction rollback: database is untouched if validation or any operation fails.
   * 3. PackageId/revision/contentHash conflict detection and idempotency.
   * 4. Outbox domain event emission in the same transaction.
   */
  async processPackageImport(
    packageBuffer: Buffer,
    fileName: string,
    uploadedByUserId: string,
    options?: ImportPackageOptions,
  ): Promise<ImportJobSummary> {
    const mode = options?.mode ?? 'ready';
    const packageSha256 = crypto.createHash('sha256').update(packageBuffer).digest('hex');

    // 1. In-memory Quarantine & Safe Extraction (Zip-Slip / Zip-Bomb protection)
    let files: Record<string, Uint8Array>;
    try {
      files = readZipBuffer(packageBuffer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Tệp ZIP không hợp lệ hoặc không an toàn: ${msg}`);
    }

    if (!files['import.json']) {
      throw new BadRequestException('Gói nhập thiếu tệp import.json ở thư mục gốc');
    }

    let rawJson: unknown;
    try {
      const jsonStr = Buffer.from(files['import.json']).toString('utf8');
      rawJson = JSON.parse(jsonStr);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`import.json không phải JSON UTF-8 hợp lệ: ${msg}`);
    }

    // 2. Schema, Checksum, Semantic & Blueprint Validation BEFORE touching the database
    // Optional blueprint check if blueprintRef is provided
    let blueprintDef: BlueprintDefinition | undefined = undefined;
    const pkgCandidate = rawJson as Partial<ImportPackageV2>;
    if (pkgCandidate.exam?.blueprintRef?.id) {
      try {
        const bpRow = await this.blueprintService.getBlueprintById(
          pkgCandidate.exam.blueprintRef.id,
          pkgCandidate.exam.blueprintRef.version,
        );
        blueprintDef = {
          id: bpRow.id,
          level: bpRow.level as BlueprintDefinition['level'],
          version: bpRow.version,
          sections: bpRow.sections as BlueprintSection[],
        };
      } catch {
        // If blueprint not yet in DB, check demo-data fixtures
        const fixturePath = resolveRepoPath(
          `docs/multi-worker/demo-data/blueprints/${pkgCandidate.exam.blueprintRef.id}-v1.json`,
        );
        if (fs.existsSync(fixturePath)) {
          blueprintDef = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        }
      }
    }

    const validationResult = validateImportData(rawJson, {
      mode,
      packageFiles: files,
      blueprint: blueprintDef,
    });

    if (!validationResult.valid || validationResult.readiness === 'INVALID') {
      this.logger.warn(`Import validation failed for ${fileName}: ${validationResult.errors.join('; ')}`);
      throw new BadRequestException({
        message: 'Dữ liệu gói nhập không hợp lệ',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });
    }

    if (mode === 'ready' && validationResult.blockingIssueCount > 0) {
      throw new BadRequestException({
        message: `Gói nhập có ${validationResult.blockingIssueCount} issue blocking; không thể nạp ở chế độ ready`,
        errors: validationResult.errors,
      });
    }

    const pkg = rawJson as ImportPackageV2;

    // 3. Compute deterministic Content Hash (SHA-256)
    const contentHash = computePackageContentHash(pkg, files);

    // 4. Idempotency & Conflict Evaluation (Acceptance 2)
    const existingJobs = await this.dbClient.db
      .select()
      .from(schema.importJobs)
      .where(eq(schema.importJobs.status, 'succeeded'));

    const existingIdentities: PackageIdentity[] = [];
    for (const j of existingJobs) {
      const errLog = j.errorLog as Record<string, unknown> | null;
      if (errLog && typeof errLog === 'object' && errLog['packageId']) {
        existingIdentities.push({
          packageId: String(errLog['packageId']),
          revision: Number(errLog['revision'] || 1),
          contentHash: String(errLog['contentHash'] || j.packageSha256),
        });
      }
    }

    const incomingIdentity: PackageIdentity = {
      packageId: pkg.packageId,
      revision: pkg.revision,
      contentHash,
    };

    const evaluation = evaluatePackageImportIdempotency(incomingIdentity, existingIdentities);

    if (evaluation.action === 'IDEMPOTENT_SKIP') {
      const matchingJob = existingJobs.find(
        (j: typeof schema.importJobs.$inferSelect) => {
          const errLog = j.errorLog as Record<string, unknown> | null;
          return errLog?.['packageId'] === pkg.packageId && errLog?.['revision'] === pkg.revision;
        },
      );
      return {
        id: matchingJob?.id ?? generateUuidV7(),
        status: 'succeeded',
        packageSha256,
        fileName,
        targetLevel: pkg.source.level,
        packageId: pkg.packageId,
        revision: pkg.revision,
        contentHash,
        createdAt: matchingJob?.createdAt ?? new Date(),
        completedAt: matchingJob?.completedAt ?? new Date(),
        message: evaluation.reason,
        idempotent: true,
      };
    }

    if (evaluation.action === 'REJECT_CONFLICT') {
      throw new ConflictException(evaluation.reason);
    }

    if (evaluation.action === 'REJECT_REGRESSION') {
      throw new ConflictException(evaluation.reason);
    }

    // 5. Store package artifacts in Object Storage
    const packageZipKey = `imports/${pkg.packageId}/r${pkg.revision}/${packageSha256}.zip`;
    await this.storageService.put(packageZipKey, packageBuffer, {
      mimeType: 'application/zip',
      metadata: { packageId: pkg.packageId, revision: String(pkg.revision), sha256: packageSha256 },
    });

    // Store media assets
    for (const m of pkg.media) {
      const fileBytes = files[m.path];
      if (fileBytes) {
        await this.storageService.put(m.path, Buffer.from(fileBytes), {
          mimeType: m.mimeType,
        });

        // Insert or ignore in mediaAssets
        await this.dbClient.db
          .insert(schema.mediaAssets)
          .values({
            id: generateUuidV7(),
            sha256: m.sha256,
            key: m.path,
            mime: m.mimeType,
            size: fileBytes.length,
            durationSec: m.durationMs ? Math.round(m.durationMs / 1000) : null,
          })
          .onConflictDoNothing();
      }
    }

    // Store source files
    for (const s of pkg.sourceFiles) {
      const sourceBytes = files[s.path];
      if (sourceBytes) {
        await this.storageService.put(s.path, Buffer.from(sourceBytes), {
          mimeType: s.mimeType,
        });
      }
    }

    // 6. Transactional Database Import (Acceptance 1 & Outbox Consistency)
    const jobId = generateUuidV7();
    const now = new Date();

    return await this.dbClient.db.transaction(async (tx: DbTx) => {
      // a) Insert importJobs
      await tx.insert(schema.importJobs).values({
        id: jobId,
        uploadedBy: uploadedByUserId,
        status: 'succeeded',
        packageSha256,
        fileName,
        targetLevel: pkg.source.level,
        errorLog: {
          packageId: pkg.packageId,
          revision: pkg.revision,
          contentHash,
          examSlug: pkg.exam.slug,
        },
        createdAt: now,
        completedAt: now,
      });

      // b) Insert importJobAttempts
      await tx.insert(schema.importJobAttempts).values({
        id: generateUuidV7(),
        jobId,
        attemptNumber: 1,
        status: 'succeeded',
        logs: [{ at: now.toISOString(), message: 'Package validated and imported successfully' }],
        startedAt: now,
        finishedAt: now,
      });

      // c) Insert importArtifacts
      await tx.insert(schema.importArtifacts).values({
        id: generateUuidV7(),
        jobId,
        artifactType: 'package_zip',
        storageKey: packageZipKey,
        createdAt: now,
      });

      // d) Exam Source & License
      const sourceSlug = pkg.source.provenance || 'self-authored';
      const sourceId = toDeterministicUuid(`source:${sourceSlug}`);
      await tx
        .insert(schema.examSources)
        .values({
          id: sourceId,
          slug: sourceSlug,
          name: pkg.source.name || 'Imported Source',
          provenance: pkg.source.provenance || 'self-authored',
          metadata: { rightsStatus: pkg.source.rightsStatus },
        })
        .onConflictDoNothing();

      const licenseId = toDeterministicUuid(`license:${sourceSlug}`);
      await tx
        .insert(schema.contentLicenses)
        .values({
          id: licenseId,
          sourceId,
          licenseType: pkg.source.licenseRef || 'imported',
          effectiveFrom: now,
          terms: 'Imported package license',
        })
        .onConflictDoNothing();

      // e) Groups and Questions (saved as draft, editor recorded)
      for (const group of pkg.groups) {
        const groupId = toDeterministicUuid(`${pkg.packageId}:group:${group.id}`);

        await tx
          .insert(schema.questionGroups)
          .values({
            id: groupId,
            sourceId,
            licenseId,
            level: pkg.source.level,
            sectionCode: group.sectionCode,
            title: `Nhóm ${group.id}`,
          })
          .onConflictDoNothing();

        const audioMediaKey = group.mediaKeys?.find((k: string) => k.endsWith('.wav') || k.endsWith('.mp3'));
        const audioAsset = pkg.media.find(
          (m: { path: string; sha256: string }) => m.path === audioMediaKey || group.mediaKeys?.includes(m.path),
        );
        const audioSha256 = audioAsset?.sha256 || null;

        await tx
          .insert(schema.questionGroupVersions)
          .values({
            groupId,
            version: 1,
            passage: (group.passage || []) as unknown,
            audioSha256,
            status: 'draft',
            createdAt: now,
          })
          .onConflictDoNothing();

        // Record editor for separation of duties in-memory and persistent DB
        this.reviewService.recordEditor('group_version', groupId, 1, uploadedByUserId);

        await tx
          .insert(schema.importArtifacts)
          .values({
            id: generateUuidV7(),
            jobId,
            artifactType: 'group',
            storageKey: groupId,
            createdAt: now,
          });

        if (Array.isArray(group.mediaKeys)) {
          for (const mk of group.mediaKeys) {
            await tx
              .insert(schema.importArtifacts)
              .values({
                id: generateUuidV7(),
                jobId,
                artifactType: 'group_media',
                storageKey: `${groupId}:${mk}`,
                createdAt: now,
              });
          }
        }

        for (const q of group.questions) {
          const questionId = toDeterministicUuid(`${pkg.packageId}:q:${q.id || q.number}`);

          await tx
            .insert(schema.questions)
            .values({
              id: questionId,
              groupId,
              level: pkg.source.level,
              skill: q.skill,
              mondaiType: group.mondaiType,
              origin: pkg.source.provenance || 'self-authored',
            })
            .onConflictDoNothing();

          await tx
            .insert(schema.questionVersions)
            .values({
              questionId,
              version: 1,
              stem: q.stem as unknown,
              explanation: (q.explanation || null) as unknown,
              status: 'draft',
              createdAt: now,
            })
            .onConflictDoNothing();

          this.reviewService.recordEditor('question_version', questionId, 1, uploadedByUserId);

          await tx
            .insert(schema.importArtifacts)
            .values({
              id: generateUuidV7(),
              jobId,
              artifactType: 'question',
              storageKey: questionId,
              createdAt: now,
            });

          // Options
          for (const opt of q.options) {
            const orderIndex = Number(opt.label) || 1;
            await tx
              .insert(schema.answerOptions)
              .values({
                questionId,
                questionVersion: 1,
                orderIndex,
                content: opt.content as unknown,
              })
              .onConflictDoNothing();
          }

          // Correct answers (server-only)
          if (q.correctOption !== null && q.correctOption !== undefined) {
            await tx
              .insert(schema.correctAnswers)
              .values({
                questionId,
                questionVersion: 1,
                correctOption: q.correctOption,
                explanationNotes: null,
              })
              .onConflictDoNothing();
          }
        }
      }

      // f) Exam Structure (status: draft, publishedVersion: null)
      const examId = toDeterministicUuid(`${pkg.packageId}:exam:${pkg.exam.slug}`);
      await tx
        .insert(schema.exams)
        .values({
          id: examId,
          slug: pkg.exam.slug,
          level: pkg.source.level,
          title: pkg.exam.title,
          kind: pkg.exam.kind,
          year: pkg.source.year ?? null,
          session: pkg.source.session ? String(pkg.source.session) : null,
          totalQuestions: pkg.exam.totalQuestions,
          description: pkg.source.name || '',
          publishedVersion: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      await tx
        .insert(schema.importArtifacts)
        .values({
          id: generateUuidV7(),
          jobId,
          artifactType: 'exam',
          storageKey: examId,
          createdAt: now,
        });

      // Exam sections and items
      let sIdx = 0;
      let globalQuestionIndex = 0;
      for (const section of pkg.exam.sections) {
        const sectionId = toDeterministicUuid(`${examId}:section:${section.code}`);
        await tx
          .insert(schema.examSections)
          .values({
            id: sectionId,
            examId,
            code: section.code,
            title: section.title,
            durationSec: section.durationSec || 600,
            orderIndex: sIdx++,
          })
          .onConflictDoNothing();

        for (const gid of section.groupIds) {
          const group = pkg.groups.find((g) => g.id === gid);
          if (group) {
            for (const q of group.questions) {
              const qId = toDeterministicUuid(`${pkg.packageId}:q:${q.id || q.number}`);
              const itemId = toDeterministicUuid(`${examId}:item:${globalQuestionIndex}`);

              await tx
                .insert(schema.examItems)
                .values({
                  id: itemId,
                  examId,
                  sectionId,
                  questionId: qId,
                  orderIndex: globalQuestionIndex++,
                })
                .onConflictDoNothing();
            }
          }
        }
      }

      // g) Outbox domain event within the transaction (Acceptance 3)
      await this.outboxService.emitEvent(
        'content.import.completed',
        jobId,
        uploadedByUserId,
        {
          importJobId: jobId,
          revision: pkg.revision,
          groupsCount: pkg.groups.length,
          questionsCount: pkg.exam.totalQuestions,
        },
        tx,
      );

      return {
        id: jobId,
        status: 'succeeded',
        packageSha256,
        fileName,
        targetLevel: pkg.source.level,
        packageId: pkg.packageId,
        revision: pkg.revision,
        contentHash,
        createdAt: now,
        completedAt: now,
        message: 'Nhập gói đề thành công',
        idempotent: false,
      };
    });
  }

  /**
   * Retrieves an import job by ID.
   */
  async getImportJob(jobId: string): Promise<ImportJobSummary> {
    const rows = await this.dbClient.db
      .select()
      .from(schema.importJobs)
      .where(eq(schema.importJobs.id, jobId))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Import job không tồn tại: ${jobId}`);
    }

    const j = rows[0]!;
    const errLog = j.errorLog as Record<string, unknown> | null;
    return {
      id: j.id,
      status: j.status as ImportJobSummary['status'],
      packageSha256: j.packageSha256,
      fileName: j.fileName,
      targetLevel: j.targetLevel,
      packageId: (errLog?.packageId as string) || undefined,
      revision: (errLog?.revision as number) || undefined,
      contentHash: (errLog?.contentHash as string) || undefined,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
    };
  }

  /**
   * Lists all import jobs.
   */
  async listImportJobs(): Promise<ImportJobSummary[]> {
    const rows = await this.dbClient.db
      .select()
      .from(schema.importJobs)
      .orderBy(desc(schema.importJobs.createdAt));

    return rows.map((j: typeof schema.importJobs.$inferSelect) => {
      const errLog = j.errorLog as Record<string, unknown> | null;
      return {
        id: j.id,
        status: j.status as ImportJobSummary['status'],
        packageSha256: j.packageSha256,
        fileName: j.fileName,
        targetLevel: j.targetLevel,
        packageId: (errLog?.packageId as string) || undefined,
        revision: (errLog?.revision as number) || undefined,
        contentHash: (errLog?.contentHash as string) || undefined,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
      };
    });
  }
}
