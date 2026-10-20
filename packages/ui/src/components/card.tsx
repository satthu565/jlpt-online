import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevated = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'jlpt-card rounded-xl border border-[var(--border-subtle,#e2e8f0)] bg-[var(--bg-surface,#ffffff)] text-[var(--text-primary,#0f172a)] transition-colors p-6 shadow-sm dark:border-[var(--border-subtle,#334155)] dark:bg-[var(--bg-surface,#1e293b)] dark:text-[var(--text-primary,#f8fafc)]',
        elevated && 'shadow-md bg-[var(--bg-surface-elevated,#ffffff)] dark:bg-[var(--bg-surface-elevated,#334155)]',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('jlpt-card-header flex flex-col gap-1 mb-4', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h2', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        'jlpt-card-title m-0 text-xl font-bold leading-tight text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)]',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-[var(--text-muted,#64748b)] dark:text-[var(--text-muted,#94a3b8)] m-0', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'jlpt-card-content text-sm leading-relaxed text-[var(--text-secondary,#475569)] dark:text-[var(--text-muted,#94a3b8)]',
      className,
    )}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'jlpt-card-footer mt-5 flex items-center justify-end gap-3 border-t border-[var(--border-subtle,#e2e8f0)] pt-4 dark:border-[var(--border-subtle,#334155)]',
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';
