import { NextResponse, type NextRequest } from 'next/server';
import postgres from 'postgres';
import { getAnalyticsDbUrl, resolveSessionUserId } from '../_db';
import { SELF_REASON_CODES } from '../../../../features/analytics/reasons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saves (or clears) the reason a learner gives for a question they answered wrong. */
export async function POST(request: NextRequest) {
  const userId = await resolveSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { questionId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const questionId = typeof body.questionId === 'string' ? body.questionId : '';
  const reason = body.reason === null ? null : typeof body.reason === 'string' ? body.reason : undefined;
  if (!UUID.test(questionId) || reason === undefined || (reason !== null && !SELF_REASON_CODES.includes(reason))) {
    return NextResponse.json({ error: 'Invalid questionId or reason' }, { status: 400 });
  }

  const sql = postgres(getAnalyticsDbUrl(), { max: 2, idle_timeout: 10 });
  try {
    // Only questions the learner really answered may be tagged
    const [answered] = await sql`
      SELECT 1 AS ok FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      WHERE ea.user_id = ${userId} AND ua.question_id = ${questionId} LIMIT 1`;
    if (!answered) {
      return NextResponse.json({ error: 'Question was not answered by this user' }, { status: 403 });
    }

    if (reason === null) {
      await sql`DELETE FROM user_wrong_reasons WHERE user_id = ${userId} AND question_id = ${questionId}`;
    } else {
      await sql`
        INSERT INTO user_wrong_reasons (user_id, question_id, reason)
        VALUES (${userId}, ${questionId}, ${reason})
        ON CONFLICT (user_id, question_id) DO UPDATE SET reason = EXCLUDED.reason, updated_at = now()`;
    }
    return NextResponse.json({ ok: true, reason });
  } catch (error) {
    // Table comes from migration 0013_user_wrong_reasons; a missing table means it was not applied yet.
    console.error('Error saving wrong-answer reason:', error);
    return NextResponse.json({ error: 'Failed to save reason' }, { status: 500 });
  } finally {
    await sql.end();
  }
}
