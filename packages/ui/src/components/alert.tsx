import { AlertTriangle, CircleCheck, CircleX, Info, X, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

// HeroUI v3 alert styles (@heroui/styles).
export const alertVariants = cva('jlpt-alert alert mb-4', {
  variants: {
    variant: {
      info: 'jlpt-alert-info alert--accent',
      default: 'jlpt-alert-info alert--default',
      success: 'jlpt-alert-success alert--success',
      warning: 'jlpt-alert-warning alert--warning',
      error: 'jlpt-alert-error alert--danger',
      destructive: 'jlpt-alert-error alert--danger',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const iconMap: Record<string, LucideIcon> = {
  info: Info,
  default: Info,
  success: CircleCheck,
  warning: AlertTriangle,
  error: CircleX,
  destructive: CircleX,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  onClose?: () => void;
  closeLabel?: string;
}

export function Alert({
  children,
  variant = 'info',
  title,
  onClose,
  closeLabel = 'Đóng thông báo',
  className,
  ...props
}: AlertProps): React.JSX.Element {
  const Icon = iconMap[variant || 'info'] || Info;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <span aria-hidden="true" className="alert__indicator">
        <Icon className="size-5" />
      </span>
      <div className="alert__content flex-1">
        {title && <div className="alert__title">{title}</div>}
        <div className="alert__description">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="button button--ghost button--sm button--icon-only"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';
