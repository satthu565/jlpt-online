import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { isSafeUploadPath } from '../../common/utils/paths.js';
import { ImportService } from './import.service.js';

interface MultipartRequest extends FastifyRequest {
  isMultipart?: () => boolean;
  file?: () => Promise<
    | {
        filename: string;
        toBuffer: () => Promise<Buffer>;
        fields?: Record<string, unknown>;
      }
    | undefined
  >;
}

function parseMultipartBuffer(
  buffer: Buffer,
  contentType: string,
): { fields: Record<string, string>; file?: { filename: string; buffer: Buffer } } {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return { fields: {} };
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2] || '';
  const delimiter = Buffer.from(`--${boundary}`);
  const crlf = Buffer.from('\r\n\r\n');
  const fields: Record<string, string> = {};
  let file: { filename: string; buffer: Buffer } | undefined;

  let start = buffer.indexOf(delimiter);
  while (start !== -1) {
    start += delimiter.length;
    if (buffer.subarray(start, start + 2).toString() === '--') {
      break;
    }
    if (buffer.subarray(start, start + 2).toString() === '\r\n') {
      start += 2;
    }
    const nextStart = buffer.indexOf(delimiter, start);
    if (nextStart === -1) break;

    const partBuffer = buffer.subarray(start, nextStart - 2);
    const headerEnd = partBuffer.indexOf(crlf);
    if (headerEnd !== -1) {
      const headerText = partBuffer.subarray(0, headerEnd).toString('utf8');
      const body = partBuffer.subarray(headerEnd + 4);

      const nameMatch = headerText.match(/name="([^"]+)"/);
      const filenameMatch = headerText.match(/filename="([^"]+)"/);

      if (nameMatch) {
        const name = nameMatch[1]!;
        if (filenameMatch) {
          file = {
            filename: filenameMatch[1]!,
            buffer: body,
          };
        } else {
          fields[name] = body.toString('utf8').trim();
        }
      }
    }
    start = nextStart;
  }
  return { fields, file };
}

@Controller('admin/imports')
@Roles('admin', 'editor', 'reviewer')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get()
  async listJobs() {
    return { items: await this.importService.listImportJobs() };
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    return this.importService.getImportJob(id);
  }

  @Post()
  async uploadPackage(
    @Req() req: FastifyRequest,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const query = (req.query || {}) as { mode?: string };
    let mode: 'draft' | 'ready' = query.mode === 'draft' ? 'draft' : 'ready';
    const contentType = (req.headers['content-type'] as string) || '';

    // 1. If body is parsed as Buffer (via Fastify content-type parser)
    if (Buffer.isBuffer(req.body)) {
      if (contentType.includes('multipart/form-data')) {
        const parsed = parseMultipartBuffer(req.body, contentType);
        if (!parsed.file) {
          throw new BadRequestException('Không tìm thấy tệp tải lên trong multipart request');
        }
        if (parsed.fields['mode'] === 'draft' || parsed.fields['mode'] === 'ready') {
          mode = parsed.fields['mode'];
        }
        if (parsed.file.filename && !isSafeUploadPath(parsed.file.filename)) {
          throw new BadRequestException(
            `Đường dẫn gói tải lên không an toàn (unsafe upload path): ${parsed.file.filename}`,
          );
        }
        const userId = user.userId || user.id || 'importer';
        return this.importService.processPackageImport(
          parsed.file.buffer,
          parsed.file.filename || 'package.zip',
          userId,
          { mode },
        );
      }

      // Raw binary body fallback
      return this.importService.processPackageImport(
        req.body,
        'package.zip',
        user.userId || user.id || 'importer',
        { mode },
      );
    }

    // 2. Fastify multipart streaming plugin fallback (if active)
    const rawReq = req as unknown as MultipartRequest;
    const isMultipart = rawReq.isMultipart?.();
    if (isMultipart && rawReq.file) {
      const part = await rawReq.file();
      if (!part) {
        throw new BadRequestException('Không tìm thấy tệp tải lên trong multipart request');
      }
      if (part.filename && !isSafeUploadPath(part.filename)) {
        throw new BadRequestException(
          `Đường dẫn gói tải lên không an toàn (unsafe upload path): ${part.filename}`,
        );
      }
      if (part.fields) {
        const fields = part.fields as Record<string, { value?: unknown } | unknown>;
        const modeField = fields['mode'];
        const modeVal = (modeField as { value?: unknown })?.value ?? modeField;
        if (modeVal === 'draft' || modeVal === 'ready') {
          mode = modeVal;
        }
      }
      const buffer = await part.toBuffer();
      const userId = user.userId || user.id || 'importer';
      return this.importService.processPackageImport(
        buffer,
        part.filename,
        userId,
        { mode },
      );
    }

    // 3. Base64 JSON body fallback
    const rawBody = req.body as { dataBase64?: string; fileName?: string; mode?: string } | undefined;
    if (rawBody && typeof rawBody === 'object' && typeof rawBody.dataBase64 === 'string') {
      const fileName = rawBody.fileName || 'package.zip';
      if (fileName && !isSafeUploadPath(fileName)) {
        throw new BadRequestException(
          `Đường dẫn gói tải lên không an toàn (unsafe upload path): ${fileName}`,
        );
      }
      if (rawBody.mode === 'draft' || rawBody.mode === 'ready') {
        mode = rawBody.mode;
      }
      const buf = Buffer.from(rawBody.dataBase64, 'base64');
      const userId = user.userId || user.id || 'importer';
      return this.importService.processPackageImport(
        buf,
        fileName,
        userId,
        { mode },
      );
    }

    throw new BadRequestException('Yêu cầu phải là multipart/form-data, binary application/zip hoặc JSON { dataBase64 }');
  }
}
