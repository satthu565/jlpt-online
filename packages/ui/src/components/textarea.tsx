'use client';

import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  requiredIndicator?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      id: explicitId,
      requiredIndicator = false,
      required,
      className,
      ...rest
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const textareaId = explicitId || generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    const textareaElement = (
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={cn(
          'jlpt-textarea flex min-h-[80px] w-full rounded-md border border-[var(--border-default,#cbd5e1)] bg-[var(--bg-surface,#ffffff)] px-3.5 py-2.5 text-base text-[var(--text-primary,#0f172a)] transition-colors placeholder:text-[var(--text-muted,#64748b)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color,#2563eb)] focus-visible:ring-offset-1 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--border-default,#475569)] dark:bg-[var(--bg-surface,#1e293b)] dark:text-[var(--text-primary,#f8fafc)] dark:placeholder:text-[var(--text-muted,#94a3b8)]',
          error && 'border-[var(--color-danger,#dc2626)] focus-visible:ring-[var(--color-danger,#dc2626)] dark:border-[var(--color-danger,#ef4444)]',
          className,
        )}
        {...rest}
      />
    );

    if (!label && !hint && !error) {
      return textareaElement;
    }

    return (
      <div className="flex flex-col gap-1.5 mb-4 w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="flex items-center gap-1 text-sm font-semibold text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)]"
          >
            {label}
            {(required || requiredIndicator) && (
              <span aria-hidden="true" className="text-[var(--color-danger,#dc2626)] dark:text-[var(--color-danger,#ef4444)]">
                *
              </span>
            )}
          </label>
        )}

        {textareaElement}

        {hint && !error && (
          <span
            id={hintId}
            className="text-xs text-[var(--text-muted,#64748b)] dark:text-[var(--text-muted,#94a3b8)]"
          >
            {hint}
          </span>
        )}

        {error && (
          <span
            id={errorId}
            role="alert"
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-danger,#dc2626)] dark:text-[var(--color-danger,#ef4444)]"
          >
            {error}
          </span>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
