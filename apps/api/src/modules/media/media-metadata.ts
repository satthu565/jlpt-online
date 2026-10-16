/**
 * Extracts audio duration in seconds from binary headers.
 */
export function extractAudioDurationSec(buf: Buffer, mime: string): number | null {
  try {
    // 1. WAV
    if (mime === 'audio/wav' || (buf.length > 36 && buf.toString('ascii', 0, 4) === 'RIFF')) {
      // Find 'fmt ' chunk
      let offset = 12;
      let byteRate = 0;
      let dataSize = 0;

      while (offset + 8 < buf.length) {
        const chunkId = buf.toString('ascii', offset, offset + 4);
        const chunkSize = buf.readUInt32LE(offset + 4);
        if (chunkId === 'fmt ' && chunkSize >= 16) {
          byteRate = buf.readUInt32LE(offset + 16);
        } else if (chunkId === 'data') {
          dataSize = chunkSize;
          break;
        }
        offset += 8 + chunkSize;
      }

      if (byteRate > 0 && dataSize > 0) {
        return Math.max(1, Math.round(dataSize / byteRate));
      }
    }

    // 2. MP3
    if (mime === 'audio/mpeg') {
      // Check ID3v2 TLEN tag
      if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'ID3') {
        const b6 = buf[6] ?? 0;
        const b7 = buf[7] ?? 0;
        const b8 = buf[8] ?? 0;
        const b9 = buf[9] ?? 0;
        const id3Size =
          ((b6 & 0x7f) << 21) |
          ((b7 & 0x7f) << 14) |
          ((b8 & 0x7f) << 7) |
          (b9 & 0x7f);

        let offset = 10;
        const maxOffset = Math.min(buf.length, 10 + id3Size);
        while (offset + 10 < maxOffset) {
          const frameId = buf.toString('ascii', offset, offset + 4);
          const frameSize = buf.readUInt32BE(offset + 4);
          if (frameId === 'TLEN' && frameSize > 1) {
            const rawVal = buf.toString('utf8', offset + 11, offset + 10 + frameSize);
            const ms = parseInt(rawVal, 10);
            if (!isNaN(ms) && ms > 0) {
              return Math.max(1, Math.round(ms / 1000));
            }
          }
          if (frameSize <= 0) break;
          offset += 10 + frameSize;
        }
      }

      // Fallback: estimate from file size assuming standard 128 kbps (16000 bytes/sec)
      const estimatedSec = Math.round(buf.length / 16000);
      return Math.max(1, estimatedSec);
    }

    // 3. M4A / MP4
    if (mime === 'audio/mp4' || mime === 'audio/x-m4a') {
      // Find 'mvhd' atom
      let offset = 0;
      while (offset + 8 < buf.length) {
        const atomSize = buf.readUInt32BE(offset);
        const atomType = buf.toString('ascii', offset + 4, offset + 8);
        if (atomSize <= 0) break;

        if (atomType === 'moov') {
          // Inside moov
          let subOffset = offset + 8;
          const moovEnd = offset + atomSize;
          while (subOffset + 8 < moovEnd && subOffset + 8 < buf.length) {
            const subSize = buf.readUInt32BE(subOffset);
            const subType = buf.toString('ascii', subOffset + 4, subOffset + 8);
            if (subSize <= 0) break;

            if (subType === 'mvhd' && subOffset + 28 < buf.length) {
              const version = buf[subOffset + 8] ?? 0;
              if (version === 0) {
                const timescale = buf.readUInt32BE(subOffset + 20);
                const duration = buf.readUInt32BE(subOffset + 24);
                if (timescale > 0) {
                  return Math.max(1, Math.round(duration / timescale));
                }
              }
            }
            subOffset += subSize;
          }
          break;
        }
        offset += atomSize;
      }
    }
  } catch {
    // If parsing fails, return null
  }

  return null;
}

/**
 * Extracts image width and height in pixels from binary headers.
 */
export function extractImageDimensions(
  buf: Buffer,
  mime: string,
): { width: number; height: number } | null {
  try {
    // 1. PNG: width at 16..19, height at 20..23
    if (mime === 'image/png' && buf.length >= 24) {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    // 2. JPEG
    if (mime === 'image/jpeg' && buf.length > 4) {
      let offset = 2;
      while (offset + 4 < buf.length) {
        if ((buf[offset] ?? 0) !== 0xff) {
          offset++;
          continue;
        }
        const marker = buf[offset + 1] ?? 0;
        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = buf.readUInt16BE(offset + 5);
          const width = buf.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) {
            return { width, height };
          }
        }
        const len = buf.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
    }

    // 3. WebP
    if (mime === 'image/webp' && buf.length > 30) {
      const format = buf.toString('ascii', 12, 16);
      if (format === 'VP8 ' && buf.length >= 30) {
        // Simple lossy
        const width = buf.readUInt16LE(26) & 0x3fff;
        const height = buf.readUInt16LE(28) & 0x3fff;
        if (width > 0 && height > 0) return { width, height };
      } else if (format === 'VP8L' && buf.length >= 25) {
        // Lossless
        const b0 = buf[21] ?? 0;
        const b1 = buf[22] ?? 0;
        const b2 = buf[23] ?? 0;
        const b3 = buf[24] ?? 0;
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        if (width > 0 && height > 0) return { width, height };
      }
    }
  } catch {
    // If parsing fails, return null
  }

  return null;
}
