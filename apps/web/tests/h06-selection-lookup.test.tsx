import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  extractCleanSelectionText,
  getEligibleSelection,
  JAPANESE_CHAR_REGEX,
  SELECT_LOOKUP_STORAGE_KEY,
} from '../features/corpus/hooks/use-select-lookup';
import { SelectionLookupPopover } from '../features/corpus/components/selection-lookup-popover';
import { SelectionKanjiPanel } from '../features/corpus/components/selection-kanji-panel';
import { selectedKanji } from '../features/corpus/utils/selected-kanji';
import { VocabDetailView } from '../features/corpus/components/vocab-detail-view';
import type { DictionaryEntryDetailDto } from '../features/corpus/types';
import { I18nProvider } from '../lib/i18n';
import viMessages from '../messages/vi.json';

// Dấu comment React chèn khi render (ngăn cách text, Suspense); bỏ đúng các chuỗi này thay vì lọc HTML bằng regex.
const REACT_MARKERS = ['<!-- -->', '<!--$-->', '<!--/$-->', '<!--$?-->', '<!--$!-->'];

const renderClean = (element: React.JSX.Element): string =>
  REACT_MARKERS.reduce(
    (html, marker) => html.split(marker).join(''),
    renderToString(
      <I18nProvider initialLocale="vi" messages={viMessages}>
        {element}
      </I18nProvider>,
    ),
  );

const mockDomRect = {
  width: 50,
  height: 20,
  top: 10,
  left: 10,
  bottom: 30,
  right: 60,
  x: 10,
  y: 10,
  toJSON: () => ({}),
} as unknown as DOMRect;

describe('H06: Selection Lookup & Dictionary Detail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Regex and Storage Constants', () => {
    it('JAPANESE_CHAR_REGEX matches hiragana, katakana, and kanji correctly', () => {
      expect(JAPANESE_CHAR_REGEX.test('学生')).toBe(true);
      expect(JAPANESE_CHAR_REGEX.test('がくせい')).toBe(true);
      expect(JAPANESE_CHAR_REGEX.test('テスト')).toBe(true);
      expect(JAPANESE_CHAR_REGEX.test('EnglishOnly')).toBe(false);
      expect(JAPANESE_CHAR_REGEX.test('123456')).toBe(false);
    });

    it('SELECT_LOOKUP_STORAGE_KEY is jlpt_select_lookup', () => {
      expect(SELECT_LOOKUP_STORAGE_KEY).toBe('jlpt_select_lookup');
    });
  });

  describe('extractCleanSelectionText', () => {
    it('strips <rt> and <rp> tags from ruby text and returns clean base characters', () => {
      let removed = false;
      const mockFragment = {
        querySelectorAll: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'rt, rp') {
            return [{ remove: () => { removed = true; } }];
          }
          return [];
        }),
        get textContent() {
          return removed ? '学生' : '学生がくせい';
        },
      };
      const mockRange = {
        cloneContents: () => mockFragment,
      } as unknown as Range;

      const cleaned = extractCleanSelectionText(mockRange);
      expect(mockFragment.querySelectorAll).toHaveBeenCalledWith('rt, rp');
      expect(cleaned).toBe('学生');
    });

    it('returns plain text unmodified when no ruby is present', () => {
      const mockFragment = {
        querySelectorAll: vi.fn().mockReturnValue([]),
        textContent: '  食べる  ',
      };
      const mockRange = {
        cloneContents: () => mockFragment,
      } as unknown as Range;

      const cleaned = extractCleanSelectionText(mockRange);
      expect(cleaned).toBe('食べる');
    });
  });

  describe('getEligibleSelection', () => {
    it('returns null if selection is collapsed or empty', () => {
      const mockSelection = {
        rangeCount: 0,
        isCollapsed: true,
      } as unknown as Selection;
      expect(getEligibleSelection(mockSelection)).toBeNull();
    });

    it('returns null if selection is inside exam toolbar or excluded areas', () => {
      const mockElement = {
        nodeType: 1,
        closest: (selector: string) => {
          if (selector.includes('toolbar')) return {};
          return null;
        },
      };
      const mockRange = {
        commonAncestorContainer: mockElement,
      };
      const mockSelection = {
        rangeCount: 1,
        isCollapsed: false,
        getRangeAt: () => mockRange,
      } as unknown as Selection;

      expect(getEligibleSelection(mockSelection)).toBeNull();
    });

    it('returns null if selection is outside allowed question/passage/explanation containers', () => {
      const mockElement = {
        nodeType: 1,
        closest: () => null,
      };
      const mockRange = {
        commonAncestorContainer: mockElement,
      };
      const mockSelection = {
        rangeCount: 1,
        isCollapsed: false,
        getRangeAt: () => mockRange,
      } as unknown as Selection;

      expect(getEligibleSelection(mockSelection)).toBeNull();
    });

    it('returns null if selection has no Japanese characters', () => {
      const mockElement = {
        nodeType: 1,
        closest: (selector: string) => {
          if (selector.includes('jlpt-question-card')) return {};
          return null;
        },
      };
      const mockFragment = {
        querySelectorAll: () => [],
        textContent: 'English only text',
      };
      const mockRange = {
        commonAncestorContainer: mockElement,
        cloneContents: () => mockFragment,
      };
      const mockSelection = {
        rangeCount: 1,
        isCollapsed: false,
        getRangeAt: () => mockRange,
      } as unknown as Selection;

      expect(getEligibleSelection(mockSelection)).toBeNull();
    });

    it('returns null if selected text is longer than 20 characters', () => {
      const mockElement = {
        nodeType: 1,
        closest: (selector: string) => {
          if (selector.includes('jlpt-question-card')) return {};
          return null;
        },
      };
      const mockFragment = {
        querySelectorAll: () => [],
        textContent: 'これはとても長すぎる日本語の文章であって二十文字を超えています',
      };
      const mockRange = {
        commonAncestorContainer: mockElement,
        cloneContents: () => mockFragment,
      };
      const mockSelection = {
        rangeCount: 1,
        isCollapsed: false,
        getRangeAt: () => mockRange,
      } as unknown as Selection;

      expect(getEligibleSelection(mockSelection)).toBeNull();
    });

    it('returns text and rect for valid Japanese selection inside question card', () => {
      const mockElement = {
        nodeType: 1,
        closest: (selector: string) => {
          if (selector.includes('jlpt-question-card')) return {};
          return null;
        },
      };
      const mockFragment = {
        querySelectorAll: () => [],
        textContent: '学生',
      };
      const mockRange = {
        commonAncestorContainer: mockElement,
        cloneContents: () => mockFragment,
        getBoundingClientRect: () => mockDomRect,
      };
      const mockSelection = {
        rangeCount: 1,
        isCollapsed: false,
        getRangeAt: () => mockRange,
      } as unknown as Selection;

      const res = getEligibleSelection(mockSelection);
      expect(res).not.toBeNull();
      expect(res?.text).toBe('学生');
      expect(res?.rect.width).toBe(50);
    });
  });

  describe('SelectionLookupPopover component', () => {
    it('extracts unique kanji from the whole selection in order, including supplementary characters', () => {
      expect(selectedKanji('学生と学生、駅へ。')).toEqual(['学', '生', '駅']);
      expect(selectedKanji('𠮷野・時々・〇')).toEqual(['𠮷', '野', '時', '〇']);
      expect(selectedKanji('えき ABC 123')).toEqual([]);
    });

    it('lists selected characters independently of a matched vocabulary entry', () => {
      const html = renderClean(<SelectionKanjiPanel text="学生と駅" breakdown={[{ kanji: '学', hanViet: 'HỌC' }, { kanji: '校', hanViet: 'HIỆU' }]} />);
      expect(html.match(/data-testid="lookup-kanji-item"/g)).toHaveLength(3);
      expect(html).toContain('HỌC');
      expect(html).not.toContain('HIỆU');
      expect(html).toContain('駅');
    });

    it('shows an empty state for a kana-only selection', () => {
      const html = renderClean(<SelectionKanjiPanel text="えき" />);
      expect(html).toContain('Đoạn được bôi đen không có kanji.');
      expect(html).not.toContain('data-testid="lookup-kanji-item"');
    });

    it('returns null when closed and idle', () => {
      const html = renderClean(
        <SelectionLookupPopover
          state={{
            isOpen: false,
            queryText: '',
            virtualRect: null,
            status: 'idle',
            result: null,
            error: null,
            close: vi.fn(),
            retry: vi.fn(),
          }}
        />,
      );
      expect(html).toBe('');
    });

    it('renders lookup results on success', () => {
      const html = renderClean(
        <SelectionLookupPopover
          openInNewTab={true}
          state={{
            isOpen: true,
            queryText: '食べた',
            matchedText: '食べた',
            virtualRect: mockDomRect,
            status: 'success',
            result: {
              entry: '食べる',
              readings: ['たべる'],
              meanings: ['to eat', 'to live on'],
              hanViet: 'THỰC',
              hanVietConfidence: 'high',
              posLabels: ['Động từ'],
              status: 'READY',
              license: 'CC BY-SA 4.0',
              attribution: 'EDRDG',
            },
            error: null,
            close: vi.fn(),
            retry: vi.fn(),
          }}
        />,
      );

      expect(typeof html).toBe('string');
    });
  });

  describe('VocabDetailView component', () => {
    const mockDetail: DictionaryEntryDetailDto = {
      entry: '学生',
      level: 'N5',
      readings: ['がくせい'],
      meanings: ['student', 'pupil'],
      posLabels: ['Danh từ'],
      hanViet: 'HỌC SINH',
      hanVietConfidence: 'high',
      senses: [
        {
          index: 0,
          posLabels: ['Danh từ'],
          meanings: ['student; pupil'],
        },
      ],
      hanVietPerKanji: [
        { kanji: '学', onyomi: 'ガク', hanViet: 'HỌC' },
        { kanji: '生', onyomi: 'セイ, ショウ', hanViet: 'SINH' },
      ],
      kanji: [
        {
          kanji: '学',
          onyomi: ['ガク'],
          kunyomi: ['まな.ぶ'],
          strokeCount: 8,
          meanings: ['study', 'learning', 'science'],
          level: 'N5',
          hanViet: 'HỌC',
        },
        {
          kanji: '生',
          onyomi: ['セイ', 'ショウ'],
          kunyomi: ['い.きる', 'う.まれる', 'なま'],
          strokeCount: 5,
          meanings: ['life', 'genuine', 'birth'],
          level: 'N5',
          hanViet: 'SINH',
        },
      ],
      corpusOccurrences: [{ level: 'N5', count: 12 }],
      license: 'CC BY-SA 4.0',
      attribution: 'EDRDG JMdict / KANJIDIC2',
    };

    it('renders complete detail view: headword, readings, posLabels, hanViet, senses, kanji table and occurrences', () => {
      const html = renderClean(<VocabDetailView entry={mockDetail} />);

      expect(html).toContain('data-testid="vocab-detail-view"');
      expect(html).toContain('data-testid="vocab-detail-entry"');
      expect(html).toContain('学生');
      expect(html).toContain('data-testid="vocab-detail-readings"');
      expect(html).toContain('がくせい');
      expect(html).toContain('data-testid="vocab-detail-hanviet"');
      expect(html).toContain('HỌC SINH');
      expect(html).toContain('data-testid="vocab-detail-pos"');
      expect(html).toContain('Danh từ');

      // Senses
      expect(html).toContain('data-testid="vocab-senses-list"');
      expect(html).toContain('student; pupil');

      // Kanji Breakdown Table
      expect(html).toContain('data-testid="kanji-breakdown-table"');
      expect(html).toContain('HỌC');
      expect(html).toContain('SINH');

      // Kanji Details
      expect(html).toContain('data-testid="kanji-cards-grid"');

      // Exam occurrences
      expect(html).toContain('data-testid="vocab-occurrences-list"');
      expect(html).toContain('N5');
      expect(html).toContain('12');

      // Buttons
      expect(html).toContain('data-testid="detail-save-notebook-btn"');
      expect(html).toContain('data-testid="detail-report-hanviet-btn"');

      // Attribution
      expect(html).toContain('data-testid="vocab-attribution"');
      expect(html).toContain('EDRDG');
    });
  });
});
