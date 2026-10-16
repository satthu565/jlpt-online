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

@Controller('api/v1/admin/imports')
@UseGuards(AuthGuard, RolesGuard)
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

    // Binary body fallback
    const rawBody = req.body;
    if (Buffer.isBuffer(rawBody)) {
      return this.importService.processPackageImport(
        rawBody,
        'package.zip',
        user.id,
      );
    }

    throw new BadRequestException('Yêu cầu phải là multipart/form-data hoặc binary application/zip');
  }
}
