import zlib from 'node:zlib';

export const MAX_FILES = 2000;
export const MAX_FILE = 120 * 1024 * 1024; // 120 MiB
export const MAX_TOTAL = 500 * 1024 * 1024; // 500 MiB
export const MAX_RATIO = 200;

export class InvalidPackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPackageError';
  }
}

export function sanitizePathSegment(rawName: string): string {
  const normalized = rawName.replace(/\/+$/, '');
  if (
    !normalized ||
    normalized.includes('\\') ||
    normalized.includes(':') ||
    normalized.includes('\0') ||
    normalized.startsWith('/')
  ) {
    throw new InvalidPackageError(`Đường dẫn không an toàn: ${rawName}`);
  }
  const parts = normalized.split('/');
  for (const part of parts) {
    if (part === '' || part === '.' || part === '..') {
      throw new InvalidPackageError(`Đường dẫn không an toàn: ${rawName}`);
    }
  }
  return parts.join('/');
}

/**
 * Safely extracts files from a ZIP archive buffer in memory.
 */
export function readZipBuffer(buf: Buffer): Record<string, Uint8Array> {
  if (buf.length < 22) {
    throw new InvalidPackageError('Đầu vào không phải file ZIP hợp lệ');
  }

  // Find End of Central Directory (EOCD, signature 0x06054b50)
  let eocdOffset = -1;
  const maxSearch = Math.min(buf.length - 22, 65535 + 22);
  for (let i = buf.length - 22; i >= buf.length - 22 - maxSearch && i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new InvalidPackageError('Không tìm thấy End of Central Directory trong ZIP');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  if (totalEntries > MAX_FILES) {
    throw new InvalidPackageError('Quá nhiều ZIP entries');
  }

  if (cdOffset + cdSize > eocdOffset || cdOffset > buf.length) {
    throw new InvalidPackageError('Central Directory ZIP không hợp lệ');
  }

  const files: Record<string, Uint8Array> = {};
  const seenNames = new Set<string>();
  let totalExpandedBytes = 0;
  let cur = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (cur + 46 > buf.length) {
      throw new InvalidPackageError('Dữ liệu Central Directory bị cắt cụt');
    }
    if (buf.readUInt32LE(cur) !== 0x02014b50) {
      throw new InvalidPackageError('Chữ ký Central Directory entry không khớp');
    }

    const flagBits = buf.readUInt16LE(cur + 8);
    const method = buf.readUInt16LE(cur + 10);
    const compSize = buf.readUInt32LE(cur + 20);
    const uncompSize = buf.readUInt32LE(cur + 24);
    const nameLen = buf.readUInt16LE(cur + 28);
    const extraLen = buf.readUInt16LE(cur + 30);
    const commentLen = buf.readUInt16LE(cur + 32);
    const externalAttr = buf.readUInt32LE(cur + 38);
    const localOffset = buf.readUInt32LE(cur + 42);

    if (cur + 46 + nameLen > buf.length) {
      throw new InvalidPackageError('Tên file trong Central Directory vượt kích thước buffer');
    }

    const rawName = buf.toString('utf8', cur + 46, cur + 46 + nameLen);
    cur += 46 + nameLen + extraLen + commentLen;

    // Check encrypted zip
    if ((flagBits & 1) !== 0) {
      throw new InvalidPackageError('Không nhận ZIP mã hóa');
    }

    // Check symlink (Unix attribute 0o120000 in top 16 bits)
    if (((externalAttr >>> 16) & 0o170000) === 0o120000) {
      throw new InvalidPackageError('Không nhận symlink trong ZIP');
    }

    if (rawName.endsWith('/')) {
      continue;
    }

    const safeName = sanitizePathSegment(rawName);
    const lowerKey = safeName.toLowerCase();
    if (seenNames.has(lowerKey)) {
      throw new InvalidPackageError(`Tên file trùng hoặc chỉ khác hoa thường: ${safeName}`);
    }
    seenNames.add(lowerKey);

    if (uncompSize > MAX_FILE) {
      throw new InvalidPackageError(`File quá lớn: ${safeName}`);
    }

    totalExpandedBytes += uncompSize;
    if (totalExpandedBytes > MAX_TOTAL) {
      throw new InvalidPackageError('ZIP vượt giới hạn giải nén');
    }

    const ratio = uncompSize / Math.max(1, compSize);
    if (ratio > MAX_RATIO) {
      throw new InvalidPackageError(`Tỷ lệ nén vượt giới hạn: ${safeName}`);
    }

    // Read local header
    if (localOffset + 30 > buf.length) {
      throw new InvalidPackageError(`Local header không hợp lệ cho: ${safeName}`);
    }
    if (buf.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new InvalidPackageError(`Chữ ký Local header không khớp cho: ${safeName}`);
    }

    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLen + localExtraLen;

    if (dataOffset + compSize > buf.length) {
      throw new InvalidPackageError(`Dữ liệu file bị cắt cụt cho: ${safeName}`);
    }

    const compData = buf.subarray(dataOffset, dataOffset + compSize);
    let decompressed: Uint8Array;

    if (method === 0) {
      decompressed = new Uint8Array(compData);
    } else if (method === 8) {
      try {
        const decompBuffer = zlib.inflateRawSync(compData);
        if (decompBuffer.length !== uncompSize) {
          throw new InvalidPackageError(`Kích thước giải nén không khớp: ${safeName}`);
        }
        decompressed = new Uint8Array(decompBuffer);
      } catch (err) {
        throw new InvalidPackageError(`Lỗi giải nén DEFLATE cho ${safeName}: ${String(err)}`);
      }
    } else {
      throw new InvalidPackageError(`Phương pháp nén không hỗ trợ (${method}) cho: ${safeName}`);
    }

    files[safeName] = decompressed;
  }

  return files;
}
