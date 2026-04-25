import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-coffee-700 text-cream-50 hover:bg-coffee-800 shadow-soft',
        secondary: 'bg-cream-200 text-coffee-800 hover:bg-cream-300',
        outline: 'border border-coffee-300 bg-white text-coffee-800 hover:bg-cream-100',
        ghost: 'text-coffee-700 hover:bg-cream-100',
        wa: 'bg-wagreen text-white hover:bg-wagreen-dark shadow-soft',
        destructive: 'bg-rose-500 text-white hover:bg-rose-600',
        accent: 'bg-caramel text-coffee-900 hover:bg-caramel-dark hover:text-white',
      },
      size: {
        default: 'px-5 py-2.5',
        sm: 'px-3 py-1.5 text-xs',
        lg: 'px-7 py-3 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';

export { buttonVariants };
