'use client';

import * as React from 'react';
import { cn } from '../lib/utils.js';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--bg-muted,#f1f5f9)] dark:bg-[var(--bg-surface-elevated,#334155)]',
        className,
      )}
      {...props}
    />
  );
}
