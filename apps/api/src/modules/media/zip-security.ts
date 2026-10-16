import zlib from 'node:zlib';

export class ZipSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipSecurityError';
  }
}

export const ZIP_LIMITS = {
  MAX_ENTRIES: 2000,
  MAX_SINGLE_FILE: 120 * 1024 * 1024, // 120 MiB
  MAX_TOTAL_EXPANDED: 500 * 1024 * 1024, // 500 MiB
  MAX_COMPRESSION_RATIO: 200, // 200:1
};

/**
 * Validates path against Zip-Slip traversal attacks.
 */
export function sanitizeZipEntryPath(rawName: string): string {
  const normalized = rawName.replace(/\/+$/, '');
  if (
    !normalized ||
    normalized.includes('\\') ||
    normalized.includes(':') ||
    normalized.includes('\0') ||
    normalized.startsWith('/')
  ) {
    throw new ZipSecurityError(`Phát hiện tấn công Zip-Slip (đường dẫn nguy hiểm): ${rawName}`);
  }

  const parts = normalized.split('/');
  for (const part of parts) {
    if (part === '' || part === '.' || part === '..') {
      throw new ZipSecurityError(`Phát hiện tấn công Zip-Slip (chứa ký tự traversal): ${rawName}`);
    }
  }

  return parts.join('/');
}

/**
 * Reads and securely extracts files from a ZIP archive buffer in memory.
 * Strictly verifies against:
 * - Zip-Slip (directory traversal)
 * - Zip-Bomb (extreme compression ratio, max file size, total uncompressed size, max entry count)
 * - Encrypted archives
 * - Symbolic links
 */
export function extractSafeZip(buf: Buffer): Record<string, Buffer> {
  if (buf.length < 22) {
    throw new ZipSecurityError('Đầu vào không phải file ZIP hợp lệ (kích thước quá nhỏ)');
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
    throw new ZipSecurityError('Không tìm thấy End of Central Directory trong tệp ZIP');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  if (totalEntries > ZIP_LIMITS.MAX_ENTRIES) {
    throw new ZipSecurityError(
      `Phát hiện Zip-Bomb: số lượng file (${totalEntries}) vượt quá giới hạn cho phép (${ZIP_LIMITS.MAX_ENTRIES})`,
    );
  }

  if (cdOffset + cdSize > eocdOffset || cdOffset > buf.length) {
    throw new ZipSecurityError('Central Directory của tệp ZIP bị hư hỏng hoặc không hợp lệ');
  }

  const files: Record<string, Buffer> = {};
  const seenNames = new Set<string>();
  let totalExpandedBytes = 0;
  let cur = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (cur + 46 > buf.length) {
      throw new ZipSecurityError('Dữ liệu Central Directory trong ZIP bị cắt cụt');
    }
    if (buf.readUInt32LE(cur) !== 0x02014b50) {
      throw new ZipSecurityError('Chữ ký Central Directory entry không khớp');
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
      throw new ZipSecurityError('Tên tệp trong Central Directory vượt kích thước buffer');
    }

    const rawName = buf.toString('utf8', cur + 46, cur + 46 + nameLen);
    cur += 46 + nameLen + extraLen + commentLen;

    // Reject encrypted zip entries
    if ((flagBits & 1) !== 0) {
      throw new ZipSecurityError(`Không chấp nhận file ZIP có mã hóa: ${rawName}`);
    }

    // Reject symlinks (Unix mode 0o120000 in top 16 bits of externalAttr)
    if (((externalAttr >>> 16) & 0o170000) === 0o120000) {
      throw new ZipSecurityError(`Không chấp nhận symbolic link trong ZIP: ${rawName}`);
    }

    // Directory entry
    if (rawName.endsWith('/')) {
      continue;
    }

    // Zip-Slip inspection
    const safeName = sanitizeZipEntryPath(rawName);
    const lowerKey = safeName.toLowerCase();
    if (seenNames.has(lowerKey)) {
      throw new ZipSecurityError(`Phát hiện tệp trùng tên trong ZIP: ${safeName}`);
    }
    seenNames.add(lowerKey);

    // Zip-Bomb single file limit
    if (uncompSize > ZIP_LIMITS.MAX_SINGLE_FILE) {
      throw new ZipSecurityError(
        `Phát hiện Zip-Bomb: Tệp ${safeName} có kích thước giải nén (${uncompSize} bytes) vượt quá 120MB`,
      );
    }

    totalExpandedBytes += uncompSize;
    if (totalExpandedBytes > ZIP_LIMITS.MAX_TOTAL_EXPANDED) {
      throw new ZipSecurityError(
        `Phát hiện Zip-Bomb: Tổng dung lượng giải nén (${totalExpandedBytes} bytes) vượt quá 500MB`,
      );
    }

    // Zip-Bomb compression ratio check
    const ratio = uncompSize / Math.max(1, compSize);
    if (ratio > ZIP_LIMITS.MAX_COMPRESSION_RATIO) {
      throw new ZipSecurityError(
        `Phát hiện Zip-Bomb: Tỷ lệ nén của ${safeName} (${ratio.toFixed(1)}:1) vượt ngưỡng an toàn 200:1`,
      );
    }

    // Read local header
    if (localOffset + 30 > buf.length) {
      throw new ZipSecurityError(`Local header không hợp lệ cho tệp: ${safeName}`);
    }
    if (buf.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new ZipSecurityError(`Chữ ký Local header không khớp cho tệp: ${safeName}`);
    }

    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLen + localExtraLen;

    if (dataOffset + compSize > buf.length) {
      throw new ZipSecurityError(`Dữ liệu tệp bị cắt cụt cho: ${safeName}`);
    }

    const compData = buf.subarray(dataOffset, dataOffset + compSize);
    let decompressed: Buffer;

    if (method === 0) {
      // Stored (no compression)
      decompressed = Buffer.from(compData);
    } else if (method === 8) {
      // DEFLATE
      try {
        decompressed = zlib.inflateRawSync(compData, {
          maxOutputLength: ZIP_LIMITS.MAX_SINGLE_FILE,
        });
        if (decompressed.length !== uncompSize) {
          throw new ZipSecurityError(
            `Kích thước giải nén không khớp với khai báo cho tệp: ${safeName}`,
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new ZipSecurityError(`Lỗi giải nén DEFLATE cho tệp ${safeName}: ${msg}`);
      }
    } else {
      throw new ZipSecurityError(
        `Phương pháp nén không được hỗ trợ (${method}) cho tệp: ${safeName}`,
      );
    }

    files[safeName] = decompressed;
  }

  return files;
}
