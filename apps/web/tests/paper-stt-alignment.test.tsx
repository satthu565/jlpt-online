// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PaperBooklet } from '../features/exam/components/paper-booklet';
import { QuestionView } from '../features/exam/components/question-view';
import { flattenExamQuestions } from '../features/exam/utils/flatten-questions';
import { SAMPLE_N5_EXAM_SNAPSHOT } from './fixtures/sample-exam';

// Configure React act environment for jsdom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const flat = flattenExamQuestions(SAMPLE_N5_EXAM_SNAPSHOT);
const sampleQuestion = flat[0]!;

describe('STT (Question Number) top alignment and selection independence', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.getSelection()?.removeAllRanges();
  });

  it('renders STT (.paper-number) with self-start and parent .paper-stem with items-start', () => {
    act(() => {
      root.render(
        <PaperBooklet
          title="N5"
          questions={[sampleQuestion]}
          answers={[0]}
          flags={[0]}
          currentIndex={0}
          workspace={{ fontSize: 'base', font: 'mincho', notes: {}, marks: {} }}
          showFurigana={false}
          disabled={false}
          onActivate={() => {}}
          onAnswer={() => {}}
          onFlag={() => {}}
          onNote={() => {}}
          onMark={() => {}}
          onClearMarks={() => {}}
          onOpenPassage={() => {}}
        />,
      );
    });

    const stem = container.querySelector('.paper-stem');
    const stt = container.querySelector('.paper-number');

    expect(stem).not.toBeNull();
    expect(stt).not.toBeNull();

    // Verify top-alignment classes on STT and container
    expect(stem?.className).toContain('items-start');
    expect(stt?.className).toContain('self-start');
  });

  it('preserves STT top alignment when text selection occurs and highlight button appears', () => {
    act(() => {
      root.render(
        <PaperBooklet
          title="N5"
          questions={[sampleQuestion]}
          answers={[0]}
          flags={[0]}
          currentIndex={0}
          workspace={{ fontSize: 'base', font: 'mincho', notes: {}, marks: {} }}
          showFurigana={false}
          disabled={false}
          onActivate={() => {}}
          onAnswer={() => {}}
          onFlag={() => {}}
          onNote={() => {}}
          onMark={() => {}}
          onClearMarks={() => {}}
          onOpenPassage={() => {}}
        />,
      );
    });

    const stem = container.querySelector('.paper-stem') as HTMLElement;
    const stt = container.querySelector('.paper-number') as HTMLElement;
    const textContainer = container.querySelector('[data-paper-text]') as HTMLElement;

    expect(stt.className).toContain('self-start');
    expect(stem.className).toContain('items-start');

    // Simulate selecting text inside the question stem
    const textNode = textContainer.firstChild;
    if (textNode) {
      const range = document.createRange();
      range.selectNodeContents(textContainer);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      // Trigger capture on pointerup
      act(() => {
        textContainer.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
      });
    }

    // When text is selected, the highlight button may appear in paper-mark-tools
    const highlightButton = container.querySelector('.paper-mark-tools button');
    if (highlightButton) {
      expect(highlightButton.textContent).toMatch(/Đánh dấu|highlight/i);
    }

    // Crucial requirement: STT top alignment is completely independent of text selection
    expect(stt.className).toContain('self-start');
    expect(stem.className).toContain('items-start');

    // Simulate clearing selection
    window.getSelection()?.removeAllRanges();
    act(() => {
      textContainer.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    });

    // Still self-start and items-start
    expect(stt.className).toContain('self-start');
    expect(stem.className).toContain('items-start');
  });

  it('ensures question view options have top alignment (self-start on indicators)', () => {
    act(() => {
      root.render(
        <QuestionView
          question={sampleQuestion}
          selectedOption={0}
          isFlagged={false}
          onSelectOption={() => {}}
          onToggleFlag={() => {}}
        />,
      );
    });

    const optionIndicators = container.querySelectorAll('[role="radio"] .self-start');
    expect(optionIndicators.length).toBeGreaterThan(0);
  });
});
