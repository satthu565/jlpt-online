import { describe, expect, it } from 'vitest';
import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { isUuid, UuidParamPipe } from './uuid-param.pipe.js';

describe('UuidParamPipe', () => {
  const pipe = new UuidParamPipe();

  it('validates and passes valid UUIDv7 and UUIDv4 strings', () => {
    const validUuidV7 = '018e0000-0000-7000-8000-000000000021';
    const validUuidV4 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    expect(pipe.transform(validUuidV7, { type: 'param', data: 'id' })).toBe(validUuidV7);
    expect(pipe.transform(validUuidV4, { type: 'param', data: 'id' })).toBe(validUuidV4);
    expect(isUuid(validUuidV7)).toBe(true);
    expect(isUuid(validUuidV4)).toBe(true);
  });

  it('throws BadRequestException for invalid non-UUID strings by default', () => {
    const invalidIds = ['jlpt-official', 'q-default-1', '123', 'invalid-uuid', '', '   '];

    for (const invalid of invalidIds) {
      expect(isUuid(invalid)).toBe(false);
      expect(() => pipe.transform(invalid, { type: 'param', data: 'id' })).toThrow(
        BadRequestException,
      );
    }
  });

  it('throws NotFoundException when configured with HttpStatus.NOT_FOUND', () => {
    const notFoundPipe = new UuidParamPipe({ status: HttpStatus.NOT_FOUND });

    expect(() => notFoundPipe.transform('jlpt-official', { type: 'param', data: 'id' })).toThrow(
      NotFoundException,
    );
  });

  it('includes parameter name in error message', () => {
    try {
      pipe.transform('bad-id', { type: 'param', data: 'questionId' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const res = (err as BadRequestException).getResponse() as Record<string, unknown>;
      expect(res['code']).toBe('INVALID_UUID');
      expect(res['message']).toContain('questionId');
    }
  });
});
