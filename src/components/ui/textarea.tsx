/**
 * Textarea component
 * Spec: prd.md §5.2 components
 */

import * as React from 'react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | undefined;
  helperText?: string | undefined;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || React.useId();
    const helperId = helperText || error ? `${textareaId}-helper` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-base font-medium text-text mb-2"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`
            block w-full rounded-control border px-3 py-2 text-base
            bg-surface text-text
            transition-colors duration-150 ease-out
            focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            resize-y min-h-[88px]
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

Textarea.displayName = 'Textarea';
