import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

// HeroUI v3 button styles (@heroui/styles): the look comes from the .button / .button--* classes.
export const buttonVariants = cva('jlpt-button button', {
  variants: {
    variant: {
      primary: 'button--primary',
      default: 'button--primary',
      success: 'button--primary',
      secondary: 'button--secondary',
      outline: 'button--outline',
      ghost: 'button--ghost',
      danger: 'button--danger',
      destructive: 'button--danger',
      link: 'button--ghost underline-offset-4 hover:underline text-[var(--accent)]',
    },
    size: {
      sm: 'button--sm',
      md: 'button--md',
      lg: 'button--lg',
      default: 'button--md',
      icon: 'button--icon-only',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

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
    const isDisabled = disabled || loading;

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        ref?: React.Ref<unknown>;
        className?: string;
        children?: React.ReactNode;
        disabled?: boolean;
      }>;
      return React.cloneElement(child, {
        ref,
        disabled: child.props.disabled ?? (isDisabled || undefined),
        'aria-busy': loading ? 'true' : undefined,
        className: cn(buttonVariants({ variant, size }), className, child.props.className),
        children: (
          <>
            {loading && (
              <span
                aria-hidden="true"
                className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
              />
            )}
            {!loading && leftIcon && <span aria-hidden="true" className="shrink-0">{leftIcon}</span>}
            {child.props.children}
            {!loading && rightIcon && <span aria-hidden="true" className="shrink-0">{rightIcon}</span>}
          </>
        ),
        ...props,
      });
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="spinner spinner--sm spinner--current"
          />
        )}
        {!loading && leftIcon && <span aria-hidden="true" className="shrink-0">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span aria-hidden="true" className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
