import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ImportService } from './import.service.js';

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
    @CurrentUser() user: { id: string },
  ) {
    const rawReq = req as any;
    const isMultipart = rawReq.isMultipart?.();
    if (isMultipart) {
      const part = await rawReq.file();
      if (!part) {
        throw new BadRequestException('Không tìm thấy tệp tải lên trong multipart request');
      }
      const buffer = await part.toBuffer();
      return this.importService.processPackageImport(
        buffer,
        part.filename,
        user.id,
      );
    }

    // Base64 JSON body fallback
    const rawBody = req.body as any;
    if (rawBody && typeof rawBody === 'object' && typeof rawBody.dataBase64 === 'string') {
      const buf = Buffer.from(rawBody.dataBase64, 'base64');
      const userId = (user as any)?.userId || user?.id || 'importer';
      return this.importService.processPackageImport(
        buf,
        rawBody.fileName || 'package.zip',
        userId,
      );
    }

    // Binary body fallback
    if (Buffer.isBuffer(rawBody)) {
      return this.importService.processPackageImport(
        rawBody,
        'package.zip',
        (user as any)?.userId || user?.id || 'importer',
      );
    }

    throw new BadRequestException('Yêu cầu phải là multipart/form-data, binary application/zip hoặc JSON { dataBase64 }');
  }
}
