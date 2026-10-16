import type { Level, MondaiType, Skill } from '@jlpt/schema';
import type {
  AdminQuestion,
  AdminQuestionGroup,
  AdminQuestionOption,
  ContentStatus,
} from '../content/types';
import {
  createTextSegment,
  richTextToPlainText,
} from '../content/types';
import type { SourceFileRef, SourcePageResolution } from './types';

/**
 * Escapes a single CSV value according to RFC 4180.
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Robust RFC 4180 CSV parser handling multiline fields and quoted commas.
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("")
          currentCell += '"';
          i++;
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        // Handle CRLF or standalone CR
        if (nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export class JsonCsvService {
  /**
   * Serializes question groups into JSON format.
   */
  public exportQuestionsToJson(groups: AdminQuestionGroup[]): string {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalGroups: groups.length,
        totalQuestions: groups.reduce((acc, g) => acc + g.questions.length, 0),
        groups,
      },
      null,
      2,
    );
  }

  /**
   * Deserializes question groups from JSON format.
   */
  public importQuestionsFromJson(jsonStr: string, operatorId = 'importer'): AdminQuestionGroup[] {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const rawGroups = (Array.isArray(parsed['groups']) ? parsed['groups'] : [parsed]) as AdminQuestionGroup[];

    return rawGroups.map((g) => ({
      ...g,
      version: typeof g.version === 'number' ? g.version : 1,
      status: g.status || 'draft',
      lastEditedBy: operatorId,
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Exports question groups into RFC 4180 compliant CSV string.
   */
  public exportQuestionsToCsv(groups: AdminQuestionGroup[]): string {
    const headers = [
      'groupId',
      'version',
      'level',
      'sectionCode',
      'mondaiType',
      'skill',
      'instructions',
      'sourceRef',
      'sourcePages',
      'status',
      'questionNumber',
      'stem',
      'option1',
      'option2',
      'option3',
      'option4',
      'correctOption',
      'explanation',
    ];

    const lines: string[] = [headers.join(',')];

    for (const g of groups) {
      const instructionsText = richTextToPlainText(g.instructions);
      const sourcePagesStr = g.sourcePage ? String(g.sourcePage) : '';

      for (const q of g.questions) {
        const stemText = richTextToPlainText(q.stem);
        const opt1 = q.options[0] ? richTextToPlainText(q.options[0].content) : '';
        const opt2 = q.options[1] ? richTextToPlainText(q.options[1].content) : '';
        const opt3 = q.options[2] ? richTextToPlainText(q.options[2].content) : '';
        const opt4 = q.options[3] ? richTextToPlainText(q.options[3].content) : '';
        const explanationText = q.explanation ? richTextToPlainText(q.explanation) : '';

        const row = [
          escapeCsvCell(g.id),
          escapeCsvCell(g.version),
          escapeCsvCell(g.level),
          escapeCsvCell(g.sectionCode),
          escapeCsvCell(g.mondaiType),
          escapeCsvCell(g.skill),
          escapeCsvCell(instructionsText),
          escapeCsvCell(g.sourceRef),
          escapeCsvCell(sourcePagesStr),
          escapeCsvCell(g.status),
          escapeCsvCell(q.number || ''),
          escapeCsvCell(stemText),
          escapeCsvCell(opt1),
          escapeCsvCell(opt2),
          escapeCsvCell(opt3),
          escapeCsvCell(opt4),
          escapeCsvCell(q.correctOption),
          escapeCsvCell(explanationText),
        ];

        lines.push(row.join(','));
      }
    }

    return lines.join('\n');
  }

  /**
   * Imports questions from CSV and reconstructs AdminQuestionGroup array.
   */
  public importQuestionsFromCsv(csvStr: string, operatorId = 'importer'): AdminQuestionGroup[] {
    const rows = parseCsvRows(csvStr);
    if (rows.length < 2) return [];

    const header = rows[0]!;
    const colIndex = (name: string): number => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

    const idxGroupId = colIndex('groupId');
    const idxVersion = colIndex('version');
    const idxLevel = colIndex('level');
    const idxSectionCode = colIndex('sectionCode');
    const idxMondaiType = colIndex('mondaiType');
    const idxSkill = colIndex('skill');
    const idxInstructions = colIndex('instructions');
    const idxSourceRef = colIndex('sourceRef');
    const idxSourcePages = colIndex('sourcePages');
    const idxStatus = colIndex('status');
    const idxNumber = colIndex('questionNumber');
    const idxStem = colIndex('stem');
    const idxOpt1 = colIndex('option1');
    const idxOpt2 = colIndex('option2');
    const idxOpt3 = colIndex('option3');
    const idxOpt4 = colIndex('option4');
    const idxCorrectOption = colIndex('correctOption');
    const idxExplanation = colIndex('explanation');

    const groupMap = new Map<string, AdminQuestionGroup>();
    const now = new Date().toISOString();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!;
      if (row.length === 0 || !row.some((cell) => cell.length > 0)) continue;

      const groupId = row[idxGroupId] || `grp_csv_${r}`;
      let group = groupMap.get(groupId);

      if (!group) {
        const level = (row[idxLevel] || 'N5') as Level;
        const sectionCode = row[idxSectionCode] || 'language_knowledge';
        const mondaiType = (row[idxMondaiType] || 'kanji_reading') as MondaiType;
        const skill = (row[idxSkill] || 'kanji') as Skill;
        const instructionsText = row[idxInstructions] || 'Hướng dẫn làm bài';
        const sourceRef = row[idxSourceRef] || '';
        const sourcePageNum = row[idxSourcePages] ? parseInt(row[idxSourcePages]!, 10) : undefined;
        const status = (row[idxStatus] || 'draft') as ContentStatus;
        const version = row[idxVersion] ? parseInt(row[idxVersion]!, 10) : 1;

        group = {
          id: groupId,
          version,
          level,
          sectionCode,
          mondaiType,
          skill,
          instructions: [createTextSegment(instructionsText)],
          passage: null,
          mediaIds: [],
          questions: [],
          sourceRef,
          sourcePage: isNaN(Number(sourcePageNum)) ? undefined : sourcePageNum,
          status,
          authorId: operatorId,
          lastEditedBy: operatorId,
          createdAt: now,
          updatedAt: now,
        };
        groupMap.set(groupId, group);
      }

      // Parse question
      const qNum = row[idxNumber] || String(group.questions.length + 1);
      const stemText = row[idxStem] || '';
      const opt1 = row[idxOpt1] || '';
      const opt2 = row[idxOpt2] || '';
      const opt3 = row[idxOpt3] || '';
      const opt4 = row[idxOpt4] || '';
      const correctOption = parseInt(row[idxCorrectOption] || '1', 10);
      const explanationText = row[idxExplanation] || '';

      const options: AdminQuestionOption[] = [];
      if (opt1) options.push({ label: '1', content: [createTextSegment(opt1)] });
      if (opt2) options.push({ label: '2', content: [createTextSegment(opt2)] });
      if (opt3) options.push({ label: '3', content: [createTextSegment(opt3)] });
      if (opt4) options.push({ label: '4', content: [createTextSegment(opt4)] });

      const question: AdminQuestion = {
        number: qNum,
        stem: [createTextSegment(stemText)],
        options,
        correctOption: isNaN(correctOption) ? 1 : correctOption,
        explanation: explanationText ? [createTextSegment(explanationText)] : undefined,
      };

      group.questions.push(question);
    }

    return Array.from(groupMap.values());
  }

  /**
   * Resolves optional source page reference to view target.
   * Enforces: "JSON/CSV import/export roundtrip và source page tùy chọn mở đúng"
   */
  public resolveSourcePage(
    group: AdminQuestionGroup,
    sourceFiles: SourceFileRef[] = [],
  ): SourcePageResolution {
    const pageNum = group.sourcePage;
    const sourceRef = group.sourceRef || '';

    if (pageNum === undefined || pageNum === null) {
      return {
        sourceFileId: sourceRef,
        pageNumber: 0,
        url: '',
        available: false,
        error: 'Chưa khai báo trang nguồn (sourcePage).',
      };
    }

    if (isNaN(pageNum) || pageNum < 1) {
      return {
        sourceFileId: sourceRef,
        pageNumber: pageNum,
        url: '',
        available: false,
        error: `Số trang không hợp lệ: ${pageNum}. Số trang phải là số nguyên >= 1.`,
      };
    }

    // Match with source file if sourceFiles provided
    const matchedFile = sourceFiles.find(
      (sf) => sf.id === sourceRef || sf.path.endsWith(sourceRef) || sf.path.includes(sourceRef),
    );

    if (sourceFiles.length > 0 && !matchedFile) {
      return {
        sourceFileId: sourceRef,
        pageNumber: pageNum,
        url: '',
        available: false,
        error: `Tệp nguồn PDF "${sourceRef}" không tồn tại trong danh mục tài liệu đính kèm.`,
      };
    }

    const fileId = matchedFile ? matchedFile.id : (sourceRef || 'default-source');
    const safeUrl = `/admin/sources/${encodeURIComponent(fileId)}#page=${pageNum}`;

    return {
      sourceFileId: fileId,
      pageNumber: pageNum,
      url: safeUrl,
      available: true,
    };
  }
}
