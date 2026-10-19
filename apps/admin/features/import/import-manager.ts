import type { Level, MondaiType, Skill, RichText, RichBlock } from '@jlpt/schema';
import { readZipBuffer } from './zip-reader';
import type {
  AdminExam,
  AdminExamSection,
  AdminExamItem,
  AdminQuestion,
  AdminQuestionGroup,
  AdminQuestionOption,
  ListeningTimelineItem,
} from '../content/types';
import { createTextSegment } from '../content/types';
import {
  type ImportJobSummary,
  type BatchImportSummary,
  type SourceFileRef,
  type SourcePageResolution,
  StandalonePdfError,
  ImportValidationError,
} from './types';
import { assertNotStandalonePdf, validateImportV2Package } from './import-validator';
import { JsonCsvService } from './json-csv-service';

export interface ConvertedImportDraft {
  exam: AdminExam;
  groups: AdminQuestionGroup[];
  sourceFiles: SourceFileRef[];
}

/**
 * ImportManager (PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-17, PDF-26, PDF-28)
 * Manages package upload, validation, draft creation, and batch processing.
 */
export class ImportManager {
  private jobs: Map<string, ImportJobSummary> = new Map();
  private drafts: Map<string, ConvertedImportDraft> = new Map();
  private jsonCsvService: JsonCsvService;

  constructor() {
    this.jsonCsvService = new JsonCsvService();
  }

  public listJobs(): ImportJobSummary[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public getJob(id: string): ImportJobSummary | null {
    return this.jobs.get(id) ?? null;
  }

  public getConvertedDraft(jobId: string): ConvertedImportDraft | null {
    return this.drafts.get(jobId) ?? null;
  }

  /**
   * PDF-01: Upload một gói dữ liệu chuẩn; PDF gốc tùy chọn để đối chiếu
   * Enforces:
   * "Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không khởi động đọc file"
   */
  public async importPackage(
    buffer: Uint8Array | Buffer,
    fileName: string,
    operatorId = 'importer',
    options?: { mode?: 'draft' | 'ready' },
  ): Promise<ImportJobSummary> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const mode = options?.mode;

    // 1. Strict guard: Standalone PDF is strictly forbidden from initiating extraction!
    assertNotStandalonePdf(buffer, fileName);

    // 2. Extract ZIP buffer safely
    let files: Record<string, Uint8Array>;
    try {
      files = readZipBuffer(Buffer.from(buffer));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const failedJob: ImportJobSummary = {
        id: jobId,
        fileName,
        fileSizeBytes: buffer.length,
        status: 'failed',
        errors: [`Tệp gói ZIP không hợp lệ hoặc bị lỗi nén: ${msg}`],
        warnings: [],
        blockingIssueCount: 1,
        nonBlockingIssueCount: 0,
        extractedQuestionsCount: 0,
        sourceFiles: [],
        createdAt: now,
        createdBy: operatorId,
      };
      this.jobs.set(jobId, failedJob);
      throw new ImportValidationError(failedJob.errors[0]!, failedJob.errors, []);
    }

    // 3. Run validation against Import v2 specification
    const validation = validateImportV2Package({ files, fileName, mode });
    const pkgJson = validation.packageJson;
    const sourceObj = (pkgJson['source'] as Record<string, unknown>) || {};
    const rawSourceFiles = Array.isArray(pkgJson['sourceFiles'])
      ? (pkgJson['sourceFiles'] as Record<string, unknown>[])
      : [];

    const sourceFiles: SourceFileRef[] = rawSourceFiles.map((sf, idx) => ({
      id: String(sf['id'] || `source_${idx + 1}`),
      path: String(sf['path'] || ''),
      sha256: String(sf['sha256'] || ''),
      mimeType: String(sf['mimeType'] || 'application/pdf'),
      sizeBytes: typeof sf['sizeBytes'] === 'number' ? sf['sizeBytes'] : undefined,
    }));

    const rawIssues = Array.isArray(pkgJson['issues'])
      ? (pkgJson['issues'] as Record<string, unknown>[])
      : [];
    const issues = rawIssues.map((iss) => ({
      id: String(iss['id'] || ''),
      severity: (iss['severity'] === 'warning' ? 'warning' : 'blocking') as 'blocking' | 'warning',
      path: String(iss['path'] || ''),
      reason: String(iss['reason'] || ''),
      sourcePages: Array.isArray(iss['sourcePages']) ? (iss['sourcePages'] as number[]) : [],
    }));

    if (!validation.valid) {
      const failedJob: ImportJobSummary = {
        id: jobId,
        fileName,
        fileSizeBytes: buffer.length,
        status: 'failed',
        packageId: typeof pkgJson['packageId'] === 'string' ? pkgJson['packageId'] : undefined,
        revision: typeof pkgJson['revision'] === 'number' ? pkgJson['revision'] : 1,
        targetLevel: sourceObj['level'] as Level | undefined,
        year: typeof sourceObj['year'] === 'number' ? sourceObj['year'] : null,
        session: (sourceObj['session'] as 7 | 12 | null) ?? null,
        provenance: sourceObj['provenance'] as 'official_past_exam' | 'self_authored' | 'third_party' | undefined,
        contentHash: validation.contentHash,
        errors: validation.errors,
        warnings: validation.warnings,
        blockingIssueCount: validation.blockingIssueCount,
        nonBlockingIssueCount: validation.nonBlockingIssueCount,
        extractedQuestionsCount: 0,
        sourceFiles,
        issues,
        readiness: 'INVALID',
        mode,
        createdAt: now,
        createdBy: operatorId,
      };
      this.jobs.set(jobId, failedJob);
      throw new ImportValidationError('Gói nhập dữ liệu không hợp lệ.', validation.errors, validation.warnings);
    }

    // 4. Convert validated package data into AdminQuestionGroup array and draft AdminExam
    const groups = this.convertRawGroups(pkgJson, operatorId);
    const draftExamId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const draftExam = this.createDraftExam(draftExamId, pkgJson, groups, sourceFiles, operatorId);

    const questionCount = groups.reduce((acc, g) => acc + g.questions.length, 0);

    const summaryJob: ImportJobSummary = {
      id: jobId,
      fileName,
      fileSizeBytes: buffer.length,
      status: options?.mode === 'draft' ? 'DRAFT_ONLY' : 'draft_created',
      readiness: validation.readiness,
      mode,
      packageId: String(pkgJson['packageId']),
      revision: Number(pkgJson['revision'] || 1),
      targetLevel: sourceObj['level'] as Level,
      year: typeof sourceObj['year'] === 'number' ? sourceObj['year'] : null,
      session: (sourceObj['session'] as 7 | 12 | null) ?? null,
      provenance: sourceObj['provenance'] as 'official_past_exam' | 'self_authored' | 'third_party',
      contentHash: validation.contentHash,
      errors: validation.errors,
      warnings: validation.warnings,
      blockingIssueCount: validation.blockingIssueCount,
      nonBlockingIssueCount: validation.nonBlockingIssueCount,
      extractedQuestionsCount: questionCount,
      sourceFiles,
      issues,
      draftExamId,
      createdAt: now,
      createdBy: operatorId,
    };

    this.jobs.set(jobId, summaryJob);
    this.drafts.set(jobId, {
      exam: draftExam,
      groups,
      sourceFiles,
    });

    return summaryJob;
  }

  /**
   * PDF-02: Upload nhiều PDF/gói cùng lúc theo lô
   */
  public async importBatch(
    packages: { buffer: Uint8Array | Buffer; fileName: string }[],
    operatorId = 'importer',
  ): Promise<BatchImportSummary> {
    const jobs: ImportJobSummary[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const pkg of packages) {
      try {
        const job = await this.importPackage(pkg.buffer, pkg.fileName, operatorId);
        jobs.push(job);
        succeeded++;
      } catch (err: unknown) {
        failed++;
        if (err instanceof StandalonePdfError) {
          const failedJob: ImportJobSummary = {
            id: `job_err_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            fileName: pkg.fileName,
            fileSizeBytes: pkg.buffer.length,
            status: 'failed',
            errors: [err.message],
            warnings: [],
            blockingIssueCount: 1,
            nonBlockingIssueCount: 0,
            extractedQuestionsCount: 0,
            sourceFiles: [],
            createdAt: new Date().toISOString(),
            createdBy: operatorId,
          };
          this.jobs.set(failedJob.id, failedJob);
          jobs.push(failedJob);
        } else if (err instanceof ImportValidationError) {
          const failedJob: ImportJobSummary = {
            id: `job_err_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            fileName: pkg.fileName,
            fileSizeBytes: pkg.buffer.length,
            status: 'failed',
            errors: err.errors,
            warnings: err.warnings,
            blockingIssueCount: 1,
            nonBlockingIssueCount: 0,
            extractedQuestionsCount: 0,
            sourceFiles: [],
            createdAt: new Date().toISOString(),
            createdBy: operatorId,
          };
          this.jobs.set(failedJob.id, failedJob);
          jobs.push(failedJob);
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          const failedJob: ImportJobSummary = {
            id: `job_err_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            fileName: pkg.fileName,
            fileSizeBytes: pkg.buffer.length,
            status: 'failed',
            errors: [msg],
            warnings: [],
            blockingIssueCount: 1,
            nonBlockingIssueCount: 0,
            extractedQuestionsCount: 0,
            sourceFiles: [],
            createdAt: new Date().toISOString(),
            createdBy: operatorId,
          };
          this.jobs.set(failedJob.id, failedJob);
          jobs.push(failedJob);
        }
      }
    }

    return {
      totalPackages: packages.length,
      succeededCount: succeeded,
      failedCount: failed,
      jobs,
    };
  }

  /**
   * PDF-19 & PDF-26: Resolve source page for a question group
   */
  public resolveSourcePage(jobId: string, group: AdminQuestionGroup): SourcePageResolution {
    const draft = this.drafts.get(jobId);
    const sourceFiles = draft ? draft.sourceFiles : [];
    return this.jsonCsvService.resolveSourcePage(group, sourceFiles);
  }

  // Helper converters
  private convertRawGroups(pkgJson: Record<string, unknown>, operatorId: string): AdminQuestionGroup[] {
    const rawGroups = (pkgJson['groups'] as Record<string, unknown>[]) || [];
    const sourceObj = (pkgJson['source'] as Record<string, unknown>) || {};
    const level = (sourceObj['level'] as Level) || 'N5';
    const now = new Date().toISOString();

    return rawGroups.map((g, gIdx) => {
      const gid = String(g['id'] || `grp_${gIdx + 1}`);
      const rawQuestions = (g['questions'] as Record<string, unknown>[]) || [];

      const questions: AdminQuestion[] = rawQuestions.map((q, qIdx) => {
        const rawOptions = (q['options'] as Record<string, unknown>[]) || [];
        const options: AdminQuestionOption[] = rawOptions.map((opt, optIdx) => ({
          label: String(opt['label'] || optIdx + 1),
          content: (opt['content'] as RichText) || [createTextSegment(String(opt['text'] || ''))],
        }));

        const correctOpt = typeof q['correctOption'] === 'number' ? q['correctOption'] : 1;
        const rawExplanation = q['explanation'] as RichText | undefined;

        return {
          questionId: String(q['id'] || `q_${gid}_${qIdx + 1}`),
          number: String(q['number'] || qIdx + 1),
          stem: (q['stem'] as RichText) || [createTextSegment(String(q['stemText'] || ''))],
          options,
          correctOption: correctOpt,
          explanation: rawExplanation,
        };
      });

      const mediaKeys = Array.isArray(g['mediaKeys']) ? (g['mediaKeys'] as string[]) : [];
      const rawTimeline = Array.isArray(g['listeningTimeline'])
        ? (g['listeningTimeline'] as Record<string, unknown>[])
        : [];

      const listeningTimeline: ListeningTimelineItem[] = rawTimeline.map((t) => ({
        groupId: gid,
        mediaKey: String(t['mediaKey'] || ''),
        startMs: Number(t['startMs'] || 0),
        endMs: Number(t['endMs'] || 0),
        audioStartMs: Number(t['audioStartMs'] || 0),
        audioEndMs: Number(t['audioEndMs'] || 0),
        gapAfterMs: Number(t['gapAfterMs'] || 0),
      }));

      // Source page number
      let sourcePage: number | undefined = undefined;
      if (Array.isArray(g['sourcePages']) && g['sourcePages'].length > 0) {
        const firstPage = g['sourcePages'][0] as Record<string, unknown>;
        if (typeof firstPage['page'] === 'number') {
          sourcePage = firstPage['page'];
        }
      }

      return {
        id: gid,
        version: 1,
        level,
        sectionCode: String(g['sectionCode'] || 'language_knowledge'),
        mondaiType: (g['mondaiType'] as MondaiType) || 'kanji_reading',
        skill: (g['skill'] as Skill) || 'kanji',
        title: typeof g['title'] === 'string' ? g['title'] : undefined,
        instructions: (g['instructions'] as RichText) || [createTextSegment('Hướng dẫn làm bài')],
        passage: (g['passage'] as RichBlock[]) || null,
        mediaIds: mediaKeys,
        listeningTimeline: listeningTimeline.length > 0 ? listeningTimeline : undefined,
        questions,
        sourceRef: String(sourceObj['provenance'] || 'official_past_exam'),
        sourcePage,
        status: 'draft',
        authorId: operatorId,
        lastEditedBy: operatorId,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  private createDraftExam(
    id: string,
    pkgJson: Record<string, unknown>,
    groups: AdminQuestionGroup[],
    sourceFiles: SourceFileRef[],
    _operatorId: string,
  ): AdminExam {
    const examObj = (pkgJson['exam'] as Record<string, unknown>) || {};
    const sourceObj = (pkgJson['source'] as Record<string, unknown>) || {};
    const now = new Date().toISOString();

    const sectionsRaw = (examObj['sections'] as Record<string, unknown>[]) || [
      {
        code: 'language_knowledge',
        title: 'Kiến thức ngôn ngữ',
        durationSec: 6000,
        groupIds: groups.map((g) => g.id),
      },
    ];

    const sections: AdminExamSection[] = sectionsRaw.map((sec, secIdx) => {
      const groupIds = Array.isArray(sec['groupIds']) ? (sec['groupIds'] as string[]) : [];
      const items: AdminExamItem[] = [];
      groupIds.forEach((gid, itemIdx) => {
        const group = groups.find((g) => g.id === gid);
        if (group) {
          items.push({
            id: `item_${sec['code']}_${itemIdx + 1}`,
            examId: id,
            sectionCode: String(sec['code']),
            groupVersionId: `${group.id}_v${group.version}`,
            groupId: group.id,
            orderIndex: itemIdx + 1,
            group,
          });
        }
      });

      return {
        code: String(sec['code'] || `section_${secIdx + 1}`),
        title: String(sec['title'] || `Phần thi ${secIdx + 1}`),
        durationSec: Number(sec['durationSec'] || 3600),
        orderIndex: secIdx + 1,
        items,
      };
    });

    const totalQuestions = groups.reduce((acc, g) => acc + g.questions.length, 0);

    return {
      id,
      slug: String(examObj['slug'] || `jlpt-${String(sourceObj['level']).toLowerCase()}-draft`),
      level: (sourceObj['level'] as Level) || 'N5',
      title: String(examObj['title'] || 'Đề thi nhập mới'),
      kind: (examObj['kind'] as 'original' | 'practice') || 'original',
      year: typeof sourceObj['year'] === 'number' ? sourceObj['year'] : undefined,
      session: sourceObj['session'] ? String(sourceObj['session']) : undefined,
      description: String(examObj['description'] || 'Đề thi tạo tự động từ gói nhập Import v2'),
      blueprintId: String((examObj['blueprintRef'] as Record<string, unknown>)?.['id'] || 'default-blueprint'),
      blueprintVersion: Number((examObj['blueprintRef'] as Record<string, unknown>)?.['version'] || 1),
      sourceRefs: sourceFiles.map((sf) => sf.path || sf.id),
      sections,
      totalQuestions,
      status: 'draft',
      publishedVersion: null,
      createdAt: now,
      updatedAt: now,
    };
  }
}
