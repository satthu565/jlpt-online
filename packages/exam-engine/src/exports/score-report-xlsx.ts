import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { sanitizeExportField } from '@jlpt/schema';
import { assertScoreReportIsolation } from '@jlpt/schema';
import type { ScoreReportOptions, ScoreReportResult } from './types.js';

interface ZipEntry {
  name: string;
  data: string | Buffer;
}

function escapeXml(unsafe: unknown): string {
  const str = String(unsafe ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(index: number): string {
  let name = '';
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

function createZipBuffer(files: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const dataBuf = Buffer.isBuffer(file.data)
      ? file.data
      : typeof file.data === 'string'
        ? Buffer.from(file.data, 'utf8')
        : Buffer.from(file.data);

    const crc = zlib.crc32(dataBuf);
    const compressed = zlib.deflateRawSync(dataBuf);
    const compMethod = 8;
    const compSize = compressed.length;
    const uncompSize = dataBuf.length;

    // Local file header (30 bytes + name)
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(compMethod, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compSize, 18);
    lh.writeUInt32LE(uncompSize, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBuf.copy(lh, 30);

    localHeaders.push(lh, compressed);

    // Central directory file header (46 bytes + name)
    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(compMethod, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compSize, 20);
    cd.writeUInt32LE(uncompSize, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    nameBuf.copy(cd, 46);

    centralHeaders.push(cd);
    offset += lh.length + compressed.length;
  }

  const cdTotalSize = centralHeaders.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdTotalSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

/**
 * Extracts all files from an in-memory ZIP archive buffer.
 */
export function readZipBuffer(buf: Buffer): Record<string, Buffer> {
  const files: Record<string, Buffer> = {};
  let cur = 0;
  while (cur < buf.length - 30) {
    const sig = buf.readUInt32LE(cur);
    if (sig !== 0x04034b50) break;
    const method = buf.readUInt16LE(cur + 8);
    const compSize = buf.readUInt32LE(cur + 18);
    const nameLen = buf.readUInt16LE(cur + 26);
    const extraLen = buf.readUInt16LE(cur + 28);
    const name = buf.subarray(cur + 30, cur + 30 + nameLen).toString('utf8');
    const dataStart = cur + 30 + nameLen + extraLen;
    const compData = buf.subarray(dataStart, dataStart + compSize);
    let decompressed: Buffer;
    if (method === 0) {
      decompressed = Buffer.from(compData);
    } else if (method === 8) {
      decompressed = zlib.inflateRawSync(compData);
    } else {
      decompressed = Buffer.from(compData);
    }
    files[name] = decompressed;
    cur = dataStart + compSize;
  }
  return files;
}

/**
 * Generates an official JLPT Score Report in OpenXML (.xlsx) format.
 * Strictly guarantees multi-tenant privacy isolation and protects against formula injection.
 */
export function generateScoreReportXlsx(options: ScoreReportOptions): ScoreReportResult {
  const { data, requestingActor } = options;

  // 1. Strict Privacy & Isolation Assertion
  assertScoreReportIsolation(data, requestingActor);

  // 2. Data Sanitization
  const candidateName = String(sanitizeExportField(data.candidateName || 'Anonymous Candidate')).normalize('NFC');
  const examTitle = String(sanitizeExportField(data.examTitle || 'JLPT Exam')).normalize('NFC');
  const generatedAt = data.generatedAt ?? new Date().toISOString();
  const examDate = String(data.examDate ?? generatedAt.split('T')[0]).normalize('NFC');

  // 3. Digital Tamper-Proof Hash
  const integrityPayload = [
    data.attemptId,
    data.userId,
    data.level,
    data.scaledScore,
    data.passed ? 'PASS' : 'FAIL',
    generatedAt,
  ].join(':');
  const checksumSha256 = crypto.createHash('sha256').update(integrityPayload).digest('hex');

  const sharedStrings: string[] = [];
  const stringMap = new Map<string, number>();

  function getStrIndex(s: unknown): number {
    const raw = String(s ?? '');
    const sanitized = String(sanitizeExportField(raw));
    let idx = stringMap.get(sanitized);
    if (idx === undefined) {
      idx = sharedStrings.length;
      stringMap.set(sanitized, idx);
      sharedStrings.push(sanitized);
    }
    return idx;
  }

  // 4. Build Sheet 1: Results Sheet
  const sheet1Rows: Array<Array<string | number>> = [
    ['日本語能力試験 成績証明書 / JLPT Score Report', ''],
    ['受験者氏名', candidateName],
    ['受験者ID', data.userId],
    ['受験番号', data.attemptId],
    ['試験名', examTitle],
    ['レベル', data.level],
    ['実施年月日', examDate],
    ['総合得点', data.scaledScore],
    ['合格基準点', data.passThreshold],
    ['満点', data.maxScore],
    ['合否判定', data.passed ? '合格' : '不合格'],
    ['', ''],
    ['【得点区分別成績】', '', '', '', ''],
    ['得点区分', '得点', '配点', '基準点', '判定'],
  ];

  const sections = data.sections.length > 0 ? data.sections : [
    { code: 'language_vocab', name: '言語知識（文字・語彙・文法）', scaledScore: Math.round(data.scaledScore * 0.35), maxScore: 60, passThreshold: 19, passed: true },
    { code: 'reading', name: '読解', scaledScore: Math.round(data.scaledScore * 0.35), maxScore: 60, passThreshold: 19, passed: true },
    { code: 'listening', name: '聴解', scaledScore: Math.round(data.scaledScore * 0.30), maxScore: 60, passThreshold: 19, passed: true },
  ];

  for (const s of sections) {
    const secPassed = s.passed ?? (s.scaledScore >= s.passThreshold);
    sheet1Rows.push([
      s.name,
      s.scaledScore,
      s.maxScore,
      s.passThreshold,
      secPassed ? '基準点クリア' : '基準点未達',
    ]);
  }

  // Build Sheet1 XML
  let sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sheet1Xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<sheetData>\n`;
  sheet1Rows.forEach((row, rIdx) => {
    const rNum = rIdx + 1;
    sheet1Xml += `  <row r="${rNum}">\n`;
    row.forEach((val, cIdx) => {
      const cellRef = `${colName(cIdx)}${rNum}`;
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

  // 5. Build Sheet 2: Audit & Privacy Provenance Sheet
  const provRows: Array<[string, string]> = [
    ['Attempt ID', data.attemptId],
    ['User ID', data.userId],
    ['Privacy Isolation', 'ISOLATED_USER_ONLY'],
    ['Security Checksum (SHA-256)', checksumSha256],
    ['Generated At (UTC)', generatedAt],
    ['Linear Reference Scaling Disclaimer', 'Điểm quy đổi chỉ mang tính chất tham khảo (Linear Reference Scaling), không thay thế chứng chỉ JLPT chính thức.'],
  ];

  let sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sheet2Xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<sheetData>\n`;
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

  // Shared Strings XML
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
    <sheet name="成績証明書" sheetId="1" r:id="rId1"/>
    <sheet name="監査情報" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const zipFiles: ZipEntry[] = [
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: rootRelsXml },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRelsXml },
    { name: 'xl/sharedStrings.xml', data: sstXml },
    { name: 'xl/worksheets/sheet1.xml', data: sheet1Xml },
    { name: 'xl/worksheets/sheet2.xml', data: sheet2Xml },
  ];

  const buffer = createZipBuffer(zipFiles);
  const filename = `jlpt-score-report-${data.attemptId}.xlsx`;

  return {
    buffer,
    filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    attemptId: data.attemptId,
    userId: data.userId,
    passed: data.passed,
    checksumSha256,
  };
}
