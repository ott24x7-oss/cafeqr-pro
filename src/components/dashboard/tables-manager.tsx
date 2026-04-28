'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Plus, Download, Printer, Trash2, Loader2, Coffee, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

export function TablesManager({ initialTables, cafe, appUrl }: { initialTables: any[]; cafe: any; appUrl: string }) {
  const [tables, setTables] = useState(initialTables);
  const [number, setNumber] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [bulkQty, setBulkQty] = useState(5);
  const [adding, setAdding] = useState(false);
  const [showQr, setShowQr] = useState<any | null>(null);

  function tableUrl(t: any) {
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/cafe/${cafe.slug}/table/${t.code}`;
  }

  async function add() {
    if (!number) return toast.error('Enter a table number');
    setAdding(true);
    const r = await fetch('/api/dashboard/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, capacity }),
    });
    setAdding(false);
    if (r.ok) {
      const data = await r.json();
      setTables((cur) => [...cur, data.table]);
      setNumber('');
      toast.success('Table added');
    } else {
      const d = await r.json();
      toast.error(d.error ?? 'Failed');
    }
  }

  async function bulkAdd() {
    setAdding(true);
    const r = await fetch('/api/dashboard/tables/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: bulkQty }),
    });
    setAdding(false);
    if (r.ok) {
      const data = await r.json();
      setTables((cur) => [...cur, ...data.tables]);
      toast.success(`${data.tables.length} tables added`);
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this table? Linked orders are kept.')) return;
    const r = await fetch(`/api/dashboard/tables/${id}`, { method: 'DELETE' });
    if (r.ok) setTables((c) => c.filter((t) => t.id !== id));
  }

  function downloadQr(t: any) {
    const canvas = document.querySelector(`canvas[data-tcode="${t.code}"]`) as HTMLCanvasElement | null;
    if (!canvas) return toast.error('QR not ready');
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cafe.slug}-table-${t.number}.png`;
    a.click();
  }

  function printAll() {
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `<!doctype html><html><head><title>QR Codes — ${cafe.name}</title>
    <style>
      body{font-family:Inter,Arial,sans-serif;padding:0;background:#FFFBF5;color:#3E2D24}
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:12px;}
      .card{border:2px dashed #6B4E3D;border-radius:14px;padding:16px;text-align:center;page-break-inside:avoid;background:white}
      h2{font-family:'Playfair Display',serif;color:#6B4E3D;margin:0 0 4px}
      .num{font-size:32px;font-weight:800;color:#6B4E3D;margin:8px 0}
      .help{font-size:12px;color:#85604A;margin-top:8px}
      img{display:block;margin:8px auto}
      @media print{ .card{break-inside:avoid;-webkit-print-color-adjust:exact} }
    </style></head><body><div class="grid">
    ${tables.map((t) => {
      const c = document.querySelector(`canvas[data-tcode="${t.code}"]`) as HTMLCanvasElement | null;
      const dataUrl = c ? c.toDataURL('image/png') : '';
      return `<div class="card">
        <h2>${cafe.name}</h2>
        <div class="num">Table ${t.number}</div>
        <img src="${dataUrl}" width="200" height="200" />
        <div class="help">Scan to view menu &amp; order</div>
        <div class="help" style="font-size:10px;opacity:.6">${tableUrl(t)}</div>
      </div>`;
    }).join('')}
    </div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
    w.document.write(html);
    w.document.close();
  }

  return (
    <div className="space-y-4">
      {tables.length === 0 && (
        <div className="rounded-2xl bg-cream-100 border border-coffee-100 p-4 text-sm leading-relaxed">
          <div className="font-semibold text-coffee-900">How tables &amp; QR codes work</div>
          <div className="text-coffee-700 mt-1">
            Each table you add gets its own QR code. Print it, place it on the table — when a
            customer scans it, the menu opens already tagged with that table number.
          </div>
          <div className="text-coffee-600 mt-1">
            हर table के लिए एक QR code बनेगा। उसे print करके table पर रखें — ग्राहक scan करेगा तो
            menu उसी table number के साथ खुलेगा।
          </div>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Tables &amp; QR codes</h1>
          <p className="text-coffee-600 text-sm">
            Generate, print and manage table QR codes
            <span className="text-coffee-500"> · टेबल के QR codes बनाएं और प्रिंट करें</span>
          </p>
        </div>
        <Button onClick={printAll} variant="outline" disabled={!tables.length}>
          <Printer className="h-4 w-4" /> Print all
        </Button>
      </div>

      <div className="card-warm">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="font-semibold text-coffee-900 mb-2 text-sm">Add a single table</div>
            <div className="flex gap-2">
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. 7 or T7" />
              <Input type="number" value={capacity} min={1} max={50} onChange={(e) => setCapacity(Number(e.target.value))} className="w-24" />
              <Button onClick={add} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
              </Button>
            </div>
            <p className="helper">Capacity helps you balance staff and seating.</p>
          </div>
          <div>
            <div className="font-semibold text-coffee-900 mb-2 text-sm">Bulk add</div>
            <div className="flex gap-2">
              <Input type="number" value={bulkQty} onChange={(e) => setBulkQty(Number(e.target.value))} className="w-24" min={1} max={100} />
              <Button variant="outline" onClick={bulkAdd} disabled={adding}>
                {adding && <Loader2 className="h-4 w-4 animate-spin" />} Generate {bulkQty} tables
              </Button>
            </div>
            <p className="helper">Auto-numbers as T-1, T-2, …</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {tables.length === 0 ? (
          <div className="card-warm col-span-full text-center text-coffee-500 py-10">
            <Coffee className="mx-auto h-10 w-10 mb-2 text-coffee-300" />
            No tables yet. Add your first one above.
          </div>
        ) : tables.map((t) => (
          <div key={t.id} className="card-warm text-center">
            <div className="font-display text-xl font-bold text-coffee-900">Table {t.number}</div>
            <div className="text-xs text-coffee-500">Capacity {t.capacity} {t.isOccupied && <span className="pill-amber ml-1">Occupied</span>}</div>
            <div className="my-3 flex justify-center">
              <div className="p-2 bg-white rounded-xl border border-coffee-200">
                {/* @ts-ignore data-tcode used to find canvas for download/print */}
                <QRCodeCanvas value={tableUrl(t)} size={140} fgColor="#3E2D24" level="M" data-tcode={t.code} />
              </div>
            </div>
            <div className="text-[10px] text-coffee-500 truncate">{t.code}</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setShowQr(t)}>View</Button>
              <Button size="sm" variant="outline" onClick={() => downloadQr(t)}><Download className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-3 w-3 text-rose-500" /></Button>
            </div>
          </div>
        ))}
      </div>

      {showQr && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setShowQr(null)}>
          <div className="bg-cream-50 rounded-3xl p-8 max-w-sm w-full text-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowQr(null)} className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full hover:bg-cream-200">
              <X className="h-4 w-4" />
            </button>
            <h2 className="font-display text-2xl font-bold text-coffee-900">{cafe.name}</h2>
            <div className="text-coffee-700 mt-1">Table {showQr.number}</div>
            <div className="my-5 inline-block p-3 bg-white rounded-2xl border-2 border-coffee-700">
              <QRCodeCanvas value={tableUrl(showQr)} size={240} fgColor="#3E2D24" />
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-coffee-600 break-all">
              <span className="truncate max-w-[200px]">{tableUrl(showQr)}</span>
              <button onClick={() => { navigator.clipboard.writeText(tableUrl(showQr)); toast.success('Link copied'); }}>
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <Button className="mt-4 w-full" onClick={() => downloadQr(showQr)}>
              <Download className="h-4 w-4" /> Download PNG
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
