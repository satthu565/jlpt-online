import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
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
    @Res() reply: FastifyReply,
  ) {
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
  async getMediaBySha256(@Param('sha256') sha256: string) {
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

    const fileBuffer = Buffer.from(body.dataBase64, 'base64');
    const asset = await this.mediaService.uploadMedia(fileBuffer, body.filename, body.mimeType);

    return {
      success: true,
      asset,
    };
  }
}
