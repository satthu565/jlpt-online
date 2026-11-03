/**
 * Features hidden in the current release phase (chủ dự án, 2026-10-21). The code stays in place;
 * a feature comes back by building the web app with its variable set to 1, e.g.
 *   NEXT_PUBLIC_FEATURE_TTS=1 pnpm --filter @jlpt/web build
 * See docs/decisions/feature-flags-phase-1.md for what each flag hides.
 *
 * Next.js inlines NEXT_PUBLIC_* at build time only when read literally, so each flag reads its own variable.
 */
export const FEATURES = {
  /** /chinh-sach and /chinh-sach-bao-mat, the footer link and the sitemap entry. */
  privacyPolicyPage: process.env.NEXT_PUBLIC_FEATURE_PRIVACY_POLICY === '1',
  /** Text-to-speech buttons: vocabulary, grammar, flashcards and notebook. */
  tts: process.env.NEXT_PUBLIC_FEATURE_TTS === '1',
  /** AI study assistant that explains answers on the result review page. */
  aiExplanation: process.env.NEXT_PUBLIC_FEATURE_AI_EXPLANATION === '1',
  /** Header menu entry "Luyện tập" (the /luyen-tap page itself is untouched). */
  navPractice: process.env.NEXT_PUBLIC_FEATURE_NAV_PRACTICE === '1',
  /** Header menu entry "Ngữ pháp" (the /ngu-phap page itself is untouched). */
  navGrammar: process.env.NEXT_PUBLIC_FEATURE_NAV_GRAMMAR === '1',
  /** Header menu entry "Lớp học" (the /lop-hoc page itself is untouched). */
  navClassroom: process.env.NEXT_PUBLIC_FEATURE_NAV_CLASSROOM === '1',
  /** Header menu entry "Gói thành viên" (the /goi-thanh-vien page itself is untouched). */
  navPricing: process.env.NEXT_PUBLIC_FEATURE_NAV_PRICING === '1',
} as const;
