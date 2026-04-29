'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bell, Loader2, Search } from 'lucide-react';
import { toast } from '@/components/ui/toaster';
import { Input } from '@/components/ui/input';

type Filter = 'all' | 'subscribed' | 'free' | 'expiring' | 'expired';

const TABS: { key: Filter; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'subscribed', label: 'Paying' },
  { key: 'free',       label: 'Free' },
  { key: 'expiring',   label: 'Expiring 7d' },
  { key: 'expired',    label: 'Expired' },
];

export function UsersFilterTabs({ current, q }: { current: Filter; q: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(q);

  function go(filter: Filter) {
    const u = new URLSearchParams(params.toString());
    if (filter === 'all') u.delete('filter'); else u.set('filter', filter);
    router.push(`/admin/users?${u.toString()}`);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const u = new URLSearchParams(params.toString());
    if (search.trim()) u.set('q', search.trim()); else u.delete('q');
    router.push(`/admin/users?${u.toString()}`);
  }

  return (
    <div className="card-warm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => go(t.key)}
            className={`pill whitespace-nowrap ${
              current === t.key ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-800 hover:bg-cream-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form onSubmit={submitSearch} className="flex gap-2 sm:max-w-xs sm:w-full">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-coffee-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cafe name, email, phone…"
            className="pl-8"
          />
        </div>
        <button type="submit" className="rounded-xl bg-coffee-700 text-cream-50 px-3 text-sm font-semibold hover:bg-coffee-800">
          Search
        </button>
      </form>
    </div>
  );
}

export function RemindButton({
  subscriptionId,
  cafeName,
}: {
  subscriptionId: string;
  cafeName: string;
}) {
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!confirm(`Send a renewal reminder to ${cafeName} on WhatsApp now?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/subscriptions/${subscriptionId}/send-reminder`, {
        method: 'POST',
      });
      const data = await r.json().catch(() => ({} as any));
      if (r.ok) {
        toast.success('Reminder sent');
      } else {
        toast.error('Failed to send', data.reason ?? `HTTP ${r.status}`);
      }
    } catch (e: any) {
      toast.error('Failed to send', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={send}
      disabled={busy}
      title="Send renewal reminder via WhatsApp"
      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
      Remind
    </button>
  );
}
