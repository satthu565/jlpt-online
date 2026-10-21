import { describe, expect, it } from 'vitest';
import { romajiToHiragana } from './romaji.js';

describe('romajiToHiragana', () => {
  it('converts common Japanese Romaji words to Hiragana', () => {
    expect(romajiToHiragana('nihon')).toBe('にほん');
    expect(romajiToHiragana('arigatou')).toBe('ありがとう');
    expect(romajiToHiragana('taberu')).toBe('たべる');
    expect(romajiToHiragana('tokyo')).toBe('ときょ');
    expect(romajiToHiragana('shitsurei')).toBe('しつれい');
    expect(romajiToHiragana('shinbun')).toBe('しんぶん');
    expect(romajiToHiragana('matcha')).toBe('まっちゃ');
    expect(romajiToHiragana('gakkou')).toBe('がっこう');
    expect(romajiToHiragana('nippon')).toBe('にっぽん');
    expect(romajiToHiragana('konnichiwa')).toBe('こんにちわ');
  });

  it('rejects arbitrary English words and non-romaji strings with null', () => {
    expect(romajiToHiragana('englishonlyword')).toBeNull();
    expect(romajiToHiragana('englishword')).toBeNull();
    expect(romajiToHiragana('hello')).toBeNull();
    expect(romajiToHiragana('world')).toBeNull();
    expect(romajiToHiragana('123456789')).toBeNull();
    expect(romajiToHiragana('')).toBeNull();
    expect(romajiToHiragana('   ')).toBeNull();
  });
});
