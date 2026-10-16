import { normalizeJapaneseTextNFC } from './japanese-text.js';

export interface LemmaResult {
  baseForm: string;
  surface: string;
  partOfSpeech: 'verb' | 'adjective' | 'noun' | 'particle' | 'auxiliary' | 'adverb' | 'other';
  inflection?: string;
}

// Well-known irregular verbs and special words mapping
const IRREGULAR_MAPPINGS: Record<string, { baseForm: string; pos: LemmaResult['partOfSpeech']; inflection: string }> = {
  // する / 為る
  する: { baseForm: 'する', pos: 'verb', inflection: 'dictionary' },
  します: { baseForm: 'する', pos: 'verb', inflection: 'polite' },
  しました: { baseForm: 'する', pos: 'verb', inflection: 'polite_past' },
  しません: { baseForm: 'する', pos: 'verb', inflection: 'polite_negative' },
  しませんでした: { baseForm: 'する', pos: 'verb', inflection: 'polite_negative_past' },
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

  // 行く (special onbin)
  行った: { baseForm: '行く', pos: 'verb', inflection: 'past' },
  行って: { baseForm: '行く', pos: 'verb', inflection: 'te_form' },
  いった: { baseForm: 'いく', pos: 'verb', inflection: 'past' },
  いって: { baseForm: 'いく', pos: 'verb', inflection: 'te_form' },

  // いい / よい (irregular adjective)
  いい: { baseForm: 'いい', pos: 'adjective', inflection: 'dictionary' },
  よい: { baseForm: 'いい', pos: 'adjective', inflection: 'dictionary' },
  よくない: { baseForm: 'いい', pos: 'adjective', inflection: 'negative' },
  よかった: { baseForm: 'いい', pos: 'adjective', inflection: 'past' },
  よくなかった: { baseForm: 'いい', pos: 'adjective', inflection: 'negative_past' },
  よくて: { baseForm: 'いい', pos: 'adjective', inflection: 'te_form' },
  よく: { baseForm: 'いい', pos: 'adjective', inflection: 'adverbial' },
};

/**
 * Normalizes Japanese surface tokens into their dictionary base form (Feature DATA-02).
 */
export function lemmatize(surfaceText: string): LemmaResult {
  const surface = normalizeJapaneseTextNFC(surfaceText.trim());
  if (!surface) {
    return { baseForm: '', surface: '', partOfSpeech: 'other' };
  }

  // 1. Direct irregular match
  if (IRREGULAR_MAPPINGS[surface]) {
    const ir = IRREGULAR_MAPPINGS[surface];
    return {
      baseForm: ir.baseForm,
      surface,
      partOfSpeech: ir.pos,
      inflection: ir.inflection,
    };
  }

  // 2. Compound suru verbs (e.g. 勉強します, 勉強して, 勉強した)
  if (surface.length > 2 && (surface.endsWith('する') || surface.endsWith('します') || surface.endsWith('しました') || surface.endsWith('して') || surface.endsWith('した') || surface.endsWith('しない') || surface.endsWith('しなかった'))) {
    for (const [suffix, { baseForm: sBase, inflection }] of Object.entries(IRREGULAR_MAPPINGS)) {
      if (suffix.startsWith('し') || suffix === 'する') {
        if (surface.endsWith(suffix) && surface.length > suffix.length) {
          const stem = surface.slice(0, surface.length - suffix.length);
          return {
            baseForm: `${stem}${sBase}`,
            surface,
            partOfSpeech: 'verb',
            inflection: `compound_${inflection}`,
          };
        }
      }
    }
  }

  // 3. Verb polite forms (〜ます, 〜ました, 〜ません, 〜ませんでした)
  const politePatterns: Array<{ ending: string; inflection: string }> = [
    { ending: 'ませんでした', inflection: 'polite_negative_past' },
    { ending: 'ました', inflection: 'polite_past' },
    { ending: 'ません', inflection: 'polite_negative' },
    { ending: 'ましょう', inflection: 'polite_volitional' },
    { ending: 'ます', inflection: 'polite' },
  ];

  for (const { ending, inflection } of politePatterns) {
    if (surface.endsWith(ending) && surface.length > ending.length) {
      const stem = surface.slice(0, surface.length - ending.length);
      const lastChar = stem[stem.length - 1];

      // Godan transformations:
      // い -> う (買い -> 買う)
      // き -> く (書き -> 書く)
      // ぎ -> ぐ (泳ぎ -> 泳ぐ)
      // し -> す (話し -> 話す)
      // ち -> つ (立ち -> 立つ)
      // に -> ぬ (死に -> 死ぬ)
      // び -> ぶ (呼び -> 呼ぶ)
      // み -> む (飲み -> 飲む)
      // り -> る (取り -> 取る)
      const godanMap: Record<string, string> = {
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

      if (godanMap[lastChar]) {
        const base = stem.slice(0, -1) + godanMap[lastChar];
        return {
          baseForm: base,
          surface,
          partOfSpeech: 'verb',
          inflection,
        };
      }

      // Ichidan verb (stem + る) (e.g. 食べます -> 食べる, 見ます -> 見る)
      return {
        baseForm: `${stem}る`,
        surface,
        partOfSpeech: 'verb',
        inflection,
      };
    }
  }

  // 4. Te-form and Ta-form (past)
  // 〜て / 〜た, 〜で / 〜だ
  const pastTePatterns: Array<{ teEnding: string; taEnding: string; replacement: string }> = [
    { teEnding: 'って', taEnding: 'った', replacement: 'る' }, // 取って -> 取る, 買って -> 買う, 待って -> 待つ
    { teEnding: 'んで', taEnding: 'んだ', replacement: 'む' }, // 飲んで -> 飲む, 呼んで -> 呼ぶ
    { teEnding: 'いて', taEnding: 'いた', replacement: 'く' }, // 書いて -> 書く
    { teEnding: 'いで', taEnding: 'いだ', replacement: 'ぐ' }, // 泳いで -> 泳ぐ
    { teEnding: 'して', taEnding: 'した', replacement: 'す' }, // 話して -> 話す
  ];

  for (const { teEnding, taEnding, replacement } of pastTePatterns) {
    if (surface.endsWith(teEnding) && surface.length > teEnding.length) {
      const stem = surface.slice(0, surface.length - teEnding.length);
      return {
        baseForm: `${stem}${replacement}`,
        surface,
        partOfSpeech: 'verb',
        inflection: 'te_form',
      };
    }
    if (surface.endsWith(taEnding) && surface.length > taEnding.length) {
      const stem = surface.slice(0, surface.length - taEnding.length);
      return {
        baseForm: `${stem}${replacement}`,
        surface,
        partOfSpeech: 'verb',
        inflection: 'past',
      };
    }
  }

  // Ichidan te/ta: 食べて -> 食べる, 食べた -> 食べる
  if ((surface.endsWith('て') || surface.endsWith('た')) && surface.length >= 2) {
    const stem = surface.slice(0, -1);
    const inflection = surface.endsWith('て') ? 'te_form' : 'past';
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection,
    };
  }

  // 5. Negative forms (〜ない, 〜なかった)
  if (surface.endsWith('なかった') && surface.length > 4) {
    const stem = surface.slice(0, -4);
    const lastChar = stem[stem.length - 1];
    const aToU: Record<string, string> = {
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
    if (aToU[lastChar]) {
      return {
        baseForm: stem.slice(0, -1) + aToU[lastChar],
        surface,
        partOfSpeech: 'verb',
        inflection: 'negative_past',
      };
    }
    // Ichidan
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: 'negative_past',
    };
  }

  if (surface.endsWith('ない') && surface.length > 2) {
    const stem = surface.slice(0, -2);
    const lastChar = stem[stem.length - 1];
    const aToU: Record<string, string> = {
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
    if (aToU[lastChar]) {
      return {
        baseForm: stem.slice(0, -1) + aToU[lastChar],
        surface,
        partOfSpeech: 'verb',
        inflection: 'negative',
      };
    }
    // Ichidan
    return {
      baseForm: `${stem}る`,
      surface,
      partOfSpeech: 'verb',
      inflection: 'negative',
    };
  }

  // 6. I-adjectives inflections:
  // 〜くない, 〜くなかった, 〜かった, 〜くて
  const adjPatterns: Array<{ ending: string; inflection: string }> = [
    { ending: 'くなかった', inflection: 'negative_past' },
    { ending: 'くない', inflection: 'negative' },
    { ending: 'かった', inflection: 'past' },
    { ending: 'くて', inflection: 'te_form' },
  ];

  for (const { ending, inflection } of adjPatterns) {
    if (surface.endsWith(ending) && surface.length > ending.length) {
      const stem = surface.slice(0, surface.length - ending.length);
      return {
        baseForm: `${stem}い`,
        surface,
        partOfSpeech: 'adjective',
        inflection,
      };
    }
  }

  // 7. Na-adjectives inflections:
  // 〜な, 〜だった
  if (surface.endsWith('な') && surface.length > 2) {
    return {
      baseForm: surface.slice(0, -1),
      surface,
      partOfSpeech: 'adjective',
      inflection: 'attributive',
    };
  }
  if (surface.endsWith('だった') && surface.length > 3) {
    return {
      baseForm: surface.slice(0, -3),
      surface,
      partOfSpeech: 'adjective',
      inflection: 'past',
    };
  }

  // Default: Already in base form
  let guessedPos: LemmaResult['partOfSpeech'] = 'noun';
  if (surface.endsWith('い') && surface.length >= 2) {
    guessedPos = 'adjective';
  } else if (surface.endsWith('る') || surface.endsWith('う') || surface.endsWith('く') || surface.endsWith('す') || surface.endsWith('つ') || surface.endsWith('ぬ') || surface.endsWith('む')) {
    guessedPos = 'verb';
  }

  return {
    baseForm: surface,
    surface,
    partOfSpeech: guessedPos,
    inflection: 'dictionary',
  };
}
