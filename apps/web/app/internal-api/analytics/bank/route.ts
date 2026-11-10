import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { getAnalyticsDbUrl } from '../_db';

export const dynamic = 'force-dynamic';

interface LevelBank {
  examsCount: number;
  questionsCount: number;
  bySkill: Record<'vocab' | 'grammar' | 'reading' | 'listening', number>;
  examsByYear: Record<string, number>;
  mondai: Array<{ type: string; skill: string; count: number }>;
  mondaiByYear: Record<string, Record<string, number>>;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: { at: number; body: { levels: Record<string, LevelBank> } } | null = null;

function emptyLevel(): LevelBank {
  return {
    examsCount: 0,
    questionsCount: 0,
    bySkill: { vocab: 0, grammar: 0, reading: 0, listening: 0 },
    examsByYear: {},
    mondai: [],
    mondaiByYear: {},
  };
}

/** Public, user-independent counts of the published exam bank. */
export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.body);
  }

  const sql = postgres(getAnalyticsDbUrl(), { max: 2, idle_timeout: 10 });
  try {
    const examRows = await sql`
      SELECT level, year, count(*)::int AS n
      FROM exams
      WHERE deleted_at IS NULL AND published_version IS NOT NULL
      GROUP BY level, year
    `;
    const itemRows = await sql`
      SELECT e.level, e.year, q.skill, q.mondai_type, count(*)::int AS n
      FROM exam_items ei
      JOIN exams e ON e.id = ei.exam_id
      JOIN questions q ON q.id = ei.question_id
      WHERE e.deleted_at IS NULL AND e.published_version IS NOT NULL AND q.deleted_at IS NULL
      GROUP BY e.level, e.year, q.skill, q.mondai_type
    `;

    const levels: Record<string, LevelBank> = {};
    for (const r of examRows) {
      const lvl = (levels[r.level as string] ||= emptyLevel());
      lvl.examsCount += r.n;
      lvl.examsByYear[String(r.year)] = (lvl.examsByYear[String(r.year)] || 0) + r.n;
    }

    const mondaiTotals: Record<string, Map<string, { type: string; skill: string; count: number }>> = {};
    for (const r of itemRows) {
      const lvl = (levels[r.level as string] ||= emptyLevel());
      const skill = r.skill as string;
      const type = (r.mondai_type as string) || 'other';
      const group = skill === 'vocabulary' || skill === 'kanji' ? 'vocab' : (skill as keyof LevelBank['bySkill']);
      if (group in lvl.bySkill) lvl.bySkill[group] += r.n;
      lvl.questionsCount += r.n;

      const year = String(r.year);
      const byYear = (lvl.mondaiByYear[type] ||= {});
      byYear[year] = (byYear[year] || 0) + r.n;

      const totals = (mondaiTotals[r.level as string] ||= new Map());
      const cur = totals.get(type);
      if (cur) cur.count += r.n;
      else totals.set(type, { type, skill, count: r.n });
    }
    for (const [lvl, map] of Object.entries(mondaiTotals)) {
      levels[lvl]!.mondai = Array.from(map.values()).sort((a, b) => b.count - a.count);
    }

    const body = { levels };
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Error fetching exam bank stats:', error);
    return NextResponse.json({ error: 'Failed to fetch exam bank stats' }, { status: 500 });
  } finally {
    await sql.end();
  }
}
