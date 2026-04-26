'use client';

import { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, ExternalLink, QrCode, Share2, Download, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';

interface Props {
  slug: string;
  cafeName: string;
  appUrl?: string;
  /** When verified, the URL points at https://<customDomain>/ instead of /cafe/<slug>. */
  customDomain?: string | null;
  customDomainStatus?: string | null;
  /** When true (default) renders a full panel; pass false for the compact card. */
  full?: boolean;
}

export function CafeStoreLink({ slug, cafeName, appUrl, customDomain, customDomainStatus, full = true }: Props) {
  const [origin, setOrigin] = useState(appUrl ?? '');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!origin && typeof window !== 'undefined') setOrigin(window.location.origin);
  }, [origin]);

  const usingCustom = !!customDomain && customDomainStatus === 'verified';
  const url = useMemo(
    () => usingCustom ? `https://${customDomain}` : `${origin || ''}/cafe/${slug}`,
    [origin, slug, usingCustom, customDomain],
  );
  const waMessage = encodeURIComponent(`Hi! Check out our menu and order online at ${cafeName}: ${url}`);
  const waShareLink = `https://wa.me/?text=${waMessage}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: cafeName, text: `${cafeName} — order online`, url });
      } catch {}
    } else {
      copy();
    }
  }

  function downloadQr() {
    const canvas = document.querySelector('canvas[data-store-qr="1"]') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${slug}-store-qr.png`;
    a.click();
  }

  if (!full) {
    // Compact banner — used on Overview.
    return (
      <div className="card-warm flex items-center gap-3 flex-wrap !p-3">
        <div className="h-10 w-10 grid place-items-center rounded-xl bg-coffee-gradient text-cream-50 shrink-0">
          <Globe className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-coffee-500">Your cafe store link</div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-coffee-900 hover:underline truncate block"
          >
            {url}
          </a>
        </div>
        <Button size="sm" onClick={copy} variant="outline">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span className="hidden sm:inline">Copy</span>
        </Button>
        <Button size="sm" onClick={() => setShowQr(true)} variant="outline">
          <QrCode className="h-3 w-3" />
          <span className="hidden sm:inline">QR</span>
        </Button>
        {showQr && <QrModal url={url} cafeName={cafeName} onClose={() => setShowQr(false)} onDownload={downloadQr} />}
      </div>
    );
  }

  return (
    <div className="card-warm bg-gradient-to-br from-cream-50 via-white to-amber-50 border-coffee-200">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-coffee-700" />
            <h3 className="font-display text-lg font-bold text-coffee-900">Your cafe store link</h3>
          </div>
          <p className="text-sm text-coffee-600">
            Share this with customers — they'll land on a lobby page and pick a table to start ordering.
          </p>
          <div className="mt-3 flex items-center gap-2 bg-white rounded-xl border border-coffee-200 px-3 py-2">
            <Globe className="h-4 w-4 text-coffee-400 shrink-0" />
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-coffee-900 truncate flex-1 hover:underline"
            >
              {url}
            </a>
            <ExternalLink className="h-3 w-3 text-coffee-400 shrink-0" />
          </div>
        </div>
        <div className="hidden sm:block">
          <button
            onClick={() => setShowQr(true)}
            className="p-2 bg-white rounded-2xl border-2 border-coffee-700 hover:shadow-coffee transition"
            title="Show QR"
          >
            <QRCodeCanvas value={url} size={88} fgColor="#3E2D24" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button onClick={copy} variant="outline" size="sm">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy link
        </Button>
        <a href={waShareLink} target="_blank" rel="noreferrer">
          <Button variant="wa" size="sm" className="w-full">
            <Share2 className="h-4 w-4" /> WhatsApp
          </Button>
        </a>
        <Button onClick={nativeShare} variant="outline" size="sm">
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button onClick={() => setShowQr(true)} variant="outline" size="sm">
          <QrCode className="h-4 w-4" /> QR code
        </Button>
      </div>

      {showQr && <QrModal url={url} cafeName={cafeName} onClose={() => setShowQr(false)} onDownload={downloadQr} />}
    </div>
  );
}

function QrModal({
  url, cafeName, onClose, onDownload,
}: { url: string; cafeName: string; onClose: () => void; onDownload: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-cream-50 rounded-3xl p-6 max-w-sm w-full text-center relative" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl font-bold text-coffee-900">{cafeName}</h2>
        <div className="text-xs text-coffee-600 mt-1">Scan to open the store</div>
        <div className="my-5 inline-block p-3 bg-white rounded-2xl border-2 border-coffee-700">
          <QRCodeCanvas value={url} size={240} fgColor="#3E2D24" data-store-qr="1" />
        </div>
        <div className="text-[11px] text-coffee-500 break-all px-2">{url}</div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
