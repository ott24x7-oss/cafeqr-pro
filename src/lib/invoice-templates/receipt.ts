/**
 * Receipt: thermal-printer style. Narrow 80mm-wide page (≈226 pts), monospace
 * font for column alignment, fits 58mm/80mm POS printers — but also looks
 * great as a phone screenshot.
 */
import PDFDocument from 'pdfkit';
import type { InvoiceData } from './types';
import { bufferFromDoc, fmtINR, formatDate, pdfDocOpts } from './shared';

export function renderReceipt(data: InvoiceData): Promise<Buffer> {
  // 80mm = 226.77pt; pdfkit uses pts.
  const W = 226;
  // Estimate page height: header + N items + totals + footer.
  const itemsCount = data.items.length;
  const H = 250 + itemsCount * 18 + 90;

  const doc = new PDFDocument({
    size: [W, H],
    margins: { top: 14, bottom: 14, left: 12, right: 12 },
    ...pdfDocOpts(data),
  });

  const C = W - 24; // content width
  const center = (s: string, opts?: any) =>
    doc.text(s, 12, doc.y, { width: C, align: 'center', ...(opts ?? {}) });

  doc.fillColor('#000').font('Helvetica-Bold').fontSize(13);
  center(data.cafeName.toUpperCase(), { characterSpacing: 1 });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(8);
  if (data.cafeAddress) center(data.cafeAddress);
  if (data.cafePhone)   center(`Ph: ${data.cafePhone}`);
  if (data.cafeGst)     center(`GST: ${data.cafeGst}`);

  doc.moveDown(0.5);
  // dashed rule
  for (let x = 12; x < W - 12; x += 4) {
    doc.rect(x, doc.y, 2, 0.6).fill('#000');
  }
  doc.moveDown(0.4);

  doc.font('Helvetica').fontSize(8).fillColor('#000');
  doc.text(`#${data.orderNumber}`, 12, doc.y, { width: C / 2, align: 'left' });
  doc.text(formatDate(data.createdAt), 12 + C / 2, doc.y - 10, { width: C / 2, align: 'right' });
  if (data.tableNumber) center(`Table ${data.tableNumber}`);
  if (data.customerName) center(data.customerName);

  doc.moveDown(0.4);
  for (let x = 12; x < W - 12; x += 4) doc.rect(x, doc.y, 2, 0.6).fill('#000');
  doc.moveDown(0.4);

  // Item rows in monospace style — sized so qty/total line up.
  doc.font('Courier').fontSize(8);
  for (const it of data.items) {
    const name = (it.variantName ? `${it.name} (${it.variantName})` : it.name).slice(0, 22);
    const qty = String(it.quantity).padStart(2, ' ');
    const amt = fmtINR(it.totalPrice).padStart(10, ' ');
    doc.text(`${name.padEnd(22, ' ')} ${qty}  ${amt}`, 12, doc.y, { width: C });
  }

  doc.moveDown(0.3);
  for (let x = 12; x < W - 12; x += 4) doc.rect(x, doc.y, 2, 0.6).fill('#000');
  doc.moveDown(0.3);

  const totRow = (label: string, v: number, bold = false) => {
    doc.font(bold ? 'Courier-Bold' : 'Courier').fontSize(bold ? 10 : 8);
    const left = label.padEnd(22, ' ');
    const right = fmtINR(v).padStart(13, ' ');
    doc.text(`${left}${right}`, 12, doc.y, { width: C });
  };
  totRow('Subtotal', data.subtotal);
  if (data.taxAmount) totRow('Tax', data.taxAmount);
  if (data.serviceAmount) totRow('Service', data.serviceAmount);
  if (data.discountAmount) totRow('Discount', -data.discountAmount);
  doc.moveDown(0.2);
  totRow('TOTAL', data.totalAmount, true);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(10);
  if (data.paymentStatus === 'PAID') {
    center('* * *  PAID  * * *');
    if (data.transactionId) {
      doc.font('Helvetica').fontSize(8);
      center(`UTR: ${data.transactionId}`);
    }
  } else {
    center(`STATUS: ${data.paymentStatus}`);
  }

  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(7).fillColor('#444');
  center('Thank you. Come again!');
  center('cafeqr.pro');

  doc.end();
  return bufferFromDoc(doc);
}
