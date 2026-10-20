export interface EvidenceRange {
  startMs?: number;
  endMs?: number;
  quote?: string;
  explanation?: string;
}

export interface LearnerExplanation {
  index: number;
  questionId: string;
  hasExplanation: boolean;
  correctReason: string | null;
  wrongReasonsByOption: Record<string, string> | null;
  translation: string | null;
  vocabTags: string[];
  grammarTags: string[];
  hanViet?: string | string[] | Array<{ kanji: string; reading: string }> | null;
  transcript: string | null;
  evidenceRanges: EvidenceRange[];
  sourceLabel?: string | null;
  licenseLabel?: string | null;
  isLicensed?: boolean;
}

export type QuestionMarkType = 'review' | 'difficult' | 'vocab' | 'grammar';

export interface QuestionMarkItem {
  id: string;
  questionId: string;
  markType: QuestionMarkType;
  createdAt: string;
}

export type QuestionReportReason =
  | 'wrong_answer'
  | 'typo_grammar'
  | 'audio_issue'
  | 'explanation_unclear'
  | 'copyright_issue'
  | 'other';

export interface CreateQuestionReportInput {
  questionId: string;
  reason: QuestionReportReason;
  description?: string;
}
