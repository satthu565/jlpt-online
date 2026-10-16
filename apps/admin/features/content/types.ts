import type {
  Level,
  MondaiType,
  RichBlock,
  RichText,
  RichTextSegment,
  Skill,
  Blueprint,
} from '@jlpt/schema';

// Helper constructors for RichTextSegment
export function createTextSegment(text: string): RichTextSegment {
  return { t: 'text', text };
}

export function createRubySegment(text: string, rt: string): RichTextSegment {
  return { t: 'ruby', text, rt };
}

export function createStarSegment(): RichTextSegment {
  return { t: 'star' };
}

export function createUnderlineSegment(text: string): RichTextSegment {
  return { t: 'underline', text };
}

export function createBlankSegment(label?: string): RichTextSegment {
  return label ? { t: 'blank', label } : { t: 'blank' };
}

export function createLineBreakSegment(): RichTextSegment {
  return { t: 'br' };
}

export function createImageSegment(options: {
  mediaKey?: string;
  alt?: string;
  url?: string;
  width?: number;
  height?: number;
}): RichTextSegment {
  return {
    t: 'image',
    mediaKey: options.mediaKey,
    alt: options.alt,
    url: options.url,
    width: options.width,
    height: options.height,
  };
}

// Helper constructors for RichBlock
export function createParagraphBlock(content: RichText): RichBlock {
  return { type: 'paragraph', content };
}

export function createTableBlock(rows: RichText[][]): RichBlock {
  return { type: 'table', rows };
}

export function createImageBlock(mediaKey: string, alt: string, width = 600, height = 400): RichBlock {
  return { type: 'image', mediaKey, alt, width, height };
}

// Convert RichText to searchable plain text
export function richTextToPlainText(richText: RichText): string {
  return richText
    .map((seg) => {
      switch (seg.t) {
        case 'text':
          return seg.text;
        case 'ruby':
          return `${seg.text}(${seg.rt})`;
        case 'underline':
          return seg.text ?? '';
        case 'emphasis':
          return '';
        case 'blank':
          return `(${seg.label ?? ' '})`;
        case 'star':
          return '★';
        case 'br':
          return '\n';
        case 'image':
          return seg.alt ? `[${seg.alt}]` : '';
      }
    })
    .join('');
}

// Listening Timeline Item
export interface ListeningTimelineItem {
  groupId: string;
  mediaKey: string;
  startMs: number;
  endMs: number;
  audioStartMs: number;
  audioEndMs: number;
  gapAfterMs: number;
}

// Question Option definition
export interface AdminQuestionOption {
  label: string;
  content: RichText;
  isCorrect?: boolean;
}

// Single Question in Question Group
export interface AdminQuestion {
  tempId?: string;
  questionId?: string;
  number?: string;
  stem: RichText;
  options: AdminQuestionOption[];
  correctOption: number; // 1-indexed (1, 2, 3, or 4)
  explanation?: RichText;
  explanationId?: string;
  tags?: string[];
}

export type ContentStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'hidden';

// Question Group model for Admin
export interface AdminQuestionGroup {
  id: string;
  version: number;
  level: Level;
  sectionCode: string;
  mondaiType: MondaiType;
  skill: Skill;
  title?: string;
  instructions: RichText;
  passage?: RichBlock[] | null;
  audioSha256?: string | null;
  audioMediaKey?: string | null;
  listeningTimeline?: ListeningTimelineItem[];
  mediaIds: string[];
  questions: AdminQuestion[];
  sourceRef: string;
  sourcePage?: number;
  status: ContentStatus;
  lastEditedBy: string;
  authorId: string;
  reviewerId?: string | null;
  reviewComment?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Exam item model
export interface AdminExamItem {
  id: string;
  examId: string;
  sectionCode: string;
  groupVersionId: string;
  groupId: string;
  orderIndex: number;
  group?: AdminQuestionGroup;
}

// Exam section model
export interface AdminExamSection {
  code: string;
  title: string;
  durationSec: number;
  orderIndex: number;
  items: AdminExamItem[];
}

// Exam model for Admin
export interface AdminExam {
  id: string;
  slug: string;
  level: Level;
  title: string;
  kind: 'original' | 'practice' | 'mixed' | 'custom';
  year?: number;
  session?: string;
  description: string;
  blueprintId: string;
  blueprintVersion: number;
  sourceRefs: string[];
  sections: AdminExamSection[];
  totalQuestions: number;
  publishedVersion?: number | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// Blueprint model alias and validation result
export type AdminBlueprint = Blueprint;

export interface BlueprintValidationResult {
  valid: boolean;
  violations: string[];
}
