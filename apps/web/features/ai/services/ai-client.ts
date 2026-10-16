import type { AiRequestResponseDto, AiUsageDto, CreateAiRequestDto } from '../types';

export class AiClient {
  private baseUrl: string;
  private getAuthToken?: () => string | null;

  constructor(options?: { baseUrl?: string; getAuthToken?: () => string | null }) {
    this.baseUrl = options?.baseUrl || '/api/v1';
    this.getAuthToken = options?.getAuthToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (this.getAuthToken) {
      const token = this.getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Request failed with status ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async createRequest(dto: CreateAiRequestDto): Promise<AiRequestResponseDto> {
    return this.request<AiRequestResponseDto>('/ai/requests', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getMyUsage(): Promise<AiUsageDto> {
    return this.request<AiUsageDto>('/me/ai-usage', {
      method: 'GET',
    });
  }
}
