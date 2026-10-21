/**
 * Romaji to Hiragana conversion utility.
 *
 * Provides strict validation and transliteration of Hepburn and Kunrei-shiki romaji
 * to Hiragana. Non-Japanese Latin words (such as arbitrary English text like 'englishonlyword')
 * and invalid sequences return null.
 */

const ROMAJI_TO_HIRAGANA_MAP: Record<string, string> = {
  // Single vowels
  a: 'あ',
  i: 'い',
  u: 'う',
  e: 'え',
  o: 'お',

  // K
  ka: 'か',
  ki: 'き',
  ku: 'く',
  ke: 'け',
  ko: 'こ',
  kya: 'きゃ',
  kyu: 'きゅ',
  kyo: 'きょ',

  // S
  sa: 'さ',
  shi: 'し',
  su: 'す',
  se: 'せ',
  so: 'そ',
  si: 'し',
  sha: 'しゃ',
  shu: 'しゅ',
  sho: 'しょ',
  sya: 'しゃ',
  syu: 'しゅ',
  syo: 'しょ',

  // T
  ta: 'た',
  chi: 'ち',
  tsu: 'つ',
  te: 'て',
  to: 'と',
  ti: 'ち',
  tu: 'つ',
  cha: 'ちゃ',
  chu: 'ちゅ',
  cho: 'ちょ',
  tya: 'ちゃ',
  tyu: 'ちゅ',
  tyo: 'ちょ',

  // N
  na: 'な',
  ni: 'に',
  nu: 'ぬ',
  ne: 'ね',
  no: 'の',
  nya: 'にゃ',
  nyu: 'にゅ',
  nyo: 'にょ',

  // H
  ha: 'は',
  hi: 'ひ',
  fu: 'ふ',
  he: 'へ',
  ho: 'ほ',
  hu: 'ふ',
  hya: 'ひゃ',
  hyu: 'ひゅ',
  hyo: 'ひょ',

  // M
  ma: 'ま',
  mi: 'み',
  mu: 'む',
  me: 'め',
  mo: 'も',
  mya: 'みゃ',
  myu: 'みゅ',
  myo: 'みょ',

  // Y
  ya: 'や',
  yu: 'ゆ',
  yo: 'よ',

  // R
  ra: 'ら',
  ri: 'り',
  ru: 'る',
  re: 'れ',
  ro: 'ろ',
  rya: 'りゃ',
  ryu: 'りゅ',
  ryo: 'りょ',

  // W
  wa: 'わ',
  wo: 'を',

  // G
  ga: 'が',
  gi: 'ぎ',
  gu: 'ぐ',
  ge: 'げ',
  go: 'ご',
  gya: 'ぎゃ',
  gyu: 'ぎゅ',
  gyo: 'ぎょ',

  // Z
  za: 'ざ',
  ji: 'じ',
  zu: 'ず',
  ze: 'ぜ',
  zo: 'ぞ',
  zi: 'じ',
  ja: 'じゃ',
  ju: 'じゅ',
  jo: 'じょ',
  zya: 'じゃ',
  zyu: 'じゅ',
  zyo: 'じょ',

  // D
  da: 'だ',
  di: 'ぢ',
  du: 'づ',
  de: 'で',
  do: 'ど',
  dji: 'ぢ',
  dzu: 'づ',
  dya: 'ぢゃ',
  dyu: 'ぢゅ',
  dyo: 'ぢょ',

  // B
  ba: 'ば',
  bi: 'び',
  bu: 'ぶ',
  be: 'べ',
  bo: 'ぼ',
  bya: 'びゃ',
  byu: 'びゅ',
  byo: 'びょ',

  // P
  pa: 'ぱ',
  pi: 'ぴ',
  pu: 'ぷ',
  pe: 'ぺ',
  po: 'ぽ',
  pya: 'ぴゃ',
  pyu: 'ぴゅ',
  pyo: 'ぴょ',
};

/**
 * Attempts to parse an ASCII string as valid Japanese Romaji and convert it to Hiragana.
 * Returns the Hiragana string if the entire input consists of valid Romaji syllables.
 * Returns null if the input is not valid Romaji (e.g. English words, numbers, symbols).
 */
export function romajiToHiragana(input: string): string | null {
  if (!input) return null;
  const str = input.toLowerCase().trim();
  if (!str || !/^[a-z']+$/.test(str)) return null;

  let result = '';
  let i = 0;
  while (i < str.length) {
    // 1. Check 3-character prefixes (e.g., kya, shi, chi, tsu, sha, cha, dji, dzu)
    if (i + 3 <= str.length) {
      const sub3 = str.slice(i, i + 3);
      if (ROMAJI_TO_HIRAGANA_MAP[sub3]) {
        result += ROMAJI_TO_HIRAGANA_MAP[sub3];
        i += 3;
        continue;
      }
    }

    // 2. Check doubled consonants (sokuon っ): kk, ss, tt, pp, etc.
    // Also 'tch' -> 'っ' + 'ch...'
    if (i + 2 <= str.length) {
      if (str.slice(i, i + 3) === 'tch') {
        result += 'っ';
        i += 1;
        continue;
      }
      if (str[i] === str[i + 1] && 'kstpbgzd'.includes(str[i]!)) {
        result += 'っ';
        i += 1;
        continue;
      }
    }

    // 3. Check 2-character prefixes (e.g., ka, ki, sa, ta, na, ni, ho, etc.)
    if (i + 2 <= str.length) {
      const sub2 = str.slice(i, i + 2);
      if (ROMAJI_TO_HIRAGANA_MAP[sub2]) {
        result += ROMAJI_TO_HIRAGANA_MAP[sub2];
        i += 2;
        continue;
      }
    }

    // 4. Check 'n' for hatsuon (ん)
    if (str[i] === 'n') {
      if (i + 1 === str.length) {
        result += 'ん';
        i += 1;
        continue;
      }
      if (str[i + 1] === "'") {
        result += 'ん';
        i += 2;
        continue;
      }
      if (str[i + 1] === 'n') {
        result += 'ん';
        i += 1;
        continue;
      }
      if (!'aiueoy'.includes(str[i + 1]!)) {
        result += 'ん';
        i += 1;
        continue;
      }
    }

    // 5. Check 1-character vowel (a, i, u, e, o)
    if (ROMAJI_TO_HIRAGANA_MAP[str[i]!]) {
      result += ROMAJI_TO_HIRAGANA_MAP[str[i]!];
      i += 1;
      continue;
    }

    // If character sequence is unrecognized, input is not valid Romaji
    return null;
  }

  return result.length > 0 ? result : null;
}
