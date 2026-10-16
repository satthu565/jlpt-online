import { normalizeJapaneseTextNFC } from './japanese-text.js';

export interface LemmaResult {
  baseForm: string;
  surface: string;
  partOfSpeech: 'verb' | 'adjective' | 'noun' | 'particle' | 'auxiliary' | 'adverb' | 'other';
  inflection?: string;
}

// Well-known irregular verbs and special words mapping
const IRREGULAR_MAPPINGS: Record<
  string,
  { baseForm: string; pos: LemmaResult['partOfSpeech']; inflection: string }
> = {
  // する / 為る
  する: { baseForm: 'する', pos: 'verb', inflection: 'dictionary' },
  します: { baseForm: 'する', pos: 'verb', inflection: 'polite' },
  しました: { baseForm: 'する', pos: 'verb', inflection: 'polite_past' },
  しません: { baseForm: 'する', pos: 'verb', inflection: 'polite_negative' },
  しませんでした: { baseForm: 'する', pos: 'verb', inflection: 'polite_negative_past' },
  しましょう: { baseForm: 'する', pos: 'verb', inflection: 'polite_volitional' },
  して: { baseForm: 'する', pos: 'verb', inflection: 'te_form' },
  した: { baseForm: 'する', pos: 'verb', inflection: 'past' },
  しない: { baseForm: 'する', pos: 'verb', inflection: 'negative' },
  しなかった: { baseForm: 'する', pos: 'verb', inflection: 'negative_past' },
  しよう: { baseForm: 'する', pos: 'verb', inflection: 'volitional' },
  すれば: { baseForm: 'する', pos: 'verb', inflection: 'conditional' },
  された: { baseForm: 'する', pos: 'verb', inflection: 'passive' },
  される: { baseForm: 'する', pos: 'verb', inflection: 'passive' },
  させる: { baseForm: 'する', pos: 'verb', inflection: 'causative' },

  // くる / 来る
  くる: { baseForm: 'くる', pos: 'verb', inflection: 'dictionary' },
  来る: { baseForm: '来る', pos: 'verb', inflection: 'dictionary' },
  きます: { baseForm: 'くる', pos: 'verb', inflection: 'polite' },
  来ます: { baseForm: '来る', pos: 'verb', inflection: 'polite' },
  きました: { baseForm: 'くる', pos: 'verb', inflection: 'polite_past' },
  来ました: { baseForm: '来る', pos: 'verb', inflection: 'polite_past' },
  きません: { baseForm: 'くる', pos: 'verb', inflection: 'polite_negative' },
  来ません: { baseForm: '来る', pos: 'verb', inflection: 'polite_negative' },
  きませんでした: { baseForm: 'くる', pos: 'verb', inflection: 'polite_negative_past' },
  来ませんでした: { baseForm: '来る', pos: 'verb', inflection: 'polite_negative_past' },
  きましよう: { baseForm: 'くる', pos: 'verb', inflection: 'polite_volitional' },
  来ましょう: { baseForm: '来る', pos: 'verb', inflection: 'polite_volitional' },
  きて: { baseForm: 'くる', pos: 'verb', inflection: 'te_form' },
  来て: { baseForm: '来る', pos: 'verb', inflection: 'te_form' },
  きた: { baseForm: 'くる', pos: 'verb', inflection: 'past' },
  来た: { baseForm: '来る', pos: 'verb', inflection: 'past' },
  こない: { baseForm: 'くる', pos: 'verb', inflection: 'negative' },
  来ない: { baseForm: '来る', pos: 'verb', inflection: 'negative' },
  こなかった: { baseForm: 'くる', pos: 'verb', inflection: 'negative_past' },
  来なかった: { baseForm: '来る', pos: 'verb', inflection: 'negative_past' },
  こよう: { baseForm: 'くる', pos: 'verb', inflection: 'volitional' },
  来よう: { baseForm: '来る', pos: 'verb', inflection: 'volitional' },
  くれば: { baseForm: 'くる', pos: 'verb', inflection: 'conditional' },
  来れば: { baseForm: '来る', pos: 'verb', inflection: 'conditional' },
  こられる: { baseForm: 'くる', pos: 'verb', inflection: 'potential_passive' },
  来られる: { baseForm: '来る', pos: 'verb', inflection: 'potential_passive' },

  // 行く (special onbin)
  行く: { baseForm: '行く', pos: 'verb', inflection: 'dictionary' },
  いきます: { baseForm: '行く', pos: 'verb', inflection: 'polite' },
  行きます: { baseForm: '行く', pos: 'verb', inflection: 'polite' },
  いきました: { baseForm: '行く', pos: 'verb', inflection: 'polite_past' },
  行きました: { baseForm: '行く', pos: 'verb', inflection: 'polite_past' },
  いきません: { baseForm: '行く', pos: 'verb', inflection: 'polite_negative' },
  行きません: { baseForm: '行く', pos: 'verb', inflection: 'polite_negative' },
  いって: { baseForm: '行く', pos: 'verb', inflection: 'te_form' },
  行って: { baseForm: '行く', pos: 'verb', inflection: 'te_form' },
  いった: { baseForm: '行く', pos: 'verb', inflection: 'past' },
  行った: { baseForm: '行く', pos: 'verb', inflection: 'past' },
  いかない: { baseForm: '行く', pos: 'verb', inflection: 'negative' },
  行かない: { baseForm: '行く', pos: 'verb', inflection: 'negative' },
  いかなかった: { baseForm: '行く', pos: 'verb', inflection: 'negative_past' },
  行かなかった: { baseForm: '行く', pos: 'verb', inflection: 'negative_past' },

  // いい / よい (irregular adjective)
  いい: { baseForm: 'いい', pos: 'adjective', inflection: 'dictionary' },
  よい: { baseForm: 'いい', pos: 'adjective', inflection: 'dictionary' },
  よくない: { baseForm: 'いい', pos: 'adjective', inflection: 'negative' },
  よかった: { baseForm: 'いい', pos: 'adjective', inflection: 'past' },
  よくなかった: { baseForm: 'いい', pos: 'adjective', inflection: 'negative_past' },
  よくて: { baseForm: 'いい', pos: 'adjective', inflection: 'te_form' },
};

const GODAN_I_TO_U: Record<string, string> = {
  い: 'う',
  き: 'く',
  ぎ: 'ぐ',
  し: 'す',
  ち: 'つ',
  に: 'ぬ',
  び: 'ぶ',
  み: 'む',
  り: 'る',
};

const GODAN_A_TO_U: Record<string, string> = {
  わ: 'う',
  か: 'く',
  が: 'ぐ',
  さ: 'す',
  た: 'つ',
  な: 'ぬ',
  ば: 'ぶ',
  ま: 'む',
  ら: 'る',
};

/**
 * Normalizes an inflected Japanese word into its dictionary base form.
 */
export function lemmatize(surfaceText: string): LemmaResult {
  const surface = normalizeJapaneseTextNFC(surfaceText.trim());
  if (!surface) {
    return { baseForm: '', surface: '', partOfSpeech: 'other' };
  }

  // 1. Exact irregular match
  if (IRREGULAR_MAPPINGS[surface]) {
    const ir = IRREGULAR_MAPPINGS[surface]!;
    return {
      baseForm: ir.baseForm,
      surface,
      partOfSpeech: ir.pos,
      inflection: ir.inflection,
    };
  }

  // 2. Compound suru verbs with 2+ Kanji prefix (e.g. 勉強する, 勉強します, 準備した)
  const suruSuffixes = [
    { suffix: 'しませんでした', inflection: 'compound_polite_negative_past' },
    { suffix: 'しました', inflection: 'compound_polite_past' },
    { suffix: 'しません', inflection: 'compound_polite_negative' },
    { suffix: 'しましょう', inflection: 'compound_polite_volitional' },
    { suffix: 'します', inflection: 'compound_polite' },
    { suffix: 'しなかった', inflection: 'compound_negative_past' },
    { suffix: 'しない', inflection: 'compound_negative' },
    { suffix: 'して', inflection: 'compound_te_form' },
    { suffix: 'した', inflection: 'compound_past' },
    { suffix: 'する', inflection: 'compound_dictionary' },
  ];

  for (const { suffix, inflection } of suruSuffixes) {
    if (surface.endsWith(suffix) && surface.length > suffix.length) {
      const stem = surface.slice(0, surface.length - suffix.length);
      // Only treat as compound suru verb if stem has at least 2 characters (e.g. 勉強, 準備, 案内, 参加)
      // or all characters in stem are Kanji
      const kanjiCount = (stem.match(/[\u4e00-\u9faf\u3400-\u4dbf]/g) ?? []).length;
      if (kanjiCount >= 2 || (kanjiCount === stem.length && stem.length >= 2)) {
        return {
          baseForm: `${stem}する`,
          surface,
          partOfSpeech: 'verb',
          inflection,
        };
      }
    }
  }

  // 3. Length 5-6 endings:
  // 〜ませんでした
  if (surface.endsWith('ませんでした') && surface.length > 6) {
    const stem = surface.slice(0, -6);
    const lastChar = stem.charAt(stem.length - 1);
    const mapped = lastChar ? GODAN_I_TO_U[lastChar] : undefined;
    if (mapped) {
      return {
        baseForm: stem.slice(0, -1) + mapped,
        surface,
        partOfSpeech: 'verb',
        inflection: 'polite_negative_past',
      };
    }
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: 'polite_negative_past',
    };
  }

  // 〜くなかった (I-adjective negative past: 高くなかった -> 高い)
  if (surface.endsWith('くなかった') && surface.length > 5) {
    const stem = surface.slice(0, -5);
    return {
      baseForm: `${stem}い`,
      surface,
      partOfSpeech: 'adjective',
      inflection: 'negative_past',
    };
  }

  // 4. Length 4 endings:
  // 〜なかった (Verb negative past: 飲まなかった -> 飲む, 食べなかった -> 食べる)
  if (surface.endsWith('なかった') && surface.length > 4) {
    const stem = surface.slice(0, -4);
    const lastChar = stem.charAt(stem.length - 1);
    const mapped = lastChar ? GODAN_A_TO_U[lastChar] : undefined;
    if (mapped) {
      return {
        baseForm: stem.slice(0, -1) + mapped,
        surface,
        partOfSpeech: 'verb',
        inflection: 'negative_past',
      };
    }
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: 'negative_past',
    };
  }

  // 5. Length 3 endings:
  // 〜ました (polite past: 登りました -> 登る, 食べました -> 食べる, 話しました -> 話す)
  if (surface.endsWith('ました') && surface.length > 3) {
    const stem = surface.slice(0, -3);
    const lastChar = stem.charAt(stem.length - 1);
    const mapped = lastChar ? GODAN_I_TO_U[lastChar] : undefined;
    if (mapped) {
      return {
        baseForm: stem.slice(0, -1) + mapped,
        surface,
        partOfSpeech: 'verb',
        inflection: 'polite_past',
      };
    }
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: 'polite_past',
    };
  }

  // 〜ません (polite negative)
  if (surface.endsWith('ません') && surface.length > 3) {
    const stem = surface.slice(0, -3);
    const lastChar = stem.charAt(stem.length - 1);
    const mapped = lastChar ? GODAN_I_TO_U[lastChar] : undefined;
    if (mapped) {
      return {
        baseForm: stem.slice(0, -1) + mapped,
        surface,
        partOfSpeech: 'verb',
        inflection: 'polite_negative',
      };
    }
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: 'polite_negative',
    };
  }

  // 〜ましょう (polite volitional)
  if (surface.endsWith('ましょう') && surface.length > 4) {
    const stem = surface.slice(0, -4);
    const lastChar = stem.charAt(stem.length - 1);
    const mapped = lastChar ? GODAN_I_TO_U[lastChar] : undefined;
    if (mapped) {
      return {
        baseForm: stem.slice(0, -1) + mapped,
        surface,
        partOfSpeech: 'verb',
        inflection: 'polite_volitional',
      };
    }
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: 'polite_volitional',
    };
  }

  // 〜くない (I-adjective negative: 高くない -> 高い)
  if (surface.endsWith('くない') && surface.length > 3) {
    const stem = surface.slice(0, -3);
    return {
      baseForm: `${stem}い`,
      surface,
      partOfSpeech: 'adjective',
      inflection: 'negative',
    };
  }

  // 〜かった (I-adjective past: 高かった -> 高い)
  if (surface.endsWith('かった') && surface.length > 3) {
    const stem = surface.slice(0, -3);
    return {
      baseForm: `${stem}い`,
      surface,
      partOfSpeech: 'adjective',
      inflection: 'past',
    };
  }

  // 〜だった (Na-adjective past: 静かだった -> 静か)
  if (surface.endsWith('だった') && surface.length > 3) {
    const stem = surface.slice(0, -3);
    return {
      baseForm: stem,
      surface,
      partOfSpeech: 'adjective',
      inflection: 'past',
    };
  }

  // 6. Length 2 endings:
  // 〜ます (polite: 登ります -> 登る, 食べます -> 食べる, 話します -> 話す)
  if (surface.endsWith('ます') && surface.length > 2) {
    const stem = surface.slice(0, -2);
    const lastChar = stem.charAt(stem.length - 1);
    const mapped = lastChar ? GODAN_I_TO_U[lastChar] : undefined;
    if (mapped) {
      return {
        baseForm: stem.slice(0, -1) + mapped,
        surface,
        partOfSpeech: 'verb',
        inflection: 'polite',
      };
    }
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: 'polite',
    };
  }

  // 〜ない (Verb negative: 読まない -> 読む, 食べない -> 食べる)
  if (surface.endsWith('ない') && surface.length > 2) {
    const stem = surface.slice(0, -2);
    const lastChar = stem.charAt(stem.length - 1);
    const mapped = lastChar ? GODAN_A_TO_U[lastChar] : undefined;
    if (mapped) {
      return {
        baseForm: stem.slice(0, -1) + mapped,
        surface,
        partOfSpeech: 'verb',
        inflection: 'negative',
      };
    }
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: 'negative',
    };
  }

  // 〜くて (I-adjective te-form: 高くて -> 高い)
  if (surface.endsWith('くて') && surface.length > 2) {
    const stem = surface.slice(0, -2);
    return {
      baseForm: `${stem}い`,
      surface,
      partOfSpeech: 'adjective',
      inflection: 'te_form',
    };
  }

  // Double consonant / onbin past and te forms:
  // って / った (買う, 待つ, 取る)
  if (
    (surface.endsWith('って') || surface.endsWith('った')) &&
    surface.length > 2
  ) {
    const stem = surface.slice(0, -2);
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: surface.endsWith('って') ? 'te_form' : 'past',
    };
  }

  // んで / んだ (飲む, 呼ぶ, 死ぬ)
  if (
    (surface.endsWith('んで') || surface.endsWith('んだ')) &&
    surface.length > 2
  ) {
    const stem = surface.slice(0, -2);
    return {
      baseForm: `${stem}む`,
      surface,
      partOfSpeech: 'verb',
      inflection: surface.endsWith('んで') ? 'te_form' : 'past',
    };
  }

  // いて / いた (書く)
  if (
    (surface.endsWith('いて') || surface.endsWith('いた')) &&
    surface.length > 2
  ) {
    const stem = surface.slice(0, -2);
    return {
      baseForm: `${stem}く`,
      surface,
      partOfSpeech: 'verb',
      inflection: surface.endsWith('いて') ? 'te_form' : 'past',
    };
  }

  // いで / いだ (泳ぐ)
  if (
    (surface.endsWith('いで') || surface.endsWith('いだ')) &&
    surface.length > 2
  ) {
    const stem = surface.slice(0, -2);
    return {
      baseForm: `${stem}ぐ`,
      surface,
      partOfSpeech: 'verb',
      inflection: surface.endsWith('いで') ? 'te_form' : 'past',
    };
  }

  // して / した (話す)
  if (
    (surface.endsWith('して') || surface.endsWith('した')) &&
    surface.length > 2
  ) {
    const stem = surface.slice(0, -2);
    return {
      baseForm: `${stem}す`,
      surface,
      partOfSpeech: 'verb',
      inflection: surface.endsWith('して') ? 'te_form' : 'past',
    };
  }

  // 7. Length 1 endings:
  // 〜て / 〜た (Ichidan verb: 食べて -> 食べる, 食べた -> 食べる, 見て -> 見る)
  if ((surface.endsWith('て') || surface.endsWith('た')) && surface.length >= 2) {
    const stem = surface.slice(0, -1);
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: surface.endsWith('て') ? 'te_form' : 'past',
    };
  }

  // 〜な (Na-adjective: 静かな -> 静か)
  if (surface.endsWith('な') && surface.length > 2) {
    return {
      baseForm: surface.slice(0, -1),
      surface,
      partOfSpeech: 'adjective',
      inflection: 'attributive',
    };
  }

  // Default: Already in base form
  let guessedPos: LemmaResult['partOfSpeech'] = 'noun';
  if (surface.endsWith('い') && surface.length >= 2) {
    guessedPos = 'adjective';
  } else if (
    surface.endsWith('る') ||
    surface.endsWith('う') ||
    surface.endsWith('く') ||
    surface.endsWith('す') ||
    surface.endsWith('つ') ||
    surface.endsWith('ぬ') ||
    surface.endsWith('む')
  ) {
    guessedPos = 'verb';
  }

  return {
    baseForm: surface,
    surface,
    partOfSpeech: guessedPos,
    inflection: 'dictionary',
  };
}

export const lemmatizeJapaneseWord = lemmatize;
