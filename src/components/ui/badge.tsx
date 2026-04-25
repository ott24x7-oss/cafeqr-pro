import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'coffee' | 'wa' | 'amber' | 'rose' | 'blue' | 'emerald' | 'gray';
}

export const Badge = ({ className, tone = 'coffee', ...props }: BadgeProps) => {
  const tones: Record<string, string> = {
    coffee: 'bg-coffee-100 text-coffee-800',
    wa: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-700',
    blue: 'bg-blue-100 text-blue-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  );
};
