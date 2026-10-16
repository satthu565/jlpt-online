import { Injectable } from '@nestjs/common';
import type {
  GetObjectResult,
  HeadObjectResult,
  ObjectStorage,
  PutObjectOptions,
  PutObjectResult,
  RangeQuery,
} from './storage.interface.js';
import { LocalFsStorage } from './local-fs.storage.js';
import { R2Storage } from './r2.storage.js';

@Injectable()
export class StorageService implements ObjectStorage {
  private storage: ObjectStorage;
  private readonly driverType: 'local' | 'r2';

  constructor() {
    const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
    if (driver === 'r2') {
      this.driverType = 'r2';
      this.storage = new R2Storage();
    } else {
      this.driverType = 'local';
      this.storage = new LocalFsStorage();
    }
  }

  public getDriverType(): 'local' | 'r2' {
    return this.driverType;
  }

  public setStorageInstance(customStorage: ObjectStorage): void {
    this.storage = customStorage;
  }

  public getStorage(): ObjectStorage {
    return this.storage;
  }

  async put(key: string, data: Buffer | Uint8Array, options?: PutObjectOptions): Promise<PutObjectResult> {
    return this.storage.put(key, data, options);
  }

  async get(key: string, range?: RangeQuery): Promise<GetObjectResult | null> {
    return this.storage.get(key, range);
  }

  async head(key: string): Promise<HeadObjectResult> {
    return this.storage.head(key);
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  /**
   * Parses HTTP Range header e.g. "bytes=0-1023" or "bytes=500-" into RangeQuery
   */
  public parseRangeHeader(rangeHeader: string | undefined, totalSize: number): RangeQuery | null {
    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
      return null;
    }

    const matches = rangeHeader.replace('bytes=', '').trim().split('-');
    if (matches.length !== 2) {
      return null;
    }

    const rawStart = matches[0]?.trim() ?? '';
    const rawEnd = matches[1]?.trim() ?? '';

    if (rawStart === '' && rawEnd === '') {
      return null;
    }

    // Suffix range: bytes=-500 (last 500 bytes)
    if (rawStart === '' && rawEnd !== '') {
      const suffixLen = parseInt(rawEnd, 10);
      if (isNaN(suffixLen) || suffixLen <= 0) return null;
      const start = Math.max(0, totalSize - suffixLen);
      return { start, end: totalSize - 1 };
    }

    const start = parseInt(rawStart, 10);
    if (isNaN(start) || start < 0) return null;

    if (rawEnd === '') {
      return { start, end: totalSize - 1 };
    }

    const end = parseInt(rawEnd, 10);
    if (isNaN(end) || end < start) return null;

    return { start, end: Math.min(end, totalSize - 1) };
  }
}
