'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2, X, UserCheck, Mail, Phone, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { formatDate } from '@/lib/utils';

const ROLES = ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'];
const ROLE_DESC: Record<string, string> = {
  OWNER: 'Full access',
  MANAGER: 'Everything except billing',
  CASHIER: 'Orders, payments, billing',
  KITCHEN: 'Live orders only',
  WAITER: 'Orders + tables',
};

export function StaffManager({ initialStaff }: { initialStaff: any[] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [showAdd, setShowAdd] = useState(false);

  async function remove(id: string) {
    if (!confirm('Remove this staff member?')) return;
    const r = await fetch(`/api/dashboard/staff/${id}`, { method: 'DELETE' });
    if (r.ok) setStaff((c) => c.filter((s) => s.id !== id));
  }

  async function toggleNotify(id: string, next: boolean) {
    const before = staff;
    setStaff((c) => c.map((s) => s.id === id ? { ...s, notifyOnNewOrder: next } : s));
    const r = await fetch(`/api/dashboard/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifyOnNewOrder: next }),
    });
    if (!r.ok) {
      setStaff(before);
      toast.error('Could not update');
    } else {
      toast.success(next ? 'Will receive new-order WA pings' : 'Pings turned off');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Staff</h1>
          <p className="text-coffee-600 text-sm">{staff.length} team members</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Invite staff
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {staff.length === 0 && (
          <div className="card-warm col-span-full text-center text-coffee-500 py-10">
            <UserCheck className="mx-auto h-10 w-10 mb-2 text-coffee-300" />
            No staff yet. Invite your team to share workload.
          </div>
        )}
        {staff.map((s) => (
          <div key={s.id} className="card-warm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-coffee-gradient grid place-items-center text-cream-50 font-bold shrink-0">
                  {(s.user.name ?? s.user.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-coffee-900 truncate">{s.user.name ?? 'Unnamed'}</div>
                  <div className="text-xs text-coffee-500 truncate flex items-center gap-1"><Mail className="h-3 w-3" /> {s.user.email}</div>
                  {s.user.phone && <div className="text-xs text-coffee-500 truncate flex items-center gap-1"><Phone className="h-3 w-3" /> {s.user.phone}</div>}
                </div>
              </div>
              {s.role !== 'OWNER' && (
                <button onClick={() => remove(s.id)} className="text-rose-500 hover:text-rose-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="pill-coffee">{s.role}</span>
              <span className="text-coffee-500">Joined {formatDate(s.joinedAt ?? s.invitedAt, { dateStyle: 'short', timeStyle: undefined })}</span>
            </div>
            <div className="text-[11px] text-coffee-500 mt-1">{ROLE_DESC[s.role]}</div>

            <button
              onClick={() => toggleNotify(s.id, !s.notifyOnNewOrder)}
              className={`mt-3 w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium border transition ${
                s.notifyOnNewOrder
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-cream-50 border-coffee-200 text-coffee-700 hover:bg-cream-100'
              }`}
              title={s.user.phone ? '' : 'Add a phone number to this user to enable WhatsApp pings'}
              disabled={!s.user.phone}
            >
              <span className="flex items-center gap-1.5">
                {s.notifyOnNewOrder ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                WhatsApp on new order
              </span>
              <span className={`h-4 w-7 rounded-full relative transition ${s.notifyOnNewOrder ? 'bg-emerald-500' : 'bg-coffee-300'}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${s.notifyOnNewOrder ? 'left-3.5' : 'left-0.5'}`} />
              </span>
            </button>
            {!s.user.phone && (
              <div className="text-[10px] text-coffee-400 mt-1">Add phone number to enable</div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <AddStaffModal
          onClose={() => setShowAdd(false)}
          onAdded={(s: any) => { setStaff((c) => [s, ...c]); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function AddStaffModal({ onClose, onAdded }: any) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'WAITER' });
  const [loading, setLoading] = useState(false);
  async function save() {
    setLoading(true);
    const r = await fetch('/api/dashboard/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (r.ok) {
      const data = await r.json();
      onAdded(data.staff);
      toast.success('Staff added — share the password');
    } else {
      const d = await r.json();
      toast.error(d.error ?? 'Failed');
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="w-full md:max-w-md bg-cream-50 rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold text-coffee-900">Invite staff</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-cream-200"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Riya" />
          </div>
          <div>
            <label className="label">Email</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="riya@cafe.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 chars" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.filter((r) => r !== 'OWNER').map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Button className="w-full" onClick={save} disabled={loading || !form.email || !form.password}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Invite
          </Button>
        </div>
      </div>
    </div>
  );
}
