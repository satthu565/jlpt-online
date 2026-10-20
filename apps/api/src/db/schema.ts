import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';


// ---------------------------------------------------------------------------
// 1. Identity & Auth (W2)
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  role: text('role').notNull().default('user'),
  targetLevel: text('target_level'),
  locale: text('locale').notNull().default('vi'),
  timezone: text('timezone').notNull().default('Asia/Ho_Chi_Minh'),
  targetExamDate: date('target_exam_date'),
  targetScore: integer('target_score'),
  blockedAt: timestamp('blocked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  metadata: jsonb('metadata').default('{}').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 2. Privacy (W2)
// ---------------------------------------------------------------------------

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    policyVersion: text('policy_version').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('consents_user_purpose_version_idx').on(t.userId, t.purpose, t.policyVersion),
  ],
);

export const dataExportJobs = pgTable(
  'data_export_jobs',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    downloadUrl: text('download_url'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('data_export_jobs_user_status_idx').on(t.userId, t.status),
  ],
);

export const deletionRequests = pgTable(
  'deletion_requests',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('requested'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    metadata: jsonb('metadata').default('{}').notNull(),
  },
  (t) => [
    index('deletion_requests_user_status_idx').on(t.userId, t.status),
  ],
);

export const retentionPolicies = pgTable(
  'retention_policies',
  {
    id: uuid('id').primaryKey(),
    domain: text('domain').notNull(),
    retentionDays: integer('retention_days').notNull(),
    policyApproved: boolean('policy_approved').default(false).notNull(),
    approvedBy: uuid('approved_by').references(() => users.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('retention_policies_domain_idx').on(t.domain),
  ],
);

// ---------------------------------------------------------------------------
// 3. Content (W2)
// ---------------------------------------------------------------------------

export const examSources = pgTable('exam_sources', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  provenance: text('provenance').notNull(), // 'self_authored' | 'official_released' | 'licensed_partner'
  metadata: jsonb('metadata').default('{}').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contentLicenses = pgTable('content_licenses', {
  id: uuid('id').primaryKey(),
  sourceId: uuid('source_id').notNull().references(() => examSources.id),
  licenseType: text('license_type').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  terms: text('terms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const questionGroups = pgTable('question_groups', {
  id: uuid('id').primaryKey(),
  sourceId: uuid('source_id').references(() => examSources.id),
  licenseId: uuid('license_id').references(() => contentLicenses.id),
  level: text('level').notNull(),
  sectionCode: text('section_code').notNull(),
  title: text('title'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const questionGroupVersions = pgTable(
  'question_group_versions',
  {
    groupId: uuid('group_id').notNull().references(() => questionGroups.id),
    version: integer('version').notNull(),
    passage: jsonb('passage').notNull(),
    audioSha256: text('audio_sha256'),
    status: text('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.version] })],
);

export const questions = pgTable('questions', {
  id: uuid('id').primaryKey(),
  groupId: uuid('group_id').references(() => questionGroups.id),
  level: text('level').notNull(),
  skill: text('skill').notNull(),
  mondaiType: text('mondai_type').notNull(),
  origin: text('origin').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const questionVersions = pgTable(
  'question_versions',
  {
    questionId: uuid('question_id').notNull().references(() => questions.id),
    version: integer('version').notNull(),
    stem: jsonb('stem').notNull(),
    explanation: jsonb('explanation'),
    status: text('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.version] })],
);

export const answerOptions = pgTable(
  'answer_options',
  {
    questionId: uuid('question_id').notNull().references(() => questions.id),
    questionVersion: integer('question_version').notNull(),
    orderIndex: smallint('order_index').notNull(),
    content: jsonb('content').notNull(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.questionVersion, t.orderIndex] })],
);

export const correctAnswers = pgTable(
  'correct_answers',
  {
    questionId: uuid('question_id').notNull().references(() => questions.id),
    questionVersion: integer('question_version').notNull(),
    correctOption: smallint('correct_option').notNull(),
    explanationNotes: text('explanation_notes'),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.questionVersion] })],
);

// ---------------------------------------------------------------------------
// 4. Media & Import (W2)
// ---------------------------------------------------------------------------

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey(),
  sha256: text('sha256').notNull().unique(),
  key: text('key').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  durationSec: integer('duration_sec'),
  rights: text('rights'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const importJobs = pgTable('import_jobs', {
  id: uuid('id').primaryKey(),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  status: text('status').notNull().default('pending'),
  packageSha256: text('package_sha256').notNull(),
  fileName: text('file_name').notNull(),
  targetLevel: text('target_level'),
  errorLog: jsonb('error_log'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const importJobAttempts = pgTable('import_job_attempts', {
  id: uuid('id').primaryKey(),
  jobId: uuid('job_id').notNull().references(() => importJobs.id),
  attemptNumber: integer('attempt_number').notNull(),
  status: text('status').notNull(),
  logs: jsonb('logs').default('[]').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const importArtifacts = pgTable('import_artifacts', {
  id: uuid('id').primaryKey(),
  jobId: uuid('job_id').notNull().references(() => importJobs.id),
  artifactType: text('artifact_type').notNull(),
  storageKey: text('storage_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const questionSourceRefs = pgTable('question_source_refs', {
  id: uuid('id').primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  sourceId: uuid('source_id').notNull().references(() => examSources.id),
  sourcePage: integer('source_page'),
  note: text('note'),
});

// ---------------------------------------------------------------------------
// 5. Review (W2)
// ---------------------------------------------------------------------------

export const contentReviews = pgTable('content_reviews', {
  id: uuid('id').primaryKey(),
  targetType: text('target_type').notNull(), // 'question_version' | 'group_version' | 'exam_version'
  targetId: uuid('target_id').notNull(),
  targetVersion: integer('target_version').notNull(),
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
  lastEditorId: uuid('last_editor_id').notNull().references(() => users.id),
  status: text('status').notNull(),
  comments: text('comments'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const explanationVersions = pgTable(
  'explanation_versions',
  {
    id: uuid('id').primaryKey(),
    questionId: uuid('question_id').notNull().references(() => questions.id),
    version: integer('version').notNull(),
    content: jsonb('content').notNull(),
    locale: text('locale').notNull().default('vi'),
    authorId: uuid('author_id').notNull().references(() => users.id),
    aiGenerated: boolean('ai_generated').default(false).notNull(),
    status: text('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('explanation_versions_question_version_locale_idx').on(
      t.questionId,
      t.version,
      t.locale,
    ),
  ],
);


export const questionTags = pgTable('question_tags', {
  id: uuid('id').primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  tag: text('tag').notNull(),
  category: text('category'),
});

export const questionReports = pgTable('question_reports', {
  id: uuid('id').primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  reportedBy: uuid('reported_by').notNull().references(() => users.id),
  issueType: text('issue_type').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nearDuplicateCandidates = pgTable('near_duplicate_candidates', {
  id: uuid('id').primaryKey(),
  questionIdA: uuid('question_id_a').notNull().references(() => questions.id),
  questionIdB: uuid('question_id_b').notNull().references(() => questions.id),
  similarityScore: integer('similarity_score').notNull(),
  status: text('status').notNull().default('pending'),
});

// ---------------------------------------------------------------------------
// 6. Exams (W2)
// ---------------------------------------------------------------------------

export const blueprints = pgTable('blueprints', {
  id: uuid('id').primaryKey(),
  level: text('level').notNull(),
  version: integer('version').notNull(),
  kind: text('kind').notNull().default('synthetic'), // 'synthetic' | 'official'
  status: text('status').notNull().default('draft'), // 'active' | 'draft' | 'pending_confirmation' | 'archived'
  isOfficial: boolean('is_official').notNull().default(false),
  isConfirmed: boolean('is_confirmed').notNull().default(false),
  confirmedBy: uuid('confirmed_by').references(() => users.id),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  effectiveFrom: text('effective_from').notNull(),
  // Last exam session (YYYY-MM) this blueprint applies to; null = still current.
  effectiveTo: text('effective_to'),
  sourceRef: jsonb('source_ref').notNull(),
  note: text('note'),
  sections: jsonb('sections').notNull(),
  scoring: jsonb('scoring').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const blueprintVersions = pgTable(
  'blueprint_versions',
  {
    blueprintId: uuid('blueprint_id').notNull().references(() => blueprints.id),
    version: integer('version').notNull(),
    sections: jsonb('sections').notNull(),
    scoring: jsonb('scoring').notNull(),
    changedBy: uuid('changed_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.blueprintId, t.version] })],
);

export const exams = pgTable('exams', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  level: text('level').notNull(),
  title: text('title').notNull(),
  kind: text('kind').notNull(),
  year: integer('year'),
  session: text('session'),
  totalQuestions: integer('total_questions').notNull().default(0),
  description: text('description').notNull().default(''),
  publishedVersion: integer('published_version'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const examSections = pgTable('exam_sections', {
  id: uuid('id').primaryKey(),
  examId: uuid('exam_id').notNull().references(() => exams.id),
  code: text('code').notNull(),
  title: text('title').notNull(),
  durationSec: integer('duration_sec').notNull(),
  orderIndex: smallint('order_index').notNull(),
});

export const examItems = pgTable('exam_items', {
  id: uuid('id').primaryKey(),
  examId: uuid('exam_id').notNull().references(() => exams.id),
  sectionId: uuid('section_id').notNull().references(() => examSections.id),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  orderIndex: smallint('order_index').notNull(),
});

export const examVersions = pgTable(
  'exam_versions',
  {
    examId: uuid('exam_id').notNull().references(() => exams.id),
    version: integer('version').notNull(),
    snapshotKey: text('snapshot_key').notNull(),
    manifestKey: text('manifest_key').notNull(),
    blueprintId: uuid('blueprint_id').notNull().references(() => blueprints.id),
    blueprintVersion: integer('blueprint_version').notNull(),
    scoring: jsonb('scoring').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    publishedBy: uuid('published_by').notNull().references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.examId, t.version] })],
);

export const examAnswerKeys = pgTable(
  'exam_answer_keys',
  {
    examId: uuid('exam_id').notNull(),
    version: integer('version').notNull(),
    keys: smallint('keys').array().notNull(),
    skills: text('skills').array().notNull(),
    mondaiTypes: text('mondai_types').array().notNull(),
    sectionRanges: jsonb('section_ranges').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.examId, t.version] }),
    foreignKey({
      columns: [t.examId, t.version],
      foreignColumns: [examVersions.examId, examVersions.version],
    }).onDelete('cascade'),
  ],
);

// ---------------------------------------------------------------------------
// 7. Attempts (W2 / A10)
// ---------------------------------------------------------------------------

export const examAttempts = pgTable(
  'exam_attempts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    guestId: uuid('guest_id'),
    examId: uuid('exam_id').notNull().references(() => exams.id),
    examVersion: integer('exam_version').notNull(),
    mode: text('mode').notNull(),
    status: text('status').notNull(),
    submittedBy: text('submitted_by'),
    currentSection: smallint('current_section'),
    currentDeadline: timestamp('current_deadline', { withTimezone: true }),
    sectionTimes: jsonb('section_times').default('[]').notNull(),
    leaseId: uuid('lease_id').notNull(),
    resultFlags: text('result_flags').array().default([]).notNull(),
    attemptMonth: date('attempt_month').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    result: jsonb('result'),
  },
  (t) => [
    uniqueIndex('exam_attempts_user_exam_open_idx')
      .on(t.userId, t.examId)
      .where(sql`status = 'in_progress' AND user_id IS NOT NULL`),
    index('exam_attempts_current_deadline_idx')
      .on(t.currentDeadline)
      .where(sql`status = 'in_progress'`),
    check('exam_attempts_user_or_guest_check', sql`user_id IS NOT NULL OR guest_id IS NOT NULL`),
    check('exam_attempts_mode_check', sql`mode IN ('real', 'practice')`),
    check('exam_attempts_status_check', sql`status IN ('in_progress', 'submitted')`),
    check(
      'exam_attempts_submitted_by_check',
      sql`submitted_by IS NULL OR submitted_by IN ('user', 'auto_client', 'system')`,
    ),
    foreignKey({
      columns: [t.examId, t.examVersion],
      foreignColumns: [examVersions.examId, examVersions.version],
    }),
  ],
);

export const attemptAnswerSheets = pgTable('attempt_answer_sheets', {
  attemptId: uuid('attempt_id').primaryKey().references(() => examAttempts.id),
  answers: smallint('answers').array().notNull(),
  flags: smallint('flags').array().default([]).notNull(),
  timeSpentMs: integer('time_spent_ms').array(),
  lastSeq: integer('last_seq').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const attemptEvents = pgTable(
  'attempt_events',
  {
    id: uuid('id').notNull(),
    attemptMonth: date('attempt_month').notNull(),
    attemptId: uuid('attempt_id').notNull().references(() => examAttempts.id),
    seq: integer('seq'),
    type: text('type').notNull(),
    payload: jsonb('payload').default('{}').notNull(),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.attemptMonth, t.id] }),
    uniqueIndex('attempt_events_month_attempt_seq_unique').on(t.attemptMonth, t.attemptId, t.seq),
  ],
);


export const userAnswers = pgTable(
  'user_answers',
  {
    attemptId: uuid('attempt_id').notNull().references(() => examAttempts.id),
    questionIndex: smallint('question_index').notNull(),
    questionId: uuid('question_id').notNull().references(() => questions.id),
    optionValue: smallint('option_value').notNull(),
    isCorrect: boolean('is_correct').notNull(),
    flagged: boolean('flagged').notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionIndex] })],
);

// ---------------------------------------------------------------------------
// 8. Mix & Practice (W2)
// ---------------------------------------------------------------------------

export const generatedExams = pgTable('generated_exams', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  configJson: jsonb('config_json').notNull(),
  seed: text('seed').notNull(),
  engineVersion: text('engine_version').notNull(),
  selectionHash: text('selection_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const generatedExamItems = pgTable(
  'generated_exam_items',
  {
    generatedExamId: uuid('generated_exam_id').notNull().references(() => generatedExams.id),
    questionId: uuid('question_id').notNull().references(() => questions.id),
    orderIndex: smallint('order_index').notNull(),
  },
  (t) => [primaryKey({ columns: [t.generatedExamId, t.orderIndex] })],
);

export const questionExposures = pgTable(
  'question_exposures',
  {
    userId: uuid('user_id').notNull().references(() => users.id),
    questionId: uuid('question_id').notNull().references(() => questions.id),
    exposureCount: integer('exposure_count').default(1).notNull(),
    lastExposedAt: timestamp('last_exposed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId] })],
);

export const questionMarks = pgTable(
  'question_marks',
  {
    userId: uuid('user_id').notNull().references(() => users.id),
    questionId: uuid('question_id').notNull().references(() => questions.id),
    markType: text('mark_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId, t.markType] })],
);

export const examFavorites = pgTable(
  'exam_favorites',
  {
    userId: uuid('user_id').notNull().references(() => users.id),
    examId: uuid('exam_id').notNull().references(() => exams.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.examId] })],
);

export const examShares = pgTable('exam_shares', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 9. Lexicon (W5)
// ---------------------------------------------------------------------------

export const lexiconLicenses = pgTable('lexicon_licenses', {
  id: uuid('id').primaryKey(),
  provider: text('provider').notNull(),
  license: text('license').notNull(),
  rightsTerms: text('rights_terms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lexicalEntries = pgTable('lexical_entries', {
  id: uuid('id').primaryKey(),
  licenseId: uuid('license_id').references(() => lexiconLicenses.id),
  term: text('term').notNull(),
  level: text('level'),
  partOfSpeech: text('part_of_speech'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const entryReadings = pgTable('entry_readings', {
  id: uuid('id').primaryKey(),
  entryId: uuid('entry_id').notNull().references(() => lexicalEntries.id),
  reading: text('reading').notNull(),
  isPrimary: boolean('is_primary').default(true).notNull(),
});

export const entryMeanings = pgTable('entry_meanings', {
  id: uuid('id').primaryKey(),
  entryId: uuid('entry_id').notNull().references(() => lexicalEntries.id),
  locale: text('locale').notNull().default('vi'),
  meaning: text('meaning').notNull(),
});

export const kanjiEntries = pgTable('kanji_entries', {
  id: uuid('id').primaryKey(),
  kanji: text('kanji').notNull().unique(),
  level: text('level'),
  strokeCount: smallint('stroke_count'),
  onyomi: text('onyomi').array().default([]).notNull(),
  kunyomi: text('kunyomi').array().default([]).notNull(),
  meanings: jsonb('meanings').default('[]').notNull(),
});

export const grammarPoints = pgTable('grammar_points', {
  id: uuid('id').primaryKey(),
  pattern: text('pattern').notNull(),
  level: text('level').notNull(),
  meaning: text('meaning').notNull(),
  formation: text('formation'),
  examples: jsonb('examples').default('[]').notNull(),
});

export const pronunciationAssets = pgTable('pronunciation_assets', {
  id: uuid('id').primaryKey(),
  entryId: uuid('entry_id').notNull().references(() => lexicalEntries.id),
  mediaAssetId: uuid('media_asset_id').notNull().references(() => mediaAssets.id),
  accent: text('accent'),
});

// ---------------------------------------------------------------------------
// 10. Corpus (W5)
// ---------------------------------------------------------------------------

export const datasets = pgTable('datasets', {
  id: uuid('id').primaryKey(),
  slug: text('slug').unique(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  licenseId: uuid('license_id').references(() => lexiconLicenses.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const datasetDocuments = pgTable('dataset_documents', {
  id: uuid('id').primaryKey(),
  datasetId: uuid('dataset_id').notNull().references(() => datasets.id),
  documentHash: text('document_hash').notNull(),
  content: text('content'),
  metadata: jsonb('metadata').default('{}').notNull(),
});

export const vocabOccurrences = pgTable('vocab_occurrences', {
  id: uuid('id').primaryKey(),
  datasetId: uuid('dataset_id').notNull().references(() => datasets.id),
  entryId: uuid('entry_id').notNull().references(() => lexicalEntries.id),
  count: integer('count').default(1).notNull(),
});

export const grammarOccurrences = pgTable('grammar_occurrences', {
  id: uuid('id').primaryKey(),
  datasetId: uuid('dataset_id').notNull().references(() => datasets.id),
  grammarId: uuid('grammar_id').notNull().references(() => grammarPoints.id),
  count: integer('count').default(1).notNull(),
});

export const kanjiOccurrences = pgTable('kanji_occurrences', {
  id: uuid('id').primaryKey(),
  datasetId: uuid('dataset_id').notNull().references(() => datasets.id),
  kanjiId: uuid('kanji_id').notNull().references(() => kanjiEntries.id),
  count: integer('count').default(1).notNull(),
});

export const corpusAggregates = pgTable('corpus_aggregates', {
  id: uuid('id').primaryKey(),
  level: text('level').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  payload: jsonb('payload').notNull(),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 11. Notebook & SRS (W5)
// ---------------------------------------------------------------------------

export const notebookItems = pgTable('notebook_items', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // 'vocab' | 'grammar' | 'kanji'
  entryId: uuid('entry_id').notNull(),
  mastered: boolean('mastered').default(false).notNull(),
  tags: text('tags').array().default([]).notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notebookItemId: uuid('notebook_item_id').notNull().references(() => notebookItems.id, { onDelete: 'cascade' }),
  front: jsonb('front').notNull(),
  back: jsonb('back').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cardSchedules = pgTable('card_schedules', {
  cardId: uuid('card_id').primaryKey().references(() => cards.id, { onDelete: 'cascade' }),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  intervalDays: integer('interval_days').default(1).notNull(),
  easeFactor: integer('ease_factor').default(250).notNull(),
  repetitions: integer('repetitions').default(0).notNull(),
  state: text('state').notNull().default('learning'),
});

export const cardReviews = pgTable('card_reviews', {
  id: uuid('id').primaryKey(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientReviewId: uuid('client_review_id').notNull(),
  rating: smallint('rating').notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 12. Planner (W5)
// ---------------------------------------------------------------------------

export const studyPlans = pgTable('study_plans', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetLevel: text('target_level').notNull(),
  targetDate: date('target_date').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const studyPlanVersions = pgTable(
  'study_plan_versions',
  {
    planId: uuid('plan_id').notNull().references(() => studyPlans.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    weeklySchedule: jsonb('weekly_schedule').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.version] })],
);

export const studySessions = pgTable('study_sessions', {
  id: uuid('id').primaryKey(),
  planId: uuid('plan_id').notNull().references(() => studyPlans.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scheduledDate: date('scheduled_date').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  status: text('status').notNull().default('pending'),
});

export const studySessionCompletions = pgTable('study_session_completions', {
  id: uuid('id').primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => studySessions.id, { onDelete: 'cascade' }),
  clientEventId: uuid('client_event_id').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  timeSpentSeconds: integer('time_spent_seconds').notNull(),
});

// ---------------------------------------------------------------------------
// 13. Learning Analytics (W5)
// ---------------------------------------------------------------------------

export const userSkillAggregates = pgTable(
  'user_skill_aggregates',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    skill: text('skill').notNull(),
    accuracyRate: integer('accuracy_rate').notNull(),
    sampleSize: integer('sample_size').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skill] })],
);

export const userMondaiAggregates = pgTable(
  'user_mondai_aggregates',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    mondaiType: text('mondai_type').notNull(),
    accuracyRate: integer('accuracy_rate').notNull(),
    sampleSize: integer('sample_size').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.mondaiType] })],
);

export const questionDifficultyStats = pgTable('question_difficulty_stats', {
  questionId: uuid('question_id').primaryKey().references(() => questions.id),
  totalAttempts: integer('total_attempts').default(0).notNull(),
  correctAttempts: integer('correct_attempts').default(0).notNull(),
  difficultyIndex: integer('difficulty_index').default(50).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userQuestionHistory = pgTable('user_question_history', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  isCorrect: boolean('is_correct').notNull(),
  answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow().notNull(),
});

export const answerChangeAggregates = pgTable('answer_change_aggregates', {
  id: uuid('id').primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  changedFrom: smallint('changed_from').notNull(),
  changedTo: smallint('changed_to').notNull(),
  count: integer('count').default(1).notNull(),
});

// ---------------------------------------------------------------------------
// 14. Teacher / Organization (W2)
// ---------------------------------------------------------------------------

export const teacherApplications = pgTable('teacher_applications', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: text('status').notNull().default('pending'),
  resumeUrl: text('resume_url'),
  qualifications: jsonb('qualifications'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orgMemberships = pgTable(
  'org_memberships',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'owner' | 'admin' | 'teacher' | 'member'
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('org_memberships_org_user_idx').on(t.orgId, t.userId),
  ],
);

export const classes = pgTable(
  'classes',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    level: text('level').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('classes_org_name_idx').on(t.orgId, t.name),
  ],
);

export const classMemberships = pgTable(
  'class_memberships',
  {
    id: uuid('id').primaryKey(),
    classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('class_memberships_class_student_idx').on(t.classId, t.studentId),
  ],
);

export const classInvitations = pgTable('class_invitations', {
  id: uuid('id').primaryKey(),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  inviteHash: text('invite_hash').notNull().unique(),
  maxUses: integer('max_uses').default(1).notNull(),
  usedCount: integer('used_count').default(0).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 15. Assignments (W2)
// ---------------------------------------------------------------------------

export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').primaryKey(),
    classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
    examId: uuid('exam_id').references(() => exams.id),
    title: text('title').notNull(),
    opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('assignments_class_window_idx').on(t.classId, t.opensAt, t.dueAt),
  ],
);

export const assignmentLearners = pgTable(
  'assignment_learners',
  {
    id: uuid('id').primaryKey(),
    assignmentId: uuid('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
    learnerId: uuid('learner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('assigned'),
  },
  (t) => [
    uniqueIndex('assignment_learners_assignment_learner_idx').on(t.assignmentId, t.learnerId),
  ],
);

export const assignmentAttempts = pgTable(
  'assignment_attempts',
  {
    id: uuid('id').primaryKey(),
    assignmentId: uuid('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
    learnerId: uuid('learner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    attemptId: uuid('attempt_id').notNull().references(() => examAttempts.id),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('assignment_attempts_assignment_attempt_idx').on(t.assignmentId, t.attemptId),
  ],
);

// ---------------------------------------------------------------------------
// 16. Events (W2)
// ---------------------------------------------------------------------------

export const examEvents = pgTable('exam_events', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  level: text('level').notNull(),
  opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  resultReleaseAt: timestamp('result_release_at', { withTimezone: true }).notNull(),
  capacity: integer('capacity').notNull(),
  registeredCount: integer('registered_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const eventRegistrations = pgTable(
  'event_registrations',
  {
    id: uuid('id').primaryKey(),
    eventId: uuid('event_id').notNull().references(() => examEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('event_registrations_event_user_idx').on(t.eventId, t.userId),
  ],
);

export const eventAttempts = pgTable(
  'event_attempts',
  {
    id: uuid('id').primaryKey(),
    eventId: uuid('event_id').notNull().references(() => examEvents.id, { onDelete: 'cascade' }),
    attemptId: uuid('attempt_id').notNull().references(() => examAttempts.id),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('event_attempts_event_user_idx').on(t.eventId, t.userId),
    uniqueIndex('event_attempts_event_attempt_idx').on(t.eventId, t.attemptId),
  ],
);

export const eventResultPublications = pgTable(
  'event_result_publications',
  {
    id: uuid('id').primaryKey(),
    eventId: uuid('event_id').notNull().references(() => examEvents.id, { onDelete: 'cascade' }),
    releasedAt: timestamp('released_at', { withTimezone: true }).notNull(),
    releasedBy: uuid('released_by').notNull().references(() => users.id),
  },
  (t) => [
    uniqueIndex('event_result_publications_event_idx').on(t.eventId),
  ],
);

// ---------------------------------------------------------------------------
// 17. Community (W2)
// ---------------------------------------------------------------------------

export const discussionThreads = pgTable('discussion_threads', {
  id: uuid('id').primaryKey(),
  targetType: text('target_type').notNull(), // 'question' | 'exam' | 'general'
  targetId: uuid('target_id').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => discussionThreads.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const commentReports = pgTable(
  'comment_reports',
  {
    id: uuid('id').primaryKey(),
    commentId: uuid('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
    reportedBy: uuid('reported_by').notNull().references(() => users.id),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('comment_reports_comment_reporter_idx').on(t.commentId, t.reportedBy),
  ],
);


export const moderationActions = pgTable('moderation_actions', {
  id: uuid('id').primaryKey(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  moderatorId: uuid('moderator_id').notNull().references(() => users.id),
  action: text('action').notNull(), // 'delete' | 'warn' | 'ban'
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const achievementShares = pgTable('achievement_shares', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').notNull().unique(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 18. Gamification (W5)
// ---------------------------------------------------------------------------

export const streakDays = pgTable(
  'streak_days',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    localDate: date('local_date').notNull(),
    activityCount: integer('activity_count').default(1).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.localDate] })],
);

export const achievementDefinitions = pgTable('achievement_definitions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  badgeIcon: text('badge_icon'),
  criteria: jsonb('criteria').notNull(),
});

export const userAchievements = pgTable(
  'user_achievements',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    achievementId: text('achievement_id').notNull().references(() => achievementDefinitions.id),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.achievementId] })],
);

export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  targetType: text('target_type').notNull(),
  targetGoal: integer('target_goal').notNull(),
});

export const challengeEnrollments = pgTable(
  'challenge_enrollments',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    challengeId: uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
    progress: integer('progress').default(0).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.challengeId] })],
);

export const leaderboardEntries = pgTable('leaderboard_entries', {
  id: uuid('id').primaryKey(),
  period: text('period').notNull(), // 'daily' | 'weekly' | 'monthly' | 'all_time'
  level: text('level').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  rank: integer('rank').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 19. Billing (W4)
// ---------------------------------------------------------------------------

export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  interval: text('interval').notNull(), // 'month' | 'year' | 'lifetime'
  price: integer('price').notNull(),
  currency: text('currency').notNull().default('VND'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const planVersions = pgTable(
  'plan_versions',
  {
    planId: text('plan_id').notNull().references(() => plans.id),
    version: integer('version').notNull(),
    price: integer('price').notNull(),
    entitlements: jsonb('entitlements').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.version] })],
);

export const entitlementDefinitions = pgTable('entitlement_definitions', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

export const entitlementGrants = pgTable('entitlement_grants', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entitlementCode: text('entitlement_code').notNull().references(() => entitlementDefinitions.code),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  sourceRef: text('source_ref'),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  totalAmount: integer('total_amount').notNull(),
  currency: text('currency').notNull().default('VND'),
  status: text('status').notNull().default('created'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orderLines = pgTable('order_lines', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  planId: text('plan_id').references(() => plans.id),
  amount: integer('amount').notNull(),
});

export const paymentAttempts = pgTable('payment_attempts', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerPaymentRef: text('provider_payment_ref'),
  status: text('status').notNull().default('initiated'),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull().references(() => plans.id),
  status: text('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
});

export const subscriptionChanges = pgTable('subscription_changes', {
  id: uuid('id').primaryKey(),
  subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  changeType: text('change_type').notNull(),
  oldPlanId: text('old_plan_id'),
  newPlanId: text('new_plan_id'),
  effectiveAt: timestamp('effective_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tenantPlans = pgTable('tenant_plans', {
  tenantId: text('tenant_id').primaryKey(),
  planCode: text('plan_code').notNull(),
  status: text('status').notNull(),
  totalSeats: integer('total_seats').notNull(),
  usedSeats: integer('used_seats').notNull(),
  maxClasses: integer('max_classes').notNull(),
  features: jsonb('features').default('[]').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});


// ---------------------------------------------------------------------------
// 20. Billing Events (W4)
// ---------------------------------------------------------------------------

export const paymentWebhookEvents = pgTable('payment_webhook_events', {
  id: uuid('id').primaryKey(),
  provider: text('provider').notNull(),
  eventId: text('event_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const refundRequests = pgTable('refund_requests', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  amount: integer('amount').notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('requested'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const refundAttempts = pgTable('refund_attempts', {
  id: uuid('id').primaryKey(),
  refundRequestId: uuid('refund_request_id').notNull().references(() => refundRequests.id),
  providerRefundRef: text('provider_refund_ref'),
  status: text('status').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const coupons = pgTable('coupons', {
  code: text('code').primaryKey(),
  discountPercent: integer('discount_percent'),
  discountAmount: integer('discount_amount'),
  maxRedemptions: integer('max_redemptions').default(1).notNull(),
  timesRedeemed: integer('times_redeemed').default(0).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }),
});

export const couponReservations = pgTable('coupon_reservations', {
  id: uuid('id').primaryKey(),
  couponCode: text('coupon_code').notNull().references(() => coupons.code),
  userId: uuid('user_id').notNull().references(() => users.id),
  reservedAt: timestamp('reserved_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const couponRedemptions = pgTable('coupon_redemptions', {
  id: uuid('id').primaryKey(),
  couponCode: text('coupon_code').notNull().references(() => coupons.code),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reconciliationRuns = pgTable('reconciliation_runs', {
  id: uuid('id').primaryKey(),
  provider: text('provider').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  discrepanciesFound: integer('discrepancies_found').default(0).notNull(),
  status: text('status').notNull(),
  runAt: timestamp('run_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 21. AI (W5 / W4)
// ---------------------------------------------------------------------------

export const providerAccounts = pgTable('provider_accounts', {
  id: text('id').primaryKey(),
  providerName: text('provider_name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  configRef: text('config_ref'),
});

export const aiRequests = pgTable('ai_requests', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  providerId: text('provider_id').notNull().references(() => providerAccounts.id),
  taskType: text('task_type').notNull(),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usageReservations = pgTable('usage_reservations', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  estimatedTokens: integer('estimated_tokens').notNull(),
  reservedAt: timestamp('reserved_at', { withTimezone: true }).defaultNow().notNull(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
});

export const usageLedger = pgTable('usage_ledger', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  aiRequestId: uuid('ai_request_id').references(() => aiRequests.id),
  tokensUsed: integer('tokens_used').notNull(),
  costMicroUsd: integer('cost_micro_usd').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiContentVersions = pgTable('ai_content_versions', {
  id: uuid('id').primaryKey(),
  questionId: uuid('question_id').references(() => questions.id),
  generatedType: text('generated_type').notNull(), // 'explanation' | 'hint' | 'translation'
  content: jsonb('content').notNull(),
  aiGenerated: boolean('ai_generated').default(true).notNull(),
  approvalStatus: text('approval_status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moderationReviews = pgTable('moderation_reviews', {
  id: uuid('id').primaryKey(),
  contentId: uuid('content_id').notNull(),
  score: integer('score'),
  flagged: boolean('flagged').default(false).notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 22. Notifications (W2)
// ---------------------------------------------------------------------------

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    channel: text('channel').notNull(), // 'email' | 'push' | 'in_app'
    notificationType: text('notification_type').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.channel, t.notificationType] })],
);

export const notificationJobs = pgTable('notification_jobs', {
  id: uuid('id').primaryKey(),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  channel: text('channel').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('queued'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).defaultNow().notNull(),
});

export const notificationDeliveries = pgTable('notification_deliveries', {
  id: uuid('id').primaryKey(),
  jobId: uuid('job_id').notNull().references(() => notificationJobs.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // 'delivered' | 'failed' | 'bounced'
  providerResponse: text('provider_response'),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  keys: jsonb('keys').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const templateVersions = pgTable('template_versions', {
  id: uuid('id').primaryKey(),
  templateKey: text('template_key').notNull(),
  version: integer('version').notNull(),
  locale: text('locale').notNull().default('vi'),
  subject: text('subject'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 23. CMS (W4)
// ---------------------------------------------------------------------------

export const articles = pgTable('articles', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  locale: text('locale').notNull().default('vi'),
  status: text('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const articleVersions = pgTable(
  'article_versions',
  {
    articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    content: jsonb('content').notNull(),
    authorId: uuid('author_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.version] })],
);

export const landingPages = pgTable('landing_pages', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  locale: text('locale').notNull().default('vi'),
  title: text('title').notNull(),
  content: jsonb('content').notNull(),
  publishedVersion: integer('published_version'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const faqItems = pgTable('faq_items', {
  id: uuid('id').primaryKey(),
  category: text('category').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  orderIndex: smallint('order_index').default(0).notNull(),
  locale: text('locale').notNull().default('vi'),
});

export const siteContentVersions = pgTable('site_content_versions', {
  id: uuid('id').primaryKey(),
  pageKey: text('page_key').notNull(),
  version: integer('version').notNull(),
  payload: jsonb('payload').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// 24. Product Analytics (W4)
// ---------------------------------------------------------------------------

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey(),
  eventName: text('event_name').notNull(),
  userId: uuid('user_id'),
  sessionId: text('session_id'),
  properties: jsonb('properties').default('{}').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const analyticsConsents = pgTable('analytics_consents', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackingAllowed: boolean('tracking_allowed').default(false).notNull(),
  consentedAt: timestamp('consented_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reportSnapshots = pgTable(
  'report_snapshots',
  {
    id: uuid('id').primaryKey(),
    reportName: text('report_name').notNull(),
    period: text('period').notNull(),
    data: jsonb('data').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('report_snapshots_name_period_idx').on(t.reportName, t.period),
  ],
);

export const experimentDefinitions = pgTable('experiment_definitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  variants: jsonb('variants').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const experimentAssignments = pgTable(
  'experiment_assignments',
  {
    experimentId: text('experiment_id').notNull().references(() => experimentDefinitions.id),
    subjectId: text('subject_id').notNull(),
    variant: text('variant').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.experimentId, t.subjectId] })],
);

export const experimentExposures = pgTable('experiment_exposures', {
  id: uuid('id').primaryKey(),
  experimentId: text('experiment_id').notNull().references(() => experimentDefinitions.id),
  subjectId: text('subject_id').notNull(),
  exposedAt: timestamp('exposed_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 25. Operations (W6)
// ---------------------------------------------------------------------------

export const outbox = pgTable(
  'outbox',
  {
    id: uuid('id').primaryKey(),
    topic: text('topic').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (t) => [
    index('outbox_created_at_unpublished_idx')
      .on(t.createdAt)
      .where(sql`published_at IS NULL`),
  ],
);

export const processedEvents = pgTable(
  'processed_events',
  {
    eventId: uuid('event_id').notNull(),
    consumer: text('consumer').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.consumer] })],
);

export const deadLetterEvents = pgTable('dead_letter_events', {
  id: uuid('id').primaryKey(),
  eventId: uuid('event_id').notNull(),
  topic: text('topic').notNull(),
  payload: jsonb('payload').notNull(),
  reason: text('reason').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  nextAt: timestamp('next_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const exportJobs = pgTable(
  'export_jobs',
  {
    id: uuid('id').primaryKey(),
    jobType: text('job_type').notNull(),
    status: text('status').notNull(),
    storagePath: text('storage_path'),
    requestedBy: uuid('requested_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('export_jobs_requested_by_status_idx').on(t.requestedBy, t.status),
  ],
);

export const backupJobs = pgTable('backup_jobs', {
  id: uuid('id').primaryKey(),
  backupType: text('backup_type').notNull(),
  status: text('status').notNull(),
  sizeBytes: integer('size_bytes'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const operatorActions = pgTable('operator_actions', {
  id: uuid('id').primaryKey(),
  operatorId: uuid('operator_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  targetResource: text('target_resource').notNull(),
  details: jsonb('details').default('{}').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const providerCostRecords = pgTable('provider_cost_records', {
  id: uuid('id').primaryKey(),
  provider: text('provider').notNull(),
  costCents: integer('cost_cents').notNull(),
  period: text('period').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});
