import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      style = {},
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      fontWeight: 600,
      borderRadius: '8px',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'all 0.15s ease-in-out',
      fontFamily: 'inherit',
      border: '1px solid transparent',
      textDecoration: 'none',
      position: 'relative',
      minHeight: '44px', // WCAG 2.1 touch target minimum
      ...style,
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem', minHeight: '36px' },
      md: { padding: '0.5rem 1.25rem', fontSize: '1rem', minHeight: '44px' },
      lg: { padding: '0.75rem 1.75rem', fontSize: '1.125rem', minHeight: '52px' },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: 'var(--color-primary, #16a34a)',
        color: 'var(--text-inverse, #ffffff)',
        borderColor: 'var(--color-primary, #16a34a)',
      },
      success: {
        backgroundColor: 'var(--color-primary, #16a34a)',
        color: 'var(--text-inverse, #ffffff)',
        borderColor: 'var(--color-primary, #16a34a)',
      },
      secondary: {
        backgroundColor: 'var(--bg-muted, #f1f5f9)',
        color: 'var(--text-primary, #0f172a)',
        borderColor: 'var(--border-default, #cbd5e1)',
      },
      outline: {
        backgroundColor: 'transparent',
        color: 'var(--color-primary, #16a34a)',
        borderColor: 'var(--color-primary, #16a34a)',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--text-primary, #0f172a)',
        borderColor: 'transparent',
      },
      danger: {
        backgroundColor: 'var(--color-danger, #dc2626)',
        color: 'var(--text-inverse, #ffffff)',
        borderColor: 'var(--color-danger, #dc2626)',
      },
    };

    const computedStyle = {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading ? 'true' : undefined}
        style={computedStyle}
        className={`jlpt-button ${className}`}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '1em',
              height: '1em',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
        {!loading && leftIcon && <span aria-hidden="true">{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
