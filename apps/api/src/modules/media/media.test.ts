import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { mediaAssets } from '../../db/schema.js';
import { LocalFsStorage } from '../storage/local-fs.storage.js';
import { StorageService } from '../storage/storage.service.js';
import {
  detectMimeType,
  MediaValidationError,
  validateMediaMagicBytes,
} from './magic-bytes.js';
import { extractAudioDurationSec, extractImageDimensions } from './media-metadata.js';
import { extractSafeZip, ZipSecurityError } from './zip-security.js';
import { MediaService } from './media.service.js';

// --- Binary Fixture Builders ---

function createMinimalPng(width = 100, height = 50): Buffer {
  const buf = Buffer.alloc(33);
  // PNG signature
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length 13
  buf.writeUInt32BE(13, 8);
  // IHDR chunk type
  buf.write('IHDR', 12, 'ascii');
  // Width & height
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  // Bit depth 8, ColorType 2, Compression 0, Filter 0, Interlace 0
  buf.set([8, 2, 0, 0, 0], 24);
  // CRC dummy
  buf.writeUInt32BE(0x12345678, 29);
  return buf;
}

function createMinimalWav(durationSec = 2, sampleRate = 44100, channels = 1): Buffer {
  const byteRate = sampleRate * channels * 2; // 16-bit
  const dataSize = byteRate * durationSec;
  const totalSize = 36 + dataSize;

  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(totalSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16); // Subchunk1Size
  buf.writeUInt16LE(1, 20); // AudioFormat PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(channels * 2, 32); // BlockAlign
  buf.writeUInt16LE(16, 34); // BitsPerSample
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

function createMinimalMp3WithId3(durationSec = 5): Buffer {
  // ID3v2 header (10 bytes) + TLEN frame + MP3 sync frame
  const tlenValue = `${durationSec * 1000}`;
  const frameSize = 1 + tlenValue.length; // encoding byte + string

  const header = Buffer.alloc(10);
  header.write('ID3', 0, 'ascii');
  header[3] = 3; // version 2.3
  header[4] = 0;
  header[5] = 0; // flags
  const totalTagSize = 10 + frameSize;
  header[6] = (totalTagSize >> 21) & 0x7f;
  header[7] = (totalTagSize >> 14) & 0x7f;
  header[8] = (totalTagSize >> 7) & 0x7f;
  header[9] = totalTagSize & 0x7f;

  const tlenFrame = Buffer.alloc(10 + frameSize);
  tlenFrame.write('TLEN', 0, 'ascii');
  tlenFrame.writeUInt32BE(frameSize, 4);
  tlenFrame[8] = 0;
  tlenFrame[9] = 0;
  tlenFrame[10] = 0; // ISO-8859-1 encoding
  tlenFrame.write(tlenValue, 11, 'ascii');

  // MP3 audio frame sync: 0xFF, 0xFB (MPEG-1 Layer 3, 128kbps, 44.1kHz)
  const mp3Frame = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00]);

  return Buffer.concat([header, tlenFrame, mp3Frame]);
}

function createMinimalPdf(): Buffer {
  return Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF');
}

/**
 * Creates a raw in-memory ZIP buffer with given files.
 */
function createRawZip(entries: Array<{ name: string; content: Buffer; method?: number }>): Buffer {
  const localHeaders: Buffer[] = [];
  const cdEntries: Buffer[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const method = entry.method ?? 0; // 0: Stored, 8: Deflate

    let compData = entry.content;
    if (method === 8) {
      compData = zlib.deflateRawSync(entry.content);
    }

    const compSize = compData.length;
    const uncompSize = entry.content.length;

    // Local file header (30 bytes + nameLen)
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0, 12); // mod date
    local.writeUInt32LE(0x12345678, 14); // crc32
    local.writeUInt32LE(compSize, 18);
    local.writeUInt32LE(uncompSize, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra len
    nameBuf.copy(local, 30);

    localHeaders.push(local, compData);

    // Central directory header (46 bytes + nameLen)
    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8); // flags
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(0x12345678, 16);
    cd.writeUInt32LE(compSize, 20);
    cd.writeUInt32LE(uncompSize, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra len
    cd.writeUInt16LE(0, 32); // comment len
    cd.writeUInt16LE(0, 34); // disk number
    cd.writeUInt16LE(0, 36); // internal attr
    cd.writeUInt32LE(0, 38); // external attr
    cd.writeUInt32LE(currentOffset, 42); // local header offset
    nameBuf.copy(cd, 46);

    cdEntries.push(cd);
    currentOffset += local.length + compData.length;
  }

  const cdBuffer = Buffer.concat(cdEntries);
  const cdOffset = currentOffset;
  const cdSize = cdBuffer.length;

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // cd disk number
  eocd.writeUInt16LE(entries.length, 8); // cd entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total cd entries
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment len

  return Buffer.concat([...localHeaders, cdBuffer, eocd]);
}

describe('Media Module - Magic Bytes, Upload Security & Deduplication', () => {
  let dbClient: DbClientInstance;
  let tempStorageDir: string;
  let storageService: StorageService;
  let mediaService: MediaService;

  beforeEach(async () => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jlpt-media-test-'));
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    const localStorage = new LocalFsStorage(tempStorageDir);
    storageService = new StorageService();
    storageService.setStorageInstance(localStorage);

    mediaService = new MediaService(dbClient, storageService);
  });

  afterEach(async () => {
    await dbClient.close();
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  describe('Magic Bytes Detection & Disguised File Rejection', () => {
    it('detects correct MIME types for valid media buffers', () => {
      const png = createMinimalPng();
      expect(detectMimeType(png)).toBe('image/png');

      const wav = createMinimalWav();
      expect(detectMimeType(wav)).toBe('audio/wav');

      const mp3 = createMinimalMp3WithId3();
      expect(detectMimeType(mp3)).toBe('audio/mpeg');

      const pdf = createMinimalPdf();
      expect(detectMimeType(pdf)).toBe('application/pdf');
    });

    it('rejects disguised executable / script disguised as MP3 or PNG', () => {
      // 1. Windows MZ executable disguised as .mp3
      const fakeExe = Buffer.concat([
        Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'binary'),
        Buffer.alloc(100),
      ]);
      expect(() => validateMediaMagicBytes(fakeExe, 'audio/mpeg', 'song.mp3')).toThrow(
        MediaValidationError,
      );

      // 2. Linux ELF binary disguised as .png
      const fakeElf = Buffer.concat([
        Buffer.from('\x7fELF\x02\x01\x01\x00', 'binary'),
        Buffer.alloc(100),
      ]);
      expect(() => validateMediaMagicBytes(fakeElf, 'image/png', 'photo.png')).toThrow(
        MediaValidationError,
      );

      // 3. HTML script tag disguised as audio
      const fakeHtml = Buffer.from('<script>alert("hacked")</script>', 'utf8');
      expect(() => validateMediaMagicBytes(fakeHtml, 'audio/mpeg', 'listening.mp3')).toThrow(
        MediaValidationError,
      );

      // 4. Mismatched extension vs magic bytes (PNG bytes with .mp3 extension)
      const pngBytes = createMinimalPng();
      expect(() => validateMediaMagicBytes(pngBytes, 'audio/mpeg', 'test.mp3')).toThrow(
        MediaValidationError,
      );

      // 5. Dangerous extensions (.exe, .sh, .php) containing valid media magic bytes
      expect(() => validateMediaMagicBytes(pngBytes, undefined, 'payload.exe')).toThrow(
        MediaValidationError,
      );
      expect(() => validateMediaMagicBytes(pngBytes, undefined, 'script.sh')).toThrow(
        MediaValidationError,
      );
      const mp3Bytes = createMinimalMp3WithId3();
      expect(() => validateMediaMagicBytes(mp3Bytes, undefined, 'shell.php')).toThrow(
        MediaValidationError,
      );
    });

    it('enforces maximum size limits on audio, images, and pdfs', () => {
      // 6 MB image buffer (limit is 5 MB)
      const oversizedImage = Buffer.alloc(6 * 1024 * 1024);
      createMinimalPng().copy(oversizedImage, 0);

      expect(() => validateMediaMagicBytes(oversizedImage, 'image/png', 'huge.png')).toThrow(
        /vượt quá dung lượng tối đa 5MB/,
      );
    });
  });

  describe('Audio Duration & Image Dimension Extraction', () => {
    it('accurately parses WAV duration in seconds', () => {
      const wav2Sec = createMinimalWav(2, 44100);
      expect(extractAudioDurationSec(wav2Sec, 'audio/wav')).toBe(2);

      const wav5Sec = createMinimalWav(5, 22050);
      expect(extractAudioDurationSec(wav5Sec, 'audio/wav')).toBe(5);
    });

    it('extracts PNG image dimensions accurately', () => {
      const png = createMinimalPng(250, 180);
      const dims = extractImageDimensions(png, 'image/png');
      expect(dims).toEqual({ width: 250, height: 180 });
    });
  });

  describe('Acceptance 1: Zip-Slip & Zip-Bomb Rejection', () => {
    it('rejects Zip-Slip directory traversal attempts in ZIP archives', () => {
      const maliciousZip1 = createRawZip([
        { name: '../../etc/passwd', content: Buffer.from('root:x:0:0') },
      ]);
      expect(() => extractSafeZip(maliciousZip1)).toThrow(ZipSecurityError);
      expect(() => extractSafeZip(maliciousZip1)).toThrow(/Zip-Slip/);

      const maliciousZip2 = createRawZip([
        { name: 'media/../secret.txt', content: Buffer.from('secret') },
      ]);
      expect(() => extractSafeZip(maliciousZip2)).toThrow(ZipSecurityError);

      const maliciousZip3 = createRawZip([
        { name: 'media\\backslashes.txt', content: Buffer.from('bad') },
      ]);
      expect(() => extractSafeZip(maliciousZip3)).toThrow(ZipSecurityError);
    });

    it('rejects Zip-Bomb with extreme compression ratio (>200:1)', () => {
      // 100 KB of zeros compresses to ~100 bytes via deflate -> ratio ~1000:1
      const zeroBuffer = Buffer.alloc(100 * 1024, 0);
      const bombZip = createRawZip([
        { name: 'media/bomb.bin', content: zeroBuffer, method: 8 },
      ]);

      expect(() => extractSafeZip(bombZip)).toThrow(ZipSecurityError);
      expect(() => extractSafeZip(bombZip)).toThrow(/Zip-Bomb: Tỷ lệ nén/);
    });

    it('accepts and extracts safe ZIP archive with valid media', () => {
      const validPng = createMinimalPng(80, 80);
      const safeZip = createRawZip([
        { name: 'import.json', content: Buffer.from('{"level":"N5"}') },
        { name: 'media/sample.png', content: validPng },
      ]);

      const extracted = mediaService.validateAndExtractZip(safeZip);
      expect(extracted['import.json']).toBeDefined();
      expect(extracted['media/sample.png']).toBeDefined();
      expect(extracted['import.json']?.toString('utf8')).toBe('{"level":"N5"}');
    });

    it('rejects safe-structured ZIP containing disguised media inside media/ folder', () => {
      const fakeMediaZip = createRawZip([
        { name: 'import.json', content: Buffer.from('{"level":"N5"}') },
        { name: 'media/fake.mp3', content: Buffer.from('<script>evil</script>') },
      ]);

      expect(() => mediaService.validateAndExtractZip(fakeMediaZip)).toThrow(
        MediaValidationError,
      );
    });
  });

  describe('Media Upload & Database Deduplication', () => {
    it('uploads valid media and stores in database and storage', async () => {
      const png = createMinimalPng(120, 90);
      const asset = await mediaService.uploadMedia(png, 'diagram.png', 'image/png');

      expect(asset.id).toBeDefined();
      expect(asset.mime).toBe('image/png');
      expect(asset.size).toBe(png.length);
      expect(asset.key).toMatch(/^media\/[a-f0-9]{64}\.png$/);
      expect(asset.dimensions).toEqual({ width: 120, height: 90 });

      // Verify retrieval
      const retrieved = await mediaService.getMedia(asset.id);
      expect(retrieved.metadata.id).toBe(asset.id);
      expect(retrieved.content.length).toBe(png.length);
      expect(retrieved.mime).toBe('image/png');
    });

    it('deduplicates uploads with identical SHA-256 hash', async () => {
      const png = createMinimalPng(64, 64);

      // First upload
      const asset1 = await mediaService.uploadMedia(png, 'icon.png', 'image/png');

      // Second upload with identical bytes but different filename
      const asset2 = await mediaService.uploadMedia(png, 'another-name.png', 'image/png');

      // Must return identical record
      expect(asset1.id).toBe(asset2.id);
      expect(asset1.sha256).toBe(asset2.sha256);
      expect(asset1.key).toBe(asset2.key);

      // Database must only contain 1 row
      const assets = await dbClient.db.select().from(mediaAssets);
      expect(assets).toHaveLength(1);
    });
  });
});
