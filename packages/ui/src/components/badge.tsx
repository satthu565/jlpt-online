import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'default' | 'secondary' | 'error';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  style = {},
  ...rest
}: BadgeProps): React.JSX.Element {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-primary-light, #dcfce7)',
      color: 'var(--color-primary-text, #14532d)',
      borderColor: 'var(--color-primary, #16a34a)',
    },
    success: {
      backgroundColor: 'var(--color-primary-light, #dcfce7)',
      color: 'var(--color-primary-text, #14532d)',
      borderColor: 'var(--color-primary, #16a34a)',
    },
    warning: {
      backgroundColor: 'var(--color-warning-light, #fef3c7)',
      color: 'var(--color-warning-text, #92400e)',
      borderColor: 'var(--color-warning, #d97706)',
    },
    danger: {
      backgroundColor: 'var(--color-danger-light, #fee2e2)',
      color: 'var(--color-danger-text, #991b1b)',
      borderColor: 'var(--color-danger, #dc2626)',
    },
    error: {
      backgroundColor: 'var(--color-danger-light, #fee2e2)',
      color: 'var(--color-danger-text, #991b1b)',
      borderColor: 'var(--color-danger, #dc2626)',
    },
    info: {
      backgroundColor: 'var(--color-info-light, #dbeafe)',
      color: 'var(--color-info-text, #1e40af)',
      borderColor: 'var(--color-info, #2563eb)',
    },
    neutral: {
      backgroundColor: 'var(--bg-muted, #f1f5f9)',
      color: 'var(--text-secondary, #475569)',
      borderColor: 'var(--border-default, #cbd5e1)',
    },
    default: {
      backgroundColor: 'var(--bg-muted, #f1f5f9)',
      color: 'var(--text-secondary, #475569)',
      borderColor: 'var(--border-default, #cbd5e1)',
    },
    secondary: {
      backgroundColor: 'var(--bg-muted, #f1f5f9)',
      color: 'var(--text-secondary, #475569)',
      borderColor: 'var(--border-default, #cbd5e1)',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.125rem 0.5rem', fontSize: '0.75rem' },
    md: { padding: '0.25rem 0.75rem', fontSize: '0.8125rem' },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        borderRadius: '9999px',
        border: '1px solid transparent',
        lineHeight: 1.25,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      className={`jlpt-badge jlpt-badge-${variant} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
