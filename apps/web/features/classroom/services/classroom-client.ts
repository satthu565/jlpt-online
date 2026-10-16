import type {
  Organization,
  ClassRoom,
  ClassMember,
  ClassAssignment,
  AssignmentAnalytics,
  GradeExportResponse,
  CreateAssignmentInput,
  CreateSupplementInput,
} from '../types';

export class ClassroomClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private authToken?: string;

  constructor(options: { baseUrl?: string; fetchFn?: typeof fetch; authToken?: string } = {}) {
    this.baseUrl = (options.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');
    this.fetchFn = options.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    this.authToken = options.authToken;
  }

  public setAuthToken(token?: string): void {
    this.authToken = token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.authToken && !reqHeaders['Authorization']) {
      reqHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await this.fetchFn(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { text };
    }

    if (!response.ok) {
      const err = (data as { message?: string; code?: string }) || {};
      throw new Error(err.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  public async getOrganizations(): Promise<{ items: Organization[] }> {
    return this.request<{ items: Organization[] }>('GET', '/organizations');
  }

  public async getClasses(orgId: string): Promise<{ items: ClassRoom[] }> {
    return this.request<{ items: ClassRoom[] }>('GET', `/organizations/${encodeURIComponent(orgId)}/classes`);
  }

  public async createClass(orgId: string, data: { name: string; level: string }): Promise<ClassRoom> {
    return this.request<ClassRoom>('POST', `/organizations/${encodeURIComponent(orgId)}/classes`, data);
  }

  public async getClassMembers(classId: string): Promise<{ items: ClassMember[] }> {
    return this.request<{ items: ClassMember[] }>('GET', `/classes/${encodeURIComponent(classId)}/members`);
  }

  public async createAssignment(classId: string, data: CreateAssignmentInput): Promise<ClassAssignment> {
    return this.request<ClassAssignment>('POST', `/classes/${encodeURIComponent(classId)}/assignments`, data);
  }

  public async getAssignment(assignmentId: string): Promise<ClassAssignment> {
    return this.request<ClassAssignment>('GET', `/assignments/${encodeURIComponent(assignmentId)}`);
  }

  public async getAssignmentAnalytics(assignmentId: string): Promise<AssignmentAnalytics> {
    return this.request<AssignmentAnalytics>('GET', `/assignments/${encodeURIComponent(assignmentId)}/analytics`);
  }

  public async createSupplementAssignment(input: CreateSupplementInput): Promise<{ supplementAssignmentId: string }> {
    return this.request<{ supplementAssignmentId: string }>(
      'POST',
      `/assignments/${encodeURIComponent(input.assignmentId)}/supplements`,
      {
        learnerIds: input.learnerIds,
        title: input.title,
        examId: input.examId,
      },
    );
  }

  public async exportClassGrades(classId: string, kind: 'CSV' | 'XLSX' | 'JSON' | 'PDF' = 'CSV'): Promise<GradeExportResponse> {
    return this.request<GradeExportResponse>(
      'POST',
      `/classes/${encodeURIComponent(classId)}/grade-exports`,
      { kind },
    );
  }

  public async createInvitation(classId: string, options: { maxUses?: number; expiresAt?: string } = {}): Promise<{ token: string; inviteUrl: string }> {
    return this.request<{ token: string; inviteUrl: string }>(
      'POST',
      `/classes/${encodeURIComponent(classId)}/invitations`,
      options,
    );
  }
}

export const defaultClassroomClient = new ClassroomClient();
