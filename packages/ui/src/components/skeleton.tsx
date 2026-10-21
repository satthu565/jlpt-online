import * as React from 'react';
import { cn } from '../lib/utils.js';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'skeleton skeleton--shimmer rounded-lg',
        className,
      )}
      {...props}
    />
  );
}
