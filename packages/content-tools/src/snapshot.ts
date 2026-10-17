import crypto from 'node:crypto';
import type {
  ExamKind as SchemaExamKind,
  ExamManifest,
  Level,
  ListeningTimelineItem,
  PublicExamSnapshot,
  PublicOption,
  PublicQuestion,
  PublicQuestionGroup,
  PublicSection,
  RichBlock,
  RichText,
} from '@jlpt/schema';
import {
  assertNoAnswerLeak,
  ExamManifestSchema,
  PublicExamSnapshotSchema,
} from '@jlpt/schema';
import type { ImportPackageV2, TimelineEntry } from './types.js';

/**
 * Generates a deterministic RFC 4122 v4-format UUID from an arbitrary string.
 */
export function stringToUuid(str: string): string {
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') +
      hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-');
}

export interface SnapshotBuildOptions {
  examId?: string;
  version?: number;
}

export interface ExamAnswerKeyItem {
  index: number;
  questionId: string;
  sourceQuestionId: string;
  correctOption: number;
  skill: string;
}

export interface BuildSnapshotResult {
  snapshot: PublicExamSnapshot;
  manifest: ExamManifest;
  answerKeys: Record<number, number>;
  answerKeyItems: ExamAnswerKeyItem[];
}

/**
 * Builds a strict PublicExamSnapshot from an ImportPackageV2.
 * Faithfully preserves:
 * - Ruby furigana ({ t: 'ruby', text, rt }) in RichText
 * - Tables ({ type: 'table', rows }) in passages
 * - Star symbols and blanks ({ t: 'star' }, { t: 'blank' }) in sentence composition
 * - Audio manifests and listening timeline (startMs, endMs, audioStartMs, audioEndMs, gapAfterMs)
 * - Correct answer options (extracted into a private server-side answer key)
 *
 * Guarantees ZERO answer leakage in the public snapshot by verifying:
 * 1. assertNoAnswerLeak(snapshot)
 * 2. PublicExamSnapshotSchema.parse(snapshot)
 */
export function buildSnapshotFromImportPackage(
  pkg: ImportPackageV2,
  options: SnapshotBuildOptions = {},
): BuildSnapshotResult {
  const examId = options.examId ?? stringToUuid(`exam:${pkg.packageId}`);
  const version = options.version ?? pkg.revision ?? 1;
  const level = pkg.source.level as Level;
  const kind: SchemaExamKind = pkg.exam.kind === 'practice' ? 'practice' : 'original';

  const groupMap = new Map<string, (typeof pkg.groups)[number]>();
  for (const g of pkg.groups) {
    groupMap.set(g.id, g);
  }

  const groupUuidMap = new Map<string, string>();
  for (const g of pkg.groups) {
    groupUuidMap.set(g.id, stringToUuid(`group:${pkg.packageId}:${g.id}`));
  }

  const mediaSet = new Set<string>();
  const answerKeys: Record<number, number> = {};
  const answerKeyItems: ExamAnswerKeyItem[] = [];

  let globalQuestionIndex = 0;
  const publicSections: PublicSection[] = [];

  for (let sIdx = 0; sIdx < pkg.exam.sections.length; sIdx++) {
    const sec = pkg.exam.sections[sIdx]!;
    const startRange = globalQuestionIndex;
    const publicGroups: PublicQuestionGroup[] = [];

    for (const gId of sec.groupIds) {
      const g = groupMap.get(gId);
      if (!g) continue;

      const groupUuid = groupUuidMap.get(gId)!;
      const groupMedia = Array.isArray(g.mediaKeys) ? [...g.mediaKeys] : [];
      for (const m of groupMedia) {
        mediaSet.add(m);
      }

      const publicQuestions: PublicQuestion[] = [];

      for (const q of g.questions) {
        const qIndex = globalQuestionIndex++;
        const questionUuid = stringToUuid(`question:${pkg.packageId}:${q.id}`);

        if (q.correctOption !== null && q.correctOption !== undefined) {
          answerKeys[qIndex] = q.correctOption;
          answerKeyItems.push({
            index: qIndex,
            questionId: questionUuid,
            sourceQuestionId: q.id,
            correctOption: q.correctOption,
            skill: q.skill,
          });
        }

        // Map options without answer keys
        const publicOptions: PublicOption[] = q.options.map((opt) => ({
          label: opt.label,
          content: opt.content as unknown as RichText,
        }));

        publicQuestions.push({
          index: qIndex,
          questionId: questionUuid,
          number: q.number,
          stem: q.stem as unknown as RichText,
          options: publicOptions,
        });
      }

      publicGroups.push({
        groupId: groupUuid,
        mondaiType: g.mondaiType,
        instructions: g.instructions as unknown as RichText,
        passage: g.passage && g.passage.length > 0 ? (g.passage as unknown as RichBlock[]) : null,
        media: groupMedia,
        questions: publicQuestions,
      });
    }

    const endRange = globalQuestionIndex > startRange ? globalQuestionIndex - 1 : startRange;

    // Map listening timeline if present
    let publicTimeline: ListeningTimelineItem[] | null = null;
    if (sec.listeningTimeline && sec.listeningTimeline.length > 0) {
      publicTimeline = sec.listeningTimeline.map((item: TimelineEntry) => {
        mediaSet.add(item.mediaKey);
        return {
          groupId: groupUuidMap.get(item.groupId) ?? stringToUuid(`group:${pkg.packageId}:${item.groupId}`),
          mediaKey: item.mediaKey,
          startMs: item.startMs,
          endMs: item.endMs,
          audioStartMs: item.audioStartMs,
          audioEndMs: item.audioEndMs,
          gapAfterMs: item.gapAfterMs,
        };
      });
    }

    publicSections.push({
      index: sIdx,
      code: sec.code,
      title: sec.title,
      durationSec: sec.durationSec ?? 1800,
      questionRange: [startRange, endRange],
      groups: publicGroups,
      listeningTimeline: publicTimeline,
    });
  }

  const publicSnapshot: PublicExamSnapshot = {
    schemaVersion: 1,
    examId,
    version,
    level,
    title: pkg.exam.title,
    kind,
    totalQuestions: globalQuestionIndex,
    sections: publicSections,
  };

  // Strictly assert ZERO answer leak in snapshot
  assertNoAnswerLeak(publicSnapshot);
  PublicExamSnapshotSchema.parse(publicSnapshot);

  const manifest: ExamManifest = {
    examId,
    version,
    media: Array.from(mediaSet),
  };
  ExamManifestSchema.parse(manifest);

  return {
    snapshot: publicSnapshot,
    manifest,
    answerKeys,
    answerKeyItems,
  };
}
