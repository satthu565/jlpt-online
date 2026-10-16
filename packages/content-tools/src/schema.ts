import type { ImportPackageV2 } from './types.js';

export function isOneOf<T extends string>(val: unknown, list: readonly T[]): val is T {
  return typeof val === 'string' && (list as readonly string[]).includes(val);
}


export const ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
export const HASH_REGEX = /^[0-9a-f]{64}$/;
export const PACKAGE_ID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MEDIA_PATH_REGEX =
  /^media\/[0-9a-f]{64}\.(png|jpg|jpeg|webp|avif|mp3|m4a|wav)$/;
export const SOURCE_FILE_PATH_REGEX = /^sources\/[0-9a-f]{64}\.pdf$/;

export const LEVELS = ['N1', 'N2', 'N3', 'N4', 'N5'] as const;
export const SESSIONS = [7, 12] as const;
export const PROVENANCES = ['self_authored', 'official_past_exam', 'third_party'] as const;
export const RIGHTS_STATUSES = ['unverified', 'owner_confirmed'] as const;
export const EXAM_KINDS = ['original', 'practice'] as const;
export const SECTION_CODES = [
  'language_vocab',
  'language_grammar_reading',
  'language_reading',
  'listening',
] as const;
export const SKILLS = ['kanji', 'vocabulary', 'grammar', 'reading', 'listening'] as const;
export const OPTION_LABELS = ['1', '2', '3', '4'] as const;
export const EXPLANATION_LOCALES = ['vi', 'ja', 'en'] as const;
export const MEDIA_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
] as const;
export const ISSUE_SEVERITIES = ['blocking', 'warning'] as const;

export const MONDAI_TYPES = [
  'kanji_reading',
  'orthography',
  'word_formation',
  'contextual',
  'paraphrase',
  'usage',
  'grammar_form',
  'sentence_composition',
  'text_grammar',
  'comprehension_short',
  'comprehension_mid',
  'comprehension_long',
  'integrated_reading',
  'thematic',
  'info_retrieval',
  'task_based',
  'point',
  'summary',
  'utterance',
  'quick_response',
  'integrated_listening',
] as const;

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function checkAllowedProps(
  obj: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  errors: string[]
): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) {
      errors.push(`${path}/${k}: trường không được phép`);
    }
  }
}

export function validateSchema(raw: unknown): {
  success: boolean;
  data?: ImportPackageV2;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isObject(raw)) {
    return { success: false, errors: ['Gói dữ liệu phải là một đối tượng JSON'] };
  }

  const allowedRoot = new Set([
    'formatVersion',
    'packageId',
    'revision',
    'source',
    'sourceFiles',
    'exam',
    'groups',
    'media',
    'issues',
  ]);
  checkAllowedProps(raw, allowedRoot, '', errors);

  if (raw['formatVersion'] !== 2) {
    errors.push('/formatVersion: cần giá trị 2');
  }

  if (typeof raw['packageId'] !== 'string' || !PACKAGE_ID_REGEX.test(raw['packageId'])) {
    errors.push('/packageId: không đúng định dạng UUID');
  }

  if (
    typeof raw['revision'] !== 'number' ||
    !Number.isInteger(raw['revision']) ||
    raw['revision'] < 1
  ) {
    errors.push('/revision: phải là số nguyên >= 1');
  }

  // Validate Source
  if (!isObject(raw['source'])) {
    errors.push('/source: thiếu trường bắt buộc hoặc sai kiểu');
  } else {
    const s = raw['source'];
    const allowedSource = new Set([
      'name',
      'level',
      'year',
      'session',
      'provenance',
      'licenseRef',
      'rightsStatus',
    ]);
    checkAllowedProps(s, allowedSource, '/source', errors);

    if (typeof s['name'] !== 'string' || s['name'].length === 0) {
      errors.push('/source/name: chuỗi rỗng hoặc thiếu');
    }
    if (!isOneOf(s['level'], LEVELS)) {
      errors.push('/source/level: giá trị ngoài danh sách cho phép');
    }
    if (
      s['year'] !== null &&
      (typeof s['year'] !== 'number' ||
        !Number.isInteger(s['year']) ||
        s['year'] < 1984 ||
        s['year'] > 2200)
    ) {
      errors.push('/source/year: phải là null hoặc số nguyên từ 1984 đến 2200');
    }
    if (s['session'] !== null && s['session'] !== 7 && s['session'] !== 12) {
      errors.push('/source/session: giá trị ngoài danh sách cho phép (7, 12, null)');
    }
    if (!isOneOf(s['provenance'], PROVENANCES)) {
      errors.push('/source/provenance: giá trị ngoài danh sách cho phép');
    }
    if (
      s['licenseRef'] !== null &&
      (typeof s['licenseRef'] !== 'string' || s['licenseRef'].length === 0)
    ) {
      errors.push('/source/licenseRef: chuỗi rỗng hoặc sai kiểu');
    }
    if (!isOneOf(s['rightsStatus'], RIGHTS_STATUSES)) {
      errors.push('/source/rightsStatus: giá trị ngoài danh sách cho phép');
    }
  }

  // Validate sourceFiles
  if (!Array.isArray(raw['sourceFiles'])) {
    errors.push('/sourceFiles: phải là một mảng');
  } else {
    for (let i = 0; i < raw['sourceFiles'].length; i++) {
      const sf = raw['sourceFiles'][i];
      const p = `/sourceFiles/${i}`;
      if (!isObject(sf)) {
        errors.push(`${p}: phải là một đối tượng`);
        continue;
      }
      checkAllowedProps(sf, new Set(['id', 'path', 'sha256', 'mimeType']), p, errors);
      if (typeof sf['id'] !== 'string' || !ID_REGEX.test(sf['id'])) {
        errors.push(`${p}/id: không đúng định dạng`);
      }
      if (
        typeof sf['path'] !== 'string' ||
        !SOURCE_FILE_PATH_REGEX.test(sf['path'])
      ) {
        errors.push(`${p}/path: không đúng định dạng`);
      }
      if (typeof sf['sha256'] !== 'string' || !HASH_REGEX.test(sf['sha256'])) {
        errors.push(`${p}/sha256: không đúng định dạng`);
      }
      if (sf['mimeType'] !== 'application/pdf') {
        errors.push(`${p}/mimeType: cần giá trị application/pdf`);
      }
    }
  }

  // Validate exam
  if (!isObject(raw['exam'])) {
    errors.push('/exam: thiếu trường bắt buộc hoặc sai kiểu');
  } else {
    const e = raw['exam'];
    checkAllowedProps(
      e,
      new Set(['title', 'slug', 'kind', 'blueprintRef', 'totalQuestions', 'sections']),
      '/exam',
      errors
    );

    if (typeof e['title'] !== 'string' || e['title'].length === 0) {
      errors.push('/exam/title: chuỗi rỗng hoặc thiếu');
    }
    if (typeof e['slug'] !== 'string' || !SLUG_REGEX.test(e['slug'])) {
      errors.push('/exam/slug: không đúng định dạng slug');
    }
    if (!isOneOf(e['kind'], EXAM_KINDS)) {
      errors.push('/exam/kind: giá trị ngoài danh sách cho phép');
    }
    if (e['blueprintRef'] !== null) {
      if (!isObject(e['blueprintRef'])) {
        errors.push('/exam/blueprintRef: phải là object hoặc null');
      } else {
        const bp = e['blueprintRef'];
        checkAllowedProps(bp, new Set(['id', 'version']), '/exam/blueprintRef', errors);
        if (typeof bp['id'] !== 'string' || !ID_REGEX.test(bp['id'])) {
          errors.push('/exam/blueprintRef/id: không đúng định dạng');
        }
        if (
          typeof bp['version'] !== 'number' ||
          !Number.isInteger(bp['version']) ||
          bp['version'] < 1
        ) {
          errors.push('/exam/blueprintRef/version: phải là số nguyên >= 1');
        }
      }
    }
    if (
      typeof e['totalQuestions'] !== 'number' ||
      !Number.isInteger(e['totalQuestions']) ||
      e['totalQuestions'] < 1
    ) {
      errors.push('/exam/totalQuestions: phải là số nguyên >= 1');
    }

    if (!Array.isArray(e['sections']) || e['sections'].length < 1 || e['sections'].length > 3) {
      errors.push('/exam/sections: phải là mảng từ 1 đến 3 phần thi');
    } else {
      for (let si = 0; si < e['sections'].length; si++) {
        const sec = e['sections'][si];
        const sp = `/exam/sections/${si}`;
        if (!isObject(sec)) {
          errors.push(`${sp}: phải là một đối tượng`);
          continue;
        }
        checkAllowedProps(
          sec,
          new Set(['code', 'title', 'durationSec', 'groupIds', 'listeningTimeline']),
          sp,
          errors
        );
        if (!isOneOf(sec['code'], SECTION_CODES)) {
          errors.push(`${sp}/code: giá trị ngoài danh sách cho phép`);
        }
        if (typeof sec['title'] !== 'string' || sec['title'].length === 0) {
          errors.push(`${sp}/title: chuỗi rỗng hoặc thiếu`);
        }
        if (
          sec['durationSec'] !== null &&
          (typeof sec['durationSec'] !== 'number' ||
            !Number.isInteger(sec['durationSec']) ||
            sec['durationSec'] < 1)
        ) {
          errors.push(`${sp}/durationSec: phải là null hoặc số nguyên >= 1`);
        }
        if (!Array.isArray(sec['groupIds']) || sec['groupIds'].length < 1) {
          errors.push(`${sp}/groupIds: phải là mảng có ít nhất 1 group`);
        } else {
          for (let gi = 0; gi < sec['groupIds'].length; gi++) {
            const gid = sec['groupIds'][gi];
            if (typeof gid !== 'string' || !ID_REGEX.test(gid)) {
              errors.push(`${sp}/groupIds/${gi}: không đúng định dạng`);
            }
          }
        }
        if (!Array.isArray(sec['listeningTimeline'])) {
          errors.push(`${sp}/listeningTimeline: phải là mảng`);
        } else {
          for (let ti = 0; ti < sec['listeningTimeline'].length; ti++) {
            const tl = sec['listeningTimeline'][ti];
            const tp = `${sp}/listeningTimeline/${ti}`;
            if (!isObject(tl)) {
              errors.push(`${tp}: phải là một đối tượng`);
              continue;
            }
            checkAllowedProps(
              tl,
              new Set([
                'groupId',
                'mediaKey',
                'startMs',
                'endMs',
                'audioStartMs',
                'audioEndMs',
                'gapAfterMs',
              ]),
              tp,
              errors
            );
            if (typeof tl['groupId'] !== 'string' || !ID_REGEX.test(tl['groupId'])) {
              errors.push(`${tp}/groupId: không đúng định dạng`);
            }
            if (typeof tl['mediaKey'] !== 'string' || tl['mediaKey'].length === 0) {
              errors.push(`${tp}/mediaKey: chuỗi rỗng hoặc thiếu`);
            }
            if (
              typeof tl['startMs'] !== 'number' ||
              !Number.isInteger(tl['startMs']) ||
              tl['startMs'] < 0
            ) {
              errors.push(`${tp}/startMs: phải là số nguyên >= 0`);
            }
            if (
              typeof tl['endMs'] !== 'number' ||
              !Number.isInteger(tl['endMs']) ||
              tl['endMs'] < 1
            ) {
              errors.push(`${tp}/endMs: phải là số nguyên >= 1`);
            }
            if (
              typeof tl['audioStartMs'] !== 'number' ||
              !Number.isInteger(tl['audioStartMs']) ||
              tl['audioStartMs'] < 0
            ) {
              errors.push(`${tp}/audioStartMs: phải là số nguyên >= 0`);
            }
            if (
              typeof tl['audioEndMs'] !== 'number' ||
              !Number.isInteger(tl['audioEndMs']) ||
              tl['audioEndMs'] < 1
            ) {
              errors.push(`${tp}/audioEndMs: phải là số nguyên >= 1`);
            }
            if (
              typeof tl['gapAfterMs'] !== 'number' ||
              !Number.isInteger(tl['gapAfterMs']) ||
              tl['gapAfterMs'] < 0
            ) {
              errors.push(`${tp}/gapAfterMs: phải là số nguyên >= 0`);
            }
          }
        }
      }
    }
  }

  // Validate richText segment helper
  function validateSegment(seg: unknown, sp: string): void {
    if (!isObject(seg)) {
      errors.push(`${sp}: segment phải là một đối tượng`);
      return;
    }
    const t = seg['t'];
    if (t === 'text') {
      checkAllowedProps(seg, new Set(['t', 'text']), sp, errors);
      if (
        typeof seg['text'] !== 'string' ||
        seg['text'].length < 1 ||
        /[\r\n]/.test(seg['text'])
      ) {
        errors.push(`${sp}/text: không được rỗng hoặc chứa ký tự xuống dòng`);
      }
    } else if (t === 'ruby') {
      checkAllowedProps(seg, new Set(['t', 'text', 'rt']), sp, errors);
      if (typeof seg['text'] !== 'string' || seg['text'].length < 1) {
        errors.push(`${sp}/text: ruby text không được rỗng`);
      }
      if (typeof seg['rt'] !== 'string' || seg['rt'].length < 1) {
        errors.push(`${sp}/rt: ruby rt không được rỗng`);
      }
    } else if (t === 'underline' || t === 'emphasis') {
      checkAllowedProps(seg, new Set(['t', 'children']), sp, errors);
      validateRichText(seg['children'], `${sp}/children`);
    } else if (t === 'blank') {
      checkAllowedProps(seg, new Set(['t', 'label']), sp, errors);
    } else if (t === 'star' || t === 'br') {
      checkAllowedProps(seg, new Set(['t']), sp, errors);
    } else if (t === 'image') {
      checkAllowedProps(seg, new Set(['t', 'mediaKey', 'alt', 'width', 'height']), sp, errors);
      if (typeof seg['mediaKey'] !== 'string' || seg['mediaKey'].length < 1) {
        errors.push(`${sp}/mediaKey: thiếu`);
      }
      if (typeof seg['alt'] !== 'string') errors.push(`${sp}/alt: cần chuỗi`);
      if (
        typeof seg['width'] !== 'number' ||
        !Number.isInteger(seg['width']) ||
        seg['width'] < 1
      ) {
        errors.push(`${sp}/width: số nguyên >= 1`);
      }
      if (
        typeof seg['height'] !== 'number' ||
        !Number.isInteger(seg['height']) ||
        seg['height'] < 1
      ) {
        errors.push(`${sp}/height: số nguyên >= 1`);
      }
    } else {
      errors.push(`${sp}/t: kiểu segment không hợp lệ: ${t}`);
    }
  }

  function validateRichText(rt: unknown, rtp: string): void {
    if (!Array.isArray(rt) || rt.length === 0) {
      errors.push(`${rtp}: RichText phải là mảng ít nhất 1 phần tử`);
      return;
    }
    for (let i = 0; i < rt.length; i++) {
      validateSegment(rt[i], `${rtp}/${i}`);
    }
  }

  function validateRichBlock(block: unknown, bp: string): void {
    if (!isObject(block)) {
      errors.push(`${bp}: RichBlock phải là một đối tượng`);
      return;
    }
    const type = block['type'];
    if (type === 'paragraph') {
      checkAllowedProps(block, new Set(['type', 'content']), bp, errors);
      validateRichText(block['content'], `${bp}/content`);
    } else if (type === 'image') {
      checkAllowedProps(
        block,
        new Set(['type', 'mediaKey', 'alt', 'width', 'height']),
        bp,
        errors
      );
      if (typeof block['mediaKey'] !== 'string' || block['mediaKey'].length < 1) {
        errors.push(`${bp}/mediaKey: thiếu`);
      }
      if (typeof block['alt'] !== 'string') errors.push(`${bp}/alt: cần chuỗi`);
      if (
        typeof block['width'] !== 'number' ||
        !Number.isInteger(block['width']) ||
        block['width'] < 1
      ) {
        errors.push(`${bp}/width: số nguyên >= 1`);
      }
      if (
        typeof block['height'] !== 'number' ||
        !Number.isInteger(block['height']) ||
        block['height'] < 1
      ) {
        errors.push(`${bp}/height: số nguyên >= 1`);
      }
    } else if (type === 'table') {
      checkAllowedProps(block, new Set(['type', 'rows']), bp, errors);
      if (!Array.isArray(block['rows']) || block['rows'].length < 1) {
        errors.push(`${bp}/rows: bảng phải có ít nhất 1 hàng`);
      } else {
        for (let ri = 0; ri < block['rows'].length; ri++) {
          const row = block['rows'][ri];
          const rp = `${bp}/rows/${ri}`;
          if (!Array.isArray(row) || row.length < 1) {
            errors.push(`${rp}: hàng phải có ít nhất 1 ô`);
          } else {
            for (let ci = 0; ci < row.length; ci++) {
              validateRichText(row[ci], `${rp}/${ci}`);
            }
          }
        }
      }
    } else {
      errors.push(`${bp}/type: kiểu block không hợp lệ: ${type}`);
    }
  }

  // Validate groups
  if (!Array.isArray(raw['groups']) || raw['groups'].length < 1) {
    errors.push('/groups: phải là mảng có ít nhất 1 group');
  } else {
    for (let gi = 0; gi < raw['groups'].length; gi++) {
      const g = raw['groups'][gi];
      const gp = `/groups/${gi}`;
      if (!isObject(g)) {
        errors.push(`${gp}: phải là một đối tượng`);
        continue;
      }
      checkAllowedProps(
        g,
        new Set([
          'id',
          'sectionCode',
          'mondaiType',
          'orderInSection',
          'instructions',
          'passage',
          'mediaKeys',
          'sourcePages',
          'questions',
          'transcript',
        ]),
        gp,
        errors
      );

      if (typeof g['id'] !== 'string' || !ID_REGEX.test(g['id'])) {
        errors.push(`${gp}/id: không đúng định dạng`);
      }
      if (typeof g['sectionCode'] !== 'string' || g['sectionCode'].length === 0) {
        errors.push(`${gp}/sectionCode: thiếu`);
      }
      if (!isOneOf(g['mondaiType'], MONDAI_TYPES)) {
        errors.push(`${gp}/mondaiType: giá trị ngoài danh sách cho phép`);
      }
      if (
        typeof g['orderInSection'] !== 'number' ||
        !Number.isInteger(g['orderInSection']) ||
        g['orderInSection'] < 1
      ) {
        errors.push(`${gp}/orderInSection: phải là số nguyên >= 1`);
      }
      validateRichText(g['instructions'], `${gp}/instructions`);

      if (!Array.isArray(g['passage'])) {
        errors.push(`${gp}/passage: phải là mảng`);
      } else {
        for (let pi = 0; pi < g['passage'].length; pi++) {
          validateRichBlock(g['passage'][pi], `${gp}/passage/${pi}`);
        }
      }

      if (!Array.isArray(g['mediaKeys'])) {
        errors.push(`${gp}/mediaKeys: phải là mảng`);
      }
      if (!Array.isArray(g['sourcePages'])) {
        errors.push(`${gp}/sourcePages: phải là mảng`);
      }

      // Questions
      if (!Array.isArray(g['questions']) || g['questions'].length < 1) {
        errors.push(`${gp}/questions: phải là mảng ít nhất 1 câu hỏi`);
      } else {
        for (let qi = 0; qi < g['questions'].length; qi++) {
          const q = g['questions'][qi];
          const qp = `${gp}/questions/${qi}`;
          if (!isObject(q)) {
            errors.push(`${qp}: phải là một đối tượng`);
            continue;
          }
          checkAllowedProps(
            q,
            new Set([
              'id',
              'number',
              'skill',
              'stem',
              'options',
              'correctOption',
              'sourcePages',
              'explanation',
            ]),
            qp,
            errors
          );

          if (typeof q['id'] !== 'string' || !ID_REGEX.test(q['id'])) {
            errors.push(`${qp}/id: không đúng định dạng`);
          }
          if (typeof q['number'] !== 'string' || q['number'].length === 0) {
            errors.push(`${qp}/number: thiếu`);
          }
          if (!isOneOf(q['skill'], SKILLS)) {
            errors.push(`${qp}/skill: giá trị ngoài danh sách cho phép`);
          }
          validateRichText(q['stem'], `${qp}/stem`);

          if (
            !Array.isArray(q['options']) ||
            q['options'].length < 3 ||
            q['options'].length > 4
          ) {
            errors.push(`${qp}/options: phải có từ 3 đến 4 lựa chọn`);
          } else {
            for (let oi = 0; oi < q['options'].length; oi++) {
              const opt = q['options'][oi];
              const op = `${qp}/options/${oi}`;
              if (!isObject(opt)) {
                errors.push(`${op}: phải là một đối tượng`);
                continue;
              }
              checkAllowedProps(opt, new Set(['label', 'content']), op, errors);
              if (!isOneOf(opt['label'], OPTION_LABELS)) {
                errors.push(`${op}/label: nhãn ngoài danh sách (1, 2, 3, 4)`);
              }
              validateRichText(opt['content'], `${op}/content`);
            }
          }

          if (
            q['correctOption'] !== null &&
            (typeof q['correctOption'] !== 'number' ||
              !Number.isInteger(q['correctOption']) ||
              q['correctOption'] < 1 ||
              q['correctOption'] > 4)
          ) {
            errors.push(`${qp}/correctOption: phải là null hoặc số nguyên 1..4`);
          }

          if (!Array.isArray(q['sourcePages'])) {
            errors.push(`${qp}/sourcePages: phải là mảng`);
          }

          if (q['explanation'] !== null && isObject(q['explanation'])) {
            const exp = q['explanation'];
            checkAllowedProps(exp, new Set(['locale', 'blocks']), `${qp}/explanation`, errors);
            if (!isOneOf(exp['locale'], EXPLANATION_LOCALES)) {
              errors.push(`${qp}/explanation/locale: ngoài danh sách cho phép`);
            }
            if (!Array.isArray(exp['blocks']) || exp['blocks'].length < 1) {
              errors.push(`${qp}/explanation/blocks: phải là mảng ít nhất 1 block`);
            }
          }
        }
      }

      if (g['transcript'] !== null && !Array.isArray(g['transcript'])) {
        errors.push(`${gp}/transcript: phải là mảng hoặc null`);
      }
    }
  }

  // Validate media
  if (!Array.isArray(raw['media'])) {
    errors.push('/media: phải là mảng');
  } else {
    for (let mi = 0; mi < raw['media'].length; mi++) {
      const m = raw['media'][mi];
      const mp = `/media/${mi}`;
      if (!isObject(m)) {
        errors.push(`${mp}: phải là một đối tượng`);
        continue;
      }
      checkAllowedProps(
        m,
        new Set(['path', 'sha256', 'mimeType', 'durationMs', 'width', 'height']),
        mp,
        errors
      );
      if (typeof m['path'] !== 'string' || !MEDIA_PATH_REGEX.test(m['path'])) {
        errors.push(`${mp}/path: không đúng định dạng đường dẫn media`);
      }
      if (typeof m['sha256'] !== 'string' || !HASH_REGEX.test(m['sha256'])) {
        errors.push(`${mp}/sha256: không đúng định dạng SHA-256`);
      }
      if (!isOneOf(m['mimeType'], MEDIA_MIMES)) {
        errors.push(`${mp}/mimeType: ngoài danh sách cho phép`);
      }
      if (
        m['durationMs'] !== null &&
        (typeof m['durationMs'] !== 'number' ||
          !Number.isInteger(m['durationMs']) ||
          m['durationMs'] < 1)
      ) {
        errors.push(`${mp}/durationMs: phải là null hoặc số nguyên >= 1`);
      }
      if (
        m['width'] !== null &&
        (typeof m['width'] !== 'number' ||
          !Number.isInteger(m['width']) ||
          m['width'] < 1)
      ) {
        errors.push(`${mp}/width: phải là null hoặc số nguyên >= 1`);
      }
      if (
        m['height'] !== null &&
        (typeof m['height'] !== 'number' ||
          !Number.isInteger(m['height']) ||
          m['height'] < 1)
      ) {
        errors.push(`${mp}/height: phải là null hoặc số nguyên >= 1`);
      }
    }
  }

  // Validate issues
  if (!Array.isArray(raw['issues'])) {
    errors.push('/issues: phải là mảng');
  } else {
    for (let ii = 0; ii < raw['issues'].length; ii++) {
      const issue = raw['issues'][ii];
      const ip = `/issues/${ii}`;
      if (!isObject(issue)) {
        errors.push(`${ip}: phải là một đối tượng`);
        continue;
      }
      checkAllowedProps(
        issue,
        new Set(['id', 'severity', 'path', 'reason', 'sourcePages']),
        ip,
        errors
      );
      if (typeof issue['id'] !== 'string' || !ID_REGEX.test(issue['id'])) {
        errors.push(`${ip}/id: không đúng định dạng`);
      }
      if (!isOneOf(issue['severity'], ISSUE_SEVERITIES)) {
        errors.push(`${ip}/severity: ngoài danh sách cho phép (blocking, warning)`);
      }
      if (typeof issue['path'] !== 'string' || !issue['path'].startsWith('/')) {
        errors.push(`${ip}/path: phải bắt đầu bằng /`);
      }
      if (typeof issue['reason'] !== 'string' || issue['reason'].length === 0) {
        errors.push(`${ip}/reason: thiếu lý do`);
      }
      if (!Array.isArray(issue['sourcePages'])) {
        errors.push(`${ip}/sourcePages: phải là mảng`);
      }
    }
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? (raw as unknown as ImportPackageV2) : undefined,
    errors,
  };
}
