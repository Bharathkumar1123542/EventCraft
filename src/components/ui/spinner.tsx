/**
 * Spinner component
 * Spec: prd.md §5.1 design tokens
 */

import * as React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4 border-2',
      md: 'h-8 w-8 border-2',
      lg: 'h-12 w-12 border-3',
    };

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={className}
        {...props}
      >
        <div
          className={`
            animate-spin rounded-full border-t-primary-600 border-r-transparent
            border-b-primary-600 border-l-transparent
            ${sizeClasses[size]}
          `.trim()}
        />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';
