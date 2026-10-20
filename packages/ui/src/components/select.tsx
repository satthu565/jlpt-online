'use client';

import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  requiredIndicator?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options = [],
      id: explicitId,
      requiredIndicator = false,
      required,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = explicitId || generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    const describedBy =
      [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

    const selectElement = (
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={cn(
          'jlpt-select flex w-full rounded-md border border-[var(--border-default,#cbd5e1)] bg-[var(--bg-surface,#ffffff)] px-3.5 py-2.5 text-base text-[var(--text-primary,#0f172a)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color,#2563eb)] focus-visible:ring-offset-1 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] cursor-pointer dark:border-[var(--border-default,#475569)] dark:bg-[var(--bg-surface,#1e293b)] dark:text-[var(--text-primary,#f8fafc)]',
          error &&
            'border-[var(--color-danger,#dc2626)] focus-visible:ring-[var(--color-danger,#dc2626)] dark:border-[var(--color-danger,#ef4444)]',
          className,
        )}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
    );

    if (!label && !hint && !error) {
      return selectElement;
    }

    return (
      <div className="flex flex-col gap-1.5 mb-4 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="flex items-center gap-1 text-sm font-semibold text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)]"
          >
            {label}
            {(required || requiredIndicator) && (
              <span
                aria-hidden="true"
                className="text-[var(--color-danger,#dc2626)] dark:text-[var(--color-danger,#ef4444)]"
              >
                *
              </span>
            )}
          </label>
        )}

        {selectElement}

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

Select.displayName = 'Select';
