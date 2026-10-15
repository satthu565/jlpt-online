import {
  OpenApiPaths,
  standardErrors,
  createErrorResponse,
} from './spec-data.js';

function jsonResp(description: string, schema: Record<string, unknown>) {
  return {
    description,
    content: {
      'application/json': { schema },
    },
  };
}

function emptyResp(description: string) {
  return { description };
}

export const endpointsData: OpenApiPaths = {
  '/api/v1/health': {
    get: {
      operationId: 'getHealth',
      summary: 'Lấy trạng thái sức khỏe toàn bộ hệ thống (DB, Redis, Version)',
      tags: ['Health'],
      responses: {
        '200': jsonResp('Hệ thống hoạt động bình thường', {
          type: 'object',
          required: ['status', 'db', 'redisCore', 'redisCache', 'version'],
          properties: {
            status: { type: 'string', const: 'ok' },
            db: { type: 'string', const: 'ok' },
            redisCore: { type: 'string', const: 'ok' },
            redisCache: { type: 'string', const: 'ok' },
            version: { type: 'string' },
          },
        }),
        '503': standardErrors.internalError,
      },
    },
  },

  '/api/v1/revalidate': {
    post: {
      operationId: 'revalidateCache',
      summary: 'Yêu cầu xóa cache tĩnh của ứng dụng web',
      tags: ['Internal'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                tags: { type: 'array', items: { type: 'string' } },
                paths: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Revalidation triggered', {
          type: 'object',
          required: ['revalidated'],
          properties: { revalidated: { type: 'boolean' } },
        }),
        '401': standardErrors.unauthorized,
        '403': standardErrors.forbidden,
      },
    },
  },

  '/api/v1/auth/session': {
    get: {
      operationId: 'getAuthSession',
      summary: 'Lấy thông tin phiên đăng nhập hiện tại',
      tags: ['Auth'],
      responses: {
        '200': jsonResp('Session active', {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/UserProfile' },
            session: { type: 'object' },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/exams': {
    get: {
      operationId: 'listExams',
      summary: 'Danh sách đề thi công khai với bộ lọc',
      tags: ['Exams'],
      parameters: [
        { name: 'level', in: 'query', schema: { type: 'string', enum: ['N1', 'N2', 'N3', 'N4', 'N5'] } },
        { name: 'year', in: 'query', schema: { type: 'integer' } },
        { name: 'session', in: 'query', schema: { type: 'string', enum: ['7', '12'] } },
        { name: 'kind', in: 'query', schema: { type: 'string', enum: ['original', 'practice', 'mixed', 'custom'] } },
        { name: 'cursor', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': jsonResp('Danh sách đề thi', {
          type: 'object',
          required: ['items'],
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/ExamSummary' } },
            nextCursor: { type: ['string', 'null'] },
          },
        }),
        '400': standardErrors.badRequest,
      },
    },
  },

  '/api/v1/exams/{slug}': {
    get: {
      operationId: 'getExamBySlug',
      summary: 'Chi tiết thông tin đề thi công khai',
      tags: ['Exams'],
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Chi tiết đề thi', { $ref: '#/components/schemas/ExamDetailPublic' }),
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/me': {
    get: {
      operationId: 'getCurrentUserProfile',
      summary: 'Lấy thông tin hồ sơ người dùng hiện tại',
      tags: ['User'],
      responses: {
        '200': jsonResp('Hồ sơ người dùng', { $ref: '#/components/schemas/UserProfile' }),
        '401': standardErrors.unauthorized,
      },
    },
    patch: {
      operationId: 'updateCurrentUserProfile',
      summary: 'Cập nhật mục tiêu và cài đặt hồ sơ người dùng',
      tags: ['User'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateProfileInput' },
          },
        },
      },
      responses: {
        '200': jsonResp('Hồ sơ sau khi cập nhật', { $ref: '#/components/schemas/UserProfile' }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/avatar': {
    post: {
      operationId: 'uploadAvatar',
      summary: 'Tải lên ảnh đại diện',
      tags: ['User'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Ảnh đại diện đã cập nhật', {
          type: 'object',
          required: ['avatarUrl'],
          properties: { avatarUrl: { type: 'string', format: 'uri' } },
        }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/sessions': {
    get: {
      operationId: 'listUserSessions',
      summary: 'Danh sách phiên đăng nhập của người dùng',
      tags: ['User'],
      responses: {
        '200': jsonResp('Danh sách phiên', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'createdAt', 'isCurrent'],
                properties: {
                  id: { type: 'string' },
                  userAgent: { type: 'string' },
                  ipAddress: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  isCurrent: { type: 'boolean' },
                },
              },
            },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/sessions/{id}': {
    delete: {
      operationId: 'revokeSession',
      summary: 'Thu hồi phiên đăng nhập',
      tags: ['User'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '204': emptyResp('Đã thu hồi phiên'),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/me/data-exports': {
    post: {
      operationId: 'requestDataExport',
      summary: 'Yêu cầu xuất toàn bộ dữ liệu cá nhân (GDPR)',
      tags: ['Privacy'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ExportRequest' } },
        },
      },
      responses: {
        '202': jsonResp('Yêu cầu xuất dữ liệu đã nhận', { $ref: '#/components/schemas/AsyncJob' }),
        '401': standardErrors.unauthorized,
        '429': standardErrors.rateLimited,
      },
    },
  },

  '/api/v1/me/deletion-request': {
    get: {
      operationId: 'getDeletionRequestStatus',
      summary: 'Xem trạng thái yêu cầu xóa tài khoản',
      tags: ['Privacy'],
      responses: {
        '200': jsonResp('Trạng thái xóa tài khoản', {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['none', 'pending', 'processing', 'completed'] },
            requestedAt: { type: 'string', format: 'date-time' },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
    post: {
      operationId: 'createDeletionRequest',
      summary: 'Gửi yêu cầu xóa tài khoản',
      tags: ['Privacy'],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { reason: { type: 'string' }, confirmation: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Yêu cầu xóa tài khoản đã ghi nhận', {
          type: 'object',
          required: ['id', 'status'],
          properties: { id: { type: 'string', format: 'uuid' }, status: { type: 'string' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/consents': {
    get: {
      operationId: 'getUserConsents',
      summary: 'Danh sách đồng ý xử lý dữ liệu và chính sách',
      tags: ['Privacy'],
      responses: {
        '200': jsonResp('Danh sách consent', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['purpose', 'policyVersion', 'granted', 'grantedAt'],
                properties: {
                  purpose: { type: 'string' },
                  policyVersion: { type: 'string' },
                  granted: { type: 'boolean' },
                  grantedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
    patch: {
      operationId: 'updateUserConsents',
      summary: 'Cập nhật chấp thuận chính sách',
      tags: ['Privacy'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['consents'],
              properties: {
                consents: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['purpose', 'policyVersion', 'granted'],
                    properties: { purpose: { type: 'string' }, policyVersion: { type: 'string' }, granted: { type: 'boolean' } },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Consents updated', {
          type: 'object',
          required: ['updated'],
          properties: { updated: { type: 'boolean' } },
        }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/notification-preferences': {
    get: {
      operationId: 'getNotificationPreferences',
      summary: 'Lấy cấu hình nhận thông báo',
      tags: ['User'],
      responses: {
        '200': jsonResp('Cấu hình thông báo', {
          type: 'object',
          required: ['emailUpdates', 'examReminders'],
          properties: {
            emailUpdates: { type: 'boolean' },
            examReminders: { type: 'boolean' },
            studyStreakAlerts: { type: 'boolean' },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
    patch: {
      operationId: 'updateNotificationPreferences',
      summary: 'Cập nhật cài đặt thông báo',
      tags: ['User'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                emailUpdates: { type: 'boolean' },
                examReminders: { type: 'boolean' },
                studyStreakAlerts: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Cấu hình đã cập nhật', {
          type: 'object',
          properties: { emailUpdates: { type: 'boolean' }, examReminders: { type: 'boolean' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/exam-status': {
    get: {
      operationId: 'getUserExamStatuses',
      summary: 'Lấy trạng thái hoàn thành đề thi theo cấp độ',
      tags: ['User'],
      parameters: [{ name: 'level', in: 'query', schema: { type: 'string', enum: ['N1', 'N2', 'N3', 'N4', 'N5'] } }],
      responses: {
        '200': jsonResp('Trạng thái đề thi của học viên', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['examId', 'status', 'attemptsCount'],
                properties: {
                  examId: { type: 'string', format: 'uuid' },
                  status: { type: 'string', enum: ['not_started', 'in_progress', 'completed'] },
                  bestScore: { type: ['number', 'null'] },
                  attemptsCount: { type: 'integer' },
                },
              },
            },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/attempts': {
    get: {
      operationId: 'listUserAttempts',
      summary: 'Lịch sử lượt thi của học viên',
      tags: ['User'],
      parameters: [
        { name: 'cursor', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': jsonResp('Danh sách bài thi', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'examId', 'mode', 'status', 'startedAt'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  examId: { type: 'string', format: 'uuid' },
                  mode: { type: 'string' },
                  status: { type: 'string' },
                  startedAt: { type: 'string', format: 'date-time' },
                  score: { type: ['number', 'null'] },
                  passed: { type: ['boolean', 'null'] },
                },
              },
            },
            nextCursor: { type: ['string', 'null'] },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/question-marks/{id}': {
    put: {
      operationId: 'markQuestion',
      summary: 'Đánh dấu câu hỏi để luyện tập lại',
      tags: ['User'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['questionVersionId'],
              properties: { questionVersionId: { type: 'string', format: 'uuid' }, tag: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Đã đánh dấu', { type: 'object', properties: { marked: { type: 'boolean' } } }),
        '401': standardErrors.unauthorized,
      },
    },
    delete: {
      operationId: 'unmarkQuestion',
      summary: 'Bỏ đánh dấu câu hỏi',
      tags: ['User'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '204': emptyResp('Đã bỏ đánh dấu'),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/favorite-exams/{id}': {
    put: {
      operationId: 'favoriteExam',
      summary: 'Thêm đề thi vào danh sách yêu thích',
      tags: ['User'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã thêm yêu thích', { type: 'object', properties: { favorited: { type: 'boolean' } } }),
        '401': standardErrors.unauthorized,
      },
    },
    delete: {
      operationId: 'unfavoriteExam',
      summary: 'Xóa đề thi khỏi danh sách yêu thích',
      tags: ['User'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '204': emptyResp('Đã xóa yêu thích'),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/recommendations': {
    get: {
      operationId: 'getRecommendations',
      summary: 'Gợi ý bài tập và kỹ năng cần cải thiện',
      tags: ['Learning'],
      parameters: [
        { name: 'level', in: 'query', schema: { type: 'string' } },
        { name: 'goal', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': jsonResp('Danh sách gợi ý', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'title', 'reason'],
                properties: { type: { type: 'string' }, title: { type: 'string' }, reason: { type: 'string' } },
              },
            },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/attempts': {
    post: {
      operationId: 'createAttempt',
      summary: 'Khởi tạo lượt thi hoặc lượt luyện tập mới',
      tags: ['Attempts'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AttemptInitInput' } },
        },
      },
      responses: {
        '201': jsonResp('Lượt thi khởi tạo thành công', { $ref: '#/components/schemas/AttemptInitResponse' }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
        '409': createErrorResponse('Already open attempt', 'ATTEMPT_ALREADY_OPEN', 'Đang có bài thi mở.', { attemptId: '0192f0c0-0000-7000-8000-000000000001' }),
      },
    },
  },

  '/api/v1/attempts/{id}': {
    get: {
      operationId: 'getAttempt',
      summary: 'Lấy trạng thái và tiến độ bài thi',
      tags: ['Attempts'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Thông tin bài thi', {
          type: 'object',
          required: ['status', 'mode', 'currentSection', 'serverNow'],
          properties: {
            status: { type: 'string' },
            mode: { type: 'string' },
            currentSection: { type: ['integer', 'null'] },
            deadline: { type: ['string', 'null'], format: 'date-time' },
            serverNow: { type: 'string', format: 'date-time' },
            result: { $ref: '#/components/schemas/Result' },
          },
        }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/attempts/{id}/sections/next': {
    post: {
      operationId: 'nextSection',
      summary: 'Bắt đầu phần thi tiếp theo và kích hoạt đồng hồ deadline server',
      tags: ['Attempts'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/NextSectionInput' } },
        },
      },
      responses: {
        '200': jsonResp('Phần thi tiếp theo bắt đầu', { $ref: '#/components/schemas/NextSectionResponse' }),
        '401': standardErrors.unauthorized,
        '409': createErrorResponse('No more sections or lease invalid', 'NO_MORE_SECTIONS', 'Không còn phần thi tiếp theo.'),
      },
    },
  },

  '/api/v1/attempts/{id}/sheet': {
    put: {
      operationId: 'updateAnswerSheet',
      summary: 'Đồng bộ phiếu trả lời và nhật ký thay đổi đáp án',
      tags: ['Attempts'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AnswerSheetUpdateInput' } },
        },
      },
      responses: {
        '200': jsonResp('Đồng bộ phiếu trả lời thành công', { $ref: '#/components/schemas/AnswerSheetAck' }),
        '401': standardErrors.unauthorized,
        '409': standardErrors.conflict,
        '422': standardErrors.unprocessable,
      },
    },
  },

  '/api/v1/attempts/{id}/submit': {
    post: {
      operationId: 'submitAttempt',
      summary: 'Nộp bài thi và nhận kết quả chấm điểm (idempotent)',
      tags: ['Attempts'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AttemptSubmitInput' } },
        },
      },
      responses: {
        '200': jsonResp('Kết quả chấm bài', {
          type: 'object',
          required: ['result'],
          properties: { result: { $ref: '#/components/schemas/Result' } },
        }),
        '401': standardErrors.unauthorized,
        '409': standardErrors.conflict,
        '422': standardErrors.unprocessable,
      },
    },
  },

  '/api/v1/attempts/{id}/resume': {
    post: {
      operationId: 'resumeAttempt',
      summary: 'Phục hồi bài thi đang làm dở (xin lease mới và lấy phiếu đáp án đã lưu)',
      tags: ['Attempts'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Khôi phục bài thi thành công', {
          type: 'object',
          required: ['lease', 'lastSeq', 'answers', 'flags', 'status', 'serverNow', 'snapshotUrl', 'mediaToken', 'mediaTokenExp'],
          properties: {
            lease: { type: 'string', format: 'uuid' },
            lastSeq: { type: 'integer' },
            answers: { type: 'array', items: { type: 'integer' } },
            flags: { type: 'array', items: { type: 'integer' } },
            status: { type: 'string' },
            currentSection: { type: ['integer', 'null'] },
            deadline: { type: ['string', 'null'], format: 'date-time' },
            serverNow: { type: 'string', format: 'date-time' },
            snapshotUrl: { type: 'string', format: 'uri' },
            mediaToken: { type: 'string' },
            mediaTokenExp: { type: 'integer' },
          },
        }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
        '409': createErrorResponse('Attempt already submitted', 'ATTEMPT_CLOSED', 'Bài thi đã đóng.'),
      },
    },
  },

  '/api/v1/attempts/{id}/media-token': {
    post: {
      operationId: 'refreshMediaToken',
      summary: 'Gia hạn mediaToken khi sắp hết hạn trong lúc làm bài',
      tags: ['Attempts'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Media token mới', {
          type: 'object',
          required: ['mediaToken', 'mediaTokenExp'],
          properties: { mediaToken: { type: 'string' }, mediaTokenExp: { type: 'integer' } },
        }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/attempts/{id}/review': {
    get: {
      operationId: 'getAttemptReview',
      summary: 'Xem lại bài thi sau khi nộp (chỉ mở khi đã nộp và hết embargo)',
      tags: ['Attempts'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Thông tin xem lại bài thi', { $ref: '#/components/schemas/ReviewAttemptResponse' }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
        '409': createErrorResponse('Attempt not yet submitted or results embargoed', 'RESULTS_EMBARGOED', 'Kết quả chưa được công bố.'),
      },
    },
  },

  '/api/v1/attempts/{id}/check': {
    post: {
      operationId: 'checkSingleAnswer',
      summary: 'Kiểm tra ngay đáp án một câu trong chế độ luyện tập',
      tags: ['Attempts'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CheckAnswerInput' } },
        },
      },
      responses: {
        '200': jsonResp('Kết quả kiểm tra', { $ref: '#/components/schemas/CheckAnswerResponse' }),
        '401': standardErrors.unauthorized,
        '403': createErrorResponse('Check not allowed in real exam mode', 'FORBIDDEN', 'Không hỗ trợ kiểm tra đáp án ngay trong chế độ thi thật.'),
      },
    },
  },

  '/api/v1/attempts/{id}/explanations/{index}': {
    get: {
      operationId: 'getQuestionExplanation',
      summary: 'Lấy lời giải thích chi tiết cho câu hỏi sau khi nộp bài',
      tags: ['Attempts'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'index', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': jsonResp('Lời giải chi tiết', {
          type: 'object',
          required: ['index', 'correctReason'],
          properties: {
            index: { type: 'integer' },
            correctReason: { $ref: '#/components/schemas/RichText' },
            wrongReasonsByOption: { type: 'object' },
            translation: { $ref: '#/components/schemas/RichText' },
            evidenceRanges: { type: 'array', items: { type: 'object' } },
          },
        }),
        '401': standardErrors.unauthorized,
        '409': standardErrors.conflict,
      },
    },
  },

  '/api/v1/attempts/{id}/exports': {
    post: {
      operationId: 'exportAttemptResult',
      summary: 'Tạo phiếu báo điểm PDF cho lượt thi',
      tags: ['Attempts'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ExportRequest' } },
        },
      },
      responses: {
        '202': jsonResp('Tiến trình xuất PDF đã khởi tạo', { $ref: '#/components/schemas/AsyncJob' }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/practice-exams': {
    post: {
      operationId: 'createPracticeExam',
      summary: 'Sinh đề luyện tập theo cấu hình kỹ năng và kho câu hỏi',
      tags: ['Practice'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/PracticeConfig' } },
        },
      },
      responses: {
        '201': jsonResp('Đề luyện tập đã sinh', { $ref: '#/components/schemas/GeneratedExam' }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
        '422': createErrorResponse('Pool shortage', 'POOL_SHORTAGE', 'Không đủ câu hỏi theo cấu hình.'),
      },
    },
  },

  '/api/v1/mixed-exams': {
    post: {
      operationId: 'createMixedExam',
      summary: 'Trộn đề tổng hợp theo blueprint chính thức và tỷ lệ nguồn',
      tags: ['Practice'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/MixConfig' } },
        },
      },
      responses: {
        '201': jsonResp('Đề trộn tổng hợp đã sinh', { $ref: '#/components/schemas/GeneratedExam' }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
        '422': createErrorResponse('Pool shortage', 'POOL_SHORTAGE', 'Không đủ câu hỏi thỏa mãn blueprint.'),
      },
    },
  },

  '/api/v1/generated-exams': {
    get: {
      operationId: 'listGeneratedExams',
      summary: 'Danh sách đề luyện tập và đề trộn do người dùng tạo',
      tags: ['Practice'],
      parameters: [
        { name: 'cursor', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': jsonResp('Danh sách đề đã sinh', {
          type: 'object',
          required: ['items'],
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/GeneratedExam' } },
            nextCursor: { type: ['string', 'null'] },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/generated-exams/{id}': {
    get: {
      operationId: 'getGeneratedExam',
      summary: 'Lấy cấu hình chi tiết của đề đã sinh',
      tags: ['Practice'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết đề sinh', { $ref: '#/components/schemas/GeneratedExam' }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/generated-exams/{id}/regenerate': {
    post: {
      operationId: 'regenerateExam',
      summary: 'Sinh lại đề với seed mới mà không làm thay đổi bản ghi cũ',
      tags: ['Practice'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: { type: 'object', properties: { newSeed: { type: 'integer' } } },
          },
        },
      },
      responses: {
        '201': jsonResp('Đề mới đã sinh', { $ref: '#/components/schemas/GeneratedExam' }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/generated-exams/{id}/shares': {
    post: {
      operationId: 'shareGeneratedExam',
      summary: 'Tạo mã liên kết chia sẻ đề luyện tập',
      tags: ['Practice'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                expiresAt: { type: 'string', format: 'date-time' },
                accessPolicy: { type: 'string', enum: ['public', 'enrolled_class'] },
              },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Share link created', {
          type: 'object',
          required: ['shareToken', 'shareUrl'],
          properties: { shareToken: { type: 'string' }, shareUrl: { type: 'string', format: 'uri' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/shared-exams/{token}': {
    get: {
      operationId: 'getSharedExamMetadata',
      summary: 'Lấy siêu dữ liệu đề chia sẻ qua token',
      tags: ['Practice'],
      parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Thông tin đề chia sẻ', {
          type: 'object',
          required: ['title', 'level', 'totalQuestions'],
          properties: { title: { type: 'string' }, level: { type: 'string' }, totalQuestions: { type: 'integer' } },
        }),
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/content-reports': {
    post: {
      operationId: 'submitContentReport',
      summary: 'Báo cáo lỗi nội dung câu hỏi hoặc lời giải',
      tags: ['Moderation'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason', 'details'],
              properties: {
                questionVersionId: { type: 'string', format: 'uuid' },
                explanationId: { type: 'string', format: 'uuid' },
                reason: { type: 'string' },
                details: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Báo cáo đã ghi nhận', {
          type: 'object',
          required: ['reportId', 'status'],
          properties: { reportId: { type: 'string', format: 'uuid' }, status: { type: 'string' } },
        }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
        '429': standardErrors.rateLimited,
      },
    },
  },

  '/api/v1/dictionary/lookup': {
    get: {
      operationId: 'lookupDictionary',
      summary: 'Tra cứu từ vựng và ngữ pháp trong từ điển có bản quyền',
      tags: ['Dictionary'],
      parameters: [
        { name: 'text', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'locale', in: 'query', schema: { type: 'string', default: 'vi' } },
      ],
      responses: {
        '200': jsonResp('Kết quả tra từ điển', {
          type: 'object',
          required: ['entry', 'readings', 'meanings'],
          properties: {
            entry: { type: 'string' },
            readings: { type: 'array', items: { type: 'string' } },
            meanings: { type: 'array', items: { type: 'string' } },
            examples: { type: 'array', items: { type: 'string' } },
            license: { type: 'string' },
          },
        }),
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/me/notebook-items': {
    get: {
      operationId: 'listNotebookItems',
      summary: 'Danh sách sổ tay từ vựng/ngữ pháp cá nhân',
      tags: ['Notebook'],
      parameters: [
        { name: 'cursor', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': jsonResp('Danh sách mục sổ tay', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'kind', 'term', 'version'],
                properties: { id: { type: 'string', format: 'uuid' }, kind: { type: 'string' }, term: { type: 'string' }, version: { type: 'integer' } },
              },
            },
            nextCursor: { type: ['string', 'null'] },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
    post: {
      operationId: 'createNotebookItem',
      summary: 'Lưu từ vựng hoặc ngữ pháp vào sổ tay',
      tags: ['Notebook'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['kind', 'entryId'],
              properties: {
                kind: { type: 'string', enum: ['vocab', 'kanji', 'grammar'] },
                entryId: { type: 'string' },
                sourceQuestionId: { type: 'string', format: 'uuid' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Mục sổ tay đã tạo', {
          type: 'object',
          required: ['id', 'kind'],
          properties: { id: { type: 'string', format: 'uuid' }, kind: { type: 'string' } },
        }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/notebook-items/{id}': {
    patch: {
      operationId: 'updateNotebookItem',
      summary: 'Cập nhật mục sổ tay (đã thành thạo, gắn nhãn)',
      tags: ['Notebook'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { mastered: { type: 'boolean' }, tags: { type: 'array', items: { type: 'string' } } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Đã cập nhật', { type: 'object', properties: { updated: { type: 'boolean' } } }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
      },
    },
    delete: {
      operationId: 'deleteNotebookItem',
      summary: 'Xóa mục khỏi sổ tay',
      tags: ['Notebook'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '204': emptyResp('Đã xóa'),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/notebook-items/{id}/cards': {
    post: {
      operationId: 'createCardFromNotebookItem',
      summary: 'Tạo thẻ ôn tập SRS từ mục trong sổ tay',
      tags: ['SRS'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { template: { type: 'string', default: 'standard' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Thẻ SRS đã tạo', {
          type: 'object',
          required: ['cardId'],
          properties: { cardId: { type: 'string', format: 'uuid' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/srs/due': {
    get: {
      operationId: 'getDueSRSCards',
      summary: 'Lấy danh sách thẻ SRS đến hạn ôn tập hôm nay',
      tags: ['SRS'],
      parameters: [
        { name: 'timezone', in: 'query', schema: { type: 'string', default: 'Asia/Ho_Chi_Minh' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
      ],
      responses: {
        '200': jsonResp('Danh sách thẻ cần ôn', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['cardId', 'front', 'back', 'dueAt'],
                properties: {
                  cardId: { type: 'string', format: 'uuid' },
                  front: { type: 'string' },
                  back: { type: 'string' },
                  dueAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/srs/reviews': {
    post: {
      operationId: 'submitCardReview',
      summary: 'Gửi kết quả ôn thẻ FSRS (again/hard/good/easy)',
      tags: ['SRS'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CardReview' } },
        },
      },
      responses: {
        '200': jsonResp('Thẻ đã lên lịch tiếp theo', {
          type: 'object',
          required: ['cardId', 'nextDueAt', 'scheduleVersion'],
          properties: {
            cardId: { type: 'string', format: 'uuid' },
            nextDueAt: { type: 'string', format: 'date-time' },
            scheduleVersion: { type: 'integer' },
          },
        }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
        '409': createErrorResponse('Card version conflict', 'VERSION_CONFLICT', 'Thẻ đã được ôn trên thiết bị khác.'),
      },
    },
  },

  '/api/v1/me/notebook-quizzes': {
    post: {
      operationId: 'generateNotebookQuiz',
      summary: 'Tạo quiz trắc nghiệm nhanh từ sổ tay',
      tags: ['Notebook'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['count'],
              properties: { count: { type: 'integer', minimum: 5, maximum: 50 }, tags: { type: 'array', items: { type: 'string' } } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Quiz đã tạo', {
          type: 'object',
          required: ['quizId', 'totalQuestions'],
          properties: { quizId: { type: 'string', format: 'uuid' }, totalQuestions: { type: 'integer' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/notebook-exports': {
    post: {
      operationId: 'exportNotebook',
      summary: 'Xuất dữ liệu sổ tay ra định dạng CSV/JSON chống formula injection',
      tags: ['Notebook'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ExportRequest' } },
        },
      },
      responses: {
        '202': jsonResp('Tiến trình xuất đã khởi tạo', { $ref: '#/components/schemas/AsyncJob' }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/study-plans': {
    get: {
      operationId: 'listStudyPlans',
      summary: 'Xem kế hoạch học tập cá nhân',
      tags: ['Planner'],
      responses: {
        '200': jsonResp('Danh sách kế hoạch', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'version', 'active'],
                properties: { id: { type: 'string', format: 'uuid' }, version: { type: 'integer' }, active: { type: 'boolean' } },
              },
            },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
    post: {
      operationId: 'createStudyPlan',
      summary: 'Tạo kế hoạch học tập mới với lịch ôn từng ngày',
      tags: ['Planner'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/StudyPlanConfig' } },
        },
      },
      responses: {
        '201': jsonResp('Kế hoạch đã lập', {
          type: 'object',
          required: ['planId', 'version'],
          properties: { planId: { type: 'string', format: 'uuid' }, version: { type: 'integer' } },
        }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/study-plans/{id}': {
    patch: {
      operationId: 'updateStudyPlan',
      summary: 'Cập nhật mục tiêu kế hoạch học tập',
      tags: ['Planner'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { minutesPerDay: { type: 'integer' }, daysOff: { type: 'array', items: { type: 'integer' } } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Đã cập nhật', { type: 'object', properties: { updated: { type: 'boolean' } } }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/study-plans/{id}/replan': {
    post: {
      operationId: 'replanStudyPlan',
      summary: 'Tái lập lịch học khi bị lỡ buổi (sinh phiên bản kế hoạch mới)',
      tags: ['Planner'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: { reason: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Kế hoạch mới đã tái lập', {
          type: 'object',
          required: ['newPlanId', 'version'],
          properties: { newPlanId: { type: 'string', format: 'uuid' }, version: { type: 'integer' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/study-sessions/{id}/completion': {
    put: {
      operationId: 'completeStudySession',
      summary: 'Đánh dấu hoàn thành buổi học (tính chuỗi streak)',
      tags: ['Planner'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['clientEventId', 'durationMs'],
              properties: {
                clientEventId: { type: 'string', format: 'uuid' },
                durationMs: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Buổi học đã hoàn thành', {
          type: 'object',
          required: ['completed', 'streakCount'],
          properties: { completed: { type: 'boolean' }, streakCount: { type: 'integer' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/analytics': {
    get: {
      operationId: 'getUserAnalytics',
      summary: 'Báo cáo tiến độ phân tích chi tiết theo kỹ năng và dạng câu',
      tags: ['Learning'],
      parameters: [
        { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date-time' } },
        { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date-time' } },
        { name: 'timezone', in: 'query', schema: { type: 'string', default: 'Asia/Ho_Chi_Minh' } },
      ],
      responses: {
        '200': jsonResp('Báo cáo học tập', {
          type: 'object',
          required: ['bySkill', 'totalAttempts'],
          properties: {
            bySkill: { type: 'object' },
            totalAttempts: { type: 'integer' },
            averageAccuracy: { type: 'number' },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/datasets': {
    get: {
      operationId: 'listDatasets',
      summary: 'Danh sách tập ngữ liệu tiếng Nhật công khai',
      tags: ['Corpus'],
      responses: {
        '200': jsonResp('Danh sách ngữ liệu', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name', 'version', 'totalWords'],
                properties: { id: { type: 'string' }, name: { type: 'string' }, version: { type: 'string' }, totalWords: { type: 'integer' } },
              },
            },
          },
        }),
      },
    },
  },

  '/api/v1/datasets/{id}': {
    get: {
      operationId: 'getDatasetDetail',
      summary: 'Chi tiết tập ngữ liệu',
      tags: ['Corpus'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Chi tiết ngữ liệu', {
          type: 'object',
          required: ['id', 'name', 'license'],
          properties: { id: { type: 'string' }, name: { type: 'string' }, license: { type: 'string' } },
        }),
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/datasets/{id}/vocabulary': {
    get: {
      operationId: 'getDatasetVocabulary',
      summary: 'Thống kê từ vựng theo cấp độ và tần suất xuất hiện',
      tags: ['Corpus'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Thống kê từ vựng', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
      },
    },
  },

  '/api/v1/datasets/{id}/grammar': {
    get: {
      operationId: 'getDatasetGrammar',
      summary: 'Thống kê ngữ pháp theo cấp độ',
      tags: ['Corpus'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Thống kê ngữ pháp', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
      },
    },
  },

  '/api/v1/datasets/{id}/kanji': {
    get: {
      operationId: 'getDatasetKanji',
      summary: 'Thống kê Hán tự theo cấp độ',
      tags: ['Corpus'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Thống kê Hán tự', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
      },
    },
  },

  '/api/v1/datasets/{id}/entries/{entryId}': {
    get: {
      operationId: 'getDatasetEntryDetail',
      summary: 'Chi tiết một mục ngữ liệu',
      tags: ['Corpus'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'entryId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': jsonResp('Chi tiết mục ngữ liệu', {
          type: 'object',
          required: ['entryId', 'occurrences'],
          properties: { entryId: { type: 'string' }, occurrences: { type: 'integer' } },
        }),
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/me/dataset-gaps': {
    get: {
      operationId: 'getDatasetGaps',
      summary: 'Phát hiện từ vựng tần suất cao mà học viên chưa thành thạo',
      tags: ['Learning'],
      parameters: [{ name: 'datasetId', in: 'query', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Danh sách từ cần bổ sung', {
          type: 'object',
          required: ['gaps'],
          properties: { gaps: { type: 'array', items: { type: 'object' } } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/datasets/{id}/exports': {
    post: {
      operationId: 'exportDataset',
      summary: 'Xuất ngữ liệu nghiên cứu',
      tags: ['Corpus'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ExportRequest' } },
        },
      },
      responses: {
        '202': jsonResp('Export job queued', { $ref: '#/components/schemas/AsyncJob' }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/tts': {
    post: {
      operationId: 'synthesizeSpeech',
      summary: 'Sinh âm thanh đọc từ vựng hoặc câu mẫu (kiểm tra hạn mức)',
      tags: ['TTS'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['text', 'locale'],
              properties: { text: { type: 'string' }, locale: { type: 'string', default: 'ja-JP' }, voice: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Âm thanh đã sinh', {
          type: 'object',
          required: ['audioUrl', 'durationMs'],
          properties: { audioUrl: { type: 'string', format: 'uri' }, durationMs: { type: 'integer' } },
        }),
        '401': standardErrors.unauthorized,
        '429': createErrorResponse('Quota exhausted', 'QUOTA_EXHAUSTED', 'Đã hết hạn mức TTS.'),
      },
    },
  },

  '/api/v1/ai/requests': {
    post: {
      operationId: 'createAIRequest',
      summary: 'Gửi yêu cầu trợ lý AI học tập (giải thích, phân tích ngữ pháp)',
      tags: ['AI'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AIRequest' } },
        },
      },
      responses: {
        '202': jsonResp('Yêu cầu AI đã nhận xử lý', { $ref: '#/components/schemas/AsyncJob' }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
        '403': createErrorResponse('AI forbidden in active real attempt', 'FORBIDDEN', 'Cấm AI trong khi đang làm bài thi thật.'),
        '429': createErrorResponse('Quota exhausted', 'QUOTA_EXHAUSTED', 'Đã hết hạn mức AI.'),
      },
    },
  },

  '/api/v1/ai/requests/{id}': {
    get: {
      operationId: 'getAIRequestStatus',
      summary: 'Xem kết quả hoặc tiến độ yêu cầu AI',
      tags: ['AI'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Trạng thái yêu cầu AI', {
          type: 'object',
          required: ['id', 'status'],
          properties: { id: { type: 'string', format: 'uuid' }, status: { type: 'string' }, response: { type: 'string' } },
        }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
      },
    },
    delete: {
      operationId: 'cancelAIRequest',
      summary: 'Hủy yêu cầu AI đang xử lý (hoàn lại hạn mức)',
      tags: ['AI'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã hủy', { type: 'object', properties: { cancelled: { type: 'boolean' } } }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/ai-usage': {
    get: {
      operationId: 'getAIUsage',
      summary: 'Xem hạn mức và số lượt AI đã sử dụng trong tháng',
      tags: ['AI'],
      responses: {
        '200': jsonResp('Hạn mức AI', {
          type: 'object',
          required: ['used', 'limit', 'resetAt'],
          properties: { used: { type: 'integer' }, limit: { type: 'integer' }, resetAt: { type: 'string', format: 'date-time' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/plans': {
    get: {
      operationId: 'listPlans',
      summary: 'Danh sách các gói dịch vụ và bảng giá công khai',
      tags: ['Billing'],
      responses: {
        '200': jsonResp('Danh sách gói', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name', 'priceMinor', 'currency'],
                properties: { id: { type: 'string' }, name: { type: 'string' }, priceMinor: { type: 'integer' }, currency: { type: 'string' } },
              },
            },
          },
        }),
      },
    },
  },

  '/api/v1/checkout-sessions': {
    post: {
      operationId: 'createCheckoutSession',
      summary: 'Khởi tạo phiên thanh toán nâng cấp gói',
      tags: ['Billing'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/PaymentCreate' } },
        },
      },
      responses: {
        '201': jsonResp('Phiên thanh toán đã tạo', {
          type: 'object',
          required: ['orderId', 'checkoutUrl'],
          properties: { orderId: { type: 'string', format: 'uuid' }, checkoutUrl: { type: 'string', format: 'uri' } },
        }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/subscription': {
    get: {
      operationId: 'getUserSubscription',
      summary: 'Lấy trạng thái gói thuê bao hiện tại',
      tags: ['Billing'],
      responses: {
        '200': jsonResp('Thông tin thuê bao', {
          type: 'object',
          required: ['status'],
          properties: {
            planId: { type: 'string' },
            status: { type: 'string', enum: ['none', 'active', 'past_due', 'cancelled', 'expired'] },
            expiresAt: { type: ['string', 'null'], format: 'date-time' },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/transactions': {
    get: {
      operationId: 'listUserTransactions',
      summary: 'Lịch sử giao dịch thanh toán của người dùng',
      tags: ['Billing'],
      responses: {
        '200': jsonResp('Lịch sử giao dịch', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['orderId', 'amountMinor', 'currency', 'status', 'createdAt'],
                properties: {
                  orderId: { type: 'string', format: 'uuid' },
                  amountMinor: { type: 'integer' },
                  currency: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/subscription/change': {
    post: {
      operationId: 'changeSubscriptionPlan',
      summary: 'Chuyển đổi gói thuê bao',
      tags: ['Billing'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['newPlanId'],
              properties: { newPlanId: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Chuyển đổi thành công', {
          type: 'object',
          properties: { updated: { type: 'boolean' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/subscription/cancel': {
    post: {
      operationId: 'cancelSubscription',
      summary: 'Hủy gói thuê bao (có hiệu lực vào cuối kỳ thanh toán)',
      tags: ['Billing'],
      responses: {
        '200': jsonResp('Đã hủy thuê bao', {
          type: 'object',
          properties: { cancelled: { type: 'boolean' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/subscription/renew': {
    post: {
      operationId: 'renewSubscription',
      summary: 'Kích hoạt lại gói thuê bao đã hủy',
      tags: ['Billing'],
      responses: {
        '200': jsonResp('Đã gia hạn thuê bao', {
          type: 'object',
          properties: { renewed: { type: 'boolean' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/refund-requests': {
    post: {
      operationId: 'requestRefund',
      summary: 'Gửi yêu cầu hoàn tiền cho đơn hàng',
      tags: ['Billing'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['transactionId', 'reason'],
              properties: { transactionId: { type: 'string', format: 'uuid' }, reason: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Yêu cầu hoàn tiền đã ghi nhận', {
          type: 'object',
          required: ['refundId', 'status'],
          properties: { refundId: { type: 'string', format: 'uuid' }, status: { type: 'string' } },
        }),
        '400': standardErrors.badRequest,
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/webhooks/payment/{provider}': {
    post: {
      operationId: 'handlePaymentWebhook',
      summary: 'Nhận webhook thanh toán từ cổng thanh toán đối tác (chữ ký số)',
      tags: ['Billing'],
      parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Webhook đã xử lý', {
          type: 'object',
          required: ['received'],
          properties: { received: { type: 'boolean' } },
        }),
        '400': standardErrors.badRequest,
      },
    },
  },

  '/api/v1/me/entitlements': {
    get: {
      operationId: 'getUserEntitlements',
      summary: 'Danh sách quyền lợi và tính năng người dùng được hưởng',
      tags: ['Billing'],
      responses: {
        '200': jsonResp('Danh sách quyền lợi', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['entitlement', 'active'],
                properties: { entitlement: { type: 'string' }, active: { type: 'boolean' }, expiresAt: { type: ['string', 'null'] } },
              },
            },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/teacher-applications': {
    post: {
      operationId: 'submitTeacherApplication',
      summary: 'Học viên nộp đơn đăng ký làm giáo viên',
      tags: ['Teacher'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['intro'],
              properties: { intro: { type: 'string' }, organizationName: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Đơn đăng ký đã gửi', {
          type: 'object',
          required: ['applicationId', 'status'],
          properties: { applicationId: { type: 'string', format: 'uuid' }, status: { type: 'string' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/organizations': {
    get: {
      operationId: 'listOrganizations',
      summary: 'Danh sách tổ chức giáo dục mà người dùng tham gia',
      tags: ['Classroom'],
      responses: {
        '200': jsonResp('Danh sách tổ chức', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
    post: {
      operationId: 'createOrganization',
      summary: 'Tạo tổ chức trung tâm mới',
      tags: ['Classroom'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: { name: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Tổ chức đã tạo', {
          type: 'object',
          required: ['id', 'name'],
          properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/organizations/{id}': {
    get: {
      operationId: 'getOrganization',
      summary: 'Chi tiết tổ chức',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết tổ chức', {
          type: 'object',
          required: ['id', 'name'],
          properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } },
        }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
      },
    },
    patch: {
      operationId: 'updateOrganization',
      summary: 'Cập nhật thông tin tổ chức (chỉ quản lý)',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
      },
      responses: {
        '200': jsonResp('Đã cập nhật tổ chức', { type: 'object', properties: { updated: { type: 'boolean' } } }),
        '401': standardErrors.unauthorized,
        '403': standardErrors.forbidden,
      },
    },
  },

  '/api/v1/organizations/{id}/classes': {
    get: {
      operationId: 'listOrganizationClasses',
      summary: 'Danh sách lớp học trong tổ chức',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Danh sách lớp', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
    post: {
      operationId: 'createClass',
      summary: 'Tạo lớp học mới trong tổ chức',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'level'],
              properties: { name: { type: 'string' }, level: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Lớp học đã tạo', {
          type: 'object',
          required: ['classId'],
          properties: { classId: { type: 'string', format: 'uuid' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/classes/{id}/invitations': {
    post: {
      operationId: 'createClassInvitation',
      summary: 'Tạo mã mời học viên tham gia lớp',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { expiresAt: { type: 'string', format: 'date-time' }, maxUses: { type: 'integer' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Mã mời tham gia lớp', {
          type: 'object',
          required: ['invitationToken'],
          properties: { invitationToken: { type: 'string' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/class-invitations/{token}/join': {
    post: {
      operationId: 'joinClassByInvitation',
      summary: 'Học viên tham gia lớp học qua mã mời (idempotent)',
      tags: ['Classroom'],
      parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Đã tham gia lớp', {
          type: 'object',
          required: ['success', 'classId'],
          properties: { success: { type: 'boolean' }, classId: { type: 'string', format: 'uuid' } },
        }),
        '401': standardErrors.unauthorized,
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/classes/{id}/members': {
    get: {
      operationId: 'listClassMembers',
      summary: 'Danh sách thành viên trong lớp học',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Danh sách thành viên', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/classes/{id}/members/{userId}': {
    delete: {
      operationId: 'removeClassMember',
      summary: 'Rời lớp hoặc giáo viên xóa học viên khỏi lớp',
      tags: ['Classroom'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '204': emptyResp('Đã xóa thành viên'),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/classes/{id}/assignments': {
    post: {
      operationId: 'createClassAssignment',
      summary: 'Giáo viên giao bài tập hoặc bài kiểm tra cho lớp',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AssignmentCreate' } },
        },
      },
      responses: {
        '201': jsonResp('Bài tập đã giao', {
          type: 'object',
          required: ['assignmentId', 'dueAt'],
          properties: { assignmentId: { type: 'string', format: 'uuid' }, dueAt: { type: 'string', format: 'date-time' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/assignments/{id}': {
    get: {
      operationId: 'getAssignment',
      summary: 'Xem chi tiết bài tập được giao',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết bài tập', {
          type: 'object',
          required: ['id', 'dueAt'],
          properties: { id: { type: 'string', format: 'uuid' }, dueAt: { type: 'string', format: 'date-time' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/assignments/{id}/submissions': {
    get: {
      operationId: 'listAssignmentSubmissions',
      summary: 'Danh sách bài nộp của học viên trong bài tập được giao',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Danh sách bài nộp', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/assignments/{id}/analytics': {
    get: {
      operationId: 'getAssignmentAnalytics',
      summary: 'Báo cáo phân tích kết quả bài tập theo lớp và từng nhóm câu hỏi',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Phân tích kết quả lớp', {
          type: 'object',
          required: ['averageScore', 'completionRate'],
          properties: { averageScore: { type: 'number' }, completionRate: { type: 'number' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/assignments/{id}/supplements': {
    post: {
      operationId: 'createSupplementAssignment',
      summary: 'Giao bài tập bổ trợ cho nhóm học viên điểm yếu',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['learnerIds'],
              properties: { learnerIds: { type: 'array', items: { type: 'string', format: 'uuid' } } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Đã giao bài bổ trợ', {
          type: 'object',
          required: ['supplementId'],
          properties: { supplementId: { type: 'string', format: 'uuid' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/classes/{id}/grade-exports': {
    post: {
      operationId: 'exportClassGrades',
      summary: 'Xuất bảng điểm lớp học ra file CSV/Excel',
      tags: ['Classroom'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ExportRequest' } },
        },
      },
      responses: {
        '202': jsonResp('Tiến trình xuất bảng điểm đã nhận', { $ref: '#/components/schemas/AsyncJob' }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/exam-events': {
    get: {
      operationId: 'listExamEvents',
      summary: 'Danh sách các sự kiện thi đồng loạt công khai',
      tags: ['Events'],
      responses: {
        '200': jsonResp('Danh sách sự kiện thi', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
      },
    },
    post: {
      operationId: 'createExamEvent',
      summary: 'Tạo kỳ thi thử đồng loạt mới (chỉ người tạo có quyền)',
      tags: ['Events'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/EventCreate' } },
        },
      },
      responses: {
        '201': jsonResp('Sự kiện thi đã tạo', {
          type: 'object',
          required: ['eventId', 'startsAt'],
          properties: { eventId: { type: 'string', format: 'uuid' }, startsAt: { type: 'string', format: 'date-time' } },
        }),
        '401': standardErrors.unauthorized,
        '403': standardErrors.forbidden,
      },
    },
  },

  '/api/v1/exam-events/{id}': {
    get: {
      operationId: 'getExamEvent',
      summary: 'Chi tiết sự kiện thi đồng loạt',
      tags: ['Events'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết sự kiện', {
          type: 'object',
          required: ['id', 'startsAt', 'endsAt'],
          properties: { id: { type: 'string', format: 'uuid' }, startsAt: { type: 'string', format: 'date-time' }, endsAt: { type: 'string', format: 'date-time' } },
        }),
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/exam-events/{id}/register': {
    post: {
      operationId: 'registerExamEvent',
      summary: 'Đăng ký tham gia kỳ thi đồng loạt (nguyên tử kiểm tra sức chứa)',
      tags: ['Events'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '201': jsonResp('Đăng ký thành công', {
          type: 'object',
          required: ['registered'],
          properties: { registered: { type: 'boolean' } },
        }),
        '401': standardErrors.unauthorized,
        '409': createErrorResponse('Capacity reached', 'QUOTA_EXHAUSTED', 'Sự kiện thi đã hết chỗ.'),
      },
    },
  },

  '/api/v1/exam-events/{id}/lobby': {
    get: {
      operationId: 'getExamEventLobby',
      summary: 'Phòng chờ thi đồng loạt (đồng bộ giờ server, chưa lộ đề thi trước giờ)',
      tags: ['Events'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Thông tin phòng chờ', {
          type: 'object',
          required: ['serverNow', 'startsAt', 'canEnter'],
          properties: {
            serverNow: { type: 'string', format: 'date-time' },
            startsAt: { type: 'string', format: 'date-time' },
            canEnter: { type: 'boolean' },
          },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/exam-events/{id}/attempts': {
    post: {
      operationId: 'startExamEventAttempt',
      summary: 'Bắt đầu làm bài thi sự kiện trong khung giờ quy định',
      tags: ['Events'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '201': jsonResp('Khởi tạo bài thi sự kiện thành công', { $ref: '#/components/schemas/AttemptInitResponse' }),
        '401': standardErrors.unauthorized,
        '409': createErrorResponse('Event not started yet', 'EVENT_NOT_STARTED', 'Sự kiện thi chưa tới giờ bắt đầu.'),
      },
    },
  },

  '/api/v1/exam-events/{id}/results': {
    get: {
      operationId: 'getExamEventResults',
      summary: 'Bảng xếp hạng và kết quả sự kiện thi (chỉ trả về sau thời điểm công bố)',
      tags: ['Events'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Kết quả sự kiện thi', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
        '401': standardErrors.unauthorized,
        '409': createErrorResponse('Results under embargo', 'RESULTS_EMBARGOED', 'Kết quả thi chưa được công bố.'),
      },
    },
  },

  '/api/v1/me/achievements': {
    get: {
      operationId: 'getUserAchievements',
      summary: 'Danh sách huy hiệu thành tích đã đạt',
      tags: ['Gamification'],
      responses: {
        '200': jsonResp('Danh sách thành tích', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/me/streak': {
    get: {
      operationId: 'getUserStreak',
      summary: 'Số ngày học liên tiếp hiện tại và lịch sử học tập',
      tags: ['Gamification'],
      responses: {
        '200': jsonResp('Chuỗi học tập streak', {
          type: 'object',
          required: ['currentStreak', 'longestStreak'],
          properties: { currentStreak: { type: 'integer' }, longestStreak: { type: 'integer' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/challenges': {
    get: {
      operationId: 'listChallenges',
      summary: 'Danh sách các thử thách học tập đang diễn ra',
      tags: ['Gamification'],
      responses: {
        '200': jsonResp('Danh sách thử thách', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
      },
    },
  },

  '/api/v1/challenges/{id}/join': {
    post: {
      operationId: 'joinChallenge',
      summary: 'Tham gia thử thách học tập',
      tags: ['Gamification'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã tham gia thử thách', {
          type: 'object',
          properties: { joined: { type: 'boolean' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/leaderboards': {
    get: {
      operationId: 'getLeaderboards',
      summary: 'Bảng xếp hạng học viên theo cấp độ và kỳ thi (chỉ người dùng đồng ý hiển thị)',
      tags: ['Gamification'],
      parameters: [
        { name: 'level', in: 'query', schema: { type: 'string' } },
        { name: 'period', in: 'query', schema: { type: 'string', enum: ['weekly', 'monthly', 'all_time'] } },
      ],
      responses: {
        '200': jsonResp('Bảng xếp hạng', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
      },
    },
  },

  '/api/v1/me/achievement-shares': {
    post: {
      operationId: 'shareAchievement',
      summary: 'Tạo mã chia sẻ ẩn danh cho thành tích học tập',
      tags: ['Gamification'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['achievementId'],
              properties: { achievementId: { type: 'string', format: 'uuid' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Chia sẻ thành tích', {
          type: 'object',
          required: ['shareUrl'],
          properties: { shareUrl: { type: 'string', format: 'uri' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/questions/{id}/discussions': {
    get: {
      operationId: 'listQuestionDiscussions',
      summary: 'Xem thảo luận và bình luận về câu hỏi (chỉ khi đề đã thi xong và công bố)',
      tags: ['Community'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Danh sách thảo luận', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
    post: {
      operationId: 'postQuestionComment',
      summary: 'Đăng bình luận hỏi đáp về câu hỏi',
      tags: ['Community'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['content'],
              properties: { content: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Bình luận đã gửi', {
          type: 'object',
          required: ['commentId'],
          properties: { commentId: { type: 'string', format: 'uuid' } },
        }),
        '401': standardErrors.unauthorized,
        '429': standardErrors.rateLimited,
      },
    },
  },

  '/api/v1/comments/{id}/reports': {
    post: {
      operationId: 'reportComment',
      summary: 'Báo cáo bình luận vi phạm',
      tags: ['Community'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: { reason: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('Đã gửi báo cáo', {
          type: 'object',
          properties: { reportId: { type: 'string', format: 'uuid' } },
        }),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/comments/{id}': {
    delete: {
      operationId: 'deleteComment',
      summary: 'Xóa bình luận của mình hoặc do điều hành viên xóa',
      tags: ['Community'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '204': emptyResp('Đã xóa bình luận'),
        '401': standardErrors.unauthorized,
      },
    },
  },

  '/api/v1/articles': {
    get: {
      operationId: 'listArticles',
      summary: 'Danh sách bài viết tin tức và kinh nghiệm thi công khai',
      tags: ['CMS'],
      responses: {
        '200': jsonResp('Danh sách bài viết', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
      },
    },
  },

  '/api/v1/articles/{slug}': {
    get: {
      operationId: 'getArticleBySlug',
      summary: 'Chi tiết bài viết',
      tags: ['CMS'],
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Nội dung bài viết', {
          type: 'object',
          required: ['title', 'content'],
          properties: { title: { type: 'string' }, content: { type: 'string' } },
        }),
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/landing-pages/{slug}': {
    get: {
      operationId: 'getLandingPage',
      summary: 'Dữ liệu landing page marketing',
      tags: ['CMS'],
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Landing page content', { type: 'object', properties: { title: { type: 'string' } } }),
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/faq': {
    get: {
      operationId: 'listFAQs',
      summary: 'Câu hỏi thường gặp',
      tags: ['CMS'],
      responses: {
        '200': jsonResp('Danh sách câu hỏi thường gặp', {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { type: 'object' } } },
        }),
      },
    },
  },

  '/api/v1/site-content': {
    get: {
      operationId: 'getSiteContent',
      summary: 'Chuỗi nội dung tĩnh giao diện theo ngôn ngữ',
      tags: ['CMS'],
      responses: {
        '200': jsonResp('Site content mapping', { type: 'object' }),
      },
    },
  },

  '/api/v1/analytics/events': {
    post: {
      operationId: 'recordAnalyticsEvents',
      summary: 'Gửi lô sự kiện theo dõi hành vi hợp lệ (chỉ gửi sự kiện được consent)',
      tags: ['Analytics'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['events'],
              properties: { events: { type: 'array', items: { type: 'object' } } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Đã nhận sự kiện', {
          type: 'object',
          required: ['accepted'],
          properties: { accepted: { type: 'integer' } },
        }),
      },
    },
  },

  '/api/v1/experiments/assignments': {
    get: {
      operationId: 'getExperimentAssignments',
      summary: 'Lấy các variant A/B testing được gán cho phiên hiện tại',
      tags: ['Experiments'],
      responses: {
        '200': jsonResp('Gán variant thử nghiệm', { type: 'object' }),
      },
    },
  },

  '/api/v1/internal/provider-jobs/{id}/callback': {
    post: {
      operationId: 'providerJobCallback',
      summary: 'Endpoint nội bộ nhận kết quả callback từ nhà cung cấp dịch vụ hạ tầng',
      tags: ['Internal'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Callback acknowledged', { type: 'object', properties: { ack: { type: 'boolean' } } }),
        '401': standardErrors.unauthorized,
        '403': standardErrors.forbidden,
      },
    },
  },

  // ADMIN ENDPOINTS
  '/api/v1/admin/sources': {
    get: {
      operationId: 'adminListSources',
      summary: 'Quản trị danh sách nguồn đề thi',
      tags: ['Admin Content'],
      responses: {
        '200': jsonResp('Danh sách nguồn', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
        '401': standardErrors.unauthorized,
        '403': standardErrors.forbidden,
      },
    },
    post: {
      operationId: 'adminCreateSource',
      summary: 'Tạo nguồn đề thi mới',
      tags: ['Admin Content'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '201': jsonResp('Đã tạo nguồn', { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } }),
        '401': standardErrors.unauthorized,
        '403': standardErrors.forbidden,
      },
    },
  },

  '/api/v1/admin/sources/{id}': {
    get: {
      operationId: 'adminGetSource',
      summary: 'Chi tiết nguồn đề thi',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết nguồn', { type: 'object' }),
        '404': standardErrors.notFound,
      },
    },
    patch: {
      operationId: 'adminUpdateSource',
      summary: 'Cập nhật thông tin nguồn đề',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': jsonResp('Đã cập nhật', { type: 'object', properties: { updated: { type: 'boolean' } } }),
        '404': standardErrors.notFound,
      },
    },
    delete: {
      operationId: 'adminDeleteSource',
      summary: 'Xóa mềm nguồn đề',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '204': emptyResp('Đã xóa'),
        '404': standardErrors.notFound,
      },
    },
  },

  '/api/v1/admin/licenses': {
    get: {
      operationId: 'adminListLicenses',
      summary: 'Quản trị giấy phép bản quyền nguồn',
      tags: ['Admin Content'],
      responses: {
        '200': jsonResp('Danh sách giấy phép', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
    post: {
      operationId: 'adminCreateLicense',
      summary: 'Khai báo giấy phép bản quyền mới',
      tags: ['Admin Content'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '201': jsonResp('Đã tạo giấy phép', { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } }),
      },
    },
  },

  '/api/v1/admin/licenses/{id}': {
    get: {
      operationId: 'adminGetLicense',
      summary: 'Chi tiết giấy phép',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết giấy phép', { type: 'object' }),
      },
    },
    patch: {
      operationId: 'adminUpdateLicense',
      summary: 'Cập nhật giấy phép',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': jsonResp('Đã cập nhật', { type: 'object', properties: { updated: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/media': {
    post: {
      operationId: 'adminUploadMedia',
      summary: 'Tải file media (audio/hình ảnh) có tính toán sha256 bất biến',
      tags: ['Admin Content'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        '201': jsonResp('File media đã tải lên', {
          type: 'object',
          required: ['mediaKey', 'sha256'],
          properties: { mediaKey: { type: 'string' }, sha256: { type: 'string' } },
        }),
      },
    },
  },

  '/api/v1/admin/media/{id}': {
    get: {
      operationId: 'adminGetMedia',
      summary: 'Xem thông tin file media',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Thông tin media', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/groups': {
    get: {
      operationId: 'adminListGroups',
      summary: 'Danh sách nhóm câu hỏi ngân hàng',
      tags: ['Admin Content'],
      responses: {
        '200': jsonResp('Danh sách nhóm câu hỏi', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
    post: {
      operationId: 'adminCreateGroup',
      summary: 'Soạn thảo nhóm câu hỏi mới (kèm đáp án và giải thích cho staff)',
      tags: ['Admin Content'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '201': jsonResp('Nhóm câu hỏi đã tạo', { type: 'object', properties: { groupId: { type: 'string', format: 'uuid' } } }),
      },
    },
  },

  '/api/v1/admin/groups/{id}': {
    get: {
      operationId: 'adminGetGroup',
      summary: 'Xem chi tiết nhóm câu hỏi',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết nhóm câu hỏi', { type: 'object' }),
      },
    },
    patch: {
      operationId: 'adminUpdateGroup',
      summary: 'Cập nhật nhóm câu hỏi',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': jsonResp('Đã cập nhật', { type: 'object', properties: { updated: { type: 'boolean' } } }),
      },
    },
    delete: {
      operationId: 'adminDeleteGroup',
      summary: 'Xóa mềm nhóm câu hỏi',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '204': emptyResp('Đã xóa nhóm câu hỏi'),
      },
    },
  },

  '/api/v1/admin/groups/{id}/submit-review': {
    post: {
      operationId: 'adminSubmitGroupReview',
      summary: 'Gửi nhóm câu hỏi lên hàng đợi duyệt',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã gửi duyệt', { type: 'object', properties: { status: { type: 'string' } } }),
      },
    },
  },

  '/api/v1/admin/groups/{id}/reviews': {
    post: {
      operationId: 'adminReviewGroup',
      summary: 'Phê duyệt hoặc từ chối nhóm câu hỏi (người duyệt khác người soạn)',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['decision'],
              properties: { decision: { type: 'string', enum: ['approved', 'rejected'] }, comment: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Đã duyệt nhóm câu hỏi', { type: 'object', properties: { approved: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/groups/{id}/hide': {
    post: {
      operationId: 'adminHideGroup',
      summary: 'Ẩn nhóm câu hỏi khỏi các đề tạo trong tương lai',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã ẩn', { type: 'object', properties: { hidden: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/groups/{id}/versions': {
    get: {
      operationId: 'adminListGroupVersions',
      summary: 'Lịch sử các phiên bản bất biến của nhóm câu hỏi',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Lịch sử phiên bản', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
  },

  '/api/v1/admin/duplicates/scan': {
    post: {
      operationId: 'adminScanDuplicates',
      summary: 'Quét câu hỏi trùng lặp hoặc tương tự trong ngân hàng',
      tags: ['Admin Content'],
      responses: {
        '202': jsonResp('Tiến trình quét đã chạy', { $ref: '#/components/schemas/AsyncJob' }),
      },
    },
  },

  '/api/v1/admin/duplicates/{id}/resolve': {
    post: {
      operationId: 'adminResolveDuplicate',
      summary: 'Xử lý cặp câu hỏi nghi trùng lặp',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã xử lý', { type: 'object', properties: { resolved: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/blueprints': {
    get: {
      operationId: 'adminListBlueprints',
      summary: 'Danh sách blueprint chính thức',
      tags: ['Admin Content'],
      responses: {
        '200': jsonResp('Danh sách blueprint', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
    post: {
      operationId: 'adminCreateBlueprint',
      summary: 'Tạo cấu trúc blueprint mới từ nguồn kiểm chứng',
      tags: ['Admin Content'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '201': jsonResp('Blueprint đã tạo', { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } }),
      },
    },
  },

  '/api/v1/admin/blueprints/{id}/versions': {
    post: {
      operationId: 'adminCreateBlueprintVersion',
      summary: 'Tạo phiên bản mới cho blueprint',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '201': jsonResp('Phiên bản blueprint đã tạo', { type: 'object', properties: { version: { type: 'integer' } } }),
      },
    },
  },

  '/api/v1/admin/blueprints/{id}/activate': {
    post: {
      operationId: 'adminActivateBlueprint',
      summary: 'Kích hoạt phiên bản blueprint sử dụng chính thức',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Blueprint đã kích hoạt', { type: 'object', properties: { active: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/exams': {
    get: {
      operationId: 'adminListExams',
      summary: 'Quản trị danh sách đề thi (gồm cả bản nháp và đã xuất bản)',
      tags: ['Admin Content'],
      responses: {
        '200': jsonResp('Danh sách đề thi admin', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
    post: {
      operationId: 'adminCreateExam',
      summary: 'Tạo bản thảo đề thi mới',
      tags: ['Admin Content'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '201': jsonResp('Đề thi đã tạo', { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } }),
      },
    },
  },

  '/api/v1/admin/exams/{id}': {
    get: {
      operationId: 'adminGetExam',
      summary: 'Xem chi tiết đề thi và danh sách các câu trong đề',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết đề thi', { type: 'object' }),
      },
    },
    patch: {
      operationId: 'adminUpdateExam',
      summary: 'Cập nhật tiêu đề, mô tả đề thi',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã cập nhật', { type: 'object', properties: { updated: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/exams/{id}/items': {
    put: {
      operationId: 'adminSetExamItems',
      summary: 'Cập nhật cấu trúc danh sách các câu hỏi trong đề',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': jsonResp('Đã cập nhật cấu trúc đề', { type: 'object', properties: { updated: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/exams/{id}/validate': {
    post: {
      operationId: 'adminValidateExam',
      summary: 'Kiểm tra tính hợp lệ của đề thi theo blueprint trước khi xuất bản',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Kết quả kiểm tra', {
          type: 'object',
          required: ['valid', 'violations'],
          properties: { valid: { type: 'boolean' }, violations: { type: 'array', items: { type: 'string' } } },
        }),
      },
    },
  },

  '/api/v1/admin/exams/{id}/publish': {
    post: {
      operationId: 'adminPublishExam',
      summary: 'Xuất bản đề thi (sinh snapshot công khai nghiêm ngặt và lưu riêng answer key)',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đề thi đã xuất bản', {
          type: 'object',
          required: ['version', 'publishedAt'],
          properties: { version: { type: 'integer' }, publishedAt: { type: 'string', format: 'date-time' } },
        }),
      },
    },
  },

  '/api/v1/admin/exams/{id}/unpublish': {
    post: {
      operationId: 'adminUnpublishExam',
      summary: 'Gỡ xuất bản đề thi (purge CDN)',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã gỡ xuất bản', { type: 'object', properties: { unpublished: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/imports': {
    get: {
      operationId: 'adminListImports',
      summary: 'Danh sách các gói nhập đề v2',
      tags: ['Admin Imports'],
      responses: {
        '200': jsonResp('Danh sách gói nhập', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
    post: {
      operationId: 'adminUploadImport',
      summary: 'Tải lên file ZIP gói nhập v2 chuẩn (CHUAN_DU_LIEU_NHAP.md)',
      tags: ['Admin Imports'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['package'],
              properties: { package: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        '202': jsonResp('Gói nhập đã tải lên và khởi động kiểm tra', { $ref: '#/components/schemas/AsyncJob' }),
      },
    },
  },

  '/api/v1/admin/imports/{id}': {
    get: {
      operationId: 'adminGetImport',
      summary: 'Chi tiết gói nhập và lỗi xác thực nếu có',
      tags: ['Admin Imports'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết gói nhập', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/imports/{id}/retry': {
    post: {
      operationId: 'adminRetryImport',
      summary: 'Thử lại việc nhập gói',
      tags: ['Admin Imports'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã bắt đầu lại tiến trình', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/imports/{id}/cancel': {
    post: {
      operationId: 'adminCancelImport',
      summary: 'Hủy gói nhập đang xử lý',
      tags: ['Admin Imports'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Đã hủy', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/imports/{id}/groups/{groupId}': {
    get: {
      operationId: 'adminGetImportDraftGroup',
      summary: 'Xem chi tiết nhóm câu hỏi trong bản thảo gói nhập',
      tags: ['Admin Imports'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'groupId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '200': jsonResp('Chi tiết câu hỏi trong bản thảo', { type: 'object' }),
      },
    },
    patch: {
      operationId: 'adminUpdateImportDraftGroup',
      summary: 'Sửa lỗi nhóm câu hỏi trong bản thảo trước khi duyệt',
      tags: ['Admin Imports'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'groupId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': jsonResp('Đã cập nhật câu hỏi bản thảo', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/imports/{id}/listening-timeline': {
    put: {
      operationId: 'adminUpdateImportListeningTimeline',
      summary: 'Cập nhật timeline audio nghe của đề',
      tags: ['Admin Imports'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['segments'],
              properties: { segments: { type: 'array', items: { $ref: '#/components/schemas/ListeningTimelineItem' } } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Đã cập nhật listening timeline', { type: 'object', properties: { updated: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/imports/{id}/preview': {
    get: {
      operationId: 'adminPreviewImport',
      summary: 'Xem trước đề thi dưới dạng học viên (snapshot sạch không đáp án)',
      tags: ['Admin Imports'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Snapshot xem trước', { $ref: '#/components/schemas/PublicExamSnapshot' }),
      },
    },
  },

  '/api/v1/admin/bank/imports': {
    post: {
      operationId: 'adminBankImport',
      summary: 'Nhập khẩu ngân hàng câu hỏi hàng loạt',
      tags: ['Admin Content'],
      responses: {
        '202': jsonResp('Nhập ngân hàng câu hỏi đã chạy', { $ref: '#/components/schemas/AsyncJob' }),
      },
    },
  },

  '/api/v1/admin/bank/exports': {
    post: {
      operationId: 'adminBankExport',
      summary: 'Xuất ngân hàng câu hỏi ra file',
      tags: ['Admin Content'],
      responses: {
        '202': jsonResp('Xuất ngân hàng đã chạy', { $ref: '#/components/schemas/AsyncJob' }),
      },
    },
  },

  '/api/v1/admin/explanations': {
    get: {
      operationId: 'adminListExplanations',
      summary: 'Danh sách bản thảo lời giải chi tiết',
      tags: ['Admin Content'],
      responses: {
        '200': jsonResp('Danh sách lời giải', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
    post: {
      operationId: 'adminCreateExplanation',
      summary: 'Soạn lời giải chi tiết cho câu hỏi',
      tags: ['Admin Content'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '201': jsonResp('Lời giải đã tạo', { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } }),
      },
    },
  },

  '/api/v1/admin/explanations/{id}': {
    patch: {
      operationId: 'adminUpdateExplanation',
      summary: 'Cập nhật lời giải',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': jsonResp('Đã cập nhật', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/explanations/{id}/reviews': {
    post: {
      operationId: 'adminReviewExplanation',
      summary: 'Phê duyệt lời giải chi tiết (kiểm duyệt trước khi mở public)',
      tags: ['Admin Content'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['decision'],
              properties: { decision: { type: 'string', enum: ['approved', 'rejected'] } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Đã duyệt lời giải', { type: 'object', properties: { approved: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/content-reports': {
    get: {
      operationId: 'adminListContentReports',
      summary: 'Danh sách báo cáo sự cố nội dung từ người dùng',
      tags: ['Admin Moderation'],
      responses: {
        '200': jsonResp('Danh sách báo cáo nội dung', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
  },

  '/api/v1/admin/content-reports/{id}': {
    patch: {
      operationId: 'adminResolveContentReport',
      summary: 'Xử lý báo cáo nội dung',
      tags: ['Admin Moderation'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': jsonResp('Đã xử lý báo cáo', { type: 'object', properties: { resolved: { type: 'boolean' } } }),
      },
    },
  },

  '/api/v1/admin/community-reports': {
    get: {
      operationId: 'adminListCommunityReports',
      summary: 'Danh sách báo cáo bình luận cộng đồng',
      tags: ['Admin Moderation'],
      responses: {
        '200': jsonResp('Danh sách báo cáo bình luận', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
  },

  '/api/v1/admin/community-reports/{id}': {
    patch: {
      operationId: 'adminResolveCommunityReport',
      summary: 'Xử lý vi phạm bình luận',
      tags: ['Admin Moderation'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': jsonResp('Đã xử lý bình luận', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/users': {
    get: {
      operationId: 'adminListUsers',
      summary: 'Quản trị tài khoản người dùng',
      tags: ['Admin Users'],
      responses: {
        '200': jsonResp('Danh sách người dùng', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
  },

  '/api/v1/admin/users/{id}': {
    get: {
      operationId: 'adminGetUser',
      summary: 'Chi tiết người dùng',
      tags: ['Admin Users'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': jsonResp('Chi tiết người dùng', { type: 'object' }),
      },
    },
    patch: {
      operationId: 'adminUpdateUser',
      summary: 'Phân vai trò hoặc khóa tài khoản',
      tags: ['Admin Users'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': jsonResp('Đã cập nhật tài khoản', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/audit-logs': {
    get: {
      operationId: 'adminListAuditLogs',
      summary: 'Nhật ký kiểm toán các thao tác quản trị',
      tags: ['Admin Audit'],
      responses: {
        '200': jsonResp('Danh sách audit logs', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
  },

  '/api/v1/admin/dashboard': {
    get: {
      operationId: 'adminGetDashboard',
      summary: 'Thống kê tổng quan hệ thống cho nhân sự',
      tags: ['Admin Audit'],
      responses: {
        '200': jsonResp('Dashboard counters', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/plans': {
    get: {
      operationId: 'adminListPlans',
      summary: 'Quản trị các gói dịch vụ',
      tags: ['Admin Billing'],
      responses: {
        '200': jsonResp('Danh sách gói', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
    post: {
      operationId: 'adminCreatePlan',
      summary: 'Tạo gói dịch vụ mới',
      tags: ['Admin Billing'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '201': jsonResp('Gói đã tạo', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/coupons': {
    get: {
      operationId: 'adminListCoupons',
      summary: 'Quản lý mã giảm giá',
      tags: ['Admin Billing'],
      responses: {
        '200': jsonResp('Danh sách coupon', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
    post: {
      operationId: 'adminCreateCoupon',
      summary: 'Tạo mã giảm giá mới',
      tags: ['Admin Billing'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '201': jsonResp('Mã giảm giá đã tạo', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/payments': {
    get: {
      operationId: 'adminListPayments',
      summary: 'Danh sách giao dịch thanh toán trên hệ thống',
      tags: ['Admin Billing'],
      responses: {
        '200': jsonResp('Danh sách giao dịch', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
  },

  '/api/v1/admin/refunds': {
    get: {
      operationId: 'adminListRefunds',
      summary: 'Danh sách yêu cầu hoàn tiền',
      tags: ['Admin Billing'],
      responses: {
        '200': jsonResp('Danh sách hoàn tiền', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
  },

  '/api/v1/admin/subscriptions': {
    get: {
      operationId: 'adminListSubscriptions',
      summary: 'Danh sách thuê bao toàn hệ thống',
      tags: ['Admin Billing'],
      responses: {
        '200': jsonResp('Danh sách thuê bao', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
  },

  '/api/v1/admin/reports/revenue': {
    get: {
      operationId: 'adminGetRevenueReport',
      summary: 'Báo cáo doanh thu tài chính (tách theo đơn vị tiền tệ)',
      tags: ['Admin Billing'],
      responses: {
        '200': jsonResp('Báo cáo doanh thu', {
          type: 'object',
          required: ['grossMinor', 'netMinor', 'currency'],
          properties: { grossMinor: { type: 'integer' }, netMinor: { type: 'integer' }, currency: { type: 'string' } },
        }),
      },
    },
  },

  '/api/v1/admin/reports/{kind}': {
    get: {
      operationId: 'adminGetReportByKind',
      summary: 'Báo cáo vận hành theo chủ đề (retention, funnel, exam-completion...)',
      tags: ['Admin Reports'],
      parameters: [{ name: 'kind', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResp('Dữ liệu báo cáo vận hành', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/experiments': {
    get: {
      operationId: 'adminListExperiments',
      summary: 'Danh sách thử nghiệm A/B testing',
      tags: ['Admin Experiments'],
      responses: {
        '200': jsonResp('Danh sách experiments', { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }),
      },
    },
    post: {
      operationId: 'adminCreateExperiment',
      summary: 'Tạo thử nghiệm A/B mới',
      tags: ['Admin Experiments'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '201': jsonResp('Experiment created', { type: 'object' }),
      },
    },
  },

  '/api/v1/admin/ai-content/{id}/reviews': {
    post: {
      operationId: 'adminReviewAIContent',
      summary: 'Kiểm duyệt nội dung do AI tạo trước khi lưu vào ngân hàng câu hỏi công khai',
      tags: ['Admin Moderation'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['decision'],
              properties: { decision: { type: 'string', enum: ['approve', 'reject'] }, comment: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '200': jsonResp('Đã kiểm duyệt nội dung AI', { type: 'object', properties: { reviewed: { type: 'boolean' } } }),
      },
    },
  },
};
