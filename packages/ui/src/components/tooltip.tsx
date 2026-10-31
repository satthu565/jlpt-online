'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils.js';

interface TooltipProviderContextValue {
  delayDuration: number;
}

const TooltipProviderContext = React.createContext<TooltipProviderContextValue>({
  delayDuration: 200,
});

export function TooltipProvider({
  children,
  delayDuration = 200,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}): React.JSX.Element {
  return (
    <TooltipProviderContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipProviderContext.Provider>
  );
}

interface TooltipContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  tooltipId: string;
  delayDuration: number;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}

export function Tooltip({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  delayDuration: propDelayDuration,
}: TooltipProps): React.JSX.Element {
  const provider = React.useContext(TooltipProviderContext);
  const delayDuration = propDelayDuration ?? provider.delayDuration;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setIsOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = React.useRef<HTMLElement | null>(null);
  const reactId = React.useId();
  const tooltipId = `tooltip-${reactId.replace(/:/g, '')}`;

  return (
    <TooltipContext.Provider
      value={{
        isOpen,
        setIsOpen,
        triggerRef,
        tooltipId,
        delayDuration,
      }}
    >
      {children}
    </TooltipContext.Provider>
  );
}

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  ({ asChild = false, children, ...props }, forwardedRef) => {
    const ctx = React.useContext(TooltipContext);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    React.useEffect(() => {
      return () => clearTimer();
    }, []);

    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
      props.onMouseEnter?.(e);
      if (e.defaultPrevented || !ctx) return;
      clearTimer();
      if (ctx.delayDuration <= 0) {
        ctx.setIsOpen(true);
      } else {
        timeoutRef.current = setTimeout(() => {
          ctx.setIsOpen(true);
        }, ctx.delayDuration);
      }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
      props.onMouseLeave?.(e);
      clearTimer();
      ctx?.setIsOpen(false);
    };

    const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
      props.onFocus?.(e);
      if (e.defaultPrevented || !ctx) return;
      clearTimer();
      ctx.setIsOpen(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
      props.onBlur?.(e);
      clearTimer();
      ctx?.setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
      props.onKeyDown?.(e);
      if (e.key === 'Escape') {
        clearTimer();
        ctx?.setIsOpen(false);
      }
    };

    const setRefs = React.useCallback(
      (node: HTMLElement | null) => {
        if (ctx) {
          ctx.triggerRef.current = node;
        }
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      [ctx, forwardedRef],
    );

    const triggerProps = {
      ref: setRefs,
      'aria-describedby': ctx?.isOpen ? ctx.tooltipId : undefined,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      ...props,
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        ref?: React.Ref<unknown>;
        className?: string;
        onMouseEnter?: React.MouseEventHandler<HTMLElement>;
        onMouseLeave?: React.MouseEventHandler<HTMLElement>;
        onFocus?: React.FocusEventHandler<HTMLElement>;
        onBlur?: React.FocusEventHandler<HTMLElement>;
        onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
        'aria-describedby'?: string;
      }>;

      return React.cloneElement(child, {
        ref: (node: HTMLElement | null) => {
          setRefs(node);
          const childRef = (child.props as { ref?: React.Ref<unknown> }).ref;
          if (typeof childRef === 'function') {
            childRef(node);
          } else if (childRef && typeof childRef === 'object') {
            (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
          }
        },
        'aria-describedby':
          [child.props['aria-describedby'], triggerProps['aria-describedby']]
            .filter(Boolean)
            .join(' ') || undefined,
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
          child.props.onMouseEnter?.(e);
          handleMouseEnter(e);
        },
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
          child.props.onMouseLeave?.(e);
          handleMouseLeave(e);
        },
        onFocus: (e: React.FocusEvent<HTMLElement>) => {
          child.props.onFocus?.(e);
          handleFocus(e);
        },
        onBlur: (e: React.FocusEvent<HTMLElement>) => {
          child.props.onBlur?.(e);
          handleBlur(e);
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
          child.props.onKeyDown?.(e);
          handleKeyDown(e);
        },
      });
    }

    return <span {...triggerProps}>{children}</span>;
  },
);
TooltipTrigger.displayName = 'TooltipTrigger';

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = 'top', sideOffset = 4, children, style, ...props }, ref) => {
    const ctx = React.useContext(TooltipContext);
    const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    React.useLayoutEffect(() => {
      if (!ctx?.isOpen || !ctx.triggerRef.current || typeof window === 'undefined') {
        return;
      }

      const updatePosition = () => {
        const trigger = ctx.triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();

        let top = 0;
        let left = 0;

        switch (side) {
          case 'bottom':
            top = rect.bottom + sideOffset;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - sideOffset;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + sideOffset;
            break;
          case 'top':
          default:
            top = rect.top - sideOffset;
            left = rect.left + rect.width / 2;
            break;
        }

        setCoords({ top, left });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition, { passive: true });
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }, [ctx?.isOpen, ctx?.triggerRef, side, sideOffset]);

    if (!ctx?.isOpen || !mounted || typeof document === 'undefined') {
      return null;
    }

    const transformMap: Record<string, string> = {
      top: 'translate(-50%, -100%)',
      bottom: 'translate(-50%, 0)',
      left: 'translate(-100%, -50%)',
      right: 'translate(0, -50%)',
    };

    const positionStyle: React.CSSProperties = coords
      ? {
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          transform: transformMap[side] || transformMap.top,
          pointerEvents: 'none',
          ...style,
        }
      : {
          position: 'fixed',
          pointerEvents: 'none',
          visibility: 'hidden',
          ...style,
        };

    return createPortal(
      <div
        ref={ref}
        id={ctx.tooltipId}
        role="tooltip"
        data-side={side}
        data-state="delayed-open"
        style={positionStyle}
        className={cn(
          'tooltip z-50 overflow-hidden text-[var(--foreground)] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:bg-[var(--bg-muted,#f1f5f9)] dark:text-[var(--text-primary,#0f172a)]',
          className,
        )}
        {...props}
      >
        {children}
      </div>,
      document.body,
    );
  },
);
TooltipContent.displayName = 'TooltipContent';
