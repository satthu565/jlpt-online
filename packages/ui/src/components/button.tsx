'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

export const buttonVariants = cva(
  'jlpt-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color,#2563eb)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 cursor-pointer min-h-[44px] select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-primary,#16a34a)] text-[var(--text-inverse,#ffffff)] hover:bg-[var(--color-primary-hover,#15803d)] border border-transparent shadow-sm dark:bg-[var(--color-primary,#22c55e)] dark:hover:bg-[var(--color-primary-hover,#4ade80)] dark:text-[var(--text-inverse,#0f172a)]',
        default:
          'bg-[var(--color-primary,#16a34a)] text-[var(--text-inverse,#ffffff)] hover:bg-[var(--color-primary-hover,#15803d)] border border-transparent shadow-sm dark:bg-[var(--color-primary,#22c55e)] dark:hover:bg-[var(--color-primary-hover,#4ade80)] dark:text-[var(--text-inverse,#0f172a)]',
        success:
          'bg-[var(--color-primary,#16a34a)] text-[var(--text-inverse,#ffffff)] hover:bg-[var(--color-primary-hover,#15803d)] border border-transparent shadow-sm dark:bg-[var(--color-primary,#22c55e)] dark:hover:bg-[var(--color-primary-hover,#4ade80)] dark:text-[var(--text-inverse,#0f172a)]',
        secondary:
          'bg-[var(--bg-muted,#f1f5f9)] text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover,#e2e8f0)] border border-[var(--border-default,#cbd5e1)] dark:bg-[var(--bg-muted,#1e293b)] dark:text-[var(--text-primary,#f8fafc)] dark:border-[var(--border-default,#475569)] dark:hover:bg-[var(--bg-hover,#334155)]',
        outline:
          'bg-transparent text-[var(--color-primary,#16a34a)] border border-[var(--color-primary,#16a34a)] hover:bg-[var(--color-primary-light,#dcfce7)]/25 dark:text-[var(--color-primary,#22c55e)] dark:border-[var(--color-primary,#22c55e)] dark:hover:bg-[var(--color-primary-light,#14532d)]/40',
        ghost:
          'bg-transparent text-[var(--text-primary,#0f172a)] border border-transparent hover:bg-[var(--bg-hover,#e2e8f0)] dark:text-[var(--text-primary,#f8fafc)] dark:hover:bg-[var(--bg-hover,#334155)]',
        danger:
          'bg-[var(--color-danger,#dc2626)] text-[var(--text-inverse,#ffffff)] hover:bg-[var(--color-danger-hover,#b91c1c)] border border-transparent shadow-sm dark:bg-[var(--color-danger,#ef4444)] dark:hover:bg-[var(--color-danger-hover,#f87171)] dark:text-[var(--text-inverse,#ffffff)]',
        destructive:
          'bg-[var(--color-danger,#dc2626)] text-[var(--text-inverse,#ffffff)] hover:bg-[var(--color-danger-hover,#b91c1c)] border border-transparent shadow-sm dark:bg-[var(--color-danger,#ef4444)] dark:hover:bg-[var(--color-danger-hover,#f87171)] dark:text-[var(--text-inverse,#ffffff)]',
        link: 'bg-transparent text-[var(--color-primary,#16a34a)] underline-offset-4 hover:underline border-0 p-0 min-h-0 dark:text-[var(--color-primary,#22c55e)]',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm min-h-[36px]',
        md: 'px-5 py-2 text-base min-h-[44px]',
        lg: 'px-7 py-3 text-lg min-h-[52px]',
        default: 'px-5 py-2 text-base min-h-[44px]',
        icon: 'h-11 w-11 p-0 min-h-[44px] min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      asChild = false,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        disabled={asChild ? undefined : isDisabled}
        aria-busy={loading ? 'true' : undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        )}
        {!loading && leftIcon && <span aria-hidden="true" className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span aria-hidden="true" className="shrink-0">{rightIcon}</span>}
      </Comp>
    );
  },
);

Button.displayName = 'Button';
