import React, { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  requiredIndicator?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      id: explicitId,
      requiredIndicator = false,
      required,
      className = '',
      style = {},
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = explicitId || generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
        {label && (
          <label
            htmlFor={selectId}
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-primary, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            {label}
            {(required || requiredIndicator) && (
              <span aria-hidden="true" style={{ color: 'var(--color-danger, #dc2626)' }}>
                *
              </span>
            )}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          style={{
            padding: '0.625rem 0.875rem',
            borderRadius: '6px',
            border: `1px solid ${error ? 'var(--color-danger, #dc2626)' : 'var(--border-default, #cbd5e1)'}`,
            backgroundColor: 'var(--bg-surface, #ffffff)',
            color: 'var(--text-primary, #0f172a)',
            fontSize: '1rem',
            lineHeight: 1.5,
            minHeight: '44px',
            fontFamily: 'inherit',
            cursor: 'pointer',
            ...style,
          }}
          className={`jlpt-select ${className}`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {hint && !error && (
          <span
            id={hintId}
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            {hint}
          </span>
        )}

        {error && (
          <span
            id={errorId}
            role="alert"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-danger, #dc2626)',
              fontWeight: 500,
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
