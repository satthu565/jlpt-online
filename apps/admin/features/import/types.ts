import type { Level, MondaiType, Skill } from '@jlpt/schema';
import type { ContentStatus } from '../content/types';

export type ImportJobStatus = 'pending' | 'validating' | 'draft_created' | 'succeeded' | 'failed';

export interface ImportPackageSource {
  level: Level;
  year?: number | null;
  session?: 7 | 12 | null;
  provenance: 'official_past_exam' | 'self_authored' | 'third_party';
  licenseRef?: string | null;
  rightsStatus?: 'verified' | 'unverified' | 'licensed' | 'public_domain';
}

export interface SourceFileRef {
  id: string;
  path: string;
  sha256: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface MediaManifestItem {
  key: string;
  path: string;
  sha256: string;
  mimeType: string;
  durationMs?: number;
  width?: number;
  height?: number;
}

export interface ImportJobSummary {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  status: ImportJobStatus;
  packageId?: string;
  revision?: number;
  targetLevel?: Level;
  year?: number | null;
  session?: 7 | 12 | null;
  provenance?: 'official_past_exam' | 'self_authored' | 'third_party';
  contentHash?: string;
  errors: string[];
  warnings: string[];
  blockingIssueCount: number;
  nonBlockingIssueCount: number;
  extractedQuestionsCount: number;
  sourceFiles: SourceFileRef[];
  draftExamId?: string;
  createdAt: string;
  createdBy: string;
}

export interface BatchImportSummary {
  totalPackages: number;
  succeededCount: number;
  failedCount: number;
  jobs: ImportJobSummary[];
}

export interface SourcePageResolution {
  sourceFileId: string;
  pageNumber: number;
  url: string;
  available: boolean;
  error?: string;
}

export interface CsvQuestionRecord {
  id: string;
  version: number;
  level: Level;
  sectionCode: string;
  mondaiType: MondaiType;
  skill: Skill;
  orderInSection: number;
  instructions: string;
  passageText: string;
  questionNumber: string;
  stemText: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctOption: number;
  explanationText: string;
  sourceRef: string;
  sourcePages: string;
  status: ContentStatus;
}

export class StandalonePdfError extends Error {
  public readonly code = 'STANDALONE_PDF_NOT_EXTRACTABLE';
  constructor(
    message = 'Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không khởi động đọc file. Không thực hiện OCR hoặc bóc tách tự động.',
  ) {
    super(message);
    this.name = 'StandalonePdfError';
  }
}

export class ImportValidationError extends Error {
  public readonly code = 'IMPORT_VALIDATION_FAILED';
  public readonly errors: string[];
  public readonly warnings: string[];

  constructor(message: string, errors: string[] = [], warnings: string[] = []) {
    super(message);
    this.name = 'ImportValidationError';
    this.errors = errors;
    this.warnings = warnings;
  }
}
