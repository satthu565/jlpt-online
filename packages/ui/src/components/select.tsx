'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '../lib/utils.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  requiredIndicator?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options = [],
      id: explicitId,
      requiredIndicator = false,
      required,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = explicitId || generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    const selectElement = (
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={cn(
          'jlpt-select flex w-full rounded-[var(--field-radius)] border-0 bg-[var(--field-background)] text-[var(--field-foreground)] shadow-[var(--field-shadow)] hover:bg-[var(--field-hover)] px-3.5 py-2.5 text-base text-[var(--text-primary,#0f172a)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color,#2563eb)] focus-visible:ring-offset-1 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] cursor-pointer dark:border-[var(--border-default,#475569)] dark:bg-[var(--bg-surface,#1e293b)] dark:text-[var(--text-primary,#f8fafc)]',
          error && 'border-[var(--color-danger,#dc2626)] focus-visible:ring-[var(--color-danger,#dc2626)] dark:border-[var(--color-danger,#ef4444)]',
          className,
        )}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
    );

    if (!label && !hint && !error) {
      return selectElement;
    }

    return (
      <div className="flex flex-col gap-1.5 mb-4 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="flex items-center gap-1 text-sm font-semibold text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)]"
          >
            {label}
            {(required || requiredIndicator) && (
              <span aria-hidden="true" className="text-[var(--color-danger,#dc2626)] dark:text-[var(--color-danger,#ef4444)]">
                *
              </span>
            )}
          </label>
        )}

        {selectElement}

        {hint && !error && (
          <span
            id={hintId}
            className="text-xs text-[var(--text-muted,#64748b)] dark:text-[var(--text-muted,#94a3b8)]"
          >
            {hint}
          </span>
        )}

        {error && (
          <span
            id={errorId}
            role="alert"
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-danger,#dc2626)] dark:text-[var(--color-danger,#ef4444)]"
          >
            {error}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

/* Radix Select Primitives for shadcn composite use */
export const SelectRoot = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-11 w-full items-center justify-between rounded-[var(--field-radius)] border-0 bg-[var(--field-background)] text-[var(--field-foreground)] shadow-[var(--field-shadow)] hover:bg-[var(--field-hover)] px-3.5 py-2 text-base ring-offset-background placeholder:text-[var(--text-muted,#64748b)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color,#2563eb)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--border-default,#475569)] dark:bg-[var(--bg-surface,#1e293b)] dark:text-[var(--text-primary,#f8fafc)]',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <span aria-hidden="true" className="h-4 w-4 opacity-50">▼</span>
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-2xl border-0 bg-[var(--overlay)] shadow-[var(--overlay-shadow)] text-[var(--text-primary,#0f172a)] shadow-md animate-in fade-in-80 dark:border-[var(--border-default,#475569)] dark:bg-[var(--bg-surface-elevated,#334155)] dark:text-[var(--text-primary,#f8fafc)]',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

export const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default rounded-xl py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-[var(--bg-hover,#e2e8f0)] focus:text-[var(--text-primary,#0f172a)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-[var(--bg-hover,#334155)] dark:focus:text-[var(--text-primary,#f8fafc)]',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <span aria-hidden="true">✓</span>
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-[var(--border-subtle,#e2e8f0)] dark:bg-[var(--border-subtle,#334155)]', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
