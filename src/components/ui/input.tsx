import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-coffee-200 bg-white px-3.5 py-2 text-sm placeholder:text-coffee-400 focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-300 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[88px] w-full rounded-xl border border-coffee-200 bg-white px-3.5 py-2.5 text-sm placeholder:text-coffee-400 focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-300',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
