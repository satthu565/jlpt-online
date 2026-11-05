// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CorpusClient } from '../features/corpus/services/corpus-client';
import { useSelectLookup, type SelectionLookupState } from '../features/corpus/hooks/use-select-lookup';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Exercise browser event ordering rather than the Popover's rendering implementation.
describe('selection lookup event lifecycle', () => {
  let root: Root;
  let container: HTMLDivElement;
  let state: SelectionLookupState;
  let lookup: ReturnType<typeof vi.spyOn>;

  function Harness() {
    state = useSelectLookup();
    return <><p data-select-lookup-area="true">先週 やま</p><div data-select-lookup-popover="true"><button>Tab</button></div><div data-testid="lookup-action-notice"><button>Notice</button></div><button data-testid="exam-control">Exam control</button></>;
  }

  async function advance(ms: number) {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  }

  function select(start = 0, end = 2) {
    const range = document.createRange();
    range.setStart(container.querySelector('p')!.firstChild!, start);
    range.setEnd(container.querySelector('p')!.firstChild!, end);
    Object.defineProperty(range, 'getBoundingClientRect', { value: () => new DOMRect(10, 10, 40, 20) });
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    container.querySelector('p')!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    lookup = vi.spyOn(CorpusClient.prototype, 'lookupDictionary').mockRejectedValue({ status: 404 });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.getSelection()?.removeAllRanges();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('keeps the popup open when tab focus collapses the browser selection', async () => {
    select();
    await advance(20);
    expect(state!.isOpen).toBe(true);
    container.querySelector('button')!.focus();
    window.getSelection()!.removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
    await advance(400);
    expect(state!.isOpen).toBe(true);
  });

  it('does not re-query stale booklet selection while clicking tabs or nested notices', async () => {
    select();
    await advance(20);
    for (const button of container.querySelectorAll('[data-select-lookup-popover] button, [data-testid="lookup-action-notice"] button')) {
      button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await advance(400);
      expect(state!.isOpen).toBe(true);
    }
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('dismisses on an outside pointer without cancelling the exam control click', async () => {
    select();
    await advance(20);
    const button = container.querySelector('[data-testid="exam-control"]')!;
    const click = vi.fn();
    button.addEventListener('click', click);
    act(() => { button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); });
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await advance(400);
    expect(state!.isOpen).toBe(false);
    expect(click).toHaveBeenCalledOnce();
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('clears the dismissed range so the following mouseup cannot reopen it', async () => {
    select();
    await advance(20);
    const button = container.querySelector('[data-testid="exam-control"]')!;
    act(() => { button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); });
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await advance(400);
    expect(state!.isOpen).toBe(false);
    expect(window.getSelection()!.isCollapsed).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('deduplicates mouse and touch debounce but still allows an explicit retry', async () => {
    select();
    await advance(400);
    expect(lookup).toHaveBeenCalledTimes(1);
    await act(async () => { state!.retry(); });
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('cancels deferred selection on Escape and allows selecting the same text again', async () => {
    select();
    await advance(20);
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    await advance(400);
    expect(state!.isOpen).toBe(false);
    expect(lookup).toHaveBeenCalledTimes(1);
    select();
    await advance(20);
    expect(state!.isOpen).toBe(true);
  });

  it('looks up a new touch selection even while a popup tab retains focus', async () => {
    select();
    await advance(20);
    const button = container.querySelector('button')!;
    button.focus();
    const range = document.createRange();
    range.setStart(container.querySelector('p')!.firstChild!, 3);
    range.setEnd(container.querySelector('p')!.firstChild!, 5);
    Object.defineProperty(range, 'getBoundingClientRect', { value: () => new DOMRect(50, 10, 40, 20) });
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    await advance(400);
    expect(state!.queryText).toBe('やま');
  });
});
