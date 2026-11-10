import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { getAnalyticsDbUrl } from '../_db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A cell is only published when enough different people answered, so no single learner can be identified. */
const MIN_USERS = 5;
const MIN_ANSWERS = 50;

type SkillGroup = 'vocab' | 'grammar' | 'reading' | 'listening';

export interface DifficultyCell {
  n: number;
  correct: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: { at: number; body: unknown } | null = null;

/** Community accuracy per exam year and skill group (aggregated over every learner). */
export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return NextResponse.json(cache.body);

  const sql = postgres(getAnalyticsDbUrl(), { max: 2, idle_timeout: 10 });
  try {
    const rows = await sql`
      SELECT e.level, e.year, q.skill,
             count(*)::int AS n,
             count(*) FILTER (WHERE ua.is_correct)::int AS correct,
             count(DISTINCT ea.user_id)::int AS users
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id AND ea.status = 'submitted'
      JOIN exams e ON e.id = ea.exam_id
      JOIN questions q ON q.id = ua.question_id
      GROUP BY e.level, e.year, q.skill`;
    const userRows = (await sql`
      SELECT count(DISTINCT ea.user_id)::int AS users FROM exam_attempts ea WHERE ea.status = 'submitted'`) as unknown as Array<{
      users: number;
    }>;
    const users = userRows[0]?.users ?? 0;

    const levels: Record<string, Record<string, Partial<Record<SkillGroup, DifficultyCell>>>> = {};
    for (const r of rows) {
      const group: SkillGroup = r.skill === 'vocabulary' || r.skill === 'kanji' ? 'vocab' : (r.skill as SkillGroup);
      if (!['vocab', 'grammar', 'reading', 'listening'].includes(group)) continue;
      const lvl = (levels[r.level as string] ||= {});
      const yr = (lvl[String(r.year)] ||= {});
      const cell = (yr[group] ||= { n: 0, correct: 0 });
      cell.n += r.n;
      cell.correct += r.correct;
    }

    // Publish only cells backed by enough distinct learners (users counted per exam-year-skill row).
    const minUsersByCell = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.level}|${r.year}`;
      minUsersByCell.set(key, Math.max(minUsersByCell.get(key) ?? 0, r.users as number));
    }
    for (const [lvl, years] of Object.entries(levels)) {
      for (const [year, cells] of Object.entries(years)) {
        const enoughUsers = (minUsersByCell.get(`${lvl}|${year}`) ?? 0) >= MIN_USERS;
        for (const group of Object.keys(cells) as SkillGroup[]) {
          if (!enoughUsers || (cells[group]?.n ?? 0) < MIN_ANSWERS) delete cells[group];
        }
        if (Object.keys(cells).length === 0) delete years[year];
      }
    }

    const body = { levels, users, minUsers: MIN_USERS, minAnswers: MIN_ANSWERS };
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Error computing difficulty statistics:', error);
    return NextResponse.json({ error: 'Failed to compute difficulty statistics' }, { status: 500 });
  } finally {
    await sql.end();
  }
}
