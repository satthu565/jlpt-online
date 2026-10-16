import { Injectable } from '@nestjs/common';
import type { NotebookItemDto } from './learning.types.js';

export const DANGEROUS_FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '|', '%', ';'];

/**
 * Neutralizes CSV formula injection by prepending a single quote (') if the field starts
 * with dangerous formula prefix characters.
 * (Acceptance 4: CSV formula injection neutralized).
 */
export function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }

  let str = String(val);

  // Check if string starts with any dangerous formula trigger character
  const startsWithDangerous = DANGEROUS_FORMULA_PREFIXES.some((prefix) =>
    str.startsWith(prefix),
  );

  if (startsWithDangerous) {
    // Neutralize by prefixing with a single quote so spreadsheets treat as literal text
    str = `'${str}`;
  }

  // RFC 4180 CSV escaping: if contains quotes, commas, or newlines, quote the field
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

@Injectable()
export class CsvExportService {
  /**
   * Converts a list of notebook items into a safe CSV string with formula injection neutralized.
   */
  exportNotebookItemsToCsv(items: NotebookItemDto[]): string {
    const headers = [
      'id',
      'kind',
      'term',
      'reading',
      'meaning',
      'partOfSpeech',
      'strokeCount',
      'mastered',
      'tags',
      'examples',
      'version',
      'createdAt',
    ];

    const rows = items.map((item) => [
      sanitizeCsvField(item.id),
      sanitizeCsvField(item.kind),
      sanitizeCsvField(item.term ?? ''),
      sanitizeCsvField(item.reading ?? ''),
      sanitizeCsvField(item.meaning ?? ''),
      sanitizeCsvField(item.partOfSpeech ?? ''),
      sanitizeCsvField(item.strokeCount ?? ''),
      sanitizeCsvField(item.mastered ? 'true' : 'false'),
      sanitizeCsvField(item.tags.join(';')),
      sanitizeCsvField((item.examples ?? []).join(' | ')),
      sanitizeCsvField(item.version),
      sanitizeCsvField(item.createdAt),
    ]);

    const csvLines = [headers.join(','), ...rows.map((row) => row.join(','))];
    return csvLines.join('\r\n');
  }
}
