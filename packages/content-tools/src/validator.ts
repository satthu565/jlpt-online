import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateSchema } from './schema.js';
import { loadPackageArchive } from './zip.js';
import { validateExamAgainstBlueprint } from './blueprint-validator.js';
import type {
  ImportPackageV2,
  ValidationResult,
  ValidateOptions,
  ValidationMode,
  ReadinessState,
  MediaMimeType,
} from './types.js';

export function extractPlainTextFromRichText(segments: unknown[]): string {
  let text = '';
  for (const seg of segments) {
    if (!seg || typeof seg !== 'object') continue;
    const s = seg as Record<string, unknown>;
    if (s['t'] === 'text' && typeof s['text'] === 'string') {
      text += s['text'];
    } else if (s['t'] === 'ruby' && typeof s['text'] === 'string') {
      text += s['text'];
    } else if ((s['t'] === 'underline' || s['t'] === 'emphasis') && Array.isArray(s['children'])) {
      text += extractPlainTextFromRichText(s['children']);
    } else if (s['t'] === 'blank') {
      text += '___';
    } else if (s['t'] === 'star') {
      text += '★';
    }
  }
  return text;
}

export function resolveJsonPointer(root: unknown, pointerPath: string): unknown {
  if (pointerPath === '' || pointerPath === '/') {
    return root;
  }
  const parts = pointerPath.replace(/^\//, '').split('/');
  let current: unknown = root;
  for (const rawPart of parts) {
    const part = rawPart.replace(/~1/g, '/').replace(/~0/g, '~');
    if (current === null || current === undefined || typeof current !== 'object') {
      throw new Error(`Cannot resolve pointer ${pointerPath} at ${part}`);
    }
    if (Array.isArray(current)) {
      const idx = Number.parseInt(part, 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= current.length) {
        throw new Error(`Array index out of bounds: ${part} in ${pointerPath}`);
      }
      current = current[idx];
    } else {
      const obj = current as Record<string, unknown>;
      if (!(part in obj)) {
        throw new Error(`Property ${part} not found in ${pointerPath}`);
      }
      current = obj[part];
    }
  }
  return current;
}

function checkNfc(val: unknown, currentPath: string, errors: string[]): void {
  if (typeof val === 'string') {
    if (val.normalize('NFC') !== val) {
      errors.push(`${currentPath}: chuỗi chưa chuẩn hóa Unicode NFC`);
    }
  } else if (val && typeof val === 'object') {
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        checkNfc(val[i], `${currentPath}/${i}`, errors);
      }
    } else {
      for (const [k, v] of Object.entries(val)) {
        checkNfc(v, `${currentPath}/${k}`, errors);
      }
    }
  }
}

function checkNoNestedStyles(node: unknown, currentPath: string, errors: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      checkNoNestedStyles(node[i], `${currentPath}/${i}`, errors);
    }
    return;
  }
  const obj = node as Record<string, unknown>;
  if (obj['t'] === 'underline' || obj['t'] === 'emphasis') {
    const children = obj['children'];
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child && typeof child === 'object') {
          const childObj = child as Record<string, unknown>;
          if (childObj['t'] === 'underline' || childObj['t'] === 'emphasis') {
            errors.push(`${currentPath}: không lồng underline/emphasis thêm một cấp`);
          }
        }
      }
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    checkNoNestedStyles(v, `${currentPath}/${k}`, errors);
  }
}

function checkMediaSignature(bytes: Uint8Array, mime: MediaMimeType): boolean {
  if (mime === 'image/png') {
    // 89 50 4E 47 0D 0A 1A 0A
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mime === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === 'image/webp') {
    if (bytes.length < 12) return false;
    const header = Buffer.from(bytes.subarray(0, 4)).toString('ascii');
    const format = Buffer.from(bytes.subarray(8, 12)).toString('ascii');
    return header === 'RIFF' && format === 'WEBP';
  }
  if (mime === 'image/avif') {
    if (bytes.length < 12) return false;
    const ftyp = Buffer.from(bytes.subarray(4, 8)).toString('ascii');
    const brandSlice = Buffer.from(bytes.subarray(8, Math.min(40, bytes.length))).toString('ascii');
    return ftyp === 'ftyp' && brandSlice.includes('avif');
  }
  if (mime === 'audio/wav') {
    if (bytes.length < 12) return false;
    const riff = Buffer.from(bytes.subarray(0, 4)).toString('ascii');
    const wave = Buffer.from(bytes.subarray(8, 12)).toString('ascii');
    return riff === 'RIFF' && wave === 'WAVE';
  }
  if (mime === 'audio/mp4') {
    if (bytes.length < 8) return false;
    const ftyp = Buffer.from(bytes.subarray(4, 8)).toString('ascii');
    return ftyp === 'ftyp';
  }
  if (mime === 'audio/mpeg') {
    if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      return true; // ID3
    }
    return bytes.length > 2 && bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0;
  }
  return false;
}

function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return { width, height };
}

function parseWavDurationMs(bytes: Uint8Array): number | null {
  if (bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Find 'fmt ' chunk
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataBytes = 0;

  while (offset + 8 <= bytes.length) {
    const chunkId = Buffer.from(bytes.subarray(offset, offset + 4)).toString('ascii');
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 'fmt ' && chunkSize >= 16) {
      channels = view.getUint16(offset + 8 + 2, true);
      sampleRate = view.getUint32(offset + 8 + 4, true);
      bitsPerSample = view.getUint16(offset + 8 + 14, true);
    } else if (chunkId === 'data') {
      dataBytes = chunkSize;
    }
    offset += 8 + chunkSize;
  }

  if (sampleRate > 0 && channels > 0 && bitsPerSample > 0 && dataBytes > 0) {
    const bytesPerSec = sampleRate * channels * (bitsPerSample / 8);
    if (bytesPerSec > 0) {
      return (dataBytes * 1000) / bytesPerSec;
    }
  }
  return null;
}

export function validateImportData(rawObj: unknown, options?: ValidateOptions): ValidationResult {
  const mode: ValidationMode = options?.mode ?? 'ready';
  const errors: string[] = [];
  const warnings: string[] = [
    'Chỉ kiểm tra cấu trúc và file; không xác minh nội dung PDF, đáp án, bản quyền hoặc blueprint chính thức.',
    'Importer production phải decode media thật và xác minh blueprint/license; tiện ích local không phải công cụ chống malware hoặc chứng nhận publish.',
  ];

  // 1. Schema Parse
  const parseResult = validateSchema(rawObj);
  if (!parseResult.success || !parseResult.data) {
    errors.push(...parseResult.errors);
    return {
      valid: false,
      mode,
      readiness: 'INVALID',
      questionCount: 0,
      groupCount: 0,
      blockingIssueCount: 0,
      errors,
      warnings,
      publicationApproved: false,
    };
  }

  const pkg: ImportPackageV2 = parseResult.data;
  const blockingIssues = pkg.issues.filter((i) => i.severity === 'blocking');

  const addError = (p: string, msg: string) => {
    errors.push(`${p}: ${msg}`);
  };

  const addUncertain = (p: string, msg: string) => {
    const isCovered = blockingIssues.some(
      (issue) => p === issue.path || p.startsWith(issue.path + '/'),
    );
    if (mode === 'ready' || !isCovered) {
      addError(p, `${msg}; cần issue blocking và chế độ draft nếu chưa xác định`);
    }
  };

  // 2. Validate issues paths resolve to existing keys
  for (const issue of pkg.issues) {
    try {
      resolveJsonPointer(pkg, issue.path);
    } catch {
      addError('/issues', `path không trỏ tới trường tồn tại: ${issue.path}`);
    }
  }

  if (mode === 'ready' && blockingIssues.length > 0) {
    addError('/issues', 'còn vấn đề blocking, không đạt READY_FOR_REVIEW');
  }

  // 3. Unicode NFC check
  checkNfc(pkg, '', errors);

  // 4. Nested underline / emphasis check
  checkNoNestedStyles(pkg.groups, '/groups', errors);

  // 5. SourceFiles map & usage
  const sourcesMap = new Map<string, (typeof pkg.sourceFiles)[0]>();
  for (let i = 0; i < pkg.sourceFiles.length; i++) {
    const s = pkg.sourceFiles[i]!;
    if (sourcesMap.has(s.id)) {
      addError(`/sourceFiles/${i}`, 'source id trùng');
    }
    sourcesMap.set(s.id, s);
  }

  // 6. Media map
  const mediaMap = new Map<string, (typeof pkg.media)[0]>();
  for (let i = 0; i < pkg.media.length; i++) {
    const m = pkg.media[i]!;
    const p = `/media/${i}`;
    if (mediaMap.has(m.path)) {
      addError(p, 'khai báo media trùng');
    }
    mediaMap.set(m.path, m);

    // Audio vs Image rules
    if (m.mimeType.startsWith('audio/')) {
      if (m.durationMs === null || m.width !== null || m.height !== null) {
        addError(p, 'audio cần durationMs, width/height=null');
      }
    } else {
      if (m.durationMs !== null || m.width === null || m.height === null) {
        addError(p, 'ảnh cần width/height, durationMs=null');
      }
    }
  }

  // 7. Groups & Questions semantic check
  const groupMap = new Map<string, (typeof pkg.groups)[0]>();
  const questionIdSet = new Set<string>();
  const questionNumberSet = new Set<string>();
  const questionSignatureMap = new Map<string, string>();
  let totalCalculatedQuestions = 0;

  for (let gi = 0; gi < pkg.groups.length; gi++) {
    const group = pkg.groups[gi]!;
    const gp = `/groups/${gi}`;

    if (groupMap.has(group.id)) {
      addError(`${gp}/id`, 'group id trùng');
    }
    groupMap.set(group.id, group);

    // Empty group check (PDF-22)
    if (group.questions.length === 0) {
      addError(`${gp}/questions`, 'nhóm không có câu hỏi');
    }

    // Check mediaKeys of group exist in exam media
    for (const key of group.mediaKeys) {
      if (!mediaMap.has(key)) {
        addError(`${gp}/mediaKeys`, `media không tồn tại: ${key}`);
      }
    }

    // SourcePages validation in group
    for (const sp of group.sourcePages) {
      if (!sourcesMap.has(sp.sourceId)) {
        addError(`${gp}/sourcePages`, 'không có sourceFile tương ứng');
      }
    }

    // Check [KHONG_DOC_RO] in group passage (PDF-21)
    for (let bi = 0; bi < group.passage.length; bi++) {
      const block = group.passage[bi]!;
      if (block.type === 'paragraph') {
        for (const seg of block.content) {
          if (seg.t === 'text' && seg.text.includes('[KHONG_DOC_RO]')) {
            addUncertain(`${gp}/passage/${bi}/content`, 'đoạn văn còn nhãn không đọc rõ');
          }
        }
      }
    }

    // Walk questions
    for (let qi = 0; qi < group.questions.length; qi++) {
      const q = group.questions[qi]!;
      const qp = `${gp}/questions/${qi}`;
      totalCalculatedQuestions++;

      if (questionIdSet.has(q.id)) {
        addError(`${qp}/id`, 'question id trùng toàn gói');
      }
      questionIdSet.add(q.id);

      // Duplicate question number check (PDF-22)
      if (questionNumberSet.has(q.number)) {
        addError(`${qp}/number`, `số thứ tự câu (${q.number}) bị trùng trong đề`);
      }
      questionNumberSet.add(q.number);

      // Check empty stem (PDF-22)
      const stemPlainText = extractPlainTextFromRichText(q.stem).trim();
      if (q.stem.length === 0 || stemPlainText.length === 0) {
        addError(`${qp}/stem`, 'nội dung câu hỏi rỗng');
      }

      // Check duplicate full question (stem + options) (PDF-22)
      const optionsSignature = q.options
        .map((o) => extractPlainTextFromRichText(o.content).trim())
        .join('|');
      const questionSig = stemPlainText + ':::' + optionsSignature;
      if (questionSignatureMap.has(questionSig)) {
        addError(
          qp,
          `phát hiện câu hỏi bị trùng lặp với câu ${questionSignatureMap.get(questionSig)}`,
        );
      } else {
        questionSignatureMap.set(questionSig, q.id);
      }

      // Options labels must be sequential "1".."N"
      const labels = q.options.map((o) => o.label);
      const expectedLabels = Array.from({ length: q.options.length }, (_, idx) => String(idx + 1));
      if (JSON.stringify(labels) !== JSON.stringify(expectedLabels)) {
        addError(`${qp}/options`, 'labels phải giữ thứ tự 1..n');
      }

      // Check options count (must be 3 or 4) (PDF-22)
      if (q.options.length < 3 || q.options.length > 4) {
        addError(`${qp}/options`, 'số lựa chọn phải từ 3 đến 4');
      }

      // Check empty options & duplicate option content within the question (PDF-22)
      const optTexts = q.options.map((o) => extractPlainTextFromRichText(o.content).trim());
      for (let oi = 0; oi < q.options.length; oi++) {
        if (q.options[oi]!.content.length === 0 || optTexts[oi]!.length === 0) {
          addError(`${qp}/options/${oi}/content`, 'lựa chọn không được để rỗng');
        }
      }
      for (let i = 0; i < optTexts.length; i++) {
        for (let j = i + 1; j < optTexts.length; j++) {
          if (optTexts[i] && optTexts[i] === optTexts[j]) {
            addError(
              `${qp}/options`,
              `các lựa chọn [${i + 1}] và [${j + 1}] trong câu bị trùng nội dung`,
            );
          }
        }
      }

      // Check correctOption (PDF-22)
      if (q.correctOption === null) {
        addUncertain(`${qp}/correctOption`, 'chưa có đáp án');
      } else if (q.correctOption < 1 || q.correctOption > q.options.length) {
        addError(`${qp}/correctOption`, 'đáp án ngoài số lựa chọn');
      }

      // Check sentence_composition (star + blank)
      if (group.mondaiType === 'sentence_composition') {
        let starCount = 0;
        let blankCount = 0;
        for (const seg of q.stem) {
          if (seg.t === 'star') starCount++;
          if (seg.t === 'blank') blankCount++;
        }
        if (starCount !== 1 || blankCount !== 3) {
          addError(`${qp}/stem`, 'câu sắp xếp cần 3 blank và 1 star; không đổi thứ tự lựa chọn');
        }
      }

      // Check [KHONG_DOC_RO] in question stem (PDF-21)
      for (const seg of q.stem) {
        if (seg.t === 'text' && seg.text.includes('[KHONG_DOC_RO]')) {
          addUncertain(`${qp}/stem`, 'nội dung còn nhãn không đọc rõ');
        }
      }

      // Check [KHONG_DOC_RO] in question options (PDF-21)
      for (let oi = 0; oi < q.options.length; oi++) {
        for (const seg of q.options[oi]!.content) {
          if (seg.t === 'text' && seg.text.includes('[KHONG_DOC_RO]')) {
            addUncertain(`${qp}/options/${oi}/content`, 'lựa chọn còn nhãn không đọc rõ');
          }
        }
      }
    }
  }

  if (totalCalculatedQuestions !== pkg.exam.totalQuestions) {
    addError('/exam/totalQuestions', `không bằng tổng câu thực tế ${totalCalculatedQuestions}`);
  }

  // 8. Exam sections and listeningTimeline
  const usedGroupIds: string[] = [];
  const sectionCodes: string[] = [];

  for (let si = 0; si < pkg.exam.sections.length; si++) {
    const s = pkg.exam.sections[si]!;
    const sp = `/exam/sections/${si}`;
    sectionCodes.push(s.code);

    if (s.durationSec === null) {
      addUncertain(`${sp}/durationSec`, 'chưa có thời lượng');
    }

    const orderedGroups: (typeof pkg.groups)[0][] = [];
    for (const gid of s.groupIds) {
      usedGroupIds.push(gid);
      const g = groupMap.get(gid);
      if (!g) {
        addError(`${sp}/groupIds`, `group không tồn tại: ${gid}`);
        continue;
      }
      orderedGroups.push(g);
      if (g.sectionCode !== s.code) {
        addError(`${sp}/groupIds`, 'sectionCode của group không khớp');
      }
    }

    // Verify orderInSection matches continuous 1..N
    const actualOrders = orderedGroups.map((g) => g.orderInSection);
    const expectedOrders = Array.from({ length: orderedGroups.length }, (_, idx) => idx + 1);
    if (JSON.stringify(actualOrders) !== JSON.stringify(expectedOrders)) {
      addError(`${sp}/groupIds`, 'groupIds phải khớp orderInSection liên tục từ 1');
    }

    // Timeline only allowed for listening
    if (s.code !== 'listening' && s.listeningTimeline.length > 0) {
      addError(`${sp}/listeningTimeline`, 'timeline chỉ dành cho phần listening');
    }

    const timelineGroups = new Set<string>();
    let previousTimelineEnd: number | null = null;

    for (let ti = 0; ti < s.listeningTimeline.length; ti++) {
      const t = s.listeningTimeline[ti]!;
      const tp = `${sp}/listeningTimeline/${ti}`;
      timelineGroups.add(t.groupId);

      if (!s.groupIds.includes(t.groupId)) {
        addError(`${tp}/groupId`, 'group không thuộc phần nghe này');
      }

      const media = mediaMap.get(t.mediaKey);
      if (!media || !media.mimeType.startsWith('audio/')) {
        addError(`${tp}/mediaKey`, 'thiếu audio hợp lệ');
      } else if (media.durationMs !== null && t.audioEndMs > media.durationMs) {
        addError(`${tp}/audioEndMs`, 'vượt độ dài audio');
      }

      const g = groupMap.get(t.groupId);
      if (g && !g.mediaKeys.includes(t.mediaKey)) {
        addError(`${tp}/mediaKey`, 'audio chưa được group khai báo');
      }

      if (t.endMs <= t.startMs || t.audioEndMs <= t.audioStartMs) {
        addError(`${tp}/endMs`, 'mốc kết thúc phải lớn hơn bắt đầu');
      }

      if (t.endMs - t.startMs !== t.audioEndMs - t.audioStartMs) {
        addError(`${tp}/audioEndMs`, 'thời gian phát trên timeline phải bằng đoạn file audio');
      }

      if (previousTimelineEnd !== null && t.startMs !== previousTimelineEnd) {
        addError(`${tp}/startMs`, 'timeline không liên tục với endMs+gapAfterMs trước đó');
      }
      previousTimelineEnd = t.endMs + t.gapAfterMs;

      if (s.durationSec !== null && previousTimelineEnd > s.durationSec * 1000) {
        addError(`${tp}/endMs`, 'timeline vượt thời lượng phần thi');
      }
    }

    if (s.code === 'listening') {
      const sectionListeningGroups = new Set(s.groupIds);
      for (const gid of sectionListeningGroups) {
        if (!timelineGroups.has(gid)) {
          addUncertain(`${sp}/listeningTimeline`, 'mỗi nhóm nghe cần timeline/audio thật');
          break;
        }
      }
    }
  }

  // Section codes uniqueness
  if (new Set(sectionCodes).size !== sectionCodes.length) {
    addError('/exam/sections', 'sectionCode trùng');
  }

  // All groups must be referenced exactly once
  const sortedUsed = [...usedGroupIds].sort();
  const sortedAll = Array.from(groupMap.keys()).sort();
  if (JSON.stringify(sortedUsed) !== JSON.stringify(sortedAll)) {
    addError('/exam/sections', 'mỗi group phải được tham chiếu đúng một lần, không bỏ sót');
  }

  // Original exam section ordering checks
  if (pkg.exam.kind === 'original') {
    const expected =
      pkg.source.level === 'N1' || pkg.source.level === 'N2'
        ? ['language_reading', 'listening']
        : ['language_vocab', 'language_grammar_reading', 'listening'];
    if (JSON.stringify(sectionCodes) !== JSON.stringify(expected)) {
      addError(
        '/exam/sections',
        'sai thứ tự phần theo cấp độ; còn cần server đối chiếu blueprint chính thức',
      );
    }
    if (pkg.source.year === null) {
      addUncertain('/source/year', 'đề gốc thiếu năm');
    }
    if (pkg.source.session === null) {
      addUncertain('/source/session', 'đề gốc thiếu kỳ thi');
    }
  }

  if (pkg.exam.blueprintRef === null) {
    addUncertain('/exam/blueprintRef', 'chưa xác định blueprintRef được hệ thống cung cấp');
  }

  if (pkg.source.rightsStatus === 'unverified' || pkg.source.licenseRef === null) {
    warnings.push(
      'Quyền sử dụng chưa được xác minh; server phải chặn publish tới khi owner duyệt license.',
    );
  }

  // 9. Validate attached files if provided in options
  if (options?.packageFiles) {
    const files = options.packageFiles;
    const declaredFiles = new Set<string>(['import.json']);

    // Check source files
    for (let i = 0; i < pkg.sourceFiles.length; i++) {
      const sf = pkg.sourceFiles[i]!;
      const p = `/sourceFiles/${i}`;
      declaredFiles.add(sf.path);
      const data = files[sf.path];
      if (!data) {
        addError(`${p}/path`, `thiếu file ${sf.path}`);
        continue;
      }
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      const filenameStem = path.basename(sf.path, '.pdf');
      if (hash !== sf.sha256 || filenameStem !== hash) {
        addError(`${p}/sha256`, 'hash hoặc tên file không đúng nội dung bytes');
      }
      if (Buffer.from(data.subarray(0, 5)).toString('ascii') !== '%PDF-') {
        addError(`${p}/path`, 'attachment nguồn không có signature PDF');
      }
    }

    // Check media files
    for (let i = 0; i < pkg.media.length; i++) {
      const m = pkg.media[i]!;
      const p = `/media/${i}`;
      declaredFiles.add(m.path);
      const data = files[m.path];
      if (!data) {
        addError(`${p}/path`, `thiếu file ${m.path}`);
        continue;
      }
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      const ext = path.extname(m.path);
      const filenameStem = path.basename(m.path, ext);
      if (hash !== m.sha256 || filenameStem !== hash) {
        addError(`${p}/sha256`, 'hash hoặc tên file không đúng nội dung bytes');
      }

      if (!checkMediaSignature(data, m.mimeType)) {
        addError(`${p}/mimeType`, 'signature file không khớp MIME');
      }

      if (m.mimeType === 'image/png') {
        const dims = parsePngDimensions(data);
        if (dims && (dims.width !== m.width || dims.height !== m.height)) {
          addError(`${p}/width`, 'kích thước không khớp PNG thật');
        }
      } else if (m.mimeType === 'audio/wav') {
        const actualDuration = parseWavDurationMs(data);
        if (
          actualDuration !== null &&
          m.durationMs !== null &&
          Math.abs(actualDuration - m.durationMs) > 1
        ) {
          addError(`${p}/durationMs`, 'không khớp WAV thật');
        }
      }
    }

    // Check unlisted files
    for (const filePath of Object.keys(files)) {
      if (!declaredFiles.has(filePath)) {
        addError('/files', `file chưa khai báo: ${filePath}`);
      }
    }
  }

  // 10. Blueprint structural validation (Feature PDF-23)
  if (options?.blueprint) {
    const bpResult = validateExamAgainstBlueprint(pkg.exam, pkg.groups, options.blueprint);
    if (!bpResult.valid) {
      errors.push(...bpResult.errors);
    }
    warnings.push(...bpResult.warnings);
  } else if (
    options?.knownBlueprints &&
    pkg.exam.blueprintRef &&
    options.knownBlueprints[pkg.exam.blueprintRef.id]
  ) {
    const bp = options.knownBlueprints[pkg.exam.blueprintRef.id]!;
    const bpResult = validateExamAgainstBlueprint(pkg.exam, pkg.groups, bp);
    if (!bpResult.valid) {
      errors.push(...bpResult.errors);
    }
    warnings.push(...bpResult.warnings);
  }

  const valid = errors.length === 0;
  let readiness: ReadinessState = 'INVALID';
  if (valid) {
    readiness = mode === 'ready' ? 'READY_FOR_REVIEW' : 'DRAFT_ONLY';
  }

  return {
    valid,
    mode,
    readiness,
    questionCount: totalCalculatedQuestions,
    groupCount: pkg.groups.length,
    blockingIssueCount: blockingIssues.length,
    errors,
    warnings,
    publicationApproved: false,
  };
}

export function loadPackageDirectory(dirPath: string): {
  rawJson: unknown;
  files: Record<string, Uint8Array>;
} {
  return loadPackageArchive(dirPath);
}

export function validatePackagePath(
  packagePath: string,
  options?: ValidateOptions,
): ValidationResult {
  const absPath = path.resolve(packagePath);
  if (!fs.existsSync(absPath)) {
    return {
      valid: false,
      mode: options?.mode ?? 'ready',
      readiness: 'INVALID',
      questionCount: 0,
      groupCount: 0,
      blockingIssueCount: 0,
      errors: [`Đường dẫn không tồn tại: ${packagePath}`],
      warnings: [],
      publicationApproved: false,
    };
  }

  try {
    const { rawJson, files } = loadPackageArchive(absPath);
    return validateImportData(rawJson, { ...options, packageFiles: files });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      valid: false,
      mode: options?.mode ?? 'ready',
      readiness: 'INVALID',
      questionCount: 0,
      groupCount: 0,
      blockingIssueCount: 0,
      errors: [msg],
      warnings: [],
      publicationApproved: false,
    };
  }
}
