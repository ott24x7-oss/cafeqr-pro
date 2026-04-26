/**
 * Bold: massive coloured header block, large type. Designed to feel
 * confident and modern — fits energetic brands.
 */
import PDFDocument from 'pdfkit';
import type { InvoiceData } from './types';
import { bufferFromDoc, fmtINR, formatDate, pdfDocOpts } from './shared';

const ACCENT = '#0F172A';   // near-black charcoal
const HOT    = '#F59E0B';   // amber accent
const INK    = '#0F172A';
const MUTED  = '#475569';

export function renderBold(data: InvoiceData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A5', margin: 0, ...pdfDocOpts(data) });
  const W = doc.page.width;
  const M = 36;

  // Big charcoal block.
  doc.rect(0, 0, W, 150).fill(ACCENT);
  // Hot accent stripe.
  doc.rect(0, 150, W, 6).fill(HOT);

  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(28).text(data.cafeName, M, 36, { width: W - M * 2 });
  doc.font('Helvetica').fontSize(9).fillColor('#CBD5E1')
    .text([data.cafeAddress, data.cafePhone, data.cafeGst].filter(Boolean).join('  ·  '), M, 76, { width: W - M * 2 });

  // Big "RECEIPT" + #order on right of header.
  doc.font('Helvetica-Bold').fontSize(12).fillColor(HOT)
    .text('RECEIPT', M, 108, { characterSpacing: 2 });
  doc.font('Helvetica').fontSize(11).fillColor('#fff')
    .text(`#${data.orderNumber}  ·  ${formatDate(data.createdAt)}`, M, 124);

  // Body.
  let y = 178;
  if (data.tableNumber || data.customerName) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('Customer', M, y);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(
      [data.tableNumber ? `Table ${data.tableNumber}` : null, data.customerName, data.customerPhone].filter(Boolean).join(' · '),
      M, y + 13, { width: W - M * 2 });
    y += 42;
  }

  // Items.
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(9)
    .text('ITEM',   M, y)
    .text('QTY',    W - 200, y, { width: 40, align: 'center' })
    .text('AMOUNT', W - M - 80, y, { width: 80, align: 'right' });
  doc.moveTo(M, y + 14).lineTo(W - M, y + 14).strokeColor(HOT).lineWidth(2).stroke();
  y += 22;

  doc.font('Helvetica').fontSize(10).fillColor(INK);
  for (const it of data.items) {
    const name = it.variantName ? `${it.name} (${it.variantName})` : it.name;
    doc.font('Helvetica-Bold').text(name, M, y, { width: W - 280, continued: false });
    doc.font('Helvetica').text(String(it.quantity), W - 200, y, { width: 40, align: 'center' });
    doc.text(fmtINR(it.totalPrice), W - M - 80, y, { width: 80, align: 'right' });
    y += 18;
  }

  y += 10;
  doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
  y += 12;

  const tot = (label: string, v: number, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 14 : 10);
    doc.fillColor(bold ? INK : MUTED).text(label, M, y, { width: W - M - 110 });
    doc.fillColor(bold ? INK : INK).text(fmtINR(v), W - M - 110, y, { width: 110, align: 'right' });
    y += bold ? 24 : 16;
  };
  tot('Subtotal', data.subtotal);
  if (data.taxAmount) tot('Tax', data.taxAmount);
  if (data.serviceAmount) tot('Service', data.serviceAmount);
  if (data.discountAmount) tot('Discount', -data.discountAmount);
  tot('TOTAL', data.totalAmount, true);

  if (data.paymentStatus === 'PAID') {
    y += 6;
    doc.rect(M, y, W - M * 2, 36).fill(HOT);
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(14)
      .text('PAID', M, y + 11, { width: W - M * 2, align: 'center', characterSpacing: 3 });
    if (data.transactionId) {
      y += 42;
      doc.fillColor(MUTED).font('Helvetica').fontSize(9)
        .text(`UTR: ${data.transactionId}`, M, y, { width: W - M * 2, align: 'center' });
    }
  }

  // Footer.
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
    .text('Thank you · cafeqr.pro', M, doc.page.height - 32, { width: W - M * 2, align: 'center' });

  doc.end();
  return bufferFromDoc(doc);
}
