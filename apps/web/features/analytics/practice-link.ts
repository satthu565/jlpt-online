import type { Level } from '@jlpt/schema';

export interface PracticeLinkOptions {
  level: Level;
  /** 'wrong' = questions answered wrong or left blank before, 'unseen' = never answered. */
  pool: 'wrong' | 'unseen' | 'random';
  skills?: string[];
  mondaiTypes?: string[];
  count?: number;
  /** Short Vietnamese description shown on the practice page ("Dạng Hình thức ngữ pháp"). */
  label?: string;
}

/** Skills belonging to each official JLPT exam section, keyed by the section codes used in attempts. */
export const SECTION_SKILLS: Record<string, string[]> = {
  language: ['vocabulary', 'kanji', 'grammar'],
  language_knowledge: ['vocabulary', 'kanji', 'grammar'],
  reading: ['reading'],
  listening: ['listening'],
};

/** Link to /luyen-tap with the generator pre-filled; the learner still presses the start button. */
export function buildPracticeHref(opts: PracticeLinkOptions): string {
  const q = new URLSearchParams();
  q.set('level', opts.level);
  q.set('pool', opts.pool);
  if (opts.skills && opts.skills.length > 0) q.set('skills', opts.skills.join(','));
  if (opts.mondaiTypes && opts.mondaiTypes.length > 0) q.set('mondai', opts.mondaiTypes.join(','));
  q.set('count', String(Math.max(5, Math.min(30, opts.count ?? 15))));
  if (opts.label) q.set('label', opts.label);
  return `/luyen-tap?${q.toString()}`;
}
