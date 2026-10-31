/**
 * Badge component
 * Spec: prd.md §5.2 components
 * Variants: neutral, ok, warn, over - always contains text
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-control px-3 py-1 text-sm font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-bg text-text border border-border',
        ok: 'bg-ok-bg text-ok-fg',
        warn: 'bg-warn-bg text-warn-fg',
        over: 'bg-over-bg text-over-fg',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={badgeVariants({ variant, className })} {...props} />
  );
}
