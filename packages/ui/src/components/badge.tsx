import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

export const badgeVariants = cva(
  'jlpt-badge inline-flex items-center justify-center font-semibold rounded-full border border-transparent leading-tight transition-colors',
  {
    variants: {
      variant: {
        primary:
          'jlpt-badge-primary bg-[var(--color-primary-light,#dcfce7)] text-[var(--color-primary-text,#14532d)] border-[var(--color-primary,#16a34a)]/30 dark:bg-[var(--color-primary-light,#14532d)] dark:text-[var(--color-primary-text,#bbf7d0)]',
        success:
          'jlpt-badge-success bg-[var(--color-primary-light,#dcfce7)] text-[var(--color-primary-text,#14532d)] border-[var(--color-primary,#16a34a)]/30 dark:bg-[var(--color-primary-light,#14532d)] dark:text-[var(--color-primary-text,#bbf7d0)]',
        warning:
          'jlpt-badge-warning bg-[var(--color-warning-light,#fef3c7)] text-[var(--color-warning-text,#92400e)] border-[var(--color-warning,#d97706)]/30 dark:bg-[var(--color-warning-light,#78350f)] dark:text-[var(--color-warning-text,#fde68a)]',
        danger:
          'jlpt-badge-danger bg-[var(--color-danger-light,#fee2e2)] text-[var(--color-danger-text,#991b1b)] border-[var(--color-danger,#dc2626)]/30 dark:bg-[var(--color-danger-light,#7f1d1d)] dark:text-[var(--color-danger-text,#fecaca)]',
        error:
          'jlpt-badge-error bg-[var(--color-danger-light,#fee2e2)] text-[var(--color-danger-text,#991b1b)] border-[var(--color-danger,#dc2626)]/30 dark:bg-[var(--color-danger-light,#7f1d1d)] dark:text-[var(--color-danger-text,#fecaca)]',
        destructive:
          'jlpt-badge-danger bg-[var(--color-danger-light,#fee2e2)] text-[var(--color-danger-text,#991b1b)] border-[var(--color-danger,#dc2626)]/30 dark:bg-[var(--color-danger-light,#7f1d1d)] dark:text-[var(--color-danger-text,#fecaca)]',
        info:
          'jlpt-badge-info bg-[var(--color-info-light,#dbeafe)] text-[var(--color-info-text,#1e40af)] border-[var(--color-info,#2563eb)]/30 dark:bg-[var(--color-info-light,#1e3a8a)] dark:text-[var(--color-info-text,#bfdbfe)]',
        neutral:
          'jlpt-badge-neutral bg-[var(--bg-muted,#f1f5f9)] text-[var(--text-secondary,#475569)] border-[var(--border-default,#cbd5e1)] dark:bg-[var(--bg-muted,#1e293b)] dark:text-[var(--text-muted,#94a3b8)] dark:border-[var(--border-default,#475569)]',
        default:
          'jlpt-badge-default bg-[var(--bg-muted,#f1f5f9)] text-[var(--text-secondary,#475569)] border-[var(--border-default,#cbd5e1)] dark:bg-[var(--bg-muted,#1e293b)] dark:text-[var(--text-muted,#94a3b8)] dark:border-[var(--border-default,#475569)]',
        secondary:
          'jlpt-badge-secondary bg-[var(--bg-muted,#f1f5f9)] text-[var(--text-secondary,#475569)] border-[var(--border-default,#cbd5e1)] dark:bg-[var(--bg-muted,#1e293b)] dark:text-[var(--text-muted,#94a3b8)] dark:border-[var(--border-default,#475569)]',
        outline:
          'bg-transparent text-[var(--text-primary,#0f172a)] border-[var(--border-default,#cbd5e1)] dark:text-[var(--text-primary,#f8fafc)] dark:border-[var(--border-default,#475569)]',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-xs',
        default: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}
