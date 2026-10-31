// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@jlpt/ui/components/tooltip';
import { Button } from '@jlpt/ui/components/button';
import HomePage from '../app/page';
import { Providers } from '../app/providers';
import viMessages from '../messages/vi.json';
import { ExamApiClient } from '../features/exam/api/exam-api';
import { SAMPLE_EXAM_SUMMARIES } from './fixtures/exam-fixtures';

// Configure React act environment for jsdom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock matchMedia for jsdom
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('Tooltip component behavior & HomePage tooltips', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(ExamApiClient.prototype, 'getExams').mockResolvedValue({
      items: SAMPLE_EXAM_SUMMARIES,
    });
    vi.spyOn(ExamApiClient.prototype, 'getUserExamStatus').mockResolvedValue({
      items: [],
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.querySelectorAll('[role="tooltip"]').forEach((el) => el.remove());
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders open tooltip directly when open prop is true', () => {
    act(() => {
      root.render(
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger asChild>
              <Button>Gợi ý</Button>
            </TooltipTrigger>
            <TooltipContent>
              Dạng câu hỏi tìm từ đồng nghĩa
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain('Dạng câu hỏi tìm từ đồng nghĩa');
  });

  it('shows tooltip on mouseenter after delay and hides on mouseleave', () => {
    act(() => {
      root.render(
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href="/phong-thi?mode=practice" aria-label="Chế độ Luyện tự do">
                Luyện tự do
              </a>
            </TooltipTrigger>
            <TooltipContent side="top">
              Chế độ Luyện tự do: Làm bài không bị áp lực thời gian.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
    });

    const trigger = container.querySelector('a')!;
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute('title')).toBeNull();

    // Before hover, no tooltip
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    // Trigger hover
    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    });

    // Before delay completes (100ms), still no tooltip
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    // After delay completes (200ms total), tooltip appears in body portal
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain('Chế độ Luyện tự do: Làm bài không bị áp lực thời gian.');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip?.id);

    // Mouse leave hides tooltip
    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBeNull();
  });

  it('shows tooltip immediately on keyboard focus and hides on blur', () => {
    act(() => {
      root.render(
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href="/luyen-tap" aria-label="Luyện tập tự do không tính giờ nghiêm ngặt">
                🎯 Luyện tự do
              </a>
            </TooltipTrigger>
            <TooltipContent side="top">
              Luyện tập tự do không tính giờ nghiêm ngặt
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
    });

    const link = container.querySelector('a')!;
    expect(link).not.toBeNull();

    // Focus triggers tooltip immediately without delay
    act(() => {
      link.focus();
      link.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
      link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain('Luyện tập tự do không tính giờ nghiêm ngặt');

    // Blur hides tooltip
    act(() => {
      link.blur();
      link.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
      link.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('HomePage renders accessible Tooltip triggers with aria-label and without title attributes', async () => {
    await act(async () => {
      root.render(
        <Providers messages={viMessages}>
          <HomePage />
        </Providers>,
      );
      // Wait for promise resolution
      await Promise.resolve();
    });

    // Check all interactive links and buttons inside HomePage: none have native title= attributes
    const mainContent = container.querySelector('#main-content') || container;
    const interactiveLinks = mainContent.querySelectorAll('a, button');
    interactiveLinks.forEach((el) => {
      expect(el.getAttribute('title')).toBeNull();
    });

    // Find "Luyện tự do" in recommended spotlight or cards
    const practiceLinks = Array.from(container.querySelectorAll('a')).filter((a) =>
      a.textContent?.includes('Luyện tự do'),
    );
    expect(practiceLinks.length).toBeGreaterThan(0);
    practiceLinks.forEach((link) => {
      expect(link.getAttribute('title')).toBeNull();
      expect(link.getAttribute('aria-label')).toBeTruthy();
    });

    // Hover on recommended "Luyện tự do" button triggers tooltip
    const recommendedPracticeLink = practiceLinks[0]!;
    act(() => {
      recommendedPracticeLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      recommendedPracticeLink.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain('Chế độ Luyện tự do: Làm bài không bị áp lực thời gian');
  });
});
