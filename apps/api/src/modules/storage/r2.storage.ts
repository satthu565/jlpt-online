import crypto from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { isSafeUploadPath } from '../../common/utils/paths.js';
import type {
  GetObjectResult,
  HeadObjectResult,
  ObjectStorage,
  PutObjectOptions,
  PutObjectResult,
  RangeQuery,
} from './storage.interface.js';
import { StorageSecurityError } from './local-fs.storage.js';

export interface R2StorageOptions {
  bucketName?: string;
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  s3Client?: S3Client;
}

export class R2Storage implements ObjectStorage {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(options: R2StorageOptions = {}) {
    this.bucket = options.bucketName || process.env.R2_BUCKET_NAME || process.env.STORAGE_BUCKET || 'jlpt-media';

    if (options.s3Client) {
      this.client = options.s3Client;
    } else {
      const accountId = options.accountId || process.env.R2_ACCOUNT_ID || 'dummy-account-id';
      const endpoint =
        options.endpoint ||
        process.env.R2_ENDPOINT ||
        `https://${accountId}.r2.cloudflarestorage.com`;
      const accessKeyId = options.accessKeyId || process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || 'dummy-key';
      const secretAccessKey =
        options.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'dummy-secret';

      this.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  public sanitizeKey(rawKey: string): string {
    if (!isSafeUploadPath(rawKey)) {
      throw new StorageSecurityError(`Tấn công đường dẫn lưu trữ R2 bị từ chối: ${rawKey}`);
    }
    const segments = rawKey.split('/').filter(Boolean);
    return segments.join('/');
  }

  async put(key: string, data: Buffer | Uint8Array, options?: PutObjectOptions): Promise<PutObjectResult> {
    const safeKey = this.sanitizeKey(key);
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const metadata: Record<string, string> = {
      ...(options?.metadata || {}),
      'sha256-checksum': sha256,
    };

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: safeKey,
      Body: buffer,
      ContentType: options?.mimeType || 'application/octet-stream',
      Metadata: metadata,
    });

    await this.client.send(cmd);

    return {
      key: safeKey,
      size: buffer.length,
      sha256,
    };
  }

  async get(key: string, range?: RangeQuery): Promise<GetObjectResult | null> {
    const safeKey = this.sanitizeKey(key);

    let rangeHeader: string | undefined;
    if (range && (range.start !== undefined || range.end !== undefined)) {
      const start = range.start ?? 0;
      const end = range.end !== undefined ? range.end : '';
      rangeHeader = `bytes=${start}-${end}`;
    }

    try {
      const cmd = new GetObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
        Range: rangeHeader,
      });

      const response = await this.client.send(cmd);
      if (!response.Body) {
        return null;
      }

      // Read response.Body stream into buffer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = response.Body as any;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const data = Buffer.concat(chunks);

      let parsedRange: GetObjectResult['range'];
      if (response.ContentRange) {
        // Format: bytes 0-10/100
        const match = response.ContentRange.match(/bytes\s+(\d+)-(\d+)\/(\d+|\*)/);
        if (match && match[1] && match[2] && match[3]) {
          parsedRange = {
            start: parseInt(match[1], 10),
            end: parseInt(match[2], 10),
            total: match[3] === '*' ? data.length : parseInt(match[3], 10),
          };
        }
      } else if (range && range.start !== undefined) {
        parsedRange = {
          start: range.start,
          end: range.end ?? range.start + data.length - 1,
          total: response.ContentLength ? response.ContentLength : data.length,
        };
      }

      return {
        data,
        mimeType: response.ContentType,
        size: data.length,
        range: parsedRange,
      };
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.name || (err as any)?.Code || (err as any)?.$metadata?.httpStatusCode;
      if (code === 'NoSuchKey' || code === 'NotFound' || code === 404) {
        return null;
      }
      throw err;
    }
  }

  async head(key: string): Promise<HeadObjectResult> {
    const safeKey = this.sanitizeKey(key);
    try {
      const cmd = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      });
      const res = await this.client.send(cmd);
      return {
        exists: true,
        size: res.ContentLength,
        mimeType: res.ContentType,
        sha256: res.Metadata?.['sha256-checksum'],
        lastModified: res.LastModified,
      };
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.name || (err as any)?.Code || (err as any)?.$metadata?.httpStatusCode;
      if (code === 'NoSuchKey' || code === 'NotFound' || code === 404) {
        return { exists: false };
      }
      throw err;
    }
  }

  async delete(key: string): Promise<boolean> {
    const safeKey = this.sanitizeKey(key);
    try {
      const cmd = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      });
      await this.client.send(cmd);
      return true;
    } catch {
      return false;
    }
  }
}
