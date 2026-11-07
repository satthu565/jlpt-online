'use client';

import * as React from 'react';
import {
  Select as HeroSelectBase,
  ListBox as HeroListBox,
  Label as HeroLabel,
} from '@heroui/react';
import { cn } from '../lib/utils.js';

export interface HeroSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface HeroSelectProps {
  id?: string;
  name?: string;
  label?: string;
  'aria-label'?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: HeroSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  required?: boolean;
}

export function HeroSelect({
  id,
  name,
  label,
  'aria-label': ariaLabel,
  value,
  defaultValue,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  className,
  triggerClassName,
  size = 'md',
  variant: _variant = 'primary',
  required = false,
}: HeroSelectProps): React.JSX.Element {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  const sizeClasses = {
    sm: 'h-9 md:h-8 text-xs',
    md: 'h-10 md:h-9 text-sm',
    lg: 'h-11 md:h-10 text-base',
  }[size] || 'h-10 md:h-9 text-sm';

  return (
    <div className={cn('jlpt-hero-select flex flex-col gap-1 w-full', className)}>
      {label && (
        <HeroLabel
          htmlFor={selectId}
          className="text-sm font-semibold text-[var(--text-primary)]"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-[var(--color-danger,#dc2626)] ms-1">
              *
            </span>
          )}
        </HeroLabel>
      )}
      <HeroSelectBase
        id={selectId}
        name={name}
        aria-label={ariaLabel || label}
        placeholder={placeholder}
        selectedKey={value !== undefined ? value : undefined}
        defaultSelectedKey={defaultValue !== undefined ? defaultValue : undefined}
        onSelectionChange={(key) => {
          if (key !== null && key !== undefined) {
            onChange?.(String(key));
          }
        }}
        isDisabled={disabled}
        isRequired={required}
        className="w-full"
      >
        <HeroSelectBase.Trigger
          className={cn(
            'w-full flex items-center justify-between',
            sizeClasses,
            triggerClassName,
          )}
        >
          <HeroSelectBase.Value />
          <HeroSelectBase.Indicator />
        </HeroSelectBase.Trigger>
        <HeroSelectBase.Popover className="min-w-[var(--trigger-width)] z-50">
          <HeroListBox className="p-1">
            {options.map((opt) => (
              <HeroListBox.Item
                key={opt.value}
                id={opt.value}
                textValue={opt.label}
                isDisabled={opt.disabled}
                className="cursor-pointer"
              >
                <span className="flex-1">{opt.label}</span>
                <HeroListBox.ItemIndicator />
              </HeroListBox.Item>
            ))}
          </HeroListBox>
        </HeroSelectBase.Popover>
      </HeroSelectBase>
    </div>
  );
}

export { HeroSelectBase, HeroListBox };
