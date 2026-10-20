import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import ExamSchedulePage from '../app/(info)/lich-thi/page';
import { VocabExplorer } from '../features/corpus/components/vocab-explorer';
import { NotebookView } from '../features/learning/components/notebook-view';
import { FlashcardView } from '../features/learning/components/flashcard-view';
import { ExplanationView } from '../features/explanations/components/explanation-view';
import { QuestionView } from '../features/exam/components/question-view';
import { RichTextView } from '@jlpt/ui/components/rich-text-view';
import { FuriganaToggle, getFuriganaSetting, setFuriganaSetting } from '@jlpt/ui/components/furigana-toggle';
import type { RichTextSegment } from '@jlpt/schema';
import type { VocabTermDto } from '../features/corpus/types';
import type { NotebookItem, DueFlashcard } from '../features/learning/types';
import type { LearnerExplanation } from '../features/explanations/types';
import type { FlatQuestionItem } from '../features/exam/types';

interface GlobalWithDom {
  window?: unknown;
  document?: unknown;
  localStorage?: unknown;
}

const globalEnv = globalThis as unknown as GlobalWithDom;

describe('P04 Features Test Suite', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-furigana');
    }
  });

  afterEach(() => {
    delete globalEnv.window;
    delete globalEnv.document;
    delete globalEnv.localStorage;
  });

  describe('1. JLPT Exam Schedule Page (/lich-thi)', () => {
    it('renders schedule page structure with title, level filter and reminder toggle', () => {
      const html = renderToString(<ExamSchedulePage />);

      expect(html).toContain('data-testid="schedule-page-container"');
      expect(html).toContain('data-testid="schedule-page-title"');
      expect(html).toContain('data-testid="schedule-reminder-toggle"');
      expect(html).toContain('data-testid="schedule-level-filter"');
      expect(html).toContain('data-testid="schedule-loading"');
    });
  });

  describe('2. Furigana Toggle & Persistence', () => {
    it('sets document attribute and stores choice in localStorage', () => {
      const storageMock: Record<string, string> = {};
      const fakeStorage = {
        getItem: (k: string) => storageMock[k] ?? null,
        setItem: (k: string, v: string) => { storageMock[k] = v; },
        removeItem: (k: string) => { delete storageMock[k]; },
        clear: () => { Object.keys(storageMock).forEach((k) => delete storageMock[k]); },
      };
      const mockDoc = {
        documentElement: {
          setAttribute: vi.fn(),
          removeAttribute: vi.fn(),
          getAttribute: vi.fn(),
        },
      };
      (globalEnv as Record<string, unknown>).localStorage = fakeStorage;
      (globalEnv as Record<string, unknown>).document = mockDoc;
      (globalEnv as Record<string, unknown>).window = {
        localStorage: fakeStorage,
        document: mockDoc,
        dispatchEvent: vi.fn(),
        CustomEvent: class CustomEvent { constructor(public type: string, public detail?: unknown) {} },
      };

      setFuriganaSetting(false);
      expect(fakeStorage.getItem('jlpt_furigana_enabled')).toBe('false');
      expect(getFuriganaSetting()).toBe(false);

      setFuriganaSetting(true);
      expect(fakeStorage.getItem('jlpt_furigana_enabled')).toBe('true');
      expect(getFuriganaSetting()).toBe(true);
    });

    it('renders ruby rt elements with display: none style when showFurigana is false', () => {
      const segments: RichTextSegment[] = [
        { t: 'ruby', text: '日本', rt: 'にほん' },
        { t: 'text', text: '語' },
      ];

      const htmlWithFurigana = renderToString(<RichTextView segments={segments} showFurigana={true} />);
      expect(htmlWithFurigana).toContain('<rt class="jlpt-ruby-rt"');
      expect(htmlWithFurigana).toContain('にほん');
      expect(htmlWithFurigana).not.toContain('display:none');

      const htmlWithoutFurigana = renderToString(<RichTextView segments={segments} showFurigana={false} />);
      expect(htmlWithoutFurigana).toContain('<rt class="jlpt-ruby-rt"');
      expect(htmlWithoutFurigana).toContain('style="font-size:0.65em;color:var(--text-secondary, #475569);user-select:none;display:none"');
      expect(htmlWithoutFurigana).toContain('にほん');
    });

    it('QuestionView forwards showFurigana to stem and options', () => {
      const mockQuestion = {
        questionId: 'q-1',
        globalIndex: 0,
        number: '1',
        stem: [{ t: 'ruby', text: '漢字', rt: 'かんじ' } as RichTextSegment],
        options: [
          { label: '1', content: [{ t: 'ruby', text: '勉強', rt: 'べんきょう' } as RichTextSegment] },
          { label: '2', content: [{ t: 'ruby', text: '読書', rt: 'どくしょ' } as RichTextSegment] },
        ],
        isLocked: false,
      } as unknown as FlatQuestionItem;

      const htmlWithFurigana = renderToString(
        <QuestionView
          question={mockQuestion}
          selectedOption={0}
          isFlagged={false}
          onSelectOption={() => {}}
          onToggleFlag={() => {}}
          showFurigana={true}
        />
      );
      expect(htmlWithFurigana).toContain('<rt class="jlpt-ruby-rt"');
      expect(htmlWithFurigana).toContain('かんじ');
      expect(htmlWithFurigana).not.toContain('display:none');

      const htmlWithoutFurigana = renderToString(
        <QuestionView
          question={mockQuestion}
          selectedOption={0}
          isFlagged={false}
          onSelectOption={() => {}}
          onToggleFlag={() => {}}
          showFurigana={false}
        />
      );
      expect(htmlWithoutFurigana).toContain('display:none');
      expect(htmlWithoutFurigana).toContain('かんじ');
      expect(htmlWithoutFurigana).toContain('べんきょう');
    });

    it('FuriganaToggle button renders with toggle testid and label', () => {
      const html = renderToString(<FuriganaToggle />);
      expect(html).toContain('data-testid="toggle-furigana-btn"');
      expect(html).toContain('Furigana');
    });
  });

  describe('3. Sino-Vietnamese (Hán Việt) Display', () => {
    it('displays vocab-hanviet in VocabExplorer when item has hanViet', () => {
      const mockItem: VocabTermDto = {
        term: '勉強',
        reading: 'べんきょう',
        meaning: 'Học tập',
        hanViet: 'MIỄN CƯỜNG',
        level: 'N5',
        frequency: 100,
      };

      const html = renderToString(<VocabExplorer initialItems={[mockItem]} initialLevel="ALL" />);
      expect(html).toContain('data-testid="vocab-hanviet"');
      expect(html).toContain('MIỄN CƯỜNG');
    });

    it('displays notebook-item-hanviet in NotebookView when item has hanViet', () => {
      const mockItem: NotebookItem = {
        id: 'nb-1',
        userId: 'u-1',
        kind: 'vocab',
        term: '会社',
        reading: 'かいしゃ',
        meaning: 'Công ty',
        hanViet: 'HỘI XÃ',
        mastered: false,
        tags: [],
        version: 1,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const html = renderToString(
        <NotebookView
          items={[mockItem]}
          totalCount={1}
          onAddItem={async () => {}}
          onUpdateItem={async () => {}}
          onDeleteItem={async () => {}}
          onExportCsv={async () => {}}
        />
      );
      expect(html).toContain('data-testid="notebook-item-hanviet"');
      expect(html).toContain('HỘI XÃ');
    });

    it('displays flashcard-hanviet on flashcard back when hanViet is provided', () => {
      const mockCard: DueFlashcard = {
        cardId: 'c-1',
        notebookItemId: 'nb-1',
        front: { term: '先生', reading: 'せんせい' },
        back: { meaning: 'Thầy cô giáo', reading: 'せんせい', hanViet: 'TIÊN SINH' },
        dueAt: '2026-01-01',
        intervalDays: 1,
        repetitions: 1,
        state: 'new',
      };

      const html = renderToString(<FlashcardView card={mockCard} onRate={() => {}} />);
      expect(html).toContain('data-testid="flashcard-card"');
      expect(html).toContain('先生');
    });

    it('displays explanation-hanviet in ExplanationView when explanation has hanViet', () => {
      const mockExplanation: LearnerExplanation = {
        index: 0,
        questionId: 'q-1',
        hasExplanation: true,
        correctReason: 'Đáp án 1 đúng vì cấu trúc diễn tả mục đích.',
        wrongReasonsByOption: {},
        translation: 'Ngày mai tôi đi Tokyo.',
        vocabTags: [],
        grammarTags: [],
        hanViet: [{ kanji: '東京', reading: 'ĐÔNG KINH' }],
        transcript: null,
        evidenceRanges: [],
      };

      const html = renderToString(<ExplanationView explanation={mockExplanation} questionNumber={1} />);
      expect(html).toContain('data-testid="explanation-hanviet"');
      expect(html).toContain('ĐÔNG KINH');
      expect(html).toContain('東京');
    });
  });
});
