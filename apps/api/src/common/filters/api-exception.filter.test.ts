import { describe, it, expect, vi, afterEach } from 'vitest';
import { ArgumentsHost, BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter.js';

function hostFor(url: string) {
  const reply = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    header() {
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const request = { method: 'POST', url, headers: { 'x-request-id': 'req_test' } };
  const host = {
    switchToHttp: () => ({ getResponse: () => reply, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  return { host, reply };
}

describe('ApiExceptionFilter logging', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs unexpected errors with request id and stack, but keeps the client message generic', () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, reply } = hostFor('/api/v1/attempts?token=secret123');

    new ApiExceptionFilter().catch(new TypeError('boom for a.user@example.com'), host);

    expect(reply.statusCode).toBe(500);
    expect(JSON.stringify(reply.body)).not.toContain('boom');
    expect(logged).toHaveBeenCalledTimes(1);
    const line = String(logged.mock.calls[0]?.[0]);
    expect(line).toContain('req_test POST /api/v1/attempts');
    expect(line).toContain('TypeError: boom');
    expect(line).toContain('at ');
    expect(line).not.toContain('secret123');
    expect(line).not.toContain('a.user@example.com');
  });

  it('logs 5xx HttpExceptions', () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, reply } = hostFor('/api/v1/health');

    new ApiExceptionFilter().catch(new ServiceUnavailableException(), host);

    expect(reply.statusCode).toBe(503);
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it('does not log client errors', () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, reply } = hostFor('/api/v1/attempts');

    new ApiExceptionFilter().catch(new BadRequestException(), host);

    expect(reply.statusCode).toBe(400);
    expect(logged).not.toHaveBeenCalled();
  });
});
