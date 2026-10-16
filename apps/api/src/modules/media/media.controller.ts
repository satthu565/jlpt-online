import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { validateMediaAccess } from '@jlpt/media-token';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { isSafeUploadPath } from '../../common/utils/paths.js';
import { StorageService } from '../storage/storage.service.js';
import { MediaService } from './media.service.js';

export interface MediaUploadBody {
  filename: string;
  mimeType?: string;
  dataBase64?: string;
}

@Controller()
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly storageService: StorageService,
  ) {}

  @Public()
  @Get('media/:id')
  async getMedia(
    @Param('id') id: string,
    @Headers('range') rangeHeader: string | undefined,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    if (!isSafeUploadPath(id)) {
      throw new BadRequestException(`Đường dẫn media không an toàn: ${id}`);
    }

    // Expired URL / token check
    const query = req.query as Record<string, string | undefined> | undefined;
    const token = query?.t || query?.token;
    const expParam = query?.exp || query?.expires;

    if (expParam) {
      const expSec = Number(expParam);
      if (!isNaN(expSec) && expSec < Math.floor(Date.now() / 1000)) {
        throw new ForbiddenException({
          code: 'EXPIRED_URL',
          message: 'URL truy cập media đã hết hạn (expired URL).',
        });
      }
    }

    if (token) {
      const secret =
        process.env.MEDIA_TOKEN_SECRET ||
        'staging_media_token_secret_for_reproducible_smoke_tests';
      const validation = await validateMediaAccess(token, secret, req.url);
      if (!validation.valid) {
        throw new ForbiddenException({
          code: 'EXPIRED_URL',
          message: `Token truy cập media không hợp lệ hoặc đã hết hạn: ${validation.reason}`,
        });
      }
    }

    const metadata = await this.mediaService.getMediaMetadata(id);
    const totalSize = metadata.size;

    const parsedRange = this.storageService.parseRangeHeader(rangeHeader, totalSize);
    if (parsedRange) {
      const rangedAsset = await this.mediaService.getMedia(id, parsedRange);
      const start = rangedAsset.range?.start ?? parsedRange.start ?? 0;
      const end = rangedAsset.range?.end ?? parsedRange.end ?? totalSize - 1;

      reply
        .status(206)
        .header('Content-Type', metadata.mime)
        .header('Content-Range', `bytes ${start}-${end}/${totalSize}`)
        .header('Content-Length', rangedAsset.content.length)
        .header('Accept-Ranges', 'bytes')
        .send(rangedAsset.content);
      return;
    }

    const asset = await this.mediaService.getMedia(id);
    reply
      .status(200)
      .header('Content-Type', metadata.mime)
      .header('Content-Length', totalSize)
      .header('Accept-Ranges', 'bytes')
      .send(asset.content);
  }

  @Public()
  @Get('media/by-sha/:sha256')
  async getMediaBySha256(@Param('sha256') sha256: string, @Req() req: FastifyRequest) {
    if (!isSafeUploadPath(sha256)) {
      throw new BadRequestException(`Mã SHA-256 không hợp lệ: ${sha256}`);
    }

    const query = req.query as Record<string, string | undefined> | undefined;
    const token = query?.t || query?.token;
    const expParam = query?.exp || query?.expires;

    if (expParam) {
      const expSec = Number(expParam);
      if (!isNaN(expSec) && expSec < Math.floor(Date.now() / 1000)) {
        throw new ForbiddenException({
          code: 'EXPIRED_URL',
          message: 'URL truy cập media đã hết hạn (expired URL).',
        });
      }
    }

    if (token) {
      const secret =
        process.env.MEDIA_TOKEN_SECRET ||
        'staging_media_token_secret_for_reproducible_smoke_tests';
      const validation = await validateMediaAccess(token, secret, req.url);
      if (!validation.valid) {
        throw new ForbiddenException({
          code: 'EXPIRED_URL',
          message: `Token truy cập media không hợp lệ hoặc đã hết hạn: ${validation.reason}`,
        });
      }
    }

    const asset = await this.mediaService.getMediaBySha256(sha256);
    if (!asset) {
      throw new BadRequestException(`Không tìm thấy media với mã băm: ${sha256}`);
    }
    return asset;
  }

  @Roles('admin', 'editor', 'reviewer')
  @Post('admin/media')
  async uploadMedia(@Body() body: MediaUploadBody) {
    if (!body || !body.dataBase64) {
      throw new BadRequestException('Yêu cầu dữ liệu file tải lên (dataBase64)');
    }

    if (body.filename && !isSafeUploadPath(body.filename)) {
      throw new BadRequestException(
        `Đường dẫn tệp tải lên không an toàn (unsafe upload path): ${body.filename}`,
      );
    }

    const fileBuffer = Buffer.from(body.dataBase64, 'base64');
    const asset = await this.mediaService.uploadMedia(fileBuffer, body.filename, body.mimeType);

    return {
      success: true,
      asset,
    };
  }
}

