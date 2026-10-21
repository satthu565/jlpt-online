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
          'jlpt-select input input--primary input--full-width cursor-pointer min-h-[44px]',
          error && 'border-[var(--danger)]',
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
