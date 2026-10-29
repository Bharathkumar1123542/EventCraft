/**
 * Skeleton component
 * Spec: prd.md §5.2 components
 * Gray block with 1.2s shimmer, static under prefers-reduced-motion
 */

import * as React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={`
        animate-shimmer bg-gradient-to-r from-border via-bg to-border
        bg-[length:200%_100%] rounded-control
        ${className || ''}
      `.trim()}
      {...props}
    />
  );
}
