'use client';

import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/utils.js';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error('DropdownMenu components must be used within a DropdownMenu');
  }
  return ctx;
}

export interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dir?: 'ltr' | 'rtl';
  modal?: boolean;
}

export function DropdownMenu({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: DropdownMenuProps): React.JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLElement, DropdownMenuTriggerProps>(
  ({ asChild = false, children, onClick, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useDropdownMenu();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        setOpen(!open);
      }
    };

    const combinedRef = (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
        'aria-haspopup'?: string;
        'aria-expanded'?: boolean;
        'data-state'?: string;
        ref?: React.Ref<HTMLElement>;
      }>;
      return React.cloneElement(child, {
        ref: combinedRef,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'data-state': open ? 'open' : 'closed',
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          child.props.onClick?.(e);
          handleClick(e);
        },
      });
    }

    return (
      <button
        ref={combinedRef as React.Ref<HTMLButtonElement>}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        data-state={open ? 'open' : 'closed'}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  asChild?: boolean;
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = 'start', sideOffset = 4, children, style, ...props }, ref) => {
    const { open, setOpen, triggerRef, contentRef } = useDropdownMenu();

    const combinedRef = (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    };

    React.useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const items = contentRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
          if (!items || items.length === 0) return;
          const activeIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);
          let nextIndex = 0;
          if (e.key === 'ArrowDown') {
            nextIndex = activeIndex >= 0 && activeIndex < items.length - 1 ? activeIndex + 1 : 0;
          } else {
            nextIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
          }
          items[nextIndex]?.focus();
        }
      };

      const handlePointerDown = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node;
        if (
          contentRef.current &&
          !contentRef.current.contains(target) &&
          triggerRef.current &&
          !triggerRef.current.contains(target)
        ) {
          setOpen(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handlePointerDown);
        document.removeEventListener('touchstart', handlePointerDown);
      };
    }, [open, setOpen, triggerRef, contentRef]);

    if (!open) return null;

    return (
      <div
        ref={combinedRef}
        role="menu"
        tabIndex={-1}
        data-state="open"
        style={{
          marginTop: `${sideOffset}px`,
          ...(align === 'end' ? { right: 0 } : {}),
          ...style,
        }}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-2xl bg-[var(--overlay)] p-1 text-[var(--foreground)] shadow-[var(--overlay-shadow)]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

export interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
  asChild?: boolean;
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, disabled, asChild = false, children, onClick, onKeyDown, ...props }, ref) => {
    const { setOpen } = useDropdownMenu();

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
      if (!e.defaultPrevented) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      onKeyDown?.(e);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
    };

    const itemClasses = cn(
      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-[var(--bg-hover,#e2e8f0)] focus:bg-[var(--bg-hover,#e2e8f0)] focus:text-[var(--text-primary,#0f172a)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:hover:bg-[var(--bg-hover,#334155)] dark:focus:bg-[var(--bg-hover,#334155)] dark:focus:text-[var(--text-primary,#f8fafc)]',
      inset && 'pl-8',
      disabled && 'pointer-events-none opacity-50',
      className,
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        className?: string;
        onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
        role?: string;
        tabIndex?: number;
      }>;
      return React.cloneElement(child, {
        role: 'menuitem',
        tabIndex: disabled ? -1 : 0,
        className: cn(itemClasses, child.props.className),
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
          child.props.onClick?.(e);
          handleClick(e);
        },
      });
    }

    return (
      <div
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={itemClasses}
        {...props}
      >
        {children}
      </div>
    );
  },
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} role="group" className={cn('space-y-0.5', className)} {...props} />
  ),
);
DropdownMenuGroup.displayName = 'DropdownMenuGroup';

export const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;
DropdownMenuPortal.displayName = 'DropdownMenuPortal';

export const DropdownMenuSub = (props: DropdownMenuProps): React.JSX.Element => <DropdownMenu {...props} />;
DropdownMenuSub.displayName = 'DropdownMenuSub';

export const DropdownMenuRadioGroup = DropdownMenuGroup;
DropdownMenuRadioGroup.displayName = 'DropdownMenuRadioGroup';

export const DropdownMenuSubTrigger = DropdownMenuItem;
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

export const DropdownMenuSubContent = DropdownMenuContent;
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

export interface DropdownMenuCheckboxItemProps extends DropdownMenuItemProps {
  checked?: boolean;
}

export const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ className, children, checked = false, ...props }, ref) => (
    <DropdownMenuItem
      ref={ref}
      role="menuitemcheckbox"
      aria-checked={checked}
      className={cn('pl-8', className)}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="size-4" aria-hidden="true" />}
      </span>
      {children}
    </DropdownMenuItem>
  ),
);
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

export interface DropdownMenuRadioItemProps extends DropdownMenuItemProps {
  checked?: boolean;
}

export const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ className, children, checked = false, ...props }, ref) => (
    <DropdownMenuItem
      ref={ref}
      role="menuitemradio"
      aria-checked={checked}
      className={cn('pl-8', className)}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <span className="h-2 w-2 rounded-full bg-current" />}
      </span>
      {children}
    </DropdownMenuItem>
  ),
);
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

export interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, inset, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
      {...props}
    />
  ),
);
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      className={cn('-mx-1 my-1 h-px bg-[var(--border-subtle,#e2e8f0)] dark:bg-[var(--border-subtle,#334155)]', className)}
      {...props}
    />
  ),
);
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';
