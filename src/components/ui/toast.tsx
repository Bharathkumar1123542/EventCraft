/**
 * Toast notification component
 * Spec: prd.md §5.1 design tokens
 * Uses Radix UI Toast primitive
 */

'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={`
      fixed top-0 z-50 flex max-h-screen w-full flex-col-reverse p-4
      sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-md
      ${className || ''}
    `.trim()}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & {
    variant?: 'default' | 'success' | 'error';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
  };

  return (
    <ToastPrimitive.Root
      ref={ref}
      className={`
        group pointer-events-auto relative flex w-full items-center justify-between
        space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg
        transition-all
        data-[swipe=cancel]:translate-x-0
        data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]
        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
        data-[swipe=move]:transition-none
        data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full
        data-[state=open]:sm:slide-in-from-bottom-full
        data-[state=closed]:animate-out data-[state=closed]:fade-out-80
        data-[state=closed]:slide-out-to-right-full
        ${variantClasses[variant]}
        ${className || ''}
      `.trim()}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={`text-sm font-semibold ${className || ''}`}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={`text-sm opacity-90 ${className || ''}`}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={`
      absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity
      hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2
      group-hover:opacity-100
      ${className || ''}
    `.trim()}
    toast-close=""
    {...props}
  >
    <span className="sr-only">Close</span>
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

export {
  type ToastProps,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
};

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

// Toast hook
type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
};

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback(
    ({
      title,
      description,
      variant = 'default',
    }: {
      title: string;
      description?: string;
      variant?: 'default' | 'success' | 'error';
    }) => {
      const id = Math.random().toString(36).slice(2);
      const newToast: ToastMessage = { id, title, variant };
      if (description !== undefined) {
        newToast.description = description;
      }
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    []
  );

  return { toast, toasts, setToasts };
}
