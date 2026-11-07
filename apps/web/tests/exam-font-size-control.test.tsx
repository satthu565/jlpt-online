// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExamToolbar } from '../features/exam/components/exam-toolbar';
import './setup-i18n';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ExamToolbar Font Size Control', () => {
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
  });

  it('renders font size control with A-, 100%, A+ and reset button when settings popover is open', async () => {
    const onFontSizeChange = vi.fn();
    act(() => {
      root.render(
        <ExamToolbar
          fontSize="base"
          onFontSizeChange={onFontSizeChange}
          isZenMode={false}
          onToggleZenMode={() => {}}
          onOpenShortcutsHelp={() => {}}
          onOpenSpeakerTest={() => {}}
        />,
      );
    });

    const settingsBtn = container.querySelector('button') as HTMLButtonElement;
    expect(settingsBtn).toBeTruthy();
    expect(settingsBtn.textContent).toContain('Cài đặt');

    await act(async () => {
      settingsBtn.click();
    });

    const fontGroup = document.body.querySelector('div[role="group"][aria-label="Cỡ chữ tiếng Nhật"]');
    expect(fontGroup).toBeTruthy();

    expect(fontGroup?.textContent).toContain('A−');
    expect(fontGroup?.textContent).toContain('100%');
    expect(fontGroup?.textContent).toContain('A+');

    const resetBtn = fontGroup?.querySelector('button[aria-label="Đặt lại cỡ chữ mặc định"]') as HTMLButtonElement;
    expect(resetBtn).toBeTruthy();

    const decreaseBtn = fontGroup?.querySelector('button[aria-label="Giảm cỡ chữ"]') as HTMLButtonElement;
    const increaseBtn = fontGroup?.querySelector('button[aria-label="Tăng cỡ chữ"]') as HTMLButtonElement;

    expect(decreaseBtn).toBeTruthy();
    expect(increaseBtn).toBeTruthy();
    expect(decreaseBtn.disabled).toBe(false);
    expect(increaseBtn.disabled).toBe(false);

    await act(async () => {
      decreaseBtn.click();
    });
    expect(onFontSizeChange).toHaveBeenCalledWith('90%');

    await act(async () => {
      increaseBtn.click();
    });
    expect(onFontSizeChange).toHaveBeenCalledWith('110%');

    await act(async () => {
      resetBtn.click();
    });
    expect(onFontSizeChange).toHaveBeenCalledWith('base');
  });

  it('does NOT disable decrease button at 90% or increase button at 120% (no zoom limit)', async () => {
    const onFontSizeChange = vi.fn();
    act(() => {
      root.render(
        <ExamToolbar
          fontSize="90%"
          onFontSizeChange={onFontSizeChange}
          isZenMode={false}
          onToggleZenMode={() => {}}
          onOpenShortcutsHelp={() => {}}
          onOpenSpeakerTest={() => {}}
        />,
      );
    });

    const settingsBtn = container.querySelector('button') as HTMLButtonElement;
    await act(async () => {
      settingsBtn.click();
    });

    const fontGroup = document.body.querySelector('div[role="group"][aria-label="Cỡ chữ tiếng Nhật"]');
    expect(fontGroup?.textContent).toContain('90%');

    const decreaseBtn = fontGroup?.querySelector('button[aria-label="Giảm cỡ chữ"]') as HTMLButtonElement;
    const increaseBtn = fontGroup?.querySelector('button[aria-label="Tăng cỡ chữ"]') as HTMLButtonElement;

    // Both should still be enabled beyond the old 90% boundary
    expect(decreaseBtn.disabled).toBe(false);
    expect(increaseBtn.disabled).toBe(false);

    await act(async () => {
      decreaseBtn.click();
    });
    expect(onFontSizeChange).toHaveBeenCalledWith('80%');
  });

  it('allows scaling up beyond 120% without disabling increase button', async () => {
    const onFontSizeChange = vi.fn();
    act(() => {
      root.render(
        <ExamToolbar
          fontSize="120%"
          onFontSizeChange={onFontSizeChange}
          isZenMode={false}
          onToggleZenMode={() => {}}
          onOpenShortcutsHelp={() => {}}
          onOpenSpeakerTest={() => {}}
        />,
      );
    });

    const settingsBtn = container.querySelector('button') as HTMLButtonElement;
    await act(async () => {
      settingsBtn.click();
    });

    const fontGroup = document.body.querySelector('div[role="group"][aria-label="Cỡ chữ tiếng Nhật"]');
    expect(fontGroup?.textContent).toContain('120%');

    const decreaseBtn = fontGroup?.querySelector('button[aria-label="Giảm cỡ chữ"]') as HTMLButtonElement;
    const increaseBtn = fontGroup?.querySelector('button[aria-label="Tăng cỡ chữ"]') as HTMLButtonElement;

    expect(decreaseBtn.disabled).toBe(false);
    expect(increaseBtn.disabled).toBe(false);

    await act(async () => {
      increaseBtn.click();
    });
    expect(onFontSizeChange).toHaveBeenCalledWith('130%');
  });
});
