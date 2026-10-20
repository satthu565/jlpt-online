import { AlertTriangle, CircleCheck, CircleX, Info, X, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

export const alertVariants = cva(
  'jlpt-alert relative flex items-start gap-3 p-3.5 rounded-lg text-sm mb-4 border-l-4 transition-colors',
  {
    variants: {
      variant: {
        info:
          'jlpt-alert-info bg-[var(--color-info-light,#eff6ff)] border-l-[var(--color-info,#2563eb)] text-[var(--color-info-text,#1e40af)] dark:bg-[var(--color-info-light,#1e3a8a)] dark:border-l-[var(--color-info,#60a5fa)] dark:text-[var(--color-info-text,#bfdbfe)]',
        default:
          'jlpt-alert-info bg-[var(--color-info-light,#eff6ff)] border-l-[var(--color-info,#2563eb)] text-[var(--color-info-text,#1e40af)] dark:bg-[var(--color-info-light,#1e3a8a)] dark:border-l-[var(--color-info,#60a5fa)] dark:text-[var(--color-info-text,#bfdbfe)]',
        success:
          'jlpt-alert-success bg-[var(--color-primary-light,#f0fdf4)] border-l-[var(--color-primary,#16a34a)] text-[var(--color-primary-text,#14532d)] dark:bg-[var(--color-primary-light,#14532d)] dark:border-l-[var(--color-primary,#22c55e)] dark:text-[var(--color-primary-text,#bbf7d0)]',
        warning:
          'jlpt-alert-warning bg-[var(--color-warning-light,#fef3c7)] border-l-[var(--color-warning,#d97706)] text-[var(--color-warning-text,#92400e)] dark:bg-[var(--color-warning-light,#78350f)] dark:border-l-[var(--color-warning,#f59e0b)] dark:text-[var(--color-warning-text,#fde68a)]',
        error:
          'jlpt-alert-error bg-[var(--color-danger-light,#fee2e2)] border-l-[var(--color-danger,#dc2626)] text-[var(--color-danger-text,#991b1b)] dark:bg-[var(--color-danger-light,#7f1d1d)] dark:border-l-[var(--color-danger,#ef4444)] dark:text-[var(--color-danger-text,#fecaca)]',
        destructive:
          'jlpt-alert-error bg-[var(--color-danger-light,#fee2e2)] border-l-[var(--color-danger,#dc2626)] text-[var(--color-danger-text,#991b1b)] dark:bg-[var(--color-danger-light,#7f1d1d)] dark:border-l-[var(--color-danger,#ef4444)] dark:text-[var(--color-danger-text,#fecaca)]',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

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
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex-1">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="cursor-pointer px-2 py-1 text-base leading-none rounded min-h-[32px] min-w-[32px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
