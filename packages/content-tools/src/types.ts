export type JLPTLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
export type JLPTProvenance = 'self_authored' | 'official_past_exam' | 'third_party';
export type JLPTSession = 7 | 12 | null;
export type JLPTRightsStatus = 'unverified' | 'owner_confirmed';
export type ExamKind = 'original' | 'practice';
export type SectionCode =
  | 'language_vocab'
  | 'language_grammar_reading'
  | 'language_reading'
  | 'listening';
export type SkillType = 'kanji' | 'vocabulary' | 'grammar' | 'reading' | 'listening';
export type IssueSeverity = 'blocking' | 'warning';
export type ValidationMode = 'ready' | 'draft';
export type ReadinessState = 'READY_FOR_REVIEW' | 'DRAFT_ONLY' | 'INVALID';

export type MondaiType =
  | 'kanji_reading'
  | 'orthography'
  | 'word_formation'
  | 'contextual'
  | 'paraphrase'
  | 'usage'
  | 'grammar_form'
  | 'sentence_composition'
  | 'text_grammar'
  | 'comprehension_short'
  | 'comprehension_mid'
  | 'comprehension_long'
  | 'integrated_reading'
  | 'thematic'
  | 'info_retrieval'
  | 'task_based'
  | 'point'
  | 'summary'
  | 'utterance'
  | 'quick_response'
  | 'integrated_listening';

export type RichTextSegment =
  | { t: 'text'; text: string }
  | { t: 'ruby'; text: string; rt: string }
  | { t: 'underline'; children: RichTextSegment[] }
  | { t: 'emphasis'; children: RichTextSegment[] }
  | { t: 'blank'; label?: string }
  | { t: 'star' }
  | { t: 'br' }
  | {
      t: 'image';
      mediaKey: string;
      alt: string;
      width: number;
      height: number;
    };

export type RichText = RichTextSegment[];

export type RichBlock =
  | { type: 'paragraph'; content: RichText }
  | {
      type: 'image';
      mediaKey: string;
      alt: string;
      width: number;
      height: number;
    }
  | { type: 'table'; rows: RichText[][] };

export interface SourcePage {
  sourceId: string;
  page: number;
}

export interface QuestionOption {
  label: '1' | '2' | '3' | '4';
  content: RichText;
}

export interface QuestionExplanation {
  locale: 'vi' | 'ja' | 'en';
  blocks: RichBlock[];
}

export interface Question {
  id: string;
  number: string;
  skill: SkillType;
  stem: RichText;
  options: QuestionOption[];
  correctOption: number | null;
  sourcePages: SourcePage[];
  explanation: QuestionExplanation | null;
}

export interface Group {
  id: string;
  sectionCode: string;
  mondaiType: MondaiType;
  orderInSection: number;
  instructions: RichText;
  passage: RichBlock[];
  mediaKeys: string[];
  sourcePages: SourcePage[];
  questions: Question[];
  transcript: RichTextSegment[] | null;
}

export interface TimelineEntry {
  groupId: string;
  mediaKey: string;
  startMs: number;
  endMs: number;
  audioStartMs: number;
  audioEndMs: number;
  gapAfterMs: number;
}

export interface Section {
  code: SectionCode;
  title: string;
  durationSec: number | null;
  groupIds: string[];
  listeningTimeline: TimelineEntry[];
}

export interface BlueprintReference {
  id: string;
  version: number;
}

export interface Exam {
  title: string;
  slug: string;
  kind: ExamKind;
  blueprintRef: BlueprintReference | null;
  totalQuestions: number;
  sections: Section[];
}

export interface SourceInfo {
  name: string;
  level: JLPTLevel;
  year: number | null;
  session: JLPTSession;
  provenance: JLPTProvenance;
  licenseRef: string | null;
  rightsStatus: JLPTRightsStatus;
}

export interface SourceFile {
  id: string;
  path: string;
  sha256: string;
  mimeType: 'application/pdf';
}

export type MediaMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/avif'
  | 'audio/mpeg'
  | 'audio/mp4'
  | 'audio/wav';

export interface MediaManifestItem {
  path: string;
  sha256: string;
  mimeType: MediaMimeType;
  durationMs: number | null;
  width: number | null;
  height: number | null;
}

export interface IssueItem {
  id: string;
  severity: IssueSeverity;
  path: string;
  reason: string;
  sourcePages: SourcePage[];
}

export interface ImportPackageV2 {
  formatVersion: 2;
  packageId: string;
  revision: number;
  source: SourceInfo;
  sourceFiles: SourceFile[];
  exam: Exam;
  groups: Group[];
  media: MediaManifestItem[];
  issues: IssueItem[];
}

export interface BlueprintMondai {
  type: MondaiType;
  skill: SkillType;
  questionCount: number;
}

export interface BlueprintSection {
  code: string;
  title: string;
  durationSec: number;
  mondai: BlueprintMondai[];
}

export interface BlueprintDefinition {
  id?: string;
  level: JLPTLevel;
  version: number;
  kind?: 'synthetic' | 'official';
  effectiveFrom?: string;
  sections: BlueprintSection[];
}

export interface BlueprintValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  expectedTotalQuestions: number;
  actualTotalQuestions: number;
}

export type IdempotencyAction =
  | 'IDEMPOTENT_SKIP'
  | 'PROCEED_NEW_REVISION'
  | 'PROCEED_INITIAL_IMPORT'
  | 'REJECT_CONFLICT'
  | 'REJECT_REGRESSION';

export interface PackageIdentity {
  packageId: string;
  revision: number;
  contentHash: string;
  status?: string;
  createdAt?: string;
}

export interface IdempotencyEvaluation {
  action: IdempotencyAction;
  statusCode: number;
  reason: string;
  packageId: string;
  revision: number;
  contentHash: string;
}

export interface IssueSummaryReport {
  totalIssues: number;
  blockingCount: number;
  warningCount: number;
  ocrLowConfidenceCount: number;
  items: IssueItem[];
}

export interface ValidationResult {
  valid: boolean;
  mode: ValidationMode;
  readiness: ReadinessState;
  questionCount: number;
  groupCount: number;
  blockingIssueCount: number;
  errors: string[];
  warnings: string[];
  publicationApproved: boolean;
}

export interface ValidateOptions {
  mode?: ValidationMode;
  packageFiles?: Record<string, Uint8Array>;
  blueprint?: BlueprintDefinition;
  knownBlueprints?: Record<string, BlueprintDefinition>;
}
