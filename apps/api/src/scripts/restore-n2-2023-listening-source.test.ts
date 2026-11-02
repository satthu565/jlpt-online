import { describe, expect, it } from 'vitest';
import {
  EXPECTED_AUDIO_DURATION_MS,
  EXPECTED_AUDIO_KEY,
  EXPECTED_AUDIO_SHA256,
  EXPECTED_BOOKLET_SHA256,
  EXPECTED_IMAGE_KEY,
  EXPECTED_IMAGE_SHA256,
  EXPECTED_MANIFEST_SHA256,
  EXPECTED_SCRIPT_SHA256,
  validateCanonicalManifest,
} from './restore-n2-2023-listening-source.js';

const numbers = [
  'L1-1', 'L1-2', 'L1-3', 'L1-4', 'L1-5',
  'L2-1', 'L2-2', 'L2-3', 'L2-4', 'L2-5', 'L2-6',
  'L3-1', 'L3-2', 'L3-3', 'L3-4', 'L3-5',
  'L4-1', 'L4-2', 'L4-3', 'L4-4', 'L4-5', 'L4-6',
  'L4-7', 'L4-8', 'L4-9', 'L4-10', 'L4-11',
  'L5-1', 'L5-2', 'L5-3',
];

function manifest() {
  const groupIds = numbers.map((number) => `group-${number}`);
  const slice = Math.floor(EXPECTED_AUDIO_DURATION_MS / numbers.length);
  let start = 0;
  const listeningTimeline = groupIds.map((groupId, index) => {
    const end = index === groupIds.length - 1 ? EXPECTED_AUDIO_DURATION_MS : start + slice;
    const item = {
      groupId,
      mediaKey: EXPECTED_AUDIO_KEY,
      startMs: start,
      endMs: end,
      audioStartMs: start,
      audioEndMs: end,
      gapAfterMs: 0,
    };
    start = end;
    return item;
  });
  return {
    exam: {
      slug: 'n2-2023-12',
      sections: [{ code: 'listening', groupIds, listeningTimeline }],
    },
    groups: groupIds.map((id, index) => ({
      id,
      transcript: [{ t: 'text', text: `transcript-${index}` }],
      questions: [{ number: numbers[index]! }],
    })),
  };
}

describe('N2 12/2023 canonical listening restoration', () => {
  it('pins every owner-supplied source identity', () => {
    for (const value of [
      EXPECTED_AUDIO_SHA256,
      EXPECTED_BOOKLET_SHA256,
      EXPECTED_SCRIPT_SHA256,
      EXPECTED_IMAGE_SHA256,
      EXPECTED_MANIFEST_SHA256,
    ]) {
      expect(value).toHaveLength(64);
    }
    expect(EXPECTED_AUDIO_KEY).toBe(`media/${EXPECTED_AUDIO_SHA256}.mp3`);
    expect(EXPECTED_IMAGE_KEY).toBe(`media/${EXPECTED_IMAGE_SHA256}.jpg`);
  });

  it('accepts a complete contiguous 30-group timeline and transcript set', () => {
    const result = validateCanonicalManifest(manifest());
    expect(result.groups).toHaveLength(30);
    expect(result.timeline).toHaveLength(30);
    expect(result.timeline.at(-1)?.endMs).toBe(EXPECTED_AUDIO_DURATION_MS);
  });

  it('rejects a timeline using a different audio source', () => {
    const input = manifest();
    input.exam.sections[0]!.listeningTimeline[1]!.mediaKey = 'media/wrong.mp3';
    expect(() => validateCanonicalManifest(input)).toThrow('canonical audio');
  });
});
