export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

export const MEDIA_LIMITS = {
  AUDIO_MAX_SIZE: 100 * 1024 * 1024, // 100 MB
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5 MB
  PDF_MAX_SIZE: 100 * 1024 * 1024, // 100 MB
};

export const ALLOWED_MIME_TYPES = {
  AUDIO: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav'],
  IMAGE: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
  PDF: ['application/pdf'],
};

/**
 * Checks if the buffer starts with specific magic bytes at an offset.
 */
function matchBytes(buf: Buffer, expected: number[], offset = 0): boolean {
  if (buf.length < offset + expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (buf[offset + i] !== expected[i]) return false;
  }
  return true;
}

/**
 * Inspects buffer to detect MIME type from magic bytes.
 */
export function detectMimeType(buf: Buffer): string | null {
  if (buf.length < 4) return null;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (matchBytes(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }

  // 2. JPEG: FF D8 FF
  if (matchBytes(buf, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }

  // 3. WebP: RIFF .... WEBP
  if (matchBytes(buf, [0x52, 0x49, 0x46, 0x46], 0) && matchBytes(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }

  // 4. WAV: RIFF .... WAVE
  if (matchBytes(buf, [0x52, 0x49, 0x46, 0x46], 0) && matchBytes(buf, [0x57, 0x41, 0x56, 0x45], 8)) {
    return 'audio/wav';
  }

  // 5. PDF: %PDF- (25 50 44 46 2D)
  if (matchBytes(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return 'application/pdf';
  }

  // 6. MP3:
  // - ID3v2 header: 49 44 33
  if (matchBytes(buf, [0x49, 0x44, 0x33])) {
    return 'audio/mpeg';
  }
  // - Raw MP3 frame sync: FF followed by byte with top 3 bits set (E0..FF)
  const b0 = buf[0];
  const b1 = buf[1];
  if (b0 === 0xff && b1 !== undefined && (b1 & 0xe0) === 0xe0 && (b1 & 0x06) !== 0x00) {
    return 'audio/mpeg';
  }

  // 7. MP4 / M4A / AVIF via ftyp box (bytes 4..7 === 'ftyp')
  if (matchBytes(buf, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = buf.toString('ascii', 8, 12).toLowerCase();
    if (brand.startsWith('avif') || brand.startsWith('avis') || brand.startsWith('mif1')) {
      return 'image/avif';
    }
    if (brand.startsWith('m4a') || brand.startsWith('mp42') || brand.startsWith('isom') || brand.startsWith('dash')) {
      return 'audio/mp4';
    }
  }

  return null;
}

/**
 * Validates that the provided buffer matches the declared MIME type and filename extension.
 * Strictly prevents disguised files (e.g. .mp3 containing shell script/HTML/EXE).
 */
export function validateMediaMagicBytes(
  buf: Buffer,
  declaredMime?: string,
  filename = '',
): { valid: boolean; detectedMime: string; ext: string } {
  // Reject obvious dangerous prefixes before anything else
  if (
    matchBytes(buf, [0x4d, 0x5a]) || // PE / Windows executable (MZ)
    matchBytes(buf, [0x7f, 0x45, 0x4c, 0x46]) || // ELF binary
    buf.subarray(0, 50).toString('utf8').toLowerCase().includes('<script') ||
    buf.subarray(0, 50).toString('utf8').toLowerCase().includes('<?php') ||
    buf.subarray(0, 50).toString('utf8').toLowerCase().includes('<!doctype')
  ) {
    throw new MediaValidationError(
      `File giả mạo hoặc chứa mã thực thi bị từ chối: ${filename || 'unknown'}`,
    );
  }

  const detected = detectMimeType(buf);
  if (!detected) {
    throw new MediaValidationError(
      `Không nhận dạng được định dạng tệp hợp lệ (magic bytes không khớp): ${filename || 'unknown'}`,
    );
  }

  const extFromFilename = filename.split('.').pop()?.toLowerCase();

  // If MIME was declared, check compatibility
  if (declaredMime) {
    const normDeclared = declaredMime.toLowerCase().trim();
    const isCompatible =
      normDeclared === detected ||
      (detected === 'audio/mp4' && (normDeclared === 'audio/x-m4a' || normDeclared === 'audio/m4a')) ||
      (detected === 'audio/wav' && normDeclared === 'audio/x-wav');

    if (!isCompatible) {
      throw new MediaValidationError(
        `MIME khai báo (${declaredMime}) không khớp nội dung thực tế (${detected}) cho tệp ${filename}`,
      );
    }
  }

  // If filename extension was declared, verify extension aligns with detected MIME
  if (extFromFilename) {
    const extMimeMap: Record<string, string[]> = {
      png: ['image/png'],
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      webp: ['image/webp'],
      avif: ['image/avif'],
      mp3: ['audio/mpeg'],
      m4a: ['audio/mp4', 'audio/x-m4a'],
      wav: ['audio/wav', 'audio/x-wav'],
      pdf: ['application/pdf'],
    };

    const allowedMimesForExt = extMimeMap[extFromFilename];
    if (allowedMimesForExt && !allowedMimesForExt.includes(detected)) {
      throw new MediaValidationError(
        `Phần mở rộng .${extFromFilename} không khớp nội dung thực tế (${detected}) cho tệp ${filename}`,
      );
    }
  }

  // Size limit validation
  if (detected.startsWith('audio/')) {
    if (buf.length > MEDIA_LIMITS.AUDIO_MAX_SIZE) {
      throw new MediaValidationError(
        `Tệp audio vượt quá dung lượng tối đa 100MB (kích thước: ${buf.length} bytes)`,
      );
    }
  } else if (detected.startsWith('image/')) {
    if (buf.length > MEDIA_LIMITS.IMAGE_MAX_SIZE) {
      throw new MediaValidationError(
        `Tệp hình ảnh vượt quá dung lượng tối đa 5MB (kích thước: ${buf.length} bytes)`,
      );
    }
  } else if (detected === 'application/pdf') {
    if (buf.length > MEDIA_LIMITS.PDF_MAX_SIZE) {
      throw new MediaValidationError(
        `Tệp PDF vượt quá dung lượng tối đa 100MB (kích thước: ${buf.length} bytes)`,
      );
    }
  }

  let finalExt = extFromFilename;
  if (!finalExt) {
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/avif': 'avif',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'application/pdf': 'pdf',
    };
    finalExt = mimeToExt[detected] || 'bin';
  }

  return {
    valid: true,
    detectedMime: detected,
    ext: finalExt,
  };
}
