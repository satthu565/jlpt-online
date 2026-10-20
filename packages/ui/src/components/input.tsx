'use client';

import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  requiredIndicator?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
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
    const inputId = explicitId || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    const inputElement = (
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={cn(
          'jlpt-input input input--primary input--full-width',
          error && 'border-[var(--danger)]',
          className,
        )}
        {...rest}
      />
    );

    if (!label && !hint && !error) {
      return inputElement;
    }

    return (
      <div className="flex flex-col gap-1.5 mb-4 w-full">
        {label && (
          <label
            htmlFor={inputId}
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

        {inputElement}

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

Input.displayName = 'Input';
