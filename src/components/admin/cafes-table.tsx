'use client';

import { useState } from 'react';
import { Search, Power, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

export function AdminCafesTable({ cafes: initial }: { cafes: any[] }) {
  const [cafes, setCafes] = useState(initial);
  const [q, setQ] = useState('');

  async function toggle(c: any) {
    const next = c.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    if (!confirm(`${next === 'SUSPENDED' ? 'Suspend' : 'Activate'} ${c.name}?`)) return;
    const r = await fetch(`/api/admin/cafes/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) {
      setCafes((cur) => cur.map((x) => x.id === c.id ? { ...x, status: next } : x));
      toast.success(`Cafe ${next.toLowerCase()}`);
    }
  }

  const filtered = q
    ? cafes.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.slug.includes(q.toLowerCase()) || c.owner.email.includes(q.toLowerCase()))
    : cafes;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Cafes</h1>
        <p className="text-coffee-600 text-sm">{cafes.length} cafes on the platform</p>
      </div>

      <div className="card-warm">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
          <Input className="pl-9" placeholder="Search by name, slug, owner email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead><tr className="text-left text-coffee-500 border-b border-coffee-100">
              <th className="py-2">Cafe</th><th>Owner</th><th>Plan</th><th>Status</th><th>Tables</th><th>Items</th><th>Orders</th><th>Joined</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-coffee-50 last:border-0">
                  <td className="py-2">
                    <div className="font-semibold text-coffee-900">{c.name}</div>
                    <div className="text-xs text-coffee-500">/{c.slug}</div>
                  </td>
                  <td>
                    <div className="text-coffee-800">{c.owner.name}</div>
                    <div className="text-xs text-coffee-500">{c.owner.email}</div>
                  </td>
                  <td>{c.plan?.name ?? <span className="text-coffee-400">—</span>}</td>
                  <td><span className={`pill ${c.status === 'ACTIVE' ? 'pill-wa' : c.status === 'TRIAL' ? 'pill-amber' : 'pill-rose'}`}>{c.status}</span></td>
                  <td>{c._count.tables}</td>
                  <td>{c._count.menuItems}</td>
                  <td>{c._count.orders}</td>
                  <td className="text-xs">{formatDate(c.createdAt, { dateStyle: 'short', timeStyle: undefined })}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <a href={`/cafe/${c.slug}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                      <Button size="sm" variant="outline" onClick={() => toggle(c)}>
                        <Power className="h-3.5 w-3.5" /> {c.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
