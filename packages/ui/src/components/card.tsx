import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({
  children,
  elevated = false,
  className = '',
  style = {},
  ...rest
}: CardProps): React.JSX.Element {
  return (
    <div
      style={{
        backgroundColor: elevated ? 'var(--bg-surface-elevated, #ffffff)' : 'var(--bg-surface, #ffffff)',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        boxShadow: elevated ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        padding: '1.5rem',
        transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        ...style,
      }}
      className={`jlpt-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
  style = {},
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      style={{
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        ...style,
      }}
      className={`jlpt-card-header ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  as: Component = 'h2',
  className = '',
  style = {},
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' }): React.JSX.Element {
  return (
    <Component
      style={{
        margin: 0,
        fontSize: '1.25rem',
        fontWeight: 700,
        color: 'var(--text-primary, #0f172a)',
        lineHeight: 1.3,
        ...style,
      }}
      className={`jlpt-card-title ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function CardContent({
  children,
  className = '',
  style = {},
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      style={{
        color: 'var(--text-secondary, #475569)',
        fontSize: '0.9375rem',
        lineHeight: 1.6,
        ...style,
      }}
      className={`jlpt-card-content ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = '',
  style = {},
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      style={{
        marginTop: '1.25rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-subtle, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0.75rem',
        ...style,
      }}
      className={`jlpt-card-footer ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
