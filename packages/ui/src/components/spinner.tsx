import React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}

export function Spinner({
  size = 'md',
  className = '',
  style = {},
  'aria-label': ariaLabel = 'Đang tải...',
  ...rest
}: SpinnerProps): React.JSX.Element {
  const sizeMap = {
    sm: { width: '1rem', height: '1rem', borderWidth: '2px' },
    md: { width: '2rem', height: '2rem', borderWidth: '3px' },
    lg: { width: '3rem', height: '3rem', borderWidth: '4px' },
  };

  const { width, height, borderWidth } = sizeMap[size] || sizeMap.md;

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      style={{
        display: 'inline-block',
        width,
        height,
        border: `${borderWidth} solid var(--border-subtle, #e2e8f0)`,
        borderTopColor: 'var(--color-primary, #2563eb)',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
        ...style,
      }}
      className={`jlpt-spinner animate-spin ${className}`}
      {...rest}
    >
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {ariaLabel}
      </span>
    </div>
  );
}
