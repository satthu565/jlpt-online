import { NextResponse, type NextRequest } from 'next/server';
import postgres from 'postgres';
import { getAnalyticsDbUrl, resolveSessionUserId } from '../_db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TZ = 'Asia/Ho_Chi_Minh';
const WINDOW_DAYS = 120;

type DayCounts = { exam: number; review: number; notebook: number; plan: number };

function addDays(date: string, delta: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + delta * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Learning activity of the signed-in user, from every place the product records it. */
export async function GET(request: NextRequest) {
  const userId = await resolveSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = postgres(getAnalyticsDbUrl(), { max: 2, idle_timeout: 10 });
  try {
    const [examRows, reviewRows, notebookRows, planRows] = await Promise.all([
      sql`
        SELECT to_char(coalesce(ea.last_activity_at, ea.submitted_at, ea.started_at) AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS d,
               count(*)::int AS n
        FROM exam_attempts ea
        WHERE ea.user_id = ${userId}
          AND coalesce(ea.last_activity_at, ea.submitted_at, ea.started_at) >= now() - make_interval(days => ${WINDOW_DAYS + 30})
        GROUP BY 1`,
      sql`
        SELECT to_char(reviewed_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS d, count(*)::int AS n
        FROM card_reviews
        WHERE user_id = ${userId} AND reviewed_at >= now() - make_interval(days => ${WINDOW_DAYS + 30})
        GROUP BY 1`,
      sql`
        SELECT to_char(created_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS d, count(*)::int AS n
        FROM notebook_items
        WHERE user_id = ${userId} AND created_at >= now() - make_interval(days => ${WINDOW_DAYS + 30})
        GROUP BY 1`,
      sql`
        SELECT to_char(c.completed_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS d, count(*)::int AS n
        FROM study_session_completions c
        JOIN study_sessions s ON s.id = c.session_id
        WHERE s.user_id = ${userId} AND c.completed_at >= now() - make_interval(days => ${WINDOW_DAYS + 30})
        GROUP BY 1`,
    ]);

    const days: Record<string, DayCounts> = {};
    const add = (rows: Array<{ d: string; n: number }>, key: keyof DayCounts) => {
      for (const r of rows) {
        const cur = (days[r.d] ||= { exam: 0, review: 0, notebook: 0, plan: 0 });
        cur[key] += r.n;
      }
    };
    add(examRows as never, 'exam');
    add(reviewRows as never, 'review');
    add(notebookRows as never, 'notebook');
    add(planRows as never, 'plan');

    const active = Object.keys(days).sort();
    let longest = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of active) {
      run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = d;
    }

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
    let cursor = days[today] ? today : addDays(today, -1);
    let current = 0;
    while (days[cursor]) {
      current += 1;
      cursor = addDays(cursor, -1);
    }

    return NextResponse.json({ days, currentStreak: current, longestStreak: longest, today });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  } finally {
    await sql.end();
  }
}
