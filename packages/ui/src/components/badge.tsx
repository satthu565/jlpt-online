'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

// HeroUI v3 chip styles (@heroui/styles): soft colour chips.
export const badgeVariants = cva('jlpt-badge chip chip--soft', {
  variants: {
    variant: {
      primary: 'jlpt-badge-primary chip--accent',
      success: 'jlpt-badge-success chip--success',
      warning: 'jlpt-badge-warning chip--warning',
      danger: 'jlpt-badge-danger chip--danger',
      error: 'jlpt-badge-error chip--danger',
      destructive: 'jlpt-badge-danger chip--danger',
      info: 'jlpt-badge-info chip--accent',
      neutral: 'jlpt-badge-neutral chip--default',
      default: 'jlpt-badge-default chip--default',
      secondary: 'jlpt-badge-secondary chip--default',
      outline: 'chip--default chip--tertiary',
    },
    size: {
      sm: 'chip--sm',
      md: 'chip--md',
      default: 'chip--md',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

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
