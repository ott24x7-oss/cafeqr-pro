'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

export function CustomerOrderActions({ orderId, cancellable }: { orderId: string; cancellable: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!cancellable) return null;

  async function cancel() {
    if (!confirm('Cancel this order? This cannot be undone.')) return;
    setBusy(true);
    try {
      const r = await fetch('/api/customer/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? 'Could not cancel');
      toast.success('Order cancelled');
      router.refresh();
    } catch (e: any) {
      toast.error('Could not cancel', e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={cancel}
      disabled={busy}
      className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} Cancel
    </button>
  );
}
