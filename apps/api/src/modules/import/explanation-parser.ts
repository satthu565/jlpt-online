import type { RichBlock, RichText } from '@jlpt/schema';

export interface ParsedExplanationResult {
  correctReason: RichText;
  wrongReasonsByOption?: Record<string, RichText>;
  translation?: RichText;
  transcript?: RichText;
  blocks?: RichBlock[];
  explanationMarkdown: string;
  translationVi: string;
}

/**
 * Extracts plain text from an array of RichText segments.
 */
export function extractPlainTextFromRichText(segments: RichText | unknown): string {
  if (!Array.isArray(segments)) return '';
  return segments
    .map((seg: unknown) => {
      if (typeof seg === 'string') return seg;
      if (!seg || typeof seg !== 'object') return '';
      const s = seg as Record<string, unknown>;
      if (s.t === 'text' && typeof s.text === 'string') return s.text;
      if (s.t === 'ruby' && typeof s.text === 'string') return s.text;
      if ((s.t === 'underline' || s.t === 'emphasis') && Array.isArray(s.children)) {
        return extractPlainTextFromRichText(s.children as RichText);
      }
      if (s.t === 'br') return '\n';
      return '';
    })
    .join('');
}

/**
 * Extracts plain text from an array of RichBlock blocks.
 */
export function extractPlainTextFromBlocks(blocks: RichBlock[] | unknown): string {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map((b: unknown) => {
      if (!b || typeof b !== 'object') return '';
      const block = b as Record<string, unknown>;
      if (block.type === 'paragraph' && Array.isArray(block.content)) {
        return extractPlainTextFromRichText(block.content as RichText);
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Parses package explanation blocks according to JLPT I17 contract:
 * - "• Dịch nghĩa:" -> translation
 * - "• Đáp án đúng: [n]" + remainder -> correctReason
 * - Each "- [n] ...: ..." line under "• Phân tích các phương án còn lại:" -> wrongReasonsByOption[n]
 * - If prefixes do not match: keeps all blocks and uses their text as correctReason.
 * - Preserves original blocks in content.
 * - Script for listening question: sets transcript from group.transcript.
 */
export function parsePackageExplanation(
  explanation: { locale?: string; blocks?: RichBlock[] } | null | undefined,
  groupTranscript?: RichText | null,
): ParsedExplanationResult | null {
  const hasBlocks = Boolean(
    explanation &&
    Array.isArray(explanation.blocks) &&
    explanation.blocks.length > 0,
  );
  const hasTranscript = Boolean(
    groupTranscript &&
    Array.isArray(groupTranscript) &&
    groupTranscript.length > 0,
  );

  // If neither explanation nor transcript exists, no draft is created
  if (!hasBlocks && !hasTranscript) {
    return null;
  }

  const rawBlocks = hasBlocks ? explanation!.blocks! : [];
  const rawText = extractPlainTextFromBlocks(rawBlocks);

  // Check prefix matches:
  // "• Dịch nghĩa:", "• Đáp án đúng:", "• Phân tích các phương án còn lại:"
  const hasTransPrefix = /(?:^|\n)\s*[•\-*]?\s*Dịch nghĩa\s*:/i.test(rawText);
  const hasCorrectPrefix = /(?:^|\n)\s*[•\-*]?\s*Đáp án đúng\s*:/i.test(rawText);
  const hasWrongPrefix = /(?:^|\n)\s*[•\-*]?\s*Phân tích các phương án còn lại\s*:/i.test(rawText);

  const isPrefixMatched = hasTransPrefix || hasCorrectPrefix || hasWrongPrefix;

  let correctReasonText = '';
  let translationText = '';
  const wrongReasonsTextMap: Record<string, string> = {};

  if (!isPrefixMatched) {
    // Fallback: không khớp tiền tố thì giữ toàn bộ blocks và dùng chữ của chúng làm correctReason
    correctReasonText = rawText.trim();
  } else {
    // Parse line-by-line across sections
    const lines = rawText.split(/\r?\n/);
    type Section = 'none' | 'translation' | 'correctReason' | 'wrongReasons';
    let currentSection: Section = 'none';
    const translationLines: string[] = [];
    const correctReasonLines: string[] = [];
    let currentWrongOpt: string | null = null;
    let currentWrongLines: string[] = [];

    const flushWrongOpt = () => {
      if (currentWrongOpt && currentWrongLines.length > 0) {
        wrongReasonsTextMap[currentWrongOpt] = currentWrongLines.join(' ').trim();
        currentWrongOpt = null;
        currentWrongLines = [];
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // 1. Translation header: "• Dịch nghĩa: ..."
      const transMatch = line.match(/^[•\-*]?\s*Dịch nghĩa\s*:\s*(.*)$/i);
      if (transMatch) {
        flushWrongOpt();
        currentSection = 'translation';
        if (transMatch[1]?.trim()) {
          translationLines.push(transMatch[1].trim());
        }
        continue;
      }

      // 2. Correct reason header: "• Đáp án đúng: [n] ..." + remainder
      const correctMatch = line.match(/^[•\-*]?\s*Đáp án đúng\s*:\s*(.*)$/i);
      if (correctMatch) {
        flushWrongOpt();
        currentSection = 'correctReason';
        // Strip bullet if present, keep "Đáp án đúng: ..." and remainder
        const lineWithoutBullet = line.replace(/^[•\-*]\s*/, '').trim();
        correctReasonLines.push(lineWithoutBullet);
        continue;
      }

      // 3. Wrong reasons header: "• Phân tích các phương án còn lại:"
      const wrongHeaderMatch = line.match(/^[•\-*]?\s*Phân tích các phương án còn lại\s*:\s*(.*)$/i);
      if (wrongHeaderMatch) {
        flushWrongOpt();
        currentSection = 'wrongReasons';
        continue;
      }

      // Inside sections
      if (currentSection === 'translation') {
        translationLines.push(line);
      } else if (currentSection === 'correctReason') {
        correctReasonLines.push(line);
      } else if (currentSection === 'wrongReasons') {
        // Line like "- [1] ...: ..." or "- 1. ...: ..." or "- [1] ..."
        const optLineMatch = line.match(/^-\s*\[?(\d+)\]?\s*(.*)$/);
        if (optLineMatch) {
          flushWrongOpt();
          currentWrongOpt = optLineMatch[1] ?? null;
          let optText = (optLineMatch[2] || '').trim();
          optText = optText.replace(/^[:.]\s*/, '').trim();
          currentWrongLines.push(optText);
        } else if (currentWrongOpt) {
          currentWrongLines.push(line);
        }
      }
    }
    flushWrongOpt();

    translationText = translationLines.join('\n').trim();
    correctReasonText = correctReasonLines.join('\n').trim();

    // If correctReasonLines was empty despite prefix match, fallback to rawText
    if (!correctReasonText && rawText.trim()) {
      correctReasonText = rawText.trim();
    }
  }

  // If raw explanation was empty, but group has transcript
  if (!correctReasonText && hasTranscript) {
    correctReasonText = 'Lời giải và script bài nghe đính kèm theo gói câu hỏi.';
  }

  // Construct RichText structures
  const correctReasonRichText: RichText = [
    { t: 'text', text: correctReasonText },
  ];

  let translationRichText: RichText | undefined;
  if (translationText) {
    translationRichText = [{ t: 'text', text: translationText }];
  }

  let wrongReasonsRichText: Record<string, RichText> | undefined;
  const wrongKeys = Object.keys(wrongReasonsTextMap);
  if (wrongKeys.length > 0) {
    wrongReasonsRichText = {};
    for (const k of wrongKeys) {
      wrongReasonsRichText[k] = [{ t: 'text', text: wrongReasonsTextMap[k]! }];
    }
  }

  // Construct markdown formatted text for admin moderation screen
  const markdownParts: string[] = [];
  if (correctReasonText) {
    markdownParts.push(`**Lý do đúng**:\n${correctReasonText}`);
  }
  if (wrongKeys.length > 0) {
    const wrongList = wrongKeys
      .sort()
      .map((k) => `- [${k}] Phương án ${k}: ${wrongReasonsTextMap[k]}`)
      .join('\n');
    markdownParts.push(`**Phân tích các phương án còn lại**:\n${wrongList}`);
  }
  if (hasTranscript) {
    const transcriptPlain = extractPlainTextFromRichText(groupTranscript!);
    if (transcriptPlain) {
      markdownParts.push(`**Script bài nghe**:\n${transcriptPlain}`);
    }
  }

  const explanationMarkdown = markdownParts.join('\n\n') || correctReasonText;

  return {
    correctReason: correctReasonRichText,
    wrongReasonsByOption: wrongReasonsRichText,
    translation: translationRichText,
    transcript: hasTranscript ? groupTranscript! : undefined,
    blocks: hasBlocks ? rawBlocks : undefined,
    explanationMarkdown,
    translationVi: translationText,
  };
}
