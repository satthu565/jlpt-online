import { NextResponse } from 'next/server';
import { loadBankContent } from '../_content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public counts of what the published exams test (words, kanji, grammar points), per level. */
export async function GET() {
  try {
    return NextResponse.json(await loadBankContent());
  } catch (error) {
    console.error('Error computing exam content statistics:', error);
    return NextResponse.json({ error: 'Failed to compute exam content statistics' }, { status: 500 });
  }
}
