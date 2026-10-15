import { describe, it, expect } from 'vitest';
import { configVersion, supportedLocales } from '../src/index.js';

describe('@jlpt/config smoke test', () => {
  it('should export valid version and locales', () => {
    expect(configVersion).toBe('0.1.0');
    expect(supportedLocales).toContain('vi');
    expect(supportedLocales).toContain('ja');
    expect(supportedLocales).toContain('en');
  });
});
