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
          'jlpt-textarea textarea textarea--primary textarea--full-width',
          error && 'border-[var(--danger)]',
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
            className="label flex items-center gap-1"
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
