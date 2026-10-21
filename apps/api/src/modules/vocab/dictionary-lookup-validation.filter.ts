import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Filter for /api/v1/dictionary/lookup:
 * Formats 400 validation error responses and 404 not found responses so they are compliant
 * with OpenAPI ApiErrorResponse while providing top-level message containing 'No dictionary entry found'
 * so frontend web clients (such as /tu-vung) display a friendly "Không tìm thấy" state instead of an alert.
 */
@Catch(BadRequestException, NotFoundException)
export class DictionaryLookupValidationFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const status = exception.getStatus();
    const requestId =
      (request?.headers?.['x-request-id'] as string) || `req_${Date.now()}`;
    const rawRes = exception.getResponse();
    const errMessage =
      typeof rawRes === 'string'
        ? rawRes
        : (rawRes as { message?: string })?.message || exception.message;

    const code = status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR';

    response
      .status(status)
      .header('content-type', 'application/json')
      .send({
        message: `No dictionary entry found: ${errMessage}`,
        error: {
          code,
          message: errMessage,
          details: {},
          requestId,
        },
      });
  }
}
