export interface RangeQuery {
  start?: number;
  end?: number;
}

export interface RangeResult {
  start: number;
  end: number;
  total: number;
}

export interface PutObjectOptions {
  mimeType?: string;
  metadata?: Record<string, string>;
}

export interface PutObjectResult {
  key: string;
  size: number;
  sha256: string;
}

export interface GetObjectResult {
  data: Buffer;
  mimeType?: string;
  size: number;
  range?: RangeResult;
}

export interface HeadObjectResult {
  exists: boolean;
  size?: number;
  mimeType?: string;
  sha256?: string;
  lastModified?: Date;
}

export interface ObjectStorage {
  put(key: string, data: Buffer | Uint8Array, options?: PutObjectOptions): Promise<PutObjectResult>;
  get(key: string, range?: RangeQuery): Promise<GetObjectResult | null>;
  head(key: string): Promise<HeadObjectResult>;
  delete(key: string): Promise<boolean>;
}
