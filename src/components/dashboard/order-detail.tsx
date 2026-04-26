'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, MessageSquare, FileDown, CheckCircle2, Receipt as ReceiptIcon, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/utils';
import {
  generateCustomerStatusMessage,
  generatePaymentMessage,
  waLink,
} from '@/lib/whatsapp';
import { billHtml } from '@/lib/invoice';
import { toast } from '@/components/ui/toaster';

export function OrderDetailClient({ order, cafe }: { order: any; cafe: any }) {
  const [busy, setBusy] = useState(false);
  const [reviewSending, setReviewSending] = useState(false);

  function printBill() {
    const html = billHtml({
      orderNumber: order.orderNumber,
      cafeName: cafe.name,
      cafeAddress: cafe.address ?? undefined,
      cafePhone: cafe.phone ?? undefined,
      cafeGst: cafe.gstNumber ?? undefined,
      tableNumber: order.table?.number,
      customerName: order.customerName ?? undefined,
      customerPhone: order.customerPhone ?? undefined,
      createdAt: order.createdAt,
      items: order.items,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      serviceAmount: order.serviceAmount,
      packingAmount: order.packingAmount,
      deliveryAmount: order.deliveryAmount,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
    });
    const w = window.open('', '_blank', 'width=480,height=800');
    if (!w) return toast.error('Popup blocked');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    const div = document.createElement('div');
    div.innerHTML = billHtml({
      orderNumber: order.orderNumber,
      cafeName: cafe.name,
      cafeAddress: cafe.address ?? undefined,
      cafePhone: cafe.phone ?? undefined,
      cafeGst: cafe.gstNumber ?? undefined,
      tableNumber: order.table?.number,
      customerName: order.customerName ?? undefined,
      customerPhone: order.customerPhone ?? undefined,
      createdAt: order.createdAt,
      items: order.items,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      serviceAmount: order.serviceAmount,
      packingAmount: order.packingAmount,
      deliveryAmount: order.deliveryAmount,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
    });
    div.style.position = 'fixed';
    div.style.left = '-99999px';
    div.style.top = '0';
    document.body.appendChild(div);
    const canvas = await html2canvas(div, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a5');
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, w, h);
    pdf.save(`bill-${order.orderNumber}.pdf`);
    document.body.removeChild(div);
  }

  async function markPaid() {
    setBusy(true);
    const r = await fetch(`/api/dashboard/orders/${order.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAID' }),
    });
    setBusy(false);
    if (r.ok) {
      toast.success('Marked as paid');
      window.location.reload();
    } else toast.error('Failed');
  }

  async function sendFeedbackLink() {
    setReviewSending(true);
    const r = await fetch(`/api/dashboard/orders/${order.id}/send-review`, { method: 'POST' });
    const data = await r.json().catch(() => ({} as any));
    setReviewSending(false);
    if (r.ok && data.ok) {
      toast.success('Feedback link sent', `via ${data.provider}`);
    } else {
      toast.error('Could not send feedback', data.error ?? '');
    }
  }

  // Manual wa.me fallbacks — only used when the cafe hasn't paired the bot
  // (provider = manual). Once Cloud API or Baileys is wired up, the
  // automatic flow handles status updates and the dashboard buttons that
  // matter most are 'Mark as paid' and 'Send feedback'.
  const customerWa = order.customerPhone
    ? waLink(order.customerPhone, generateCustomerStatusMessage(order, cafe, order.status, window.location.origin))
    : '';
  const payWa = order.customerPhone
    ? waLink(order.customerPhone, generatePaymentMessage(order, cafe, window.location.origin))
    : '';

  const reviewBtnVisible =
    !!order.customerPhone &&
    !!cafe.settings?.googleReviewUrl?.trim() &&
    cafe.settings?.reviewEnabled !== false &&
    (order.status === 'COMPLETED' || order.status === 'SERVED' || order.paymentStatus === 'PAID');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/dashboard/orders" className="text-coffee-600 hover:text-coffee-900 inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={printBill}><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="outline" onClick={downloadPdf}><FileDown className="h-4 w-4" /> PDF</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-warm lg:col-span-2 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs text-coffee-500">Order</div>
              <h1 className="font-display text-2xl font-bold text-coffee-900">#{order.orderNumber}</h1>
              <div className="text-sm text-coffee-600 mt-1">{formatDate(order.createdAt)}</div>
            </div>
            <span className={`pill ${ORDER_STATUS_COLORS[order.status]} text-sm`}>{ORDER_STATUS_LABELS[order.status]}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field l="Type" v={order.type.replace('_', ' ')} />
            <Field l="Table" v={order.table ? `Table ${order.table.number}` : '—'} />
            <Field l="Customer" v={order.customerName ?? 'Walk-in'} />
            <Field l="Phone" v={order.customerPhone ?? '—'} />
            <Field l="Payment" v={order.paymentStatus} />
            <Field l="Items" v={order.items.length} />
          </div>

          {order.customerNote && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              📝 <b>Customer note:</b> {order.customerNote}
            </div>
          )}

          <div>
            <div className="font-semibold text-coffee-900 mb-2">Items</div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-coffee-500 border-b border-coffee-100"><th className="py-2">Item</th><th>Qty</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {order.items.map((i: any) => (
                  <tr key={i.id} className="border-b border-coffee-50 last:border-0">
                    <td className="py-2">
                      <div className="font-medium text-coffee-900">{i.name}{i.variantName ? ` (${i.variantName})` : ''}</div>
                      {i.note && <div className="text-xs text-coffee-600 italic">{i.note}</div>}
                    </td>
                    <td>{i.quantity}</td>
                    <td className="text-right font-semibold">{formatCurrency(i.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 space-y-1 text-sm">
              <Row l="Subtotal" v={formatCurrency(order.subtotal)} />
              {order.taxAmount > 0 && <Row l="Tax" v={formatCurrency(order.taxAmount)} />}
              {order.serviceAmount > 0 && <Row l="Service" v={formatCurrency(order.serviceAmount)} />}
              {order.discountAmount > 0 && <Row l="Discount" v={`-${formatCurrency(order.discountAmount)}`} />}
              <div className="border-t border-coffee-100 pt-2 mt-2 flex justify-between font-bold text-coffee-900 text-base">
                <span>Total</span><span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card-warm">
            <h3 className="font-bold text-coffee-900 mb-2">Quick actions</h3>
            <div className="space-y-2">
              {order.paymentStatus !== 'PAID' && (
                <Button variant="accent" className="w-full" onClick={markPaid} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" /> Mark as paid
                </Button>
              )}
              {customerWa && (
                <a href={customerWa} target="_blank" rel="noreferrer">
                  <Button variant="wa" className="w-full"><MessageSquare className="h-4 w-4" /> Status WhatsApp</Button>
                </a>
              )}
              {payWa && order.paymentStatus !== 'PAID' && (
                <a href={payWa} target="_blank" rel="noreferrer">
                  <Button variant="wa" className="w-full"><MessageSquare className="h-4 w-4" /> Send payment link</Button>
                </a>
              )}
              {reviewBtnVisible && (
                <Button
                  variant="wa"
                  className="w-full"
                  onClick={sendFeedbackLink}
                  disabled={reviewSending}
                  title="Send the customer the cafe's Google review link via the bot"
                >
                  {reviewSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                  Send feedback link
                </Button>
              )}
              <Link href={`/order/${order.id}`} target="_blank">
                <Button variant="outline" className="w-full"><ReceiptIcon className="h-4 w-4" /> Customer view</Button>
              </Link>
            </div>
          </div>

          {order.statusHistory && (
            <div className="card-warm">
              <h3 className="font-bold text-coffee-900 mb-2">Status history</h3>
              <ul className="text-xs space-y-1.5 text-coffee-700">
                {(order.statusHistory as any[]).map((s, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{ORDER_STATUS_LABELS[s.status] ?? s.status}</span>
                    <span className="text-coffee-500">{formatDate(s.at, { timeStyle: 'short', dateStyle: undefined })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ l, v }: { l: string; v: any }) {
  return (
    <div>
      <div className="text-xs text-coffee-500">{l}</div>
      <div className="font-semibold text-coffee-900">{v}</div>
    </div>
  );
}
function Row({ l, v }: any) {
  return <div className="flex justify-between"><span className="text-coffee-600">{l}</span><span className="text-coffee-900">{v}</span></div>;
}
