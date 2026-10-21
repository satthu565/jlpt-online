'use client';

import { useEffect } from 'react';

export interface KeyboardShortcutsHandlers {
  onSelectOption?: (optionValue: number) => void;
  onToggleFlag?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleZen?: () => void;
  onOpenHelp?: () => void;
  isEnabled?: boolean;
}

export function useKeyboardShortcuts({
  onSelectOption,
  onToggleFlag,
  onPrev,
  onNext,
  onToggleZen,
  onOpenHelp,
  isEnabled = true,
}: KeyboardShortcutsHandlers): void {
  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea or select, or focusing in lookup popover
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        (document.activeElement as HTMLElement)?.isContentEditable ||
        Boolean(document.activeElement?.closest('[data-select-lookup-popover="true"], [role="dialog"], [data-radix-popper-content-wrapper]'))
      ) {
        return;
      }

      // Check key
      switch (e.key) {
        case '1':
          e.preventDefault();
          onSelectOption?.(1);
          break;
        case '2':
          e.preventDefault();
          onSelectOption?.(2);
          break;
        case '3':
          e.preventDefault();
          onSelectOption?.(3);
          break;
        case '4':
          e.preventDefault();
          onSelectOption?.(4);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          onToggleFlag?.();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          onPrev?.();
          break;
        case 'ArrowRight':
        case 'k':
        case 'K':
          e.preventDefault();
          onNext?.();
          break;
        case 'z':
        case 'Z':
          e.preventDefault();
          onToggleZen?.();
          break;
        case '?':
          e.preventDefault();
          onOpenHelp?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEnabled, onSelectOption, onToggleFlag, onPrev, onNext, onToggleZen, onOpenHelp]);
}
