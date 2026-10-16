import { createZipBuffer, readZipBuffer } from '../zip.js';
import type { CorpusAggregator } from '../nlp/corpus-aggregator.js';
import type {
  CorpusProvenanceMeta,
  ExportOptions,
  ExportResult,
  ParsedExportResult,
} from './types.js';

export const DANGEROUS_FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '|', '%', ';'] as const;

/**
 * Sanitizes CSV cell values to neutralize spreadsheet formula injection.
 * Prepends a single quote (') if the field starts with dangerous characters.
 */
export function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }

  let str = String(val);
  const startsWithDangerous = DANGEROUS_FORMULA_PREFIXES.some((prefix) =>
    str.startsWith(prefix),
  );

  if (startsWithDangerous) {
    str = `'${str}`;
  }

  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Sanitizes string values for XLSX to neutralize formula injection.
 */
export function sanitizeXlsxValue(val: unknown): string | number {
  if (typeof val === 'number') {
    return val;
  }
  if (val === null || val === undefined) {
    return '';
  }
  let str = String(val);
  const startsWithDangerous = DANGEROUS_FORMULA_PREFIXES.some((prefix) =>
    str.startsWith(prefix),
  );
  if (startsWithDangerous) {
    str = `'${str}`;
  }
  return str;
}

/**
 * Strips formula injection neutralization single-quote if it was prepended to a dangerous character.
 */
export function desanitizeValue(val: string): string {
  if (val.startsWith("'") && val.length > 1) {
    const afterQuote = val.charAt(1);
    if ((DANGEROUS_FORMULA_PREFIXES as readonly string[]).includes(afterQuote)) {
      return val.slice(1);
    }
  }
  return val;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(n: number): string {
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/**
 * Exports corpus dataset data to RFC 4180 compliant CSV format with UTF-8 BOM and formula sanitization.
 */
export function exportDatasetToCsv(
  aggregator: CorpusAggregator,
  options: ExportOptions,
): ExportResult {
  const meta = aggregator.getMetadata();
  const provenance: CorpusProvenanceMeta = {
    datasetId: meta.datasetId,
    name: meta.name,
    version: meta.version,
    source: meta.source,
    date: meta.date,
    license: 'CC-BY-SA-4.0',
    attribution: meta.licenseAttribution,
  };

  let headers: string[] = [];
  const rows: Array<Array<string | number>> = [];

  if (options.type === 'vocabulary') {
    headers = [
      'Rank',
      'BaseForm',
      'Surface',
      'Level',
      'PartOfSpeech',
      'Frequency',
      'TargetFrequency',
      'IncidentalFrequency',
      'DistinctExamsCount',
      'DatasetId',
      'DatasetName',
      'Version',
      'Source',
      'Date',
      'License',
    ];

    const analysis = aggregator.getVocabularyAnalysis({ level: options.level });
    for (const item of analysis.rankings) {
      rows.push([
        item.rank,
        item.baseForm,
        item.surface,
        item.level ?? '',
        item.partOfSpeech ?? '',
        item.frequency,
        item.targetFrequency,
        item.incidentalFrequency,
        item.distinctExamsCount,
        provenance.datasetId,
        provenance.name,
        provenance.version,
        provenance.source,
        provenance.date,
        provenance.license,
      ]);
    }
  } else if (options.type === 'grammar') {
    headers = [
      'PatternId',
      'PatternName',
      'Level',
      'Meaning',
      'Frequency',
      'TargetFrequency',
      'DistinctExamsCount',
      'DatasetId',
      'DatasetName',
      'Source',
      'License',
    ];

    const analysis = aggregator.getGrammarAnalysis();
    for (const item of analysis.items) {
      if (!options.level || item.level === options.level) {
        rows.push([
          item.patternId,
          item.pattern,
          item.level,
          item.meaning,
          item.count,
          item.count,
          item.distinctExamsCount,
          provenance.datasetId,
          provenance.name,
          provenance.source,
          provenance.license,
        ]);
      }
    }
  } else if (options.type === 'kanji') {
    headers = [
      'Character',
      'Level',
      'StrokeCount',
      'KnowledgeGroup',
      'Frequency',
      'DistinctExamsCount',
      'DatasetId',
      'DatasetName',
      'Source',
      'License',
    ];

    const analysis = aggregator.getKanjiAnalysis();
    for (const item of analysis.items) {
      if (!options.level || item.level === options.level) {
        rows.push([
          item.kanji,
          item.level ?? 'N5',
          item.strokeCount ?? 0,
          item.knowledgeGroup ?? 'general',
          item.count,
          item.distinctExamsCount,
          provenance.datasetId,
          provenance.name,
          provenance.source,
          provenance.license,
        ]);
      }
    }
  } else {
    // Summary export
    headers = ['Metric', 'Value', 'DatasetId', 'DatasetName', 'Version', 'License'];
    rows.push(
      ['TotalTokens', meta.totalTokens, provenance.datasetId, provenance.name, provenance.version, provenance.license],
      ['UniqueVocabCount', meta.uniqueVocabCount, provenance.datasetId, provenance.name, provenance.version, provenance.license],
      ['UniqueKanjiCount', meta.uniqueKanjiCount, provenance.datasetId, provenance.name, provenance.version, provenance.license],
      ['UniqueGrammarCount', meta.uniqueGrammarCount, provenance.datasetId, provenance.name, provenance.version, provenance.license],
      ['DocumentCount', meta.documentCount, provenance.datasetId, provenance.name, provenance.version, provenance.license],
    );
  }

  // Prepend UTF-8 BOM (\uFEFF) for Excel
  const csvLines: string[] = ['\uFEFF' + headers.map(sanitizeCsvField).join(',')];
  for (const r of rows) {
    csvLines.push(r.map(sanitizeCsvField).join(','));
  }

  const csvString = csvLines.join('\r\n');
  const filename = `${meta.datasetId}-${options.type}-${options.level ?? 'all'}.csv`;

  return {
    data: csvString,
    filename,
    mimeType: 'text/csv; charset=utf-8',
    rowCount: rows.length,
    provenance,
  };
}

/**
 * Parses RFC 4180 CSV export back into structured rows and provenance metadata.
 */
export function parseDatasetCsv(csv: string): ParsedExportResult {
  let cleanCsv = csv;
  if (cleanCsv.charCodeAt(0) === 0xfeff) {
    cleanCsv = cleanCsv.slice(1);
  }

  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanCsv.length; i++) {
    const char = cleanCsv[i];
    const nextChar = cleanCsv[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        lines.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        lines.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    lines.push(currentRow);
  }

  if (lines.length === 0) {
    return {
      format: 'csv',
      type: 'vocabulary',
      provenance: {},
      headers: [],
      rows: [],
    };
  }

  const headers = lines[0]!.map((h) => desanitizeValue(h.trim()));
  const parsedRows: Record<string, string | number>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const rawRow = lines[r]!;
    if (rawRow.length === 0 || (rawRow.length === 1 && rawRow[0] === '')) continue;
    const rowObj: Record<string, string | number> = {};
    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c]!;
      const rawVal = rawRow[c] ?? '';
      const desanitized = desanitizeValue(rawVal);
      const num = Number(desanitized);
      if (!isNaN(num) && desanitized.trim() !== '' && !isNaN(Number(desanitized))) {
        rowObj[headerName] = num;
      } else {
        rowObj[headerName] = desanitized;
      }
    }
    parsedRows.push(rowObj);
  }

  const first = parsedRows[0] ?? {};
  const provenance: Partial<CorpusProvenanceMeta> = {
    datasetId: String(first['DatasetId'] ?? ''),
    name: String(first['DatasetName'] ?? ''),
    version: String(first['Version'] ?? ''),
    source: String(first['Source'] ?? ''),
    date: String(first['Date'] ?? ''),
    license: String(first['License'] ?? ''),
  };

  let type: ExportOptions['type'] = 'vocabulary';
  if (headers.includes('PatternId')) type = 'grammar';
  else if (headers.includes('Character')) type = 'kanji';
  else if (headers.includes('Metric')) type = 'summary';

  return {
    format: 'csv',
    type,
    provenance,
    headers,
    rows: parsedRows,
  };
}

/**
 * Exports corpus dataset data to standard OpenXML (.xlsx) format with multiple sheets and provenance metadata.
 */
export function exportDatasetToXlsx(
  aggregator: CorpusAggregator,
  options: ExportOptions,
): ExportResult {
  const meta = aggregator.getMetadata();
  const provenance: CorpusProvenanceMeta = {
    datasetId: meta.datasetId,
    name: meta.name,
    version: meta.version,
    source: meta.source,
    date: meta.date,
    license: 'CC-BY-SA-4.0',
    attribution: meta.licenseAttribution,
  };

  const sharedStrings: string[] = [];
  const stringMap = new Map<string, number>();

  function getStrIndex(s: unknown): number {
    const str = String(s ?? '');
    let idx = stringMap.get(str);
    if (idx === undefined) {
      idx = sharedStrings.length;
      stringMap.set(str, idx);
      sharedStrings.push(str);
    }
    return idx;
  }

  // 1. Data Sheet
  let headers: string[] = [];
  const rows: Array<Array<string | number>> = [];

  if (options.type === 'vocabulary') {
    headers = [
      'Rank',
      'BaseForm',
      'Surface',
      'Level',
      'PartOfSpeech',
      'Frequency',
      'TargetFrequency',
      'IncidentalFrequency',
      'DistinctExamsCount',
      'DatasetId',
      'DatasetName',
      'Version',
      'Source',
      'Date',
      'License',
    ];

    const analysis = aggregator.getVocabularyAnalysis({ level: options.level });
    for (const item of analysis.rankings) {
      rows.push([
        item.rank,
        sanitizeXlsxValue(item.baseForm),
        sanitizeXlsxValue(item.surface),
        sanitizeXlsxValue(item.level ?? ''),
        sanitizeXlsxValue(item.partOfSpeech ?? ''),
        item.frequency,
        item.targetFrequency,
        item.incidentalFrequency,
        item.distinctExamsCount,
        provenance.datasetId,
        provenance.name,
        provenance.version,
        provenance.source,
        provenance.date,
        provenance.license,
      ]);
    }
  } else if (options.type === 'grammar') {
    headers = [
      'PatternId',
      'PatternName',
      'Level',
      'Meaning',
      'Frequency',
      'TargetFrequency',
      'DistinctExamsCount',
      'DatasetId',
      'DatasetName',
      'Source',
      'License',
    ];

    const analysis = aggregator.getGrammarAnalysis();
    for (const item of analysis.items) {
      if (!options.level || item.level === options.level) {
        rows.push([
          sanitizeXlsxValue(item.patternId),
          sanitizeXlsxValue(item.pattern),
          item.level,
          sanitizeXlsxValue(item.meaning),
          item.count,
          item.count,
          item.distinctExamsCount,
          provenance.datasetId,
          provenance.name,
          provenance.source,
          provenance.license,
        ]);
      }
    }
  } else if (options.type === 'kanji') {
    headers = [
      'Character',
      'Level',
      'StrokeCount',
      'KnowledgeGroup',
      'Frequency',
      'DistinctExamsCount',
      'DatasetId',
      'DatasetName',
      'Source',
      'License',
    ];

    const analysis = aggregator.getKanjiAnalysis();
    for (const item of analysis.items) {
      if (!options.level || item.level === options.level) {
        rows.push([
          item.kanji,
          item.level ?? 'N5',
          item.strokeCount ?? 0,
          item.knowledgeGroup ?? 'general',
          item.count,
          item.distinctExamsCount,
          provenance.datasetId,
          provenance.name,
          provenance.source,
          provenance.license,
        ]);
      }
    }
  } else {
    headers = ['Metric', 'Value', 'DatasetId', 'DatasetName', 'Version', 'License'];
    rows.push(
      ['TotalTokens', meta.totalTokens, provenance.datasetId, provenance.name, provenance.version, provenance.license],
      ['UniqueVocabCount', meta.uniqueVocabCount, provenance.datasetId, provenance.name, provenance.version, provenance.license],
      ['UniqueKanjiCount', meta.uniqueKanjiCount, provenance.datasetId, provenance.name, provenance.version, provenance.license],
      ['UniqueGrammarCount', meta.uniqueGrammarCount, provenance.datasetId, provenance.name, provenance.version, provenance.license],
      ['DocumentCount', meta.documentCount, provenance.datasetId, provenance.name, provenance.version, provenance.license],
    );
  }

  // Build Sheet1 XML
  let sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sheet1Xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<sheetData>\n`;

  // Header row
  sheet1Xml += `  <row r="1">\n`;
  headers.forEach((h, colIdx) => {
    const sIdx = getStrIndex(h);
    sheet1Xml += `    <c r="${colName(colIdx)}1" t="s"><v>${sIdx}</v></c>\n`;
  });
  sheet1Xml += `  </row>\n`;

  // Data rows
  rows.forEach((row, rowIdx) => {
    const rNum = rowIdx + 2;
    sheet1Xml += `  <row r="${rNum}">\n`;
    row.forEach((val, colIdx) => {
      const cellRef = `${colName(colIdx)}${rNum}`;
      if (typeof val === 'number') {
        sheet1Xml += `    <c r="${cellRef}"><v>${val}</v></c>\n`;
      } else {
        const sIdx = getStrIndex(val);
        sheet1Xml += `    <c r="${cellRef}" t="s"><v>${sIdx}</v></c>\n`;
      }
    });
    sheet1Xml += `  </row>\n`;
  });
  sheet1Xml += `</sheetData>\n</worksheet>`;

  // 2. Sheet2: Provenance Metadata
  let sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sheet2Xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<sheetData>\n`;
  const provRows: Array<[string, string]> = [
    ['Dataset ID', provenance.datasetId],
    ['Dataset Name', provenance.name],
    ['Version', provenance.version],
    ['Source', provenance.source],
    ['Extraction Date', provenance.date],
    ['License', provenance.license],
    ['Attribution', provenance.attribution],
    ['Total Tokens', String(meta.totalTokens)],
    ['Unique Vocabulary', String(meta.uniqueVocabCount)],
  ];
  provRows.forEach(([prop, val], rIdx) => {
    const rNum = rIdx + 1;
    const pIdx = getStrIndex(prop);
    const vIdx = getStrIndex(val);
    sheet2Xml += `  <row r="${rNum}">\n`;
    sheet2Xml += `    <c r="A${rNum}" t="s"><v>${pIdx}</v></c>\n`;
    sheet2Xml += `    <c r="B${rNum}" t="s"><v>${vIdx}</v></c>\n`;
    sheet2Xml += `  </row>\n`;
  });
  sheet2Xml += `</sheetData>\n</worksheet>`;

  // Build SharedStrings XML
  let sstXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sstXml += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">\n`;
  for (const s of sharedStrings) {
    sstXml += `  <si><t xml:space="preserve">${escapeXml(s)}</t></si>\n`;
  }
  sstXml += `</sst>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(options.type)}" sheetId="1" r:id="rId1"/>
    <sheet name="Provenance" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const zipFiles = [
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: rootRelsXml },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRelsXml },
    { name: 'xl/sharedStrings.xml', data: sstXml },
    { name: 'xl/worksheets/sheet1.xml', data: sheet1Xml },
    { name: 'xl/worksheets/sheet2.xml', data: sheet2Xml },
  ];

  const xlsxBuffer = createZipBuffer(zipFiles);
  const filename = `${meta.datasetId}-${options.type}-${options.level ?? 'all'}.xlsx`;

  return {
    data: xlsxBuffer,
    filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    rowCount: rows.length,
    provenance,
  };
}

/**
 * Parses OpenXML (.xlsx) buffer back into structured data and provenance metadata.
 */
export function parseDatasetXlsx(xlsxBuf: Buffer): ParsedExportResult {
  const files = readZipBuffer(xlsxBuf);

  // Parse shared strings
  const sharedStrings: string[] = [];
  if (files['xl/sharedStrings.xml']) {
    const sstXml = Buffer.from(files['xl/sharedStrings.xml']).toString('utf8');
    const regex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sstXml)) !== null) {
      const unescaped = match[1]!
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      sharedStrings.push(unescaped);
    }
  }

  // Parse sheet1
  if (!files['xl/worksheets/sheet1.xml']) {
    throw new Error('Invalid XLSX archive: sheet1.xml missing');
  }
  const sheet1Xml = Buffer.from(files['xl/worksheets/sheet1.xml']).toString('utf8');

  // Extract rows
  const rowRegex = /<row r="(\d+)">([\s\S]*?)<\/row>/g;
  const cellRegex = /<c r="([A-Z]+)\d+"(?: t="([^"]*)")?>[\s\S]*?<v>([\s\S]*?)<\/v>[\s\S]*?<\/c>/g;

  const rawRows: Array<Record<string, string | number>> = [];
  let headers: string[] = [];

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(sheet1Xml)) !== null) {
    const rowNum = parseInt(rowMatch[1]!, 10);
    const rowContent = rowMatch[2]!;

    const rowCells: Record<string, string | number> = {};
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetter = cellMatch[1]!;
      const cellType = cellMatch[2];
      const valText = cellMatch[3]!;

      let cellValue: string | number;
      if (cellType === 's') {
        const sIdx = parseInt(valText, 10);
        cellValue = desanitizeValue(sharedStrings[sIdx] ?? '');
      } else {
        const num = Number(valText);
        cellValue = isNaN(num) ? desanitizeValue(valText) : num;
      }
      rowCells[colLetter] = cellValue;
    }

    if (rowNum === 1) {
      // Header row
      headers = Object.keys(rowCells)
        .sort((a, b) => (a.length === b.length ? a.localeCompare(b) : a.length - b.length))
        .map((k) => String(rowCells[k]));
    } else {
      const rowObj: Record<string, string | number> = {};
      const sortedKeys = Object.keys(rowCells).sort((a, b) =>
        a.length === b.length ? a.localeCompare(b) : a.length - b.length,
      );
      sortedKeys.forEach((k, colIdx) => {
        const header = headers[colIdx] ?? k;
        rowObj[header] = rowCells[k]!;
      });
      rawRows.push(rowObj);
    }
  }

  // Parse provenance from sheet2 if present
  const provenance: Partial<CorpusProvenanceMeta> = {};
  if (files['xl/worksheets/sheet2.xml']) {
    const sheet2Xml = Buffer.from(files['xl/worksheets/sheet2.xml']).toString('utf8');
    let provMatch: RegExpExecArray | null;
    while ((provMatch = rowRegex.exec(sheet2Xml)) !== null) {
      const rowContent = provMatch[2]!;
      const pairs: string[] = [];
      let cMatch: RegExpExecArray | null;
      while ((cMatch = cellRegex.exec(rowContent)) !== null) {
        const sIdx = parseInt(cMatch[3]!, 10);
        pairs.push(sharedStrings[sIdx] ?? '');
      }
      if (pairs.length >= 2) {
        const [k, v] = pairs;
        if (k === 'Dataset ID') provenance.datasetId = v;
        if (k === 'Dataset Name') provenance.name = v;
        if (k === 'Version') provenance.version = v;
        if (k === 'Source') provenance.source = v;
        if (k === 'Extraction Date') provenance.date = v;
        if (k === 'License') provenance.license = v;
        if (k === 'Attribution') provenance.attribution = v;
      }
    }
  }

  let type: ExportOptions['type'] = 'vocabulary';
  if (headers.includes('PatternId')) type = 'grammar';
  else if (headers.includes('Character')) type = 'kanji';
  else if (headers.includes('Metric')) type = 'summary';

  return {
    format: 'xlsx',
    type,
    provenance,
    headers,
    rows: rawRows,
  };
}

/**
 * Validates that an export roundtrip matches the original data.
 */
export function verifyExportRoundtrip(
  originalRows: Array<Record<string, unknown>>,
  parsedRows: Array<Record<string, string | number>>,
): boolean {
  if (originalRows.length !== parsedRows.length) {
    return false;
  }
  for (let i = 0; i < originalRows.length; i++) {
    const orig = originalRows[i]!;
    const parsed = parsedRows[i]!;
    for (const [key, origVal] of Object.entries(orig)) {
      if (origVal === undefined || origVal === null) continue;
      const matchKey = Object.keys(parsed).find(
        (k) => k.toLowerCase() === key.toLowerCase(),
      );
      if (!matchKey) continue;
      const parsedVal = parsed[matchKey];
      if (typeof origVal === 'number') {
        if (Number(parsedVal) !== origVal) return false;
      } else if (String(origVal) !== String(parsedVal)) {
        return false;
      }
    }
  }
  return true;
}
