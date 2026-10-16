import { z } from 'zod';
import { ErrorCodeSchema, type ErrorCode } from './enums.js';

export const ApiErrorDetailSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).default({}),
  requestId: z.string(),
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: ApiErrorDetailSchema,
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export function createApiError(
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
  requestId = `req_${Date.now()}`,
): ApiErrorEnvelope {
  return {
    error: {
      code,
      message,
      details,
      requestId,
    },
  };
}
