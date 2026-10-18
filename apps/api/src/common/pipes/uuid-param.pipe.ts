import {
  ArgumentMetadata,
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Optional,
  PipeTransform,
} from '@nestjs/common';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UuidParamPipeOptions {
  status?: HttpStatus.BAD_REQUEST | HttpStatus.NOT_FOUND;
  paramName?: string;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

@Injectable()
export class UuidParamPipe implements PipeTransform<string, string> {
  private readonly options: UuidParamPipeOptions;

  constructor(@Optional() options?: UuidParamPipeOptions) {
    this.options = options || {};
  }

  transform(value: unknown, metadata: ArgumentMetadata): string {
    const paramName = this.options.paramName || metadata.data || 'id';

    if (typeof value !== 'string' || !UUID_REGEX.test(value.trim())) {
      if (this.options.status === HttpStatus.NOT_FOUND) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Không tìm thấy tài nguyên với ${paramName}: ${value}`,
        });
      }

      throw new BadRequestException({
        code: 'INVALID_UUID',
        message: `Mã ${paramName} không đúng định dạng UUID hợp lệ: ${value}`,
      });
    }

    return value.trim();
  }
}
