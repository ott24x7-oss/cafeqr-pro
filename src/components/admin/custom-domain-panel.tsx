'use client';

import { useState } from 'react';
import { Globe, Check, X, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { formatDate } from '@/lib/utils';

interface DomainRequest {
  id: string;
  name: string;
  slug: string;
  customDomain: string;
  customDomainStatus: string | null;
  customDomainNote: string | null;
  customDomainRequestedAt: string | Date | null;
  customDomainVerifiedAt: string | Date | null;
  owner: { email: string; name: string };
}

export function CustomDomainPanel({ requests: initial }: { requests: DomainRequest[] }) {
  const [requests, setRequests] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const pending = requests.filter((r) => r.customDomainStatus === 'pending');
  const verified = requests.filter((r) => r.customDomainStatus === 'verified');
  const failed = requests.filter((r) => r.customDomainStatus === 'failed');

  async function act(req: DomainRequest, action: 'approve' | 'reject' | 'clear', note?: string) {
    setBusy(req.id);
    const r = await fetch(`/api/admin/cafes/${req.id}/custom-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    });
    setBusy(null);
    if (!r.ok) {
      const data = await r.json().catch(() => ({} as any));
      toast.error('Failed', data.error ?? `HTTP ${r.status}`);
      return;
    }
    if (action === 'clear') {
      setRequests((cur) => cur.filter((x) => x.id !== req.id));
    } else {
      const newStatus = action === 'approve' ? 'verified' : 'failed';
      setRequests((cur) => cur.map((x) => x.id === req.id ? {
        ...x,
        customDomainStatus: newStatus,
        customDomainNote: note ?? null,
        customDomainVerifiedAt: action === 'approve' ? new Date() : null,
      } : x));
    }
    toast.success(
      action === 'approve' ? 'Domain approved · cafe is live'
        : action === 'reject' ? 'Domain rejected'
          : 'Cleared'
    );
  }

  function copyDig(host: string) {
    navigator.clipboard.writeText(`dig +short CNAME ${host}`);
    toast.success('Copied dig command');
  }

  if (requests.length === 0) {
    return (
      <div className="card-warm bg-cream-100 border-coffee-100">
        <div className="flex items-center gap-2 text-coffee-700">
          <Globe className="h-4 w-4" />
          <span className="text-sm">No custom-domain requests yet.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card-warm space-y-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-xl font-bold text-coffee-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-coffee-600" /> Custom domains
          </h2>
          <p className="text-xs text-coffee-500 mt-0.5">
            Before approving: confirm DNS with <span className="font-mono">dig CNAME &lt;host&gt;</span>{' '}
            and add the host under Railway → Custom Domains so the SSL cert can issue.
          </p>
        </div>
        <div className="flex gap-1 flex-wrap text-xs">
          {pending.length > 0 && <span className="pill-amber">{pending.length} pending</span>}
          {verified.length > 0 && <span className="pill bg-emerald-100 text-emerald-700">{verified.length} live</span>}
          {failed.length > 0 && <span className="pill bg-rose-100 text-rose-700">{failed.length} failed</span>}
        </div>
      </div>

      <div className="space-y-2">
        {[...pending, ...failed, ...verified].map((req) => (
          <div key={req.id} className="rounded-xl border border-coffee-100 bg-white p-3">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-coffee-900 break-all">{req.customDomain}</span>
                  {req.customDomainStatus === 'pending' && <span className="pill-amber text-[10px]">Pending</span>}
                  {req.customDomainStatus === 'verified' && (
                    <span className="pill text-[10px] bg-emerald-100 text-emerald-700">
                      <Check className="h-3 w-3" /> Live
                    </span>
                  )}
                  {req.customDomainStatus === 'failed' && (
                    <span className="pill text-[10px] bg-rose-100 text-rose-700">
                      <AlertCircle className="h-3 w-3" /> Failed
                    </span>
                  )}
                </div>
                <div className="text-xs text-coffee-600 mt-1">
                  → {req.name} <span className="text-coffee-400">/{req.slug}</span>
                  <span className="mx-1">·</span>
                  {req.owner.email}
                </div>
                <div className="text-xs text-coffee-400 mt-0.5">
                  {req.customDomainRequestedAt && (
                    <>Requested {formatDate(req.customDomainRequestedAt, { dateStyle: 'medium', timeStyle: 'short' })}</>
                  )}
                  {req.customDomainVerifiedAt && (
                    <> · Verified {formatDate(req.customDomainVerifiedAt, { dateStyle: 'medium', timeStyle: 'short' })}</>
                  )}
                </div>
                {req.customDomainNote && (
                  <div className="text-xs text-rose-600 mt-1 italic">Note: {req.customDomainNote}</div>
                )}
              </div>

              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="ghost" onClick={() => copyDig(req.customDomain)} title="Copy dig command">
                  <Copy className="h-3 w-3" /> dig
                </Button>
                <a href={`https://${req.customDomain}`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost"><ExternalLink className="h-3 w-3" /> Open</Button>
                </a>
                {req.customDomainStatus !== 'verified' && (
                  <Button
                    size="sm"
                    onClick={() => act(req, 'approve')}
                    disabled={busy === req.id}
                  >
                    <Check className="h-3 w-3" /> Approve
                  </Button>
                )}
                {req.customDomainStatus !== 'failed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const note = prompt('Reject reason (shown to the cafe owner):', 'CNAME does not resolve to cafe.watshop.in') ?? undefined;
                      if (note === undefined) return;
                      act(req, 'reject', note);
                    }}
                    disabled={busy === req.id}
                  >
                    <X className="h-3 w-3 text-rose-500" /> Reject
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!confirm(`Clear the domain ${req.customDomain} from ${req.name}?`)) return;
                    act(req, 'clear');
                  }}
                  disabled={busy === req.id}
                  title="Wipe entirely"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
