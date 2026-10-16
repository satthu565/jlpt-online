import React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
  closeLabel?: string;
}

export function Alert({
  children,
  variant = 'info',
  title,
  onClose,
  closeLabel = 'Close notification',
  className = '',
  style = {},
  ...rest
}: AlertProps): React.JSX.Element {
  const variantStyles: Record<
    'info' | 'success' | 'warning' | 'error',
    { bg: string; border: string; text: string; icon: string }
  > = {
    info: {
      bg: 'var(--color-info-light, #eff6ff)',
      border: 'var(--color-info, #2563eb)',
      text: 'var(--color-info-text, #1e40af)',
      icon: 'ℹ',
    },
    success: {
      bg: 'var(--color-primary-light, #f0fdf4)',
      border: 'var(--color-primary, #16a34a)',
      text: 'var(--color-primary-text, #14532d)',
      icon: '✓',
    },
    warning: {
      bg: 'var(--color-warning-light, #fef3c7)',
      border: 'var(--color-warning, #d97706)',
      text: 'var(--color-warning-text, #92400e)',
      icon: '⚠',
    },
    error: {
      bg: 'var(--color-danger-light, #fee2e2)',
      border: 'var(--color-danger, #dc2626)',
      text: 'var(--color-danger-text, #991b1b)',
      icon: '✕',
    },
  };

  const v = variantStyles[variant] || variantStyles.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: '8px',
        backgroundColor: v.bg,
        borderLeft: `4px solid ${v.border}`,
        color: v.text,
        fontSize: '0.9375rem',
        marginBottom: '1rem',
        position: 'relative',
        ...style,
      }}
      className={`jlpt-alert jlpt-alert-${variant} ${className}`}
      {...rest}
    >
      <span aria-hidden="true" style={{ fontSize: '1.125rem', fontWeight: 'bold', lineHeight: 1 }}>
        {v.icon}
      </span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '1rem',
            lineHeight: 1,
            borderRadius: '4px',
            minHeight: '32px',
            minWidth: '32px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
