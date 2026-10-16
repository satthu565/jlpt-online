import React, { useId } from 'react';

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
      className = '',
      style = {},
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = explicitId || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

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
            htmlFor={inputId}
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

        <input
          ref={ref}
          id={inputId}
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
            transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
            ...style,
          }}
          className={`jlpt-input ${className}`}
          {...rest}
        />

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
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
