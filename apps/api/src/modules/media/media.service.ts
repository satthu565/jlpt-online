import crypto from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { signMediaToken, validateMediaAccess } from '@jlpt/media-token';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import { mediaAssets } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { isSafeUploadPath } from '../../common/utils/paths.js';
import { StorageService } from '../storage/storage.service.js';
import { MediaValidationError, validateMediaMagicBytes } from './magic-bytes.js';
import { extractAudioDurationSec, extractImageDimensions } from './media-metadata.js';
import { extractSafeZip } from './zip-security.js';

export interface MediaAssetRecord {
  id: string;
  sha256: string;
  key: string;
  mime: string;
  size: number;
  durationSec: number | null;
  rights: string | null;
  createdAt: Date;
  dimensions?: { width: number; height: number } | null;
}

@Injectable()
export class MediaService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Validates and stores a media asset.
   * Performs magic bytes verification, disguised file prevention, size limit checks,
   * SHA-256 calculation, and database deduplication.
   */
  async uploadMedia(
    fileBuffer: Buffer,
    filename = 'unnamed-file',
    declaredMime?: string,
  ): Promise<MediaAssetRecord> {
    // 0. Path traversal validation
    if (filename && !isSafeUploadPath(filename)) {
      throw new MediaValidationError(
        `Đường dẫn tệp tải lên không an toàn (unsafe upload path): ${filename}`,
      );
    }

    // 1. Magic bytes & security checks
    const { detectedMime, ext } = validateMediaMagicBytes(fileBuffer, declaredMime, filename);

    // 2. SHA-256 calculation
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 3. Deduplication check in DB
    const existing = await this.dbClient.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.sha256, sha256))
      .limit(1);

    if (existing.length > 0) {
      const asset = existing[0];
      const dimensions = detectedMime.startsWith('image/')
        ? extractImageDimensions(fileBuffer, detectedMime)
        : null;

      return {
        ...asset,
        dimensions,
      };
    }

    // 4. Extract metadata (duration / dimensions)
    const durationSec = detectedMime.startsWith('audio/')
      ? extractAudioDurationSec(fileBuffer, detectedMime)
      : null;
    const dimensions = detectedMime.startsWith('image/')
      ? extractImageDimensions(fileBuffer, detectedMime)
      : null;

    // 5. Store file in object storage
    const storageKey = detectedMime === 'application/pdf' ? `sources/${sha256}.pdf` : `media/${sha256}.${ext}`;

    await this.storageService.put(storageKey, fileBuffer, {
      mimeType: detectedMime,
      metadata: {
        originalFilename: filename,
        sha256,
      },
    });

    // 6. Insert new record in media_assets
    const id = generateUuidV7();
    const [inserted] = await this.dbClient.db
      .insert(mediaAssets)
      .values({
        id,
        sha256,
        key: storageKey,
        mime: detectedMime,
        size: fileBuffer.length,
        durationSec,
        rights: null,
      })
      .returning();

    return {
      ...inserted,
      dimensions,
    };
  }

  /**
   * Retrieves media asset metadata and content.
   */
  async getMedia(
    id: string,
    range?: { start?: number; end?: number },
  ): Promise<{
    metadata: MediaAssetRecord;
    content: Buffer;
    mime: string;
    range?: { start: number; end: number; total: number };
  }> {
    const records = await this.dbClient.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);

    const metadata = records[0];
    if (!metadata) {
      throw new NotFoundException(`Media asset không tìm thấy: ${id}`);
    }

    const storageRes = await this.storageService.get(metadata.key, range);
    if (!storageRes) {
      throw new NotFoundException(`Nội dung media không tồn tại trong lưu trữ: ${metadata.key}`);
    }

    return {
      metadata,
      content: storageRes.data,
      mime: metadata.mime,
      range: storageRes.range,
    };
  }

  /**
   * Retrieves media asset metadata only from database without fetching storage content.
   */
  async getMediaMetadata(id: string): Promise<MediaAssetRecord> {
    const records = await this.dbClient.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);

    const metadata = records[0];
    if (!metadata) {
      throw new NotFoundException(`Media asset không tìm thấy: ${id}`);
    }

    return metadata;
  }

  /**
   * Finds media asset by SHA-256.
   */
  async getMediaBySha256(sha256: string): Promise<MediaAssetRecord | null> {
    const records = await this.dbClient.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.sha256, sha256))
      .limit(1);

    return records.length > 0 ? records[0] : null;
  }

  /**
   * Securely validates and extracts a ZIP archive, verifying Zip-Slip,
   * Zip-Bomb, and contained media magic bytes.
   */
  validateAndExtractZip(zipBuffer: Buffer): Record<string, Buffer> {
    const files = extractSafeZip(zipBuffer);

    // Validate any media files inside media/ directory
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.startsWith('media/') && !filePath.endsWith('/')) {
        validateMediaMagicBytes(content, undefined, filePath);
      }
    }

    return files;
  }

  /**
   * Generates a signed URL for a media asset with an expiration TTL.
   */
  async generateSignedMediaUrl(id: string, expiresInSec = 3600): Promise<string> {
    const secret =
      process.env.MEDIA_TOKEN_SECRET ||
      'staging_media_token_secret_for_reproducible_smoke_tests';
    const metadata = await this.getMediaMetadata(id);
    const exp = Math.floor(Date.now() / 1000) + expiresInSec;
    const token = await signMediaToken({ mediaKey: metadata.key, exp }, secret);
    return `/media/${id}?t=${token}`;
  }

  /**
   * Validates a media URL with signed token against expiration and tampering.
   */
  async verifySignedMediaUrl(
    urlStr: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const url = new URL(urlStr, 'http://localhost');
      const token = url.searchParams.get('t') || url.searchParams.get('token');
      const expParam = url.searchParams.get('exp') || url.searchParams.get('expires');

      if (expParam) {
        const exp = Number(expParam);
        if (!isNaN(exp) && exp < Math.floor(Date.now() / 1000)) {
          return { valid: false, reason: 'EXPIRED' };
        }
      }

      if (!token) {
        return { valid: true };
      }

      const secret =
        process.env.MEDIA_TOKEN_SECRET ||
        'staging_media_token_secret_for_reproducible_smoke_tests';
      const validation = await validateMediaAccess(token, secret, url.pathname);
      return validation;
    } catch {
      return { valid: false, reason: 'INVALID_URL' };
    }
  }
}

