import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'Đang tải...',
  ...rest
}: SpinnerProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn(
        'jlpt-spinner inline-block rounded-full animate-spin border-[var(--border-subtle,#e2e8f0)] border-t-[var(--color-primary,#16a34a)] dark:border-[var(--border-subtle,#334155)] dark:border-t-[var(--color-primary,#22c55e)]',
        sizeClasses[size] || sizeClasses.md,
        className,
      )}
      {...rest}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}
