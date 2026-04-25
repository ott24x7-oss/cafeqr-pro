'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    setDark(stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches));
  }, []);
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);
  return (
    <button
      onClick={() => setDark((d) => !d)}
      className={`h-9 w-9 grid place-items-center rounded-full hover:bg-cream-100 text-coffee-700 ${className}`}
      title={dark ? 'Switch to light' : 'Switch to dark'}
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
