import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  GetObjectResult,
  HeadObjectResult,
  ObjectStorage,
  PutObjectOptions,
  PutObjectResult,
  RangeQuery,
} from './storage.interface.js';

export class StorageSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageSecurityError';
  }
}

export class LocalFsStorage implements ObjectStorage {
  private readonly rootDir: string;

  constructor(customRoot?: string) {
    const defaultRoot = process.env.STORAGE_LOCAL_ROOT || path.resolve(process.cwd(), '.data/storage');
    this.rootDir = path.resolve(customRoot || defaultRoot);
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }
  }

  public sanitizeKey(rawKey: string): string {
    if (
      !rawKey ||
      rawKey.includes('\0') ||
      rawKey.includes('\\') ||
      rawKey.startsWith('/') ||
      rawKey.includes('..')
    ) {
      throw new StorageSecurityError(`Tấn công đường dẫn lưu trữ bị từ chối: ${rawKey}`);
    }

    const segments = rawKey.split('/').filter(Boolean);
    for (const segment of segments) {
      if (segment === '.' || segment === '..' || segment.trim() === '') {
        throw new StorageSecurityError(`Đoạn đường dẫn không an toàn: ${rawKey}`);
      }
    }

    const resolved = path.resolve(this.rootDir, segments.join(path.sep));
    if (!resolved.startsWith(this.rootDir + path.sep) && resolved !== this.rootDir) {
      throw new StorageSecurityError(`Đường dẫn ngoài vùng lưu trữ: ${rawKey}`);
    }

    return resolved;
  }

  async put(key: string, data: Buffer | Uint8Array, options?: PutObjectOptions): Promise<PutObjectResult> {
    const fullPath = this.sanitizeKey(key);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    fs.writeFileSync(fullPath, buffer);

    if (options?.mimeType) {
      const metaPath = `${fullPath}.meta.json`;
      fs.writeFileSync(
        metaPath,
        JSON.stringify({
          mimeType: options.mimeType,
          sha256,
          size: buffer.length,
          metadata: options.metadata || {},
        }),
      );
    }

    return {
      key,
      size: buffer.length,
      sha256,
    };
  }

  async get(key: string, range?: RangeQuery): Promise<GetObjectResult | null> {
    const fullPath = this.sanitizeKey(key);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const stat = fs.statSync(fullPath);
    const totalSize = stat.size;

    let mimeType: string | undefined;
    const metaPath = `${fullPath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        mimeType = meta.mimeType;
      } catch {
        // Ignore corrupted meta
      }
    }

    if (range && (range.start !== undefined || range.end !== undefined)) {
      let start = range.start ?? 0;
      let end = range.end ?? totalSize - 1;

      if (start < 0) start = 0;
      if (end >= totalSize) end = totalSize - 1;
      if (start > end || start >= totalSize) {
        return {
          data: Buffer.alloc(0),
          mimeType,
          size: 0,
          range: { start: 0, end: 0, total: totalSize },
        };
      }

      const length = end - start + 1;
      const buffer = Buffer.alloc(length);
      const fd = fs.openSync(fullPath, 'r');
      try {
        fs.readSync(fd, buffer, 0, length, start);
      } finally {
        fs.closeSync(fd);
      }

      return {
        data: buffer,
        mimeType,
        size: length,
        range: {
          start,
          end,
          total: totalSize,
        },
      };
    }

    const data = fs.readFileSync(fullPath);
    return {
      data,
      mimeType,
      size: totalSize,
    };
  }

  async head(key: string): Promise<HeadObjectResult> {
    const fullPath = this.sanitizeKey(key);
    if (!fs.existsSync(fullPath)) {
      return { exists: false };
    }

    const stat = fs.statSync(fullPath);
    let mimeType: string | undefined;
    let sha256: string | undefined;

    const metaPath = `${fullPath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        mimeType = meta.mimeType;
        sha256 = meta.sha256;
      } catch {
        // Ignore
      }
    }

    if (!sha256) {
      const buffer = fs.readFileSync(fullPath);
      sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    }

    return {
      exists: true,
      size: stat.size,
      mimeType,
      sha256,
      lastModified: stat.mtime,
    };
  }

  async delete(key: string): Promise<boolean> {
    const fullPath = this.sanitizeKey(key);
    if (!fs.existsSync(fullPath)) {
      return false;
    }

    fs.unlinkSync(fullPath);
    const metaPath = `${fullPath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }
    return true;
  }
}
