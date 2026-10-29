/**
 * Progress bar component
 * Spec: prd.md §5.2 components
 * Uses role="progressbar" with aria attributes and visible percentage
 */

import * as React from 'react';

export interface ProgressProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function Progress({
  value,
  label,
  showPercentage = true,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max(value, 0), 100);

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-text">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted tabular-nums">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div
        className="w-full h-2 rounded-control bg-border overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
