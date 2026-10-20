import * as React from 'react';
import { AlertTriangle, Inbox, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils.js';

export type EmptyStateVariant = 'empty' | 'loading' | 'error';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: EmptyStateVariant;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Overrides the variant's default icon. */
  icon?: LucideIcon;
  /** Usually a Button: retry on error, a link to start something when empty. */
  action?: React.ReactNode;
  /** Reserve height while loading so the content that replaces it does not shift the page. */
  minHeight?: 'sm' | 'md' | 'lg';
}

const DEFAULT_ICON: Record<EmptyStateVariant, LucideIcon> = {
  empty: Inbox,
  loading: Loader2,
  error: AlertTriangle,
};

const MIN_HEIGHT = { sm: 'min-h-40', md: 'min-h-64', lg: 'min-h-96' } as const;

/** One component for the empty, loading and error states of lists and pages. */
export function EmptyState({
  variant = 'empty',
  title,
  description,
  icon,
  action,
  minHeight = 'md',
  className,
  ...props
}: EmptyStateProps): React.JSX.Element {
  const Icon = icon ?? DEFAULT_ICON[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      data-variant={variant}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border-subtle,#e2e8f0)] px-6 py-10 text-center dark:border-[var(--border-subtle,#334155)]',
        MIN_HEIGHT[minHeight],
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-full bg-[var(--bg-muted,#f1f5f9)] dark:bg-[var(--bg-surface-elevated,#334155)]',
          variant === 'error' ? 'text-[var(--color-danger,#dc2626)]' : 'text-[var(--text-muted,#64748b)]',
        )}
        aria-hidden="true"
      >
        <Icon className={cn('size-6', variant === 'loading' && 'animate-spin')} />
      </span>
      <p className="m-0 text-base font-semibold text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)]">{title}</p>
      {description ? (
        <p className="m-0 max-w-md text-sm text-[var(--text-muted,#64748b)] dark:text-[var(--text-muted,#94a3b8)]">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
