/**
 * MoneyField component
 * Spec: prd.md §5.2 components
 * Text input with inputmode="decimal" and currency symbol prefix
 */

import * as React from 'react';

export interface MoneyFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> {
  label?: string;
  error?: string | undefined;
  helperText?: string | undefined;
  currencySymbol?: string | undefined;
}

export const MoneyField = React.forwardRef<HTMLInputElement, MoneyFieldProps>(
  ({ className, label, error, helperText, currencySymbol = '$', id, ...props }, ref) => {
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
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-muted text-base">{currencySymbol}</span>
          </div>
          <input
            id={inputId}
            ref={ref}
            type="text"
            inputMode="decimal"
            className={`
              block w-full rounded-control border pl-8 pr-3 py-2 text-base
              bg-surface text-text tabular-nums
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
        </div>
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

MoneyField.displayName = 'MoneyField';
