/**
 * Complete OpenAPI 3.1.0 Specification Definition for JLPT Online V1-V4.
 * Defines all components, schemas, paths, and standard error envelopes.
 */

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  schema: Record<string, unknown>;
  description?: string;
}

export interface OpenApiResponse {
  description: string;
  content?: Record<
    string,
    {
      schema: Record<string, unknown>;
      examples?: Record<string, { summary: string; value: unknown }>;
    }
  >;
}

export interface OpenApiOperation {
  operationId: string;
  summary: string;
  tags: string[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content: Record<string, { schema: Record<string, unknown> }>;
  };
  responses: Record<string, OpenApiResponse>;
}

export type OpenApiPaths = Record<string, Record<string, OpenApiOperation>>;

const errorSchemaRef = { $ref: '#/components/schemas/ApiErrorResponse' };

export function createErrorResponse(
  description: string,
  errorCode: string,
  message: string,
  details: Record<string, unknown> = {},
): OpenApiResponse {
  return {
    description,
    content: {
      'application/json': {
        schema: errorSchemaRef,
        examples: {
          default: {
            summary: errorCode,
            value: {
              error: {
                code: errorCode,
                message,
                details,
                requestId: 'req_01J00000000000000000000000',
              },
            },
          },
        },
      },
    },
  };
}

export const standardErrors = {
  badRequest: createErrorResponse('Validation error', 'VALIDATION_ERROR', 'Dữ liệu gửi lên không đúng định dạng.'),
  unauthorized: createErrorResponse('Authentication required', 'UNAUTHENTICATED', 'Yêu cầu đăng nhập.'),
  forbidden: createErrorResponse('Insufficient permissions', 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'),
  notFound: createErrorResponse('Resource not found', 'NOT_FOUND', 'Tài nguyên không tồn tại.'),
  conflict: createErrorResponse('Version or lease conflict', 'VERSION_CONFLICT', 'Tài nguyên đã bị thay đổi bởi phiên khác.'),
  unprocessable: createErrorResponse('Business logic error', 'DEADLINE_PASSED', 'Quá thời hạn xử lý.'),
  rateLimited: createErrorResponse('Rate limit exceeded', 'RATE_LIMITED', 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'),
  internalError: createErrorResponse('Internal system error', 'INTERNAL_ERROR', 'Đã xảy ra lỗi nội bộ hệ thống.'),
};

export const openApiComponents = {
  schemas: {
    ApiErrorDetail: {
      type: 'object',
      required: ['code', 'message', 'details', 'requestId'],
      properties: {
        code: {
          type: 'string',
          enum: [
            'VALIDATION_ERROR',
            'TURNSTILE_FAILED',
            'UNAUTHENTICATED',
            'EMAIL_NOT_VERIFIED',
            'FORBIDDEN',
            'TWO_FACTOR_REQUIRED',
            'NOT_FOUND',
            'ATTEMPT_ALREADY_OPEN',
            'LEASE_INVALID',
            'ATTEMPT_CLOSED',
            'ATTEMPT_NOT_SUBMITTED',
            'SECTION_NOT_STARTED',
            'NO_MORE_SECTIONS',
            'DEADLINE_PASSED',
            'RATE_LIMITED',
            'INTERNAL_ERROR',
            'SERVICE_UNAVAILABLE',
            'POOL_SHORTAGE',
            'LICENSE_DENIED',
            'ENTITLEMENT_REQUIRED',
            'TENANT_FORBIDDEN',
            'VERSION_CONFLICT',
            'IDEMPOTENCY_CONFLICT',
            'EVENT_NOT_STARTED',
            'RESULTS_EMBARGOED',
            'QUOTA_EXHAUSTED',
            'PROVIDER_UNAVAILABLE',
            'CONTENT_REVIEW_REQUIRED',
            'INSUFFICIENT_DATA',
          ],
        },
        message: { type: 'string' },
        details: { type: 'object', additionalProperties: true },
        requestId: { type: 'string' },
      },
    },
    ApiErrorResponse: {
      type: 'object',
      required: ['error'],
      properties: {
        error: { $ref: '#/components/schemas/ApiErrorDetail' },
      },
    },
    RichTextSegment: {
      type: 'object',
      required: ['t'],
      properties: {
        t: {
          type: 'string',
          enum: ['text', 'ruby', 'underline', 'emphasis', 'blank', 'star', 'br', 'image'],
        },
        text: { type: 'string' },
        rt: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/components/schemas/RichTextSegment' },
        },
        label: { type: 'string' },
        mediaKey: { type: 'string' },
        alt: { type: 'string' },
        width: { type: 'integer' },
        height: { type: 'integer' },
      },
    },
    RichText: {
      type: 'array',
      items: { $ref: '#/components/schemas/RichTextSegment' },
    },
    PublicOption: {
      type: 'object',
      required: ['label', 'content'],
      additionalProperties: false,
      properties: {
        label: { type: 'string' },
        content: { $ref: '#/components/schemas/RichText' },
      },
    },
    PublicQuestion: {
      type: 'object',
      required: ['index', 'questionId', 'number', 'stem', 'options'],
      additionalProperties: false,
      properties: {
        index: { type: 'integer', minimum: 0 },
        questionId: { type: 'string', format: 'uuid' },
        number: { type: 'string' },
        stem: { $ref: '#/components/schemas/RichText' },
        options: {
          type: 'array',
          items: { $ref: '#/components/schemas/PublicOption' },
          minItems: 3,
          maxItems: 4,
        },
      },
    },
    PublicQuestionGroup: {
      type: 'object',
      required: ['groupId', 'mondaiType', 'instructions', 'passage', 'media', 'questions'],
      additionalProperties: false,
      properties: {
        groupId: { type: 'string', format: 'uuid' },
        mondaiType: { type: 'string' },
        instructions: { $ref: '#/components/schemas/RichText' },
        passage: { type: ['array', 'null'], items: { type: 'object' } },
        media: { type: 'array', items: { type: 'string' } },
        questions: {
          type: 'array',
          items: { $ref: '#/components/schemas/PublicQuestion' },
        },
      },
    },
    ListeningTimelineItem: {
      type: 'object',
      required: ['groupId', 'mediaKey', 'startMs', 'endMs', 'audioStartMs', 'audioEndMs', 'gapAfterMs'],
      additionalProperties: false,
      properties: {
        groupId: { type: 'string', format: 'uuid' },
        mediaKey: { type: 'string' },
        startMs: { type: 'integer', minimum: 0 },
        endMs: { type: 'integer', minimum: 0 },
        audioStartMs: { type: 'integer', minimum: 0 },
        audioEndMs: { type: 'integer', minimum: 0 },
        gapAfterMs: { type: 'integer', minimum: 0 },
      },
    },
    PublicSection: {
      type: 'object',
      required: ['index', 'code', 'title', 'durationSec', 'questionRange', 'groups', 'listeningTimeline'],
      additionalProperties: false,
      properties: {
        index: { type: 'integer', minimum: 0 },
        code: { type: 'string' },
        title: { type: 'string' },
        durationSec: { type: 'integer', minimum: 1 },
        questionRange: {
          type: 'array',
          items: { type: 'integer' },
          minItems: 2,
          maxItems: 2,
        },
        groups: {
          type: 'array',
          items: { $ref: '#/components/schemas/PublicQuestionGroup' },
        },
        listeningTimeline: {
          type: ['array', 'null'],
          items: { $ref: '#/components/schemas/ListeningTimelineItem' },
        },
      },
    },
    PublicExamSnapshot: {
      type: 'object',
      required: ['schemaVersion', 'examId', 'version', 'level', 'title', 'kind', 'totalQuestions', 'sections'],
      additionalProperties: false,
      properties: {
        schemaVersion: { type: 'integer', const: 1 },
        examId: { type: 'string', format: 'uuid' },
        version: { type: 'integer', minimum: 1 },
        level: { type: 'string', enum: ['N1', 'N2', 'N3', 'N4', 'N5'] },
        title: { type: 'string' },
        kind: { type: 'string', enum: ['original', 'practice', 'mixed', 'custom'] },
        totalQuestions: { type: 'integer', minimum: 1 },
        sections: {
          type: 'array',
          items: { $ref: '#/components/schemas/PublicSection' },
        },
      },
    },
    ExamAnswerKey: {
      type: 'object',
      required: ['examId', 'version', 'keys', 'skills', 'mondaiTypes', 'sectionRanges'],
      additionalProperties: false,
      properties: {
        examId: { type: 'string', format: 'uuid' },
        version: { type: 'integer', minimum: 1 },
        keys: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 4 } },
        skills: { type: 'array', items: { type: 'string' } },
        mondaiTypes: { type: 'array', items: { type: 'string' } },
        sectionRanges: {
          type: 'array',
          items: { type: 'array', items: { type: 'integer' } },
        },
      },
    },
    ExamSummary: {
      type: 'object',
      required: ['id', 'slug', 'level', 'title', 'kind', 'totalQuestions', 'sections', 'guestTrial', 'publishedVersion'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        slug: { type: 'string' },
        level: { type: 'string', enum: ['N1', 'N2', 'N3', 'N4', 'N5'] },
        title: { type: 'string' },
        kind: { type: 'string', enum: ['original', 'practice', 'mixed', 'custom'] },
        year: { type: ['integer', 'null'] },
        session: { type: ['string', 'null'], enum: ['7', '12', null] },
        totalQuestions: { type: 'integer' },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'durationSec'],
            properties: { title: { type: 'string' }, durationSec: { type: 'integer' } },
          },
        },
        sourceLabel: { type: ['string', 'null'] },
        licenseLabel: { type: ['string', 'null'] },
        guestTrial: { type: 'boolean' },
        publishedVersion: { type: 'integer' },
      },
    },
    ExamDetailPublic: {
      allOf: [
        { $ref: '#/components/schemas/ExamSummary' },
        {
          type: 'object',
          required: ['description'],
          properties: { description: { type: 'string' } },
        },
      ],
    },
    AttemptInitInput: {
      type: 'object',
      required: ['examId', 'mode'],
      properties: {
        examId: { type: 'string', format: 'uuid' },
        mode: { type: 'string', enum: ['real', 'practice'] },
        assignmentId: { type: 'string', format: 'uuid' },
        eventId: { type: 'string', format: 'uuid' },
      },
    },
    AttemptInitResponse: {
      type: 'object',
      required: ['attemptId', 'lease', 'serverNow', 'snapshotUrl', 'mediaToken', 'mediaTokenExp', 'status', 'currentSection'],
      properties: {
        attemptId: { type: 'string', format: 'uuid' },
        lease: { type: 'string', format: 'uuid' },
        serverNow: { type: 'string', format: 'date-time' },
        snapshotUrl: { type: 'string', format: 'uri' },
        mediaToken: { type: 'string' },
        mediaTokenExp: { type: 'integer' },
        status: { type: 'string', const: 'in_progress' },
        currentSection: { type: ['integer', 'null'] },
      },
    },
    NextSectionInput: {
      type: 'object',
      required: ['lease'],
      properties: { lease: { type: 'string', format: 'uuid' } },
    },
    NextSectionResponse: {
      type: 'object',
      required: ['sectionIndex', 'startedAt', 'deadline', 'serverNow'],
      properties: {
        sectionIndex: { type: 'integer', minimum: 0 },
        startedAt: { type: 'string', format: 'date-time' },
        deadline: { type: 'string', format: 'date-time' },
        serverNow: { type: 'string', format: 'date-time' },
      },
    },
    AnswerChange: {
      type: 'object',
      required: ['i', 'v', 'at'],
      properties: {
        i: { type: 'integer', minimum: 0 },
        v: { type: 'integer', minimum: 0, maximum: 4 },
        at: { type: 'integer' },
      },
    },
    AnswerSheetUpdateInput: {
      type: 'object',
      required: ['lease', 'seq', 'answers', 'flags', 'changes'],
      properties: {
        lease: { type: 'string', format: 'uuid' },
        seq: { type: 'integer', minimum: 1 },
        answers: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 4 } },
        flags: { type: 'array', items: { type: 'integer' } },
        timeSpentMs: { type: 'array', items: { type: 'integer' } },
        changes: { type: 'array', items: { $ref: '#/components/schemas/AnswerChange' } },
      },
    },
    AnswerSheetAck: {
      type: 'object',
      required: ['lastSeq', 'serverNow'],
      properties: {
        lastSeq: { type: 'integer' },
        serverNow: { type: 'string', format: 'date-time' },
      },
    },
    AttemptSubmitInput: {
      type: 'object',
      required: ['lease', 'seq', 'answers', 'flags'],
      properties: {
        lease: { type: 'string', format: 'uuid' },
        seq: { type: 'integer', minimum: 1 },
        answers: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 4 } },
        flags: { type: 'array', items: { type: 'integer' } },
        timeSpentMs: { type: 'array', items: { type: 'integer' } },
      },
    },
    Result: {
      type: 'object',
      required: ['totals', 'accuracy', 'durationSec', 'bySection', 'bySkill', 'scoring', 'flags'],
      properties: {
        totals: {
          type: 'object',
          required: ['correct', 'wrong', 'blank', 'total'],
          properties: {
            correct: { type: 'integer' },
            wrong: { type: 'integer' },
            blank: { type: 'integer' },
            total: { type: 'integer' },
          },
        },
        accuracy: { type: 'number' },
        durationSec: { type: 'integer' },
        bySection: {
          type: 'array',
          items: {
            type: 'object',
            required: ['code', 'correct', 'total'],
            properties: { code: { type: 'string' }, correct: { type: 'integer' }, total: { type: 'integer' } },
          },
        },
        bySkill: {
          type: 'array',
          items: {
            type: 'object',
            required: ['skill', 'correct', 'total'],
            properties: { skill: { type: 'string' }, correct: { type: 'integer' }, total: { type: 'integer' } },
          },
        },
        scoring: {
          type: 'object',
          required: ['method', 'sections', 'total', 'totalMax', 'totalPass', 'passEstimate'],
          properties: {
            method: { type: 'string', const: 'linear_reference' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                required: ['code', 'label', 'raw', 'rawMax', 'scaled', 'maxScaled', 'minPass', 'passed'],
                properties: {
                  code: { type: 'string' },
                  label: { type: 'string' },
                  raw: { type: 'integer' },
                  rawMax: { type: 'integer' },
                  scaled: { type: 'integer' },
                  maxScaled: { type: 'integer' },
                  minPass: { type: 'integer' },
                  passed: { type: 'boolean' },
                },
              },
            },
            total: { type: 'integer' },
            totalMax: { type: 'integer' },
            totalPass: { type: 'integer' },
            passEstimate: { type: 'boolean' },
          },
        },
        flags: { type: 'array', items: { type: 'string' } },
      },
    },
    ReviewAttemptResponse: {
      type: 'object',
      required: ['snapshotUrl', 'mediaToken', 'answers', 'flags', 'correct', 'result'],
      properties: {
        snapshotUrl: { type: 'string', format: 'uri' },
        mediaToken: { type: 'string' },
        answers: { type: 'array', items: { type: 'integer' } },
        flags: { type: 'array', items: { type: 'integer' } },
        correct: { type: 'array', items: { type: 'integer' } },
        result: { $ref: '#/components/schemas/Result' },
      },
    },
    CheckAnswerInput: {
      type: 'object',
      required: ['lease', 'index'],
      properties: {
        lease: { type: 'string', format: 'uuid' },
        index: { type: 'integer', minimum: 0 },
      },
    },
    CheckAnswerResponse: {
      type: 'object',
      required: ['index', 'correct'],
      properties: {
        index: { type: 'integer' },
        correct: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    UserProfile: {
      type: 'object',
      required: ['id', 'email', 'name', 'locale', 'timezone', 'completedExams'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
        targetLevel: { type: ['string', 'null'], enum: ['N1', 'N2', 'N3', 'N4', 'N5', null] },
        targetExamDate: { type: ['string', 'null'] },
        targetScore: { type: ['integer', 'null'] },
        locale: { type: 'string' },
        timezone: { type: 'string' },
        completedExams: { type: 'integer' },
      },
    },
    UpdateProfileInput: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        targetLevel: { type: 'string', enum: ['N1', 'N2', 'N3', 'N4', 'N5'] },
        targetExamDate: { type: 'string' },
        targetScore: { type: 'integer' },
        locale: { type: 'string' },
        timezone: { type: 'string' },
      },
    },
    AsyncJob: {
      type: 'object',
      required: ['id', 'status', 'progress', 'artifacts', 'retryable'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'] },
        progress: { type: 'number', minimum: 0, maximum: 100 },
        artifacts: { type: 'array', items: { type: 'string' } },
        errorCode: { type: 'string' },
        retryable: { type: 'boolean' },
      },
    },
    ExportRequest: {
      type: 'object',
      required: ['kind'],
      properties: {
        kind: { type: 'string', enum: ['PDF', 'CSV', 'XLSX', 'JSON'] },
        resourceId: { type: 'string', format: 'uuid' },
        filters: { type: 'object' },
        locale: { type: 'string' },
      },
    },
    PracticeConfig: {
      type: 'object',
      required: ['level', 'skills', 'mondaiTypes', 'questionCount', 'pool'],
      properties: {
        level: { type: 'string', enum: ['N1', 'N2', 'N3', 'N4', 'N5'] },
        skills: { type: 'array', items: { type: 'string' } },
        mondaiTypes: { type: 'array', items: { type: 'string' } },
        questionCount: { type: 'integer', enum: [10, 20, 30, 50] },
        sourceIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        pool: { type: 'string', enum: ['wrong', 'unseen', 'marked', 'random', 'tagged', 'difficulty'] },
        timeLimitSec: { type: 'integer' },
        tagIds: { type: 'array', items: { type: 'string' } },
        difficultyRange: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
      },
    },
    MixConfig: {
      type: 'object',
      required: ['level', 'sourceSessions', 'sourceWeights', 'skills', 'mondaiTypes', 'mode', 'blueprintVersion'],
      properties: {
        level: { type: 'string', enum: ['N1', 'N2', 'N3', 'N4', 'N5'] },
        sourceSessions: { type: 'array', items: { type: 'string' } },
        sourceWeights: { type: 'object', additionalProperties: { type: 'number' } },
        skills: { type: 'array', items: { type: 'string' } },
        mondaiTypes: { type: 'array', items: { type: 'string' } },
        mode: { type: 'string', enum: ['Random', 'Balanced', 'Weakness', 'Unseen', 'Challenge', 'Revision', 'Custom'] },
        seed: { type: 'integer' },
        blueprintVersion: { type: 'integer' },
        questionCount: { type: 'integer' },
        difficultyRange: { type: 'array', items: { type: 'number' } },
        maxExposure: { type: 'integer' },
      },
    },
    GeneratedExam: {
      type: 'object',
      required: ['id', 'examId', 'version', 'seed', 'engineVersion', 'configHash', 'selectionGroupIds', 'sourceSummary', 'warnings', 'blueprintConformant'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        examId: { type: 'string', format: 'uuid' },
        version: { type: 'integer' },
        seed: { type: 'integer' },
        engineVersion: { type: 'string' },
        configHash: { type: 'string' },
        selectionGroupIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        sourceSummary: { type: 'object' },
        warnings: { type: 'array', items: { type: 'string' } },
        blueprintConformant: { type: 'boolean' },
      },
    },
    CardReview: {
      type: 'object',
      required: ['clientReviewId', 'cardId', 'rating', 'reviewedAtUTC', 'durationMs', 'expectedVersion'],
      properties: {
        clientReviewId: { type: 'string', format: 'uuid' },
        cardId: { type: 'string', format: 'uuid' },
        rating: { type: 'string', enum: ['again', 'hard', 'good', 'easy'] },
        reviewedAtUTC: { type: 'string', format: 'date-time' },
        durationMs: { type: 'integer' },
        expectedVersion: { type: 'integer' },
      },
    },
    StudyPlanConfig: {
      type: 'object',
      required: ['targetExamDate', 'timezone', 'minutesPerDay', 'days', 'skillWeights', 'daysOff', 'goals'],
      properties: {
        targetExamDate: { type: 'string' },
        timezone: { type: 'string' },
        minutesPerDay: { type: 'integer' },
        days: { type: 'integer', enum: [30, 60, 90] },
        skillWeights: { type: 'object', additionalProperties: { type: 'number' } },
        daysOff: { type: 'array', items: { type: 'integer' } },
        goals: { type: 'array', items: { type: 'string' } },
      },
    },
    AIRequest: {
      type: 'object',
      required: ['action', 'locale'],
      properties: {
        action: {
          type: 'string',
          enum: [
            'explain_question',
            'analyze_grammar',
            'compare_options',
            'explain_reading',
            'analyze_transcript',
            'ask_context',
            'memory_hint',
            'grammar_example',
            'generate_question',
            'detect_repeated_errors',
            'recommend_practice',
            'weekly_summary',
            'generate_flashcards',
          ],
        },
        questionId: { type: 'string', format: 'uuid' },
        attemptId: { type: 'string', format: 'uuid' },
        notebookId: { type: 'string', format: 'uuid' },
        message: { type: 'string' },
        locale: { type: 'string' },
      },
    },
    PaymentCreate: {
      type: 'object',
      required: ['planId', 'term', 'quantity', 'returnPath'],
      properties: {
        planId: { type: 'string' },
        term: { type: 'string', enum: ['month', 'quarter', 'year'] },
        quantity: { type: 'integer', default: 1 },
        couponCode: { type: 'string' },
        returnPath: { type: 'string' },
      },
    },
    AssignmentCreate: {
      type: 'object',
      required: ['dueAtUTC', 'opensAtUTC'],
      properties: {
        examId: { type: 'string', format: 'uuid' },
        mixConfig: { $ref: '#/components/schemas/MixConfig' },
        dueAtUTC: { type: 'string', format: 'date-time' },
        opensAtUTC: { type: 'string', format: 'date-time' },
        attemptPolicy: { type: 'object' },
        learnerIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
    },
    EventCreate: {
      type: 'object',
      required: ['examId', 'opensAt', 'startsAt', 'endsAt', 'resultReleaseAt', 'capacity', 'lateSyncWindowSec', 'rankingScope'],
      properties: {
        examId: { type: 'string', format: 'uuid' },
        opensAt: { type: 'string', format: 'date-time' },
        startsAt: { type: 'string', format: 'date-time' },
        endsAt: { type: 'string', format: 'date-time' },
        resultReleaseAt: { type: 'string', format: 'date-time' },
        capacity: { type: 'integer', minimum: 1 },
        lateSyncWindowSec: { type: 'integer', const: 0 },
        rankingScope: { type: 'string' },
      },
    },
  },
};
