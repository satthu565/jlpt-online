import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Small line above the title, e.g. a level badge or breadcrumb. */
  eyebrow?: React.ReactNode;
  /** Buttons or links aligned to the right on wide screens, below the text on phones. */
  actions?: React.ReactNode;
  /** Heading level of the title; pages use h1, nested sections h2. */
  as?: 'h1' | 'h2';
}

/** Title block shared by every page: eyebrow, heading, description and actions. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  as: Heading = 'h1',
  className,
  ...props
}: PageHeaderProps): React.JSX.Element {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-[var(--border-subtle,#e2e8f0)] pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-[var(--border-subtle,#334155)]',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <div className="text-sm font-medium text-[var(--text-muted,#64748b)]">{eyebrow}</div> : null}
        <Heading className="m-0 text-2xl font-bold tracking-tight text-[var(--text-primary,#0f172a)] sm:text-3xl dark:text-[var(--text-primary,#f8fafc)]">
          {title}
        </Heading>
        {description ? (
          <p className="m-0 max-w-2xl text-sm text-[var(--text-muted,#64748b)] sm:text-base dark:text-[var(--text-muted,#94a3b8)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
