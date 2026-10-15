/**
 * AUTO-GENERATED CLIENT BY F02 CONTRACT GENERATOR. DO NOT EDIT DIRECTLY.
 * To regenerate: pnpm contracts:generate
 */

export interface ApiClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
  authToken?: string;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown>;
  public readonly requestId?: string;
  public readonly status: number;

  constructor(code: string, message: string, details: Record<string, unknown> = {}, status = 400, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
    this.requestId = requestId;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly authToken?: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.fetchFn = config.fetchFn ?? fetch;
    this.authToken = config.authToken;
    this.defaultHeaders = config.headers ?? {};
  }

  public async request<T = unknown>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    let url = this.baseUrl + path;
    if (options.query) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined) {
          searchParams.append(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    if (this.authToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      if (options.body instanceof FormData) {
        body = options.body;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
      }
    }

    const res =
      method === 'GET' && Object.keys(headers).length === 0 && body === undefined
        ? await this.fetchFn(url)
        : await this.fetchFn(url, {
            method,
            headers,
            body,
          });

    if (!res.ok) {
      let errData: { error?: { code?: string; message?: string; details?: Record<string, unknown>; requestId?: string } } = {};
      try {
        errData = (await res.json()) as typeof errData;
      } catch {
        // non-json response body
      }
      const code = errData?.error?.code ?? 'UNKNOWN_ERROR';
      const message = errData?.error?.message ?? `Request failed with status ${res.status}`;
      const details = errData?.error?.details ?? {};
      const reqId = errData?.error?.requestId;
      throw new ApiError(code, message, details, res.status, reqId);
    }

    if (res.status === 204) {
      return undefined as unknown as T;
    }

    return (await res.json()) as T;
  }

  /**
   * Kích hoạt phiên bản blueprint sử dụng chính thức
   */
  public async adminActivateBlueprint<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/blueprints/${encodeURIComponent(id)}/activate`);
  }

  /**
   * Xuất ngân hàng câu hỏi ra file
   */
  public async adminBankExport<T = unknown>(): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/bank/exports');
  }

  /**
   * Nhập khẩu ngân hàng câu hỏi hàng loạt
   */
  public async adminBankImport<T = unknown>(): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/bank/imports');
  }

  /**
   * Hủy gói nhập đang xử lý
   */
  public async adminCancelImport<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/imports/${encodeURIComponent(id)}/cancel`);
  }

  /**
   * Tạo cấu trúc blueprint mới từ nguồn kiểm chứng
   */
  public async adminCreateBlueprint<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/blueprints', { body });
  }

  /**
   * Tạo phiên bản mới cho blueprint
   */
  public async adminCreateBlueprintVersion<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/blueprints/${encodeURIComponent(id)}/versions`);
  }

  /**
   * Tạo mã giảm giá mới
   */
  public async adminCreateCoupon<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/coupons', { body });
  }

  /**
   * Tạo bản thảo đề thi mới
   */
  public async adminCreateExam<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/exams', { body });
  }

  /**
   * Tạo thử nghiệm A/B mới
   */
  public async adminCreateExperiment<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/experiments', { body });
  }

  /**
   * Soạn lời giải chi tiết cho câu hỏi
   */
  public async adminCreateExplanation<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/explanations', { body });
  }

  /**
   * Soạn thảo nhóm câu hỏi mới (kèm đáp án và giải thích cho staff)
   */
  public async adminCreateGroup<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/groups', { body });
  }

  /**
   * Khai báo giấy phép bản quyền mới
   */
  public async adminCreateLicense<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/licenses', { body });
  }

  /**
   * Tạo gói dịch vụ mới
   */
  public async adminCreatePlan<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/plans', { body });
  }

  /**
   * Tạo nguồn đề thi mới
   */
  public async adminCreateSource<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/sources', { body });
  }

  /**
   * Xóa mềm nhóm câu hỏi
   */
  public async adminDeleteGroup<T = unknown>(id: string): Promise<T> {
    return this.request<T>('DELETE', `/api/v1/admin/groups/${encodeURIComponent(id)}`);
  }

  /**
   * Xóa mềm nguồn đề
   */
  public async adminDeleteSource<T = unknown>(id: string): Promise<T> {
    return this.request<T>('DELETE', `/api/v1/admin/sources/${encodeURIComponent(id)}`);
  }

  /**
   * Thống kê tổng quan hệ thống cho nhân sự
   */
  public async adminGetDashboard<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/dashboard');
  }

  /**
   * Xem chi tiết đề thi và danh sách các câu trong đề
   */
  public async adminGetExam<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/exams/${encodeURIComponent(id)}`);
  }

  /**
   * Xem chi tiết nhóm câu hỏi
   */
  public async adminGetGroup<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/groups/${encodeURIComponent(id)}`);
  }

  /**
   * Chi tiết gói nhập và lỗi xác thực nếu có
   */
  public async adminGetImport<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/imports/${encodeURIComponent(id)}`);
  }

  /**
   * Xem chi tiết nhóm câu hỏi trong bản thảo gói nhập
   */
  public async adminGetImportDraftGroup<T = unknown>(id: string, groupId: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/imports/${encodeURIComponent(id)}/groups/${encodeURIComponent(groupId)}`);
  }

  /**
   * Chi tiết giấy phép
   */
  public async adminGetLicense<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/licenses/${encodeURIComponent(id)}`);
  }

  /**
   * Xem thông tin file media
   */
  public async adminGetMedia<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/media/${encodeURIComponent(id)}`);
  }

  /**
   * Báo cáo vận hành theo chủ đề (retention, funnel, exam-completion...)
   */
  public async adminGetReportByKind<T = unknown>(kind: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/reports/${encodeURIComponent(kind)}`);
  }

  /**
   * Báo cáo doanh thu tài chính (tách theo đơn vị tiền tệ)
   */
  public async adminGetRevenueReport<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/reports/revenue');
  }

  /**
   * Chi tiết nguồn đề thi
   */
  public async adminGetSource<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/sources/${encodeURIComponent(id)}`);
  }

  /**
   * Chi tiết người dùng
   */
  public async adminGetUser<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/users/${encodeURIComponent(id)}`);
  }

  /**
   * Ẩn nhóm câu hỏi khỏi các đề tạo trong tương lai
   */
  public async adminHideGroup<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/groups/${encodeURIComponent(id)}/hide`);
  }

  /**
   * Nhật ký kiểm toán các thao tác quản trị
   */
  public async adminListAuditLogs<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/audit-logs');
  }

  /**
   * Danh sách blueprint chính thức
   */
  public async adminListBlueprints<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/blueprints');
  }

  /**
   * Danh sách báo cáo bình luận cộng đồng
   */
  public async adminListCommunityReports<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/community-reports');
  }

  /**
   * Danh sách báo cáo sự cố nội dung từ người dùng
   */
  public async adminListContentReports<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/content-reports');
  }

  /**
   * Quản lý mã giảm giá
   */
  public async adminListCoupons<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/coupons');
  }

  /**
   * Quản trị danh sách đề thi (gồm cả bản nháp và đã xuất bản)
   */
  public async adminListExams<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/exams');
  }

  /**
   * Danh sách thử nghiệm A/B testing
   */
  public async adminListExperiments<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/experiments');
  }

  /**
   * Danh sách bản thảo lời giải chi tiết
   */
  public async adminListExplanations<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/explanations');
  }

  /**
   * Danh sách nhóm câu hỏi ngân hàng
   */
  public async adminListGroups<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/groups');
  }

  /**
   * Lịch sử các phiên bản bất biến của nhóm câu hỏi
   */
  public async adminListGroupVersions<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/groups/${encodeURIComponent(id)}/versions`);
  }

  /**
   * Danh sách các gói nhập đề v2
   */
  public async adminListImports<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/imports');
  }

  /**
   * Quản trị giấy phép bản quyền nguồn
   */
  public async adminListLicenses<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/licenses');
  }

  /**
   * Danh sách giao dịch thanh toán trên hệ thống
   */
  public async adminListPayments<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/payments');
  }

  /**
   * Quản trị các gói dịch vụ
   */
  public async adminListPlans<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/plans');
  }

  /**
   * Danh sách yêu cầu hoàn tiền
   */
  public async adminListRefunds<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/refunds');
  }

  /**
   * Quản trị danh sách nguồn đề thi
   */
  public async adminListSources<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/sources');
  }

  /**
   * Danh sách thuê bao toàn hệ thống
   */
  public async adminListSubscriptions<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/subscriptions');
  }

  /**
   * Quản trị tài khoản người dùng
   */
  public async adminListUsers<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/admin/users');
  }

  /**
   * Xem trước đề thi dưới dạng học viên (snapshot sạch không đáp án)
   */
  public async adminPreviewImport<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/admin/imports/${encodeURIComponent(id)}/preview`);
  }

  /**
   * Xuất bản đề thi (sinh snapshot công khai nghiêm ngặt và lưu riêng answer key)
   */
  public async adminPublishExam<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/exams/${encodeURIComponent(id)}/publish`);
  }

  /**
   * Xử lý vi phạm bình luận
   */
  public async adminResolveCommunityReport<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/admin/community-reports/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Xử lý báo cáo nội dung
   */
  public async adminResolveContentReport<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/admin/content-reports/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Xử lý cặp câu hỏi nghi trùng lặp
   */
  public async adminResolveDuplicate<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/duplicates/${encodeURIComponent(id)}/resolve`);
  }

  /**
   * Thử lại việc nhập gói
   */
  public async adminRetryImport<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/imports/${encodeURIComponent(id)}/retry`);
  }

  /**
   * Kiểm duyệt nội dung do AI tạo trước khi lưu vào ngân hàng câu hỏi công khai
   */
  public async adminReviewAIContent<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/ai-content/${encodeURIComponent(id)}/reviews`, { body });
  }

  /**
   * Phê duyệt lời giải chi tiết (kiểm duyệt trước khi mở public)
   */
  public async adminReviewExplanation<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/explanations/${encodeURIComponent(id)}/reviews`, { body });
  }

  /**
   * Phê duyệt hoặc từ chối nhóm câu hỏi (người duyệt khác người soạn)
   */
  public async adminReviewGroup<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/groups/${encodeURIComponent(id)}/reviews`, { body });
  }

  /**
   * Quét câu hỏi trùng lặp hoặc tương tự trong ngân hàng
   */
  public async adminScanDuplicates<T = unknown>(): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/duplicates/scan');
  }

  /**
   * Cập nhật cấu trúc danh sách các câu hỏi trong đề
   */
  public async adminSetExamItems<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', `/api/v1/admin/exams/${encodeURIComponent(id)}/items`, { body });
  }

  /**
   * Gửi nhóm câu hỏi lên hàng đợi duyệt
   */
  public async adminSubmitGroupReview<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/groups/${encodeURIComponent(id)}/submit-review`);
  }

  /**
   * Gỡ xuất bản đề thi (purge CDN)
   */
  public async adminUnpublishExam<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/exams/${encodeURIComponent(id)}/unpublish`);
  }

  /**
   * Cập nhật tiêu đề, mô tả đề thi
   */
  public async adminUpdateExam<T = unknown>(id: string): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/admin/exams/${encodeURIComponent(id)}`);
  }

  /**
   * Cập nhật lời giải
   */
  public async adminUpdateExplanation<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/admin/explanations/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Cập nhật nhóm câu hỏi
   */
  public async adminUpdateGroup<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/admin/groups/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Sửa lỗi nhóm câu hỏi trong bản thảo trước khi duyệt
   */
  public async adminUpdateImportDraftGroup<T = unknown>(id: string, groupId: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/admin/imports/${encodeURIComponent(id)}/groups/${encodeURIComponent(groupId)}`, { body });
  }

  /**
   * Cập nhật timeline audio nghe của đề
   */
  public async adminUpdateImportListeningTimeline<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', `/api/v1/admin/imports/${encodeURIComponent(id)}/listening-timeline`, { body });
  }

  /**
   * Cập nhật giấy phép
   */
  public async adminUpdateLicense<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/admin/licenses/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Cập nhật thông tin nguồn đề
   */
  public async adminUpdateSource<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/admin/sources/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Phân vai trò hoặc khóa tài khoản
   */
  public async adminUpdateUser<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/admin/users/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Tải lên file ZIP gói nhập v2 chuẩn (CHUAN_DU_LIEU_NHAP.md)
   */
  public async adminUploadImport<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/imports', { body });
  }

  /**
   * Tải file media (audio/hình ảnh) có tính toán sha256 bất biến
   */
  public async adminUploadMedia<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/admin/media', { body });
  }

  /**
   * Kiểm tra tính hợp lệ của đề thi theo blueprint trước khi xuất bản
   */
  public async adminValidateExam<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/admin/exams/${encodeURIComponent(id)}/validate`);
  }

  /**
   * Hủy yêu cầu AI đang xử lý (hoàn lại hạn mức)
   */
  public async cancelAIRequest<T = unknown>(id: string): Promise<T> {
    return this.request<T>('DELETE', `/api/v1/ai/requests/${encodeURIComponent(id)}`);
  }

  /**
   * Hủy gói thuê bao (có hiệu lực vào cuối kỳ thanh toán)
   */
  public async cancelSubscription<T = unknown>(): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/subscription/cancel');
  }

  /**
   * Chuyển đổi gói thuê bao
   */
  public async changeSubscriptionPlan<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/subscription/change', { body });
  }

  /**
   * Kiểm tra ngay đáp án một câu trong chế độ luyện tập
   */
  public async checkSingleAnswer<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/attempts/${encodeURIComponent(id)}/check`, { body });
  }

  /**
   * Đánh dấu hoàn thành buổi học (tính chuỗi streak)
   */
  public async completeStudySession<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', `/api/v1/me/study-sessions/${encodeURIComponent(id)}/completion`, { body });
  }

  /**
   * Gửi yêu cầu trợ lý AI học tập (giải thích, phân tích ngữ pháp)
   */
  public async createAIRequest<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/ai/requests', { body });
  }

  /**
   * Khởi tạo lượt thi hoặc lượt luyện tập mới
   */
  public async createAttempt<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/attempts', { body });
  }

  /**
   * Tạo thẻ ôn tập SRS từ mục trong sổ tay
   */
  public async createCardFromNotebookItem<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/me/notebook-items/${encodeURIComponent(id)}/cards`, { body });
  }

  /**
   * Khởi tạo phiên thanh toán nâng cấp gói
   */
  public async createCheckoutSession<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/checkout-sessions', { body });
  }

  /**
   * Tạo lớp học mới trong tổ chức
   */
  public async createClass<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/organizations/${encodeURIComponent(id)}/classes`, { body });
  }

  /**
   * Giáo viên giao bài tập hoặc bài kiểm tra cho lớp
   */
  public async createClassAssignment<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/classes/${encodeURIComponent(id)}/assignments`, { body });
  }

  /**
   * Tạo mã mời học viên tham gia lớp
   */
  public async createClassInvitation<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/classes/${encodeURIComponent(id)}/invitations`, { body });
  }

  /**
   * Gửi yêu cầu xóa tài khoản
   */
  public async createDeletionRequest<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/deletion-request', { body });
  }

  /**
   * Tạo kỳ thi thử đồng loạt mới (chỉ người tạo có quyền)
   */
  public async createExamEvent<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/exam-events', { body });
  }

  /**
   * Trộn đề tổng hợp theo blueprint chính thức và tỷ lệ nguồn
   */
  public async createMixedExam<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/mixed-exams', { body });
  }

  /**
   * Lưu từ vựng hoặc ngữ pháp vào sổ tay
   */
  public async createNotebookItem<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/notebook-items', { body });
  }

  /**
   * Tạo tổ chức trung tâm mới
   */
  public async createOrganization<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/organizations', { body });
  }

  /**
   * Sinh đề luyện tập theo cấu hình kỹ năng và kho câu hỏi
   */
  public async createPracticeExam<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/practice-exams', { body });
  }

  /**
   * Tạo kế hoạch học tập mới với lịch ôn từng ngày
   */
  public async createStudyPlan<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/study-plans', { body });
  }

  /**
   * Giao bài tập bổ trợ cho nhóm học viên điểm yếu
   */
  public async createSupplementAssignment<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/assignments/${encodeURIComponent(id)}/supplements`, { body });
  }

  /**
   * Xóa bình luận của mình hoặc do điều hành viên xóa
   */
  public async deleteComment<T = unknown>(id: string): Promise<T> {
    return this.request<T>('DELETE', `/api/v1/comments/${encodeURIComponent(id)}`);
  }

  /**
   * Xóa mục khỏi sổ tay
   */
  public async deleteNotebookItem<T = unknown>(id: string): Promise<T> {
    return this.request<T>('DELETE', `/api/v1/me/notebook-items/${encodeURIComponent(id)}`);
  }

  /**
   * Tạo phiếu báo điểm PDF cho lượt thi
   */
  public async exportAttemptResult<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/attempts/${encodeURIComponent(id)}/exports`, { body });
  }

  /**
   * Xuất bảng điểm lớp học ra file CSV/Excel
   */
  public async exportClassGrades<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/classes/${encodeURIComponent(id)}/grade-exports`, { body });
  }

  /**
   * Xuất ngữ liệu nghiên cứu
   */
  public async exportDataset<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/datasets/${encodeURIComponent(id)}/exports`, { body });
  }

  /**
   * Xuất dữ liệu sổ tay ra định dạng CSV/JSON chống formula injection
   */
  public async exportNotebook<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/notebook-exports', { body });
  }

  /**
   * Thêm đề thi vào danh sách yêu thích
   */
  public async favoriteExam<T = unknown>(id: string): Promise<T> {
    return this.request<T>('PUT', `/api/v1/me/favorite-exams/${encodeURIComponent(id)}`);
  }

  /**
   * Tạo quiz trắc nghiệm nhanh từ sổ tay
   */
  public async generateNotebookQuiz<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/notebook-quizzes', { body });
  }

  /**
   * Xem kết quả hoặc tiến độ yêu cầu AI
   */
  public async getAIRequestStatus<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/ai/requests/${encodeURIComponent(id)}`);
  }

  /**
   * Xem hạn mức và số lượt AI đã sử dụng trong tháng
   */
  public async getAIUsage<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/ai-usage');
  }

  /**
   * Chi tiết bài viết
   */
  public async getArticleBySlug<T = unknown>(slug: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/articles/${encodeURIComponent(slug)}`);
  }

  /**
   * Xem chi tiết bài tập được giao
   */
  public async getAssignment<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/assignments/${encodeURIComponent(id)}`);
  }

  /**
   * Báo cáo phân tích kết quả bài tập theo lớp và từng nhóm câu hỏi
   */
  public async getAssignmentAnalytics<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/assignments/${encodeURIComponent(id)}/analytics`);
  }

  /**
   * Lấy trạng thái và tiến độ bài thi
   */
  public async getAttempt<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/attempts/${encodeURIComponent(id)}`);
  }

  /**
   * Xem lại bài thi sau khi nộp (chỉ mở khi đã nộp và hết embargo)
   */
  public async getAttemptReview<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/attempts/${encodeURIComponent(id)}/review`);
  }

  /**
   * Lấy thông tin phiên đăng nhập hiện tại
   */
  public async getAuthSession<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/auth/session');
  }

  /**
   * Lấy thông tin hồ sơ người dùng hiện tại
   */
  public async getCurrentUserProfile<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me');
  }

  /**
   * Chi tiết tập ngữ liệu
   */
  public async getDatasetDetail<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/datasets/${encodeURIComponent(id)}`);
  }

  /**
   * Chi tiết một mục ngữ liệu
   */
  public async getDatasetEntryDetail<T = unknown>(id: string, entryId: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/datasets/${encodeURIComponent(id)}/entries/${encodeURIComponent(entryId)}`);
  }

  /**
   * Phát hiện từ vựng tần suất cao mà học viên chưa thành thạo
   */
  public async getDatasetGaps<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/dataset-gaps', { query });
  }

  /**
   * Thống kê ngữ pháp theo cấp độ
   */
  public async getDatasetGrammar<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/datasets/${encodeURIComponent(id)}/grammar`);
  }

  /**
   * Thống kê Hán tự theo cấp độ
   */
  public async getDatasetKanji<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/datasets/${encodeURIComponent(id)}/kanji`);
  }

  /**
   * Thống kê từ vựng theo cấp độ và tần suất xuất hiện
   */
  public async getDatasetVocabulary<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/datasets/${encodeURIComponent(id)}/vocabulary`);
  }

  /**
   * Xem trạng thái yêu cầu xóa tài khoản
   */
  public async getDeletionRequestStatus<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/deletion-request');
  }

  /**
   * Lấy danh sách thẻ SRS đến hạn ôn tập hôm nay
   */
  public async getDueSRSCards<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/srs/due', { query });
  }

  /**
   * Chi tiết thông tin đề thi công khai
   */
  public async getExamBySlug<T = unknown>(slug: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/exams/${encodeURIComponent(slug)}`);
  }

  /**
   * Chi tiết sự kiện thi đồng loạt
   */
  public async getExamEvent<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/exam-events/${encodeURIComponent(id)}`);
  }

  /**
   * Phòng chờ thi đồng loạt (đồng bộ giờ server, chưa lộ đề thi trước giờ)
   */
  public async getExamEventLobby<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/exam-events/${encodeURIComponent(id)}/lobby`);
  }

  /**
   * Bảng xếp hạng và kết quả sự kiện thi (chỉ trả về sau thời điểm công bố)
   */
  public async getExamEventResults<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/exam-events/${encodeURIComponent(id)}/results`);
  }

  /**
   * Lấy các variant A/B testing được gán cho phiên hiện tại
   */
  public async getExperimentAssignments<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/experiments/assignments');
  }

  /**
   * Lấy cấu hình chi tiết của đề đã sinh
   */
  public async getGeneratedExam<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/generated-exams/${encodeURIComponent(id)}`);
  }

  /**
   * Lấy trạng thái sức khỏe toàn bộ hệ thống (DB, Redis, Version)
   */
  public async getHealth<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/health');
  }

  /**
   * Dữ liệu landing page marketing
   */
  public async getLandingPage<T = unknown>(slug: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/landing-pages/${encodeURIComponent(slug)}`);
  }

  /**
   * Bảng xếp hạng học viên theo cấp độ và kỳ thi (chỉ người dùng đồng ý hiển thị)
   */
  public async getLeaderboards<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/leaderboards', { query });
  }

  /**
   * Lấy cấu hình nhận thông báo
   */
  public async getNotificationPreferences<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/notification-preferences');
  }

  /**
   * Chi tiết tổ chức
   */
  public async getOrganization<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/organizations/${encodeURIComponent(id)}`);
  }

  /**
   * Lấy lời giải thích chi tiết cho câu hỏi sau khi nộp bài
   */
  public async getQuestionExplanation<T = unknown>(id: string, index: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/attempts/${encodeURIComponent(id)}/explanations/${encodeURIComponent(index)}`);
  }

  /**
   * Gợi ý bài tập và kỹ năng cần cải thiện
   */
  public async getRecommendations<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/recommendations', { query });
  }

  /**
   * Lấy siêu dữ liệu đề chia sẻ qua token
   */
  public async getSharedExamMetadata<T = unknown>(token: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/shared-exams/${encodeURIComponent(token)}`);
  }

  /**
   * Chuỗi nội dung tĩnh giao diện theo ngôn ngữ
   */
  public async getSiteContent<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/site-content');
  }

  /**
   * Danh sách huy hiệu thành tích đã đạt
   */
  public async getUserAchievements<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/achievements');
  }

  /**
   * Báo cáo tiến độ phân tích chi tiết theo kỹ năng và dạng câu
   */
  public async getUserAnalytics<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/analytics', { query });
  }

  /**
   * Danh sách đồng ý xử lý dữ liệu và chính sách
   */
  public async getUserConsents<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/consents');
  }

  /**
   * Danh sách quyền lợi và tính năng người dùng được hưởng
   */
  public async getUserEntitlements<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/entitlements');
  }

  /**
   * Lấy trạng thái hoàn thành đề thi theo cấp độ
   */
  public async getUserExamStatuses<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/exam-status', { query });
  }

  /**
   * Số ngày học liên tiếp hiện tại và lịch sử học tập
   */
  public async getUserStreak<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/streak');
  }

  /**
   * Lấy trạng thái gói thuê bao hiện tại
   */
  public async getUserSubscription<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/subscription');
  }

  /**
   * Nhận webhook thanh toán từ cổng thanh toán đối tác (chữ ký số)
   */
  public async handlePaymentWebhook<T = unknown>(provider: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/webhooks/payment/${encodeURIComponent(provider)}`);
  }

  /**
   * Tham gia thử thách học tập
   */
  public async joinChallenge<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/challenges/${encodeURIComponent(id)}/join`);
  }

  /**
   * Học viên tham gia lớp học qua mã mời (idempotent)
   */
  public async joinClassByInvitation<T = unknown>(token: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/class-invitations/${encodeURIComponent(token)}/join`);
  }

  /**
   * Danh sách bài viết tin tức và kinh nghiệm thi công khai
   */
  public async listArticles<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/articles');
  }

  /**
   * Danh sách bài nộp của học viên trong bài tập được giao
   */
  public async listAssignmentSubmissions<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/assignments/${encodeURIComponent(id)}/submissions`);
  }

  /**
   * Danh sách các thử thách học tập đang diễn ra
   */
  public async listChallenges<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/challenges');
  }

  /**
   * Danh sách thành viên trong lớp học
   */
  public async listClassMembers<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/classes/${encodeURIComponent(id)}/members`);
  }

  /**
   * Danh sách tập ngữ liệu tiếng Nhật công khai
   */
  public async listDatasets<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/datasets');
  }

  /**
   * Danh sách các sự kiện thi đồng loạt công khai
   */
  public async listExamEvents<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/exam-events');
  }

  /**
   * Danh sách đề thi công khai với bộ lọc
   */
  public async listExams<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/exams', { query });
  }

  /**
   * Câu hỏi thường gặp
   */
  public async listFAQs<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/faq');
  }

  /**
   * Danh sách đề luyện tập và đề trộn do người dùng tạo
   */
  public async listGeneratedExams<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/generated-exams', { query });
  }

  /**
   * Danh sách sổ tay từ vựng/ngữ pháp cá nhân
   */
  public async listNotebookItems<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/notebook-items', { query });
  }

  /**
   * Danh sách lớp học trong tổ chức
   */
  public async listOrganizationClasses<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/organizations/${encodeURIComponent(id)}/classes`);
  }

  /**
   * Danh sách tổ chức giáo dục mà người dùng tham gia
   */
  public async listOrganizations<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/organizations');
  }

  /**
   * Danh sách các gói dịch vụ và bảng giá công khai
   */
  public async listPlans<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/plans');
  }

  /**
   * Xem thảo luận và bình luận về câu hỏi (chỉ khi đề đã thi xong và công bố)
   */
  public async listQuestionDiscussions<T = unknown>(id: string): Promise<T> {
    return this.request<T>('GET', `/api/v1/questions/${encodeURIComponent(id)}/discussions`);
  }

  /**
   * Xem kế hoạch học tập cá nhân
   */
  public async listStudyPlans<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/study-plans');
  }

  /**
   * Lịch sử lượt thi của học viên
   */
  public async listUserAttempts<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/attempts', { query });
  }

  /**
   * Danh sách phiên đăng nhập của người dùng
   */
  public async listUserSessions<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/sessions');
  }

  /**
   * Lịch sử giao dịch thanh toán của người dùng
   */
  public async listUserTransactions<T = unknown>(): Promise<T> {
    return this.request<T>('GET', '/api/v1/me/transactions');
  }

  /**
   * Tra cứu từ vựng và ngữ pháp trong từ điển có bản quyền
   */
  public async lookupDictionary<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', '/api/v1/dictionary/lookup', { query });
  }

  /**
   * Đánh dấu câu hỏi để luyện tập lại
   */
  public async markQuestion<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', `/api/v1/me/question-marks/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Bắt đầu phần thi tiếp theo và kích hoạt đồng hồ deadline server
   */
  public async nextSection<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/attempts/${encodeURIComponent(id)}/sections/next`, { body });
  }

  /**
   * Đăng bình luận hỏi đáp về câu hỏi
   */
  public async postQuestionComment<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/questions/${encodeURIComponent(id)}/discussions`, { body });
  }

  /**
   * Endpoint nội bộ nhận kết quả callback từ nhà cung cấp dịch vụ hạ tầng
   */
  public async providerJobCallback<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/internal/provider-jobs/${encodeURIComponent(id)}/callback`);
  }

  /**
   * Gửi lô sự kiện theo dõi hành vi hợp lệ (chỉ gửi sự kiện được consent)
   */
  public async recordAnalyticsEvents<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/analytics/events', { body });
  }

  /**
   * Gia hạn mediaToken khi sắp hết hạn trong lúc làm bài
   */
  public async refreshMediaToken<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/attempts/${encodeURIComponent(id)}/media-token`);
  }

  /**
   * Sinh lại đề với seed mới mà không làm thay đổi bản ghi cũ
   */
  public async regenerateExam<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/generated-exams/${encodeURIComponent(id)}/regenerate`, { body });
  }

  /**
   * Đăng ký tham gia kỳ thi đồng loạt (nguyên tử kiểm tra sức chứa)
   */
  public async registerExamEvent<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/exam-events/${encodeURIComponent(id)}/register`);
  }

  /**
   * Rời lớp hoặc giáo viên xóa học viên khỏi lớp
   */
  public async removeClassMember<T = unknown>(id: string, userId: string): Promise<T> {
    return this.request<T>('DELETE', `/api/v1/classes/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`);
  }

  /**
   * Kích hoạt lại gói thuê bao đã hủy
   */
  public async renewSubscription<T = unknown>(): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/subscription/renew');
  }

  /**
   * Tái lập lịch học khi bị lỡ buổi (sinh phiên bản kế hoạch mới)
   */
  public async replanStudyPlan<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/me/study-plans/${encodeURIComponent(id)}/replan`, { body });
  }

  /**
   * Báo cáo bình luận vi phạm
   */
  public async reportComment<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/comments/${encodeURIComponent(id)}/reports`, { body });
  }

  /**
   * Yêu cầu xuất toàn bộ dữ liệu cá nhân (GDPR)
   */
  public async requestDataExport<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/data-exports', { body });
  }

  /**
   * Gửi yêu cầu hoàn tiền cho đơn hàng
   */
  public async requestRefund<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/refund-requests', { body });
  }

  /**
   * Phục hồi bài thi đang làm dở (xin lease mới và lấy phiếu đáp án đã lưu)
   */
  public async resumeAttempt<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/attempts/${encodeURIComponent(id)}/resume`);
  }

  /**
   * Yêu cầu xóa cache tĩnh của ứng dụng web
   */
  public async revalidateCache<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/revalidate', { body });
  }

  /**
   * Thu hồi phiên đăng nhập
   */
  public async revokeSession<T = unknown>(id: string): Promise<T> {
    return this.request<T>('DELETE', `/api/v1/me/sessions/${encodeURIComponent(id)}`);
  }

  /**
   * Tạo mã chia sẻ ẩn danh cho thành tích học tập
   */
  public async shareAchievement<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/achievement-shares', { body });
  }

  /**
   * Tạo mã liên kết chia sẻ đề luyện tập
   */
  public async shareGeneratedExam<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/generated-exams/${encodeURIComponent(id)}/shares`, { body });
  }

  /**
   * Bắt đầu làm bài thi sự kiện trong khung giờ quy định
   */
  public async startExamEventAttempt<T = unknown>(id: string): Promise<T> {
    return this.request<T>('POST', `/api/v1/exam-events/${encodeURIComponent(id)}/attempts`);
  }

  /**
   * Nộp bài thi và nhận kết quả chấm điểm (idempotent)
   */
  public async submitAttempt<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('POST', `/api/v1/attempts/${encodeURIComponent(id)}/submit`, { body });
  }

  /**
   * Gửi kết quả ôn thẻ FSRS (again/hard/good/easy)
   */
  public async submitCardReview<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/srs/reviews', { body });
  }

  /**
   * Báo cáo lỗi nội dung câu hỏi hoặc lời giải
   */
  public async submitContentReport<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/content-reports', { body });
  }

  /**
   * Học viên nộp đơn đăng ký làm giáo viên
   */
  public async submitTeacherApplication<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/teacher-applications', { body });
  }

  /**
   * Sinh âm thanh đọc từ vựng hoặc câu mẫu (kiểm tra hạn mức)
   */
  public async synthesizeSpeech<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/tts', { body });
  }

  /**
   * Xóa đề thi khỏi danh sách yêu thích
   */
  public async unfavoriteExam<T = unknown>(id: string): Promise<T> {
    return this.request<T>('DELETE', `/api/v1/me/favorite-exams/${encodeURIComponent(id)}`);
  }

  /**
   * Bỏ đánh dấu câu hỏi
   */
  public async unmarkQuestion<T = unknown>(id: string): Promise<T> {
    return this.request<T>('DELETE', `/api/v1/me/question-marks/${encodeURIComponent(id)}`);
  }

  /**
   * Đồng bộ phiếu trả lời và nhật ký thay đổi đáp án
   */
  public async updateAnswerSheet<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', `/api/v1/attempts/${encodeURIComponent(id)}/sheet`, { body });
  }

  /**
   * Cập nhật mục tiêu và cài đặt hồ sơ người dùng
   */
  public async updateCurrentUserProfile<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('PATCH', '/api/v1/me', { body });
  }

  /**
   * Cập nhật mục sổ tay (đã thành thạo, gắn nhãn)
   */
  public async updateNotebookItem<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/me/notebook-items/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Cập nhật cài đặt thông báo
   */
  public async updateNotificationPreferences<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('PATCH', '/api/v1/me/notification-preferences', { body });
  }

  /**
   * Cập nhật thông tin tổ chức (chỉ quản lý)
   */
  public async updateOrganization<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/organizations/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Cập nhật mục tiêu kế hoạch học tập
   */
  public async updateStudyPlan<T = unknown>(id: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', `/api/v1/me/study-plans/${encodeURIComponent(id)}`, { body });
  }

  /**
   * Cập nhật chấp thuận chính sách
   */
  public async updateUserConsents<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('PATCH', '/api/v1/me/consents', { body });
  }

  /**
   * Tải lên ảnh đại diện
   */
  public async uploadAvatar<T = unknown>(body: unknown): Promise<T> {
    return this.request<T>('POST', '/api/v1/me/avatar', { body });
  }

}
