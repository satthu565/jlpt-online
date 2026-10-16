import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { ErrorCode } from '@jlpt/schema';
import { maskPii } from '../utils/pii.js';

interface CustomErrorResponse {
  code?: ErrorCode | string;
  message?: string;
  details?: Record<string, unknown>;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const requestId =
      (request.headers['x-request-id'] as string) || `req_${Date.now()}`;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'Đã có lỗi xảy ra trên hệ thống.';
    let details: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const customRes = res as CustomErrorResponse;
        if (customRes.code) {
          code = customRes.code as ErrorCode;
        }
        if (customRes.message) {
          message = customRes.message;
        }
        if (customRes.details) {
          details = customRes.details;
        }
      }

      // Default codes by status if code is still generic
      if (code === 'INTERNAL_ERROR') {
        if (status === HttpStatus.UNAUTHORIZED) {
          code = 'UNAUTHENTICATED';
          message = message || 'Yêu cầu đăng nhập.';
        } else if (status === HttpStatus.FORBIDDEN) {
          code = 'FORBIDDEN';
          message = message || 'Không có quyền truy cập tài nguyên này.';
        } else if (status === HttpStatus.NOT_FOUND) {
          code = 'NOT_FOUND';
          message = message || 'Không tìm thấy tài nguyên.';
        } else if (status === HttpStatus.BAD_REQUEST) {
          code = 'VALIDATION_ERROR';
        } else if (status === HttpStatus.CONFLICT) {
          code = 'IDEMPOTENCY_CONFLICT';
        } else if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
          code = 'DEADLINE_PASSED';
        } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
          code = 'RATE_LIMITED';
        } else if (status === HttpStatus.SERVICE_UNAVAILABLE) {
          code = 'SERVICE_UNAVAILABLE';
        }
      }
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Dữ liệu đầu vào không hợp lệ.';
      details = {
        issues: exception.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      };
    } else if (exception instanceof Error) {
      // In development or test, log message without leaking to client
      if (process.env.NODE_ENV === 'test') {
        details = { internal: exception.message };
      }
    }

    // Mask any PII before sending
    const errorBody = {
      error: {
        code,
        message,
        details: maskPii(details),
        requestId,
      },
    };

    response.status(status).header('content-type', 'application/json').send(errorBody);
  }
}
