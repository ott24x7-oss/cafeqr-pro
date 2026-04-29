'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

/**
 * Pill-shaped switch the cafe owner uses to flip the storefront between
 * Open (green) and Closed (red). Optimistic — the pill flips instantly,
 * the API call runs in the background, and we router.refresh() so any
 * server component reading cafe.isOpen (header pills, order-place
 * route) re-renders with the new value.
 */
export function OpenClosedToggle({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function flip() {
    if (saving) return;
    const next = !open;
    setOpen(next);
    setSaving(true);
    try {
      const r = await fetch('/api/dashboard/cafe-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: next }),
      });
      if (!r.ok) {
        setOpen(!next);
        const d = await r.json().catch(() => ({}));
        toast.error('Could not switch', d.error ?? `HTTP ${r.status}`);
        return;
      }
      toast.success(next ? 'Cafe is now Open' : 'Cafe is now Closed');
      // Re-render server components so the customer page sees the flip
      // immediately on the next navigation / revalidate.
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={flip}
      disabled={saving}
      title={open ? 'Tap to close the cafe' : 'Tap to open the cafe'}
      aria-pressed={open}
      className={
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition ' +
        (open
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100')
      }
    >
      <span
        className={
          'relative inline-flex h-4 w-7 items-center rounded-full transition ' +
          (open ? 'bg-emerald-500' : 'bg-rose-500')
        }
      >
        <span
          className={
            'inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ' +
            (open ? 'translate-x-3.5' : 'translate-x-0.5')
          }
        />
      </span>
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <span>{open ? 'Open' : 'Closed'}</span>
      )}
    </button>
  );
}
