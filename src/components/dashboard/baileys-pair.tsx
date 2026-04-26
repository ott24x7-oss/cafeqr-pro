'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Loader2, Smartphone, Wifi, WifiOff, X, RefreshCw, LogOut, ScanLine, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';

interface Status {
  sessionId?: string;
  state: 'idle' | 'connecting' | 'qr' | 'open' | 'close';
  qrDataUrl: string | null;
  phone: string | null;
  error: string | null;
  ageMs?: number;
}

const STATE_LABEL: Record<Status['state'], string> = {
  idle: 'Not started',
  connecting: 'Connecting…',
  qr: 'Scan QR',
  open: 'Connected',
  close: 'Disconnected',
};

const STATE_TONE: Record<Status['state'], string> = {
  idle:       'bg-coffee-100 text-coffee-700',
  connecting: 'bg-amber-100 text-amber-800',
  qr:         'bg-amber-100 text-amber-800',
  open:       'bg-emerald-100 text-emerald-800',
  close:      'bg-rose-100 text-rose-800',
};

export function BaileysPair({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [pairing, setPairing] = useState(false);
  const pollRef = useRef<any>(null);

  async function fetchStatus(): Promise<Status | null> {
    try {
      const r = await fetch(`/api/dashboard/wa/baileys/status?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
      const data = await r.json();
      setStatus(data);
      return data as Status;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    fetchStatus();
  }, [sessionId]);

  // Poll while modal is open. Once connected, stop.
  useEffect(() => {
    if (!open) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      const s = await fetchStatus();
      if (s?.state === 'open') {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    }, 1500);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [open]);

  async function startPair(force = false) {
    setPairing(true);
    setOpen(true);
    try {
      const r = await fetch('/api/dashboard/wa/baileys/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, force }),
      });
      const data = await r.json();
      setStatus(data);
      if (!r.ok) toast.error('Could not start pairing', data.error ?? '');
    } catch (e: any) {
      toast.error('Pair error', e?.message);
    } finally {
      setPairing(false);
    }
  }

  async function logout() {
    if (!confirm('Disconnect the paired phone?')) return;
    const r = await fetch('/api/dashboard/wa/baileys/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (r.ok) {
      toast.success('Disconnected');
      fetchStatus();
    }
  }

  const isOpen = status?.state === 'open';
  const card =
    isOpen ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
    status?.state === 'qr' || status?.state === 'connecting' ? 'bg-amber-50 border-amber-200 text-amber-900' :
    'bg-coffee-50 border-coffee-200 text-coffee-800';

  return (
    <div className={`rounded-2xl border p-4 ${card}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 grid place-items-center rounded-xl bg-white/70 shrink-0">
            {isOpen ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold flex items-center gap-2">
              {isOpen ? 'Paired' : status?.state === 'qr' || status?.state === 'connecting' ? 'Pairing…' : 'Not paired'}
              {status && (
                <span className={`pill text-[10px] ${STATE_TONE[status.state]}`}>
                  {STATE_LABEL[status.state]}
                </span>
              )}
            </div>
            <div className="text-xs opacity-90 truncate">
              {isOpen && status?.phone ? `+${status.phone}` :
               status?.error ? status.error :
               'Scan a QR with the cafe phone to start sending WhatsApp from your bot number.'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <Button onClick={() => startPair(false)} disabled={pairing} size="sm">
              {pairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              Pair device
            </Button>
          )}
          {isOpen && (
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4" /> Disconnect
            </Button>
          )}
        </div>
      </div>

      {open && (
        <PairModal
          status={status}
          onClose={() => setOpen(false)}
          onRetry={() => startPair(false)}
          onForceRestart={() => startPair(true)}
        />
      )}
    </div>
  );
}

function PairModal({
  status, onClose, onRetry, onForceRestart,
}: {
  status: Status | null;
  onClose: () => void;
  onRetry: () => void;
  onForceRestart: () => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const ageSec = status?.ageMs ? Math.floor(status.ageMs / 1000) : 0;
  const stuck = (status?.state === 'connecting') && ageSec > 15;
  const isOpen = status?.state === 'open';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-cream-50 rounded-3xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full hover:bg-cream-200">
          <X className="h-4 w-4" />
        </button>
        <h3 className="font-display text-xl font-bold text-coffee-900 flex items-center gap-2">
          <Smartphone className="h-5 w-5" /> Pair WhatsApp
        </h3>
        {status && (
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className={`pill text-[10px] ${STATE_TONE[status.state]}`}>{STATE_LABEL[status.state]}</span>
            {status.ageMs !== undefined && <span className="text-[10px] text-coffee-500">{ageSec}s elapsed</span>}
          </div>
        )}

        {isOpen ? (
          <div className="text-center py-8">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center mx-auto">
              <Wifi className="h-7 w-7" />
            </div>
            <div className="mt-3 font-semibold text-coffee-900">Connected!</div>
            <div className="text-sm text-coffee-600 mt-1">Sending as +{status?.phone}</div>
            <Button onClick={onClose} className="mt-5">Done</Button>
          </div>
        ) : status?.qrDataUrl ? (
          <>
            <ol className="text-xs text-coffee-700 mt-3 space-y-1.5 list-decimal pl-4">
              <li>Open WhatsApp on the cafe's phone.</li>
              <li>Tap <b>⋮ &nbsp;&rarr;&nbsp; Linked devices</b> &nbsp;(iOS: Settings &rarr; Linked devices).</li>
              <li>Tap <b>Link a device</b> and scan the code below.</li>
            </ol>
            <div className="my-4 grid place-items-center">
              <div className="p-3 bg-white rounded-2xl border-2 border-coffee-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={status.qrDataUrl} alt="WhatsApp pairing QR" className="block w-[260px] h-[260px]" />
              </div>
            </div>
            <p className="text-[11px] text-coffee-500 text-center">QR refreshes automatically. Keep this window open until paired.</p>
            <div className="mt-3 flex justify-center">
              <Button variant="outline" size="sm" onClick={onForceRestart}>
                <RefreshCw className="h-4 w-4" /> Restart pairing
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-coffee-700" />
            <div className="mt-3 text-sm text-coffee-700 font-medium">
              {stuck ? 'Still trying…' : 'Starting session…'}
            </div>
            {status?.error && (
              <div className="mt-2 inline-flex items-start gap-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 max-w-full">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="break-words text-left">{status.error}</span>
              </div>
            )}
            {stuck && (
              <p className="mt-3 text-[11px] text-coffee-600 max-w-xs mx-auto">
                Stuck on connecting? The container's outbound websocket to WhatsApp may be blocked, or a stale session is wedging the connect. Try a force restart.
              </p>
            )}
            <div className="mt-3 flex justify-center gap-2">
              <Button onClick={onRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
              <Button onClick={onForceRestart} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" /> Force restart
              </Button>
            </div>
          </div>
        )}
        {/* keep linter happy with unused tick */}
        <span className="hidden">{tick}</span>
      </div>
    </div>
  );
}
