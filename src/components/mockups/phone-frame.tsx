'use client';

import { ReactNode } from 'react';

export function PhoneFrame({
  children,
  size = 'md',
  className = '',
}: {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'w-[220px] aspect-[9/19]',
    md: 'w-[280px] md:w-[300px] aspect-[9/19]',
    lg: 'w-[320px] md:w-[360px] aspect-[9/19]',
  };
  return (
    <div className={`mx-auto ${sizes[size]} rounded-[2.5rem] bg-coffee-900 p-3 shadow-coffee ${className}`}>
      <div className="h-full w-full rounded-[2rem] bg-cream-50 overflow-hidden flex flex-col relative">
        {children}
      </div>
    </div>
  );
}

export function PhoneStatusBar() {
  return (
    <div className="flex justify-between items-center px-4 pt-2 pb-1 text-[10px] text-coffee-700 font-semibold">
      <span>9:41</span>
      <div className="flex gap-1">
        <span>●●●●</span>
        <span>📶</span>
        <span>🔋</span>
      </div>
    </div>
  );
}
