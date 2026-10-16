import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { S3Client } from '@aws-sdk/client-s3';
import { LocalFsStorage, StorageSecurityError } from './local-fs.storage.js';
import { R2Storage } from './r2.storage.js';
import { StorageService } from './storage.service.js';

describe('Storage Module - LocalFsStorage & R2Storage', () => {
  let tempDir: string;
  let localStorage: LocalFsStorage;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jlpt-storage-test-'));
    localStorage = new LocalFsStorage(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('LocalFsStorage', () => {
    it('stores file and computes correct sha256 checksum', async () => {
      const data = Buffer.from('こんにちは世界！JLPT Online 2026', 'utf8');
      const expectedSha256 = crypto.createHash('sha256').update(data).digest('hex');

      const putRes = await localStorage.put('media/test-sample.txt', data, {
        mimeType: 'text/plain',
      });

      expect(putRes.key).toBe('media/test-sample.txt');
      expect(putRes.size).toBe(data.length);
      expect(putRes.sha256).toBe(expectedSha256);

      const getRes = await localStorage.get('media/test-sample.txt');
      expect(getRes).not.toBeNull();
      expect(getRes!.data.toString('utf8')).toBe('こんにちは世界！JLPT Online 2026');
      expect(getRes!.mimeType).toBe('text/plain');
      expect(getRes!.size).toBe(data.length);

      const headRes = await localStorage.head('media/test-sample.txt');
      expect(headRes.exists).toBe(true);
      expect(headRes.size).toBe(data.length);
      expect(headRes.sha256).toBe(expectedSha256);
      expect(headRes.mimeType).toBe('text/plain');
    });

    it('supports HTTP Range queries for audio/video streaming', async () => {
      // 100 bytes buffer
      const data = Buffer.from(Array.from({ length: 100 }, (_, i) => i));
      await localStorage.put('audio/track01.mp3', data, { mimeType: 'audio/mpeg' });

      // Range 10-19 (10 bytes)
      const rangeRes = await localStorage.get('audio/track01.mp3', { start: 10, end: 19 });
      expect(rangeRes).not.toBeNull();
      expect(rangeRes!.size).toBe(10);
      expect(rangeRes!.range).toEqual({ start: 10, end: 19, total: 100 });
      expect(Array.from(rangeRes!.data)).toEqual(Array.from({ length: 10 }, (_, i) => i + 10));

      // Range 90- (last 10 bytes)
      const rangeEndRes = await localStorage.get('audio/track01.mp3', { start: 90 });
      expect(rangeEndRes).not.toBeNull();
      expect(rangeEndRes!.size).toBe(10);
      expect(rangeEndRes!.range).toEqual({ start: 90, end: 99, total: 100 });

      // Out of bounds range clamping
      const clampedRes = await localStorage.get('audio/track01.mp3', { start: 95, end: 150 });
      expect(clampedRes).not.toBeNull();
      expect(clampedRes!.size).toBe(5);
      expect(clampedRes!.range).toEqual({ start: 95, end: 99, total: 100 });
    });

    it('rejects directory traversal and dangerous paths', async () => {
      const maliciousKeys = [
        '../outside.txt',
        'media/../../etc/passwd',
        '/absolute/path/file.txt',
        'media\\subdir\\file.txt',
        'media/\0/poison.txt',
        'media/././evil.txt',
      ];

      for (const key of maliciousKeys) {
        await expect(localStorage.put(key, Buffer.from('malicious'))).rejects.toThrow(
          StorageSecurityError,
        );
        await expect(localStorage.get(key)).rejects.toThrow(StorageSecurityError);
        await expect(localStorage.head(key)).rejects.toThrow(StorageSecurityError);
        await expect(localStorage.delete(key)).rejects.toThrow(StorageSecurityError);
      }
    });

    it('deletes file cleanly and reports non-existent file gracefully', async () => {
      await localStorage.put('temp/to-delete.txt', Buffer.from('goodbye'));
      const deleted = await localStorage.delete('temp/to-delete.txt');
      expect(deleted).toBe(true);

      const head = await localStorage.head('temp/to-delete.txt');
      expect(head.exists).toBe(false);

      const deletedAgain = await localStorage.delete('temp/to-delete.txt');
      expect(deletedAgain).toBe(false);
    });
  });

  describe('R2Storage (S3-compatible Cloudflare R2)', () => {
    it('strictly sanitizes keys against traversal attacks', () => {
      const r2 = new R2Storage({ bucketName: 'test-bucket' });

      expect(r2.sanitizeKey('media/audio.mp3')).toBe('media/audio.mp3');
      expect(() => r2.sanitizeKey('../secret.env')).toThrow(StorageSecurityError);
      expect(() => r2.sanitizeKey('media/../../shadow')).toThrow(StorageSecurityError);
      expect(() => r2.sanitizeKey('/root/secret')).toThrow(StorageSecurityError);
      expect(() => r2.sanitizeKey('media/\0bad')).toThrow(StorageSecurityError);
    });

    it('integrates with S3 commands for put, get with range, head, and delete', async () => {
      type MockCommand = {
        constructor: { name: string };
        input: { Key?: string; Range?: string; Bucket?: string };
      };
      const commandHistory: MockCommand[] = [];
      const mockS3Client = {
        send: async (command: MockCommand) => {
          commandHistory.push(command);
          const cmdName = command.constructor.name;

          if (cmdName === 'PutObjectCommand') {
            return { ETag: '"test-etag"' };
          }
          if (cmdName === 'GetObjectCommand') {
            const dataBuffer = Buffer.from('partial-content-test');
            // Async iterable stream
            async function* makeStream() {
              yield dataBuffer;
            }
            return {
              Body: makeStream(),
              ContentType: 'application/octet-stream',
              ContentLength: dataBuffer.length,
              ContentRange: command.input.Range ? 'bytes 0-19/100' : undefined,
            };
          }
          if (cmdName === 'HeadObjectCommand') {
            if (command.input.Key === 'non-existent.txt') {
              const notFound = new Error('Not Found');
              notFound.name = 'NotFound';
              throw notFound;
            }
            return {
              ContentLength: 1024,
              ContentType: 'image/png',
              Metadata: { 'sha256-checksum': 'abc123hash' },
              LastModified: new Date('2026-10-16T00:00:00Z'),
            };
          }
          if (cmdName === 'DeleteObjectCommand') {
            return {};
          }
          return {};
        },
      } as unknown as S3Client;

      const r2 = new R2Storage({
        bucketName: 'mock-r2-bucket',
        s3Client: mockS3Client,
      });

      // Put
      const putRes = await r2.put('media/sample.png', Buffer.from('png-bytes'), {
        mimeType: 'image/png',
      });
      expect(putRes.key).toBe('media/sample.png');
      expect(commandHistory[0]?.constructor.name).toBe('PutObjectCommand');
      expect(commandHistory[0]?.input.Bucket).toBe('mock-r2-bucket');

      // Get with Range
      const getRes = await r2.get('media/sample.png', { start: 0, end: 19 });
      expect(getRes).not.toBeNull();
      expect(commandHistory[1]?.constructor.name).toBe('GetObjectCommand');
      expect(commandHistory[1]?.input.Range).toBe('bytes=0-19');
      expect(getRes!.range).toEqual({ start: 0, end: 19, total: 100 });

      // Head
      const headRes = await r2.head('media/sample.png');
      expect(headRes.exists).toBe(true);
      expect(headRes.size).toBe(1024);
      expect(headRes.sha256).toBe('abc123hash');

      // Head non-existent
      const headNotFound = await r2.head('non-existent.txt');
      expect(headNotFound.exists).toBe(false);

      // Delete
      const deleted = await r2.delete('media/sample.png');
      expect(deleted).toBe(true);
    });
  });

  describe('StorageService', () => {
    it('correctly parses HTTP Range headers', () => {
      const service = new StorageService();

      expect(service.parseRangeHeader(undefined, 1000)).toBeNull();
      expect(service.parseRangeHeader('invalid-header', 1000)).toBeNull();
      expect(service.parseRangeHeader('bytes=0-499', 1000)).toEqual({ start: 0, end: 499 });
      expect(service.parseRangeHeader('bytes=500-', 1000)).toEqual({ start: 500, end: 999 });
      expect(service.parseRangeHeader('bytes=-200', 1000)).toEqual({ start: 800, end: 999 });
      expect(service.parseRangeHeader('bytes=900-1500', 1000)).toEqual({ start: 900, end: 999 });
      expect(service.parseRangeHeader('bytes=500-200', 1000)).toBeNull();
    });

    it('defaults to local driver and delegates operations', async () => {
      const service = new StorageService();
      expect(service.getDriverType()).toBe('local');

      service.setStorageInstance(localStorage);
      const putRes = await service.put('delegated.txt', Buffer.from('hello'));
      expect(putRes.size).toBe(5);

      const headRes = await service.head('delegated.txt');
      expect(headRes.exists).toBe(true);
    });
  });
});
