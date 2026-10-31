/**
 * Input component
 * Spec: prd.md §5.1 design tokens, §5.2 components
 * Visible label above field, helper text and error text below
 */

import * as React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
  helperText?: string | undefined;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const helperId = helperText || error ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-base font-medium text-text mb-2"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            block w-full rounded-control border px-3 py-2 text-base
            bg-surface text-text
            transition-colors duration-150 ease-out
            focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            min-h-[44px] md:min-h-[32px]
            ${
              error
                ? 'border-over-fg focus:border-over-fg'
                : 'border-border focus:border-primary'
            }
            ${className || ''}
          `.trim()}
          aria-invalid={!!error}
          aria-describedby={errorId || helperId}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-2 text-sm text-over-fg">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-2 text-sm text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
