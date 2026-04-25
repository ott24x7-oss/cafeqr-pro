'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Theme: read once on mount
    const t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
