'use client';

import React from 'react';
import { Button as HeroButton, Modal as HeroModal, Spinner } from '@heroui/react';
import type { ButtonProps as LegacyButtonProps } from './button.js';
type ButtonProps = Omit<React.ComponentProps<typeof HeroButton>, 'variant' | 'size' | 'children'> & Pick<LegacyButtonProps, 'variant' | 'size' | 'loading' | 'disabled' | 'leftIcon' | 'rightIcon'> & { children?: React.ReactNode };
import type { ModalProps } from './modal.js';
export { Card, Chip, Radio, RadioGroup, Label, ProgressBar, Tabs, Popover, Switch, TextArea, TextField, Description, ButtonGroup, Separator, Tooltip } from '@heroui/react';

// API compatibility only: all visuals and interactions belong to HeroUI.
export function Button({ variant = 'primary', size = 'md', disabled, loading, leftIcon, rightIcon, children, value, ...props }: Omit<ButtonProps, 'asChild'>): React.JSX.Element {
  const mapped = variant === 'success' || variant === 'default' ? 'primary' : variant === 'destructive' ? 'danger' : variant === 'link' ? 'ghost' : variant;
  return <HeroButton {...props} value={value === undefined ? undefined : String(value)} variant={mapped ?? 'primary'} size={size === 'icon' || size === 'default' ? 'md' : size ?? 'md'} isIconOnly={size === 'icon'} isDisabled={disabled || loading} isPending={loading}>
    {loading ? <Spinner size="sm" /> : leftIcon}{children}{rightIcon}
  </HeroButton>;
}

export function Modal({ isOpen, onClose, title, children, footer, closeLabel, className }: ModalProps): React.JSX.Element {
  return <HeroModal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
    <HeroModal.Container size="lg" scroll="inside"><HeroModal.Dialog className={className}>
      <HeroModal.CloseTrigger aria-label={closeLabel} />
      <HeroModal.Header><HeroModal.Heading>{title}</HeroModal.Heading></HeroModal.Header>
      <HeroModal.Body>{children}</HeroModal.Body>
      {footer && <HeroModal.Footer>{footer}</HeroModal.Footer>}
    </HeroModal.Dialog></HeroModal.Container>
  </HeroModal.Backdrop>;
}
