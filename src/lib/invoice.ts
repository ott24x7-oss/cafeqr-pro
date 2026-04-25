/**
 * Lightweight invoice / bill HTML generator.
 * Used by /order/[id]/bill print view, and email receipt.
 * PDF is produced client-side via html2canvas + jsPDF (see Bill component).
 */

export interface BillData {
  orderNumber: string;
  cafeName: string;
  cafeAddress?: string;
  cafePhone?: string;
  cafeGst?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: Date | string;
  items: { name: string; variantName?: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  packingAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string;
}

export function billHtml(b: BillData) {
  const itemRows = b.items
    .map(
      (i) => `<tr>
      <td style="padding:6px 0">${i.name}${i.variantName ? ` <small>(${i.variantName})</small>` : ''}</td>
      <td align="center">${i.quantity}</td>
      <td align="right">₹${i.unitPrice.toFixed(0)}</td>
      <td align="right">₹${i.totalPrice.toFixed(0)}</td>
    </tr>`
    )
    .join('');
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Bill ${b.orderNumber}</title>
<style>
body{font-family:'Inter',Arial,sans-serif;color:#3E2D24;background:#FFFBF5;padding:24px;}
.box{max-width:420px;margin:auto;background:#fff;border:1px solid #E8D5BE;border-radius:14px;padding:24px;box-shadow:0 2px 14px rgba(85,60,40,0.06);}
h1{margin:0;color:#6B4E3D;font-size:20px;}
.muted{color:#85604A;font-size:12px;}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;}
thead th{text-align:left;border-bottom:1px solid #E8D5BE;padding-bottom:6px;color:#85604A;font-weight:600;}
tfoot td{padding-top:6px;}
.tot{font-size:18px;color:#3E2D24;font-weight:700;}
.barcode{text-align:center;margin-top:14px;font-family:monospace;letter-spacing:2px;color:#6B4E3D;}
</style></head>
<body><div class="box">
  <h1>${b.cafeName}</h1>
  <div class="muted">${b.cafeAddress ?? ''}</div>
  <div class="muted">${b.cafePhone ? '📞 ' + b.cafePhone : ''} ${b.cafeGst ? ' | GST: ' + b.cafeGst : ''}</div>
  <hr style="border:none;border-top:1px dashed #E8D5BE;margin:14px 0">
  <div style="display:flex;justify-content:space-between;font-size:13px">
    <div><b>#${b.orderNumber}</b></div>
    <div>${new Date(b.createdAt).toLocaleString('en-IN')}</div>
  </div>
  <div class="muted">${b.tableNumber ? `Table ${b.tableNumber}` : ''} ${b.customerName ? ' — ' + b.customerName : ''}</div>
  <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
  <tbody>${itemRows}</tbody></table>
  <table>
    <tr><td>Subtotal</td><td align="right">₹${b.subtotal.toFixed(0)}</td></tr>
    ${b.discountAmount ? `<tr><td>Discount</td><td align="right">-₹${b.discountAmount.toFixed(0)}</td></tr>` : ''}
    ${b.taxAmount ? `<tr><td>Tax / GST</td><td align="right">₹${b.taxAmount.toFixed(0)}</td></tr>` : ''}
    ${b.serviceAmount ? `<tr><td>Service Charge</td><td align="right">₹${b.serviceAmount.toFixed(0)}</td></tr>` : ''}
    ${b.packingAmount ? `<tr><td>Packing</td><td align="right">₹${b.packingAmount.toFixed(0)}</td></tr>` : ''}
    ${b.deliveryAmount ? `<tr><td>Delivery</td><td align="right">₹${b.deliveryAmount.toFixed(0)}</td></tr>` : ''}
    <tr class="tot"><td>Total</td><td align="right">₹${b.totalAmount.toFixed(0)}</td></tr>
  </table>
  <div class="muted" style="text-align:center;margin-top:8px">Payment: <b>${b.paymentStatus}</b></div>
  <div class="barcode">* * * Thank you * * *</div>
</div></body></html>`;
}
