'use client';

import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel?: string;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeLabel = 'Đóng hộp thoại',
  className = '',
}: ModalProps): React.JSX.Element | null {
  const titleId = React.useId();
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        // Trap focus inside modal
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Focus first focusable element or modal container
    const timer = setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable && focusable.length > 0) {
        focusable[0]?.focus();
      } else {
        modalRef.current?.focus();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously active element
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'jlpt-modal w-full max-w-[520px] bg-[var(--overlay)] rounded-3xl border-0 shadow-[var(--overlay-shadow)] overflow-hidden flex flex-col max-h-[90vh] dark:border-[var(--border-default,#475569)] dark:bg-[var(--bg-surface-elevated,#1e293b)]',
          className,
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#334155)]">
          <h2
            id={titleId}
            className="m-0 text-xl font-bold text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex items-center justify-center min-h-[36px] min-w-[36px] rounded-md text-[var(--text-muted,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover,#e2e8f0)] transition-colors text-lg dark:hover:bg-[var(--bg-hover,#334155)] dark:hover:text-[var(--text-primary,#f8fafc)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto text-[var(--text-secondary,#475569)] text-sm leading-relaxed dark:text-[var(--text-muted,#94a3b8)]">
          {children}
        </div>

        {footer && (
          <div className="px-5 py-4 border-t border-[var(--border-subtle,#e2e8f0)] bg-[var(--bg-muted,#f8fafc)] flex items-center justify-end gap-3 dark:border-[var(--border-subtle,#334155)] dark:bg-[var(--bg-muted,#0f172a)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
