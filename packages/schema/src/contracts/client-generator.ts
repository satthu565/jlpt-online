import { endpointsData } from './endpoints-data.js';

export function generateApiClientCode(): string {
  const operations: Array<{
    operationId: string;
    method: string;
    path: string;
    summary: string;
    hasPathParams: boolean;
    pathParams: string[];
    hasQuery: boolean;
    hasBody: boolean;
  }> = [];

  for (const [path, methods] of Object.entries(endpointsData)) {
    for (const [method, op] of Object.entries(methods)) {
      const pathParams = (path.match(/\{([^}]+)\}/g) || []).map((p) => p.replace(/[{}]/g, ''));
      const hasQuery = (op.parameters || []).some((p) => p.in === 'query');
      const hasBody = Boolean(op.requestBody);

      operations.push({
        operationId: op.operationId,
        method: method.toUpperCase(),
        path,
        summary: op.summary,
        hasPathParams: pathParams.length > 0,
        pathParams,
        hasQuery,
        hasBody,
      });
    }
  }

  // Sort operations by operationId for 100% deterministic code output
  operations.sort((a, b) => a.operationId.localeCompare(b.operationId));

  const code: string[] = [
    `/**`,
    ` * AUTO-GENERATED CLIENT BY F02 CONTRACT GENERATOR. DO NOT EDIT DIRECTLY.`,
    ` * To regenerate: pnpm contracts:generate`,
    ` */`,
    ``,
    `export interface ApiClientConfig {`,
    `  baseUrl: string;`,
    `  fetchFn?: typeof fetch;`,
    `  authToken?: string;`,
    `  headers?: Record<string, string>;`,
    `}`,
    ``,
    `export interface RequestOptions {`,
    `  query?: Record<string, string | number | boolean | undefined>;`,
    `  body?: unknown;`,
    `  headers?: Record<string, string>;`,
    `}`,
    ``,
    `export class ApiError extends Error {`,
    `  public readonly code: string;`,
    `  public readonly details: Record<string, unknown>;`,
    `  public readonly requestId?: string;`,
    `  public readonly status: number;`,
    ``,
    `  constructor(code: string, message: string, details: Record<string, unknown> = {}, status = 400, requestId?: string) {`,
    `    super(message);`,
    `    this.name = 'ApiError';`,
    `    this.code = code;`,
    `    this.details = details;`,
    `    this.status = status;`,
    `    this.requestId = requestId;`,
    `  }`,
    `}`,
    ``,
    `export class ApiClient {`,
    `  private readonly baseUrl: string;`,
    `  private readonly fetchFn: typeof fetch;`,
    `  private readonly authToken?: string;`,
    `  private readonly defaultHeaders: Record<string, string>;`,
    ``,
    `  constructor(config: ApiClientConfig) {`,
    `    this.baseUrl = config.baseUrl.replace(/\\/$/, '');`,
    `    this.fetchFn = config.fetchFn ?? fetch;`,
    `    this.authToken = config.authToken;`,
    `    this.defaultHeaders = config.headers ?? {};`,
    `  }`,
    ``,
    `  public async request<T = unknown>(method: string, path: string, options: RequestOptions = {}): Promise<T> {`,
    `    let url = this.baseUrl + path;`,
    `    if (options.query) {`,
    `      const searchParams = new URLSearchParams();`,
    `      for (const [k, v] of Object.entries(options.query)) {`,
    `        if (v !== undefined) {`,
    `          searchParams.append(k, String(v));`,
    `        }`,
    `      }`,
    `      const qs = searchParams.toString();`,
    `      if (qs) {`,
    `        url += (url.includes('?') ? '&' : '?') + qs;`,
    `      }`,
    `    }`,
    ``,
    `    const headers: Record<string, string> = {`,
    `      ...this.defaultHeaders,`,
    `      ...options.headers,`,
    `    };`,
    ``,
    `    if (this.authToken && !headers['Authorization']) {`,
    `      headers['Authorization'] = \`Bearer \${this.authToken}\`;`,
    `    }`,
    ``,
    `    let body: BodyInit | undefined;`,
    `    if (options.body !== undefined) {`,
    `      if (options.body instanceof FormData) {`,
    `        body = options.body;`,
    `      } else {`,
    `        headers['Content-Type'] = 'application/json';`,
    `        body = JSON.stringify(options.body);`,
    `      }`,
    `    }`,
    ``,
    `    const res =`,
    `      method === 'GET' && Object.keys(headers).length === 0 && body === undefined`,
    `        ? await this.fetchFn(url)`,
    `        : await this.fetchFn(url, {`,
    `            method,`,
    `            headers,`,
    `            body,`,
    `          });`,
    ``,
    `    if (!res.ok) {`,
    `      let errData: { error?: { code?: string; message?: string; details?: Record<string, unknown>; requestId?: string } } = {};`,
    `      try {`,
    `        errData = (await res.json()) as typeof errData;`,
    `      } catch {`,
    `        // non-json response body`,
    `      }`,
    `      const code = errData?.error?.code ?? 'UNKNOWN_ERROR';`,
    `      const message = errData?.error?.message ?? \`Request failed with status \${res.status}\`;`,
    `      const details = errData?.error?.details ?? {};`,
    `      const reqId = errData?.error?.requestId;`,
    `      throw new ApiError(code, message, details, res.status, reqId);`,
    `    }`,
    ``,
    `    if (res.status === 204) {`,
    `      return undefined as unknown as T;`,
    `    }`,
    ``,
    `    return (await res.json()) as T;`,
    `  }`,
    ``,
  ];

  for (const op of operations) {
    const paramsList: string[] = [];
    for (const p of op.pathParams) {
      paramsList.push(`${p}: string`);
    }
    if (op.hasBody) {
      paramsList.push(`body: unknown`);
    }
    if (op.hasQuery) {
      paramsList.push(`query?: Record<string, string | number | boolean | undefined>`);
    }

    let urlExpression = `'${op.path}'`;
    for (const p of op.pathParams) {
      urlExpression = urlExpression.replace(`{${p}}`, `\${encodeURIComponent(${p})}`);
    }
    if (op.hasPathParams) {
      urlExpression = `\`${urlExpression.slice(1, -1)}\``;
    }

    const opts: string[] = [];
    if (op.hasQuery) {
      opts.push(`query`);
    }
    if (op.hasBody) {
      opts.push(`body`);
    }
    const optsStr = opts.length > 0 ? `, { ${opts.join(', ')} }` : ``;

    code.push(`  /**`);
    code.push(`   * ${op.summary}`);
    code.push(`   */`);
    code.push(`  public async ${op.operationId}<T = unknown>(${paramsList.join(', ')}): Promise<T> {`);
    code.push(`    return this.request<T>('${op.method}', ${urlExpression}${optsStr});`);
    code.push(`  }`);
    code.push(``);
  }

  code.push(`}`);
  code.push(``);

  return code.join('\n');
}
