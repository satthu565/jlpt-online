export interface ApiClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async getHealth(): Promise<{ status: string }> {
    const res = await this.fetchFn(`${this.baseUrl}/api/v1/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return (await res.json()) as { status: string };
  }
}
