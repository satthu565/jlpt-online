'use client';

import * as React from 'react';
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
  delayDuration: number;
  triggerRef: React.RefObject<HTMLElement | null>;
  tooltipId: string;
  preload: () => void;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}

type HeroTooltipModule = typeof import('@heroui/react/tooltip');
type HeroTooltipContentComponent = React.ComponentType<
  React.ComponentProps<HeroTooltipModule['TooltipContent']> & {
    id?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    triggerRef?: React.RefObject<HTMLElement | null>;
  }
>;

// In test environments, import synchronously so unit tests with fakeTimers run deterministically.
// In production, Next.js dead-code elimination removes this branch, preserving the < 200KB initial JS budget.
let cachedHeroUI: HeroTooltipModule | null = null;
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedHeroUI = require('@heroui/react/tooltip');
  } catch {
    cachedHeroUI = null;
  }
}

let heroModulePromise: Promise<HeroTooltipModule> | null = null;
function preloadHeroTooltip(): Promise<HeroTooltipModule> {
  if (cachedHeroUI) {
    return Promise.resolve(cachedHeroUI);
  }
  if (!heroModulePromise) {
    heroModulePromise = import('@heroui/react/tooltip').then((m) => {
      cachedHeroUI = m;
      return m;
    });
  }
  return heroModulePromise;
}

interface HeroPortalInnerProps {
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  delay: number;
  side: 'top' | 'bottom' | 'left' | 'right';
  sideOffset: number;
  className?: string;
  id?: string;
  triggerRef: React.RefObject<HTMLElement | null>;
  [key: string]: unknown;
}

const LazyHeroPortal = React.lazy(async () => {
  const { TooltipRoot, TooltipContent } = await preloadHeroTooltip();
  const HeroContent = TooltipContent as unknown as HeroTooltipContentComponent;
  return {
    default: React.forwardRef<HTMLDivElement, HeroPortalInnerProps>(
      (
        {
          children,
          isOpen,
          onOpenChange,
          delay,
          side,
          sideOffset,
          className,
          id,
          triggerRef,
          ...props
        },
        ref,
      ) => {
        return (
          <TooltipRoot isOpen={isOpen} onOpenChange={onOpenChange} delay={delay}>
            <HeroContent
              ref={ref}
              id={id}
              placement={side}
              offset={sideOffset}
              triggerRef={triggerRef}
              className={cn(
                'max-w-[300px] break-normal [word-break:normal] [overflow-wrap:break-word] text-[var(--foreground,#0b1b3a)] shadow-md dark:bg-[var(--surface-secondary,#192542)] dark:text-[var(--foreground,#e6ecf8)] dark:border dark:border-[var(--border,#24324f)] pointer-events-none',
                className,
              )}
              {...props}
            >
              {children}
            </HeroContent>
          </TooltipRoot>
        );
      },
    ),
  };
});

function renderDirectHeroPortal({
  hero,
  children,
  isOpen,
  onOpenChange,
  delay,
  side,
  sideOffset,
  className,
  id,
  triggerRef,
  ...props
}: {
  hero: HeroTooltipModule;
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  delay: number;
  side: 'top' | 'bottom' | 'left' | 'right';
  sideOffset: number;
  className?: string;
  id?: string;
  triggerRef: React.RefObject<HTMLElement | null>;
  [key: string]: unknown;
}) {
  const { TooltipRoot, TooltipContent } = hero;
  const HeroContent = TooltipContent as unknown as HeroTooltipContentComponent;
  return (
    <TooltipRoot isOpen={isOpen} onOpenChange={onOpenChange} delay={delay}>
      <HeroContent
        id={id}
        placement={side}
        offset={sideOffset}
        triggerRef={triggerRef}
        className={cn(
          'max-w-[300px] break-normal [word-break:normal] [overflow-wrap:break-word] text-[var(--foreground,#0b1b3a)] shadow-md dark:bg-[var(--surface-secondary,#192542)] dark:text-[var(--foreground,#e6ecf8)] dark:border dark:border-[var(--border,#24324f)] pointer-events-none',
          className,
        )}
        {...props}
      >
        {children}
      </HeroContent>
    </TooltipRoot>
  );
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

  const preload = React.useCallback(() => {
    preloadHeroTooltip();
  }, []);

  return (
    <TooltipContext.Provider
      value={{
        isOpen,
        setIsOpen,
        delayDuration,
        triggerRef,
        tooltipId,
        preload,
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
  ({ asChild = false, children, className, ...props }, forwardedRef) => {
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

    const handleOpen = () => {
      clearTimer();
      if (!ctx) return;
      ctx.preload();
      if (ctx.delayDuration <= 0) {
        ctx.setIsOpen(true);
      } else {
        timeoutRef.current = setTimeout(() => {
          ctx.setIsOpen(true);
        }, ctx.delayDuration);
      }
    };

    const handleClose = () => {
      clearTimer();
      ctx?.setIsOpen(false);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
      props.onMouseEnter?.(e);
      if (e.defaultPrevented) return;
      handleOpen();
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
      props.onMouseLeave?.(e);
      handleClose();
    };

    const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
      props.onFocus?.(e);
      if (e.defaultPrevented || !ctx) return;
      clearTimer();
      ctx.preload();
      ctx.setIsOpen(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
      props.onBlur?.(e);
      handleClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
      props.onKeyDown?.(e);
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const setRefs = (node: HTMLElement | null) => {
      if (ctx) {
        ctx.triggerRef.current = node;
      }
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef && typeof forwardedRef === 'object') {
        (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    };

    const triggerProps = {
      ref: setRefs,
      'aria-describedby': ctx?.isOpen ? ctx.tooltipId : undefined,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      className,
      ...props,
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        ref?: React.Ref<unknown>;
        role?: string;
        className?: string;
        href?: string;
        'aria-describedby'?: string;
        onMouseEnter?: React.MouseEventHandler<HTMLElement>;
        onMouseLeave?: React.MouseEventHandler<HTMLElement>;
        onFocus?: React.FocusEventHandler<HTMLElement>;
        onBlur?: React.FocusEventHandler<HTMLElement>;
        onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
        [key: string]: unknown;
      }>;

      const childProps = child.props || {};

      const mergedRef = (node: HTMLElement | null) => {
        setRefs(node);
        const childRef = (child as unknown as { ref?: React.Ref<unknown> }).ref ?? childProps.ref;
        if (typeof childRef === 'function') {
          childRef(node);
        } else if (childRef && typeof childRef === 'object') {
          (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      };

      const ariaDescribedBy = [
        childProps['aria-describedby'],
        ctx?.isOpen ? ctx.tooltipId : undefined,
      ]
        .filter(Boolean)
        .join(' ') || undefined;

      return React.cloneElement(child, {
        ...props,
        ...childProps,
        ref: mergedRef,
        'aria-describedby': ariaDescribedBy,
        className: cn(className, childProps.className),
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
          childProps.onMouseEnter?.(e);
          handleMouseEnter(e);
        },
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
          childProps.onMouseLeave?.(e);
          handleMouseLeave(e);
        },
        onFocus: (e: React.FocusEvent<HTMLElement>) => {
          childProps.onFocus?.(e);
          handleFocus(e);
        },
        onBlur: (e: React.FocusEvent<HTMLElement>) => {
          childProps.onBlur?.(e);
          handleBlur(e);
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
          childProps.onKeyDown?.(e);
          handleKeyDown(e);
        },
      });
    }

    return (
      <span {...triggerProps}>
        {children}
      </span>
    );
  },
);
TooltipTrigger.displayName = 'TooltipTrigger';

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      className,
      side = 'top',
      sideOffset = 4,
      children,
      id,
      ...props
    },
    ref,
  ) => {
    const ctx = React.useContext(TooltipContext);
    const contentId = id || ctx?.tooltipId;

    if (!ctx?.isOpen) {
      return null;
    }

    if (cachedHeroUI) {
      return renderDirectHeroPortal({
        hero: cachedHeroUI,
        ref,
        id: contentId,
        isOpen: ctx.isOpen,
        onOpenChange: ctx.setIsOpen,
        delay: ctx.delayDuration,
        side,
        sideOffset,
        triggerRef: ctx.triggerRef,
        className,
        children,
        ...props,
      });
    }

    return (
      <React.Suspense fallback={null}>
        <LazyHeroPortal
          ref={ref}
          id={contentId}
          isOpen={ctx.isOpen}
          onOpenChange={ctx.setIsOpen}
          delay={ctx.delayDuration}
          side={side}
          sideOffset={sideOffset}
          triggerRef={ctx.triggerRef}
          className={className}
          {...props}
        >
          {children}
        </LazyHeroPortal>
      </React.Suspense>
    );
  },
);
TooltipContent.displayName = 'TooltipContent';
