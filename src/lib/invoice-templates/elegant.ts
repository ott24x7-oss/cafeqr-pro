/**
 * Elegant: italic accents, Times-style serif, hairline rules. Refined,
 * understated — fits boutique cafes and patisseries.
 */
import PDFDocument from 'pdfkit';
import type { InvoiceData } from './types';
import { bufferFromDoc, fmtINR, formatDate, pdfDocOpts } from './shared';

const INK    = '#1A1A1A';
const MUTED  = '#7A6E63';
const ACCENT = '#8B6F47'; // muted brown

export function renderElegant(data: InvoiceData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A5', margin: 48, ...pdfDocOpts(data) });
  const W = doc.page.width;
  const M = 48;

  // Cafe name in serif italic.
  doc.fillColor(ACCENT).font('Times-Italic').fontSize(28).text(data.cafeName, M, 50);
  doc.fillColor(MUTED).font('Times-Roman').fontSize(9)
    .text([data.cafeAddress, data.cafePhone].filter(Boolean).join('  ·  '), M, 86, { width: W - M * 2 });

  // Hairline.
  doc.moveTo(M, 110).lineTo(W - M, 110).strokeColor(ACCENT).lineWidth(0.4).stroke();

  doc.fillColor(MUTED).font('Times-Italic').fontSize(10).text('Receipt', M, 122);
  doc.fillColor(INK).font('Times-Roman').fontSize(11).text(`#${data.orderNumber}`, M, 138);
  doc.fillColor(MUTED).fontSize(9).text(formatDate(data.createdAt), M, 154);

  if (data.tableNumber || data.customerName) {
    doc.fillColor(MUTED).font('Times-Italic').fontSize(10).text('Guest', W - M - 160, 122, { width: 160, align: 'right' });
    doc.fillColor(INK).font('Times-Roman').fontSize(11)
      .text([data.tableNumber ? `Table ${data.tableNumber}` : null, data.customerName].filter(Boolean).join(' · '),
        W - M - 160, 138, { width: 160, align: 'right' });
  }

  // Items.
  let y = 188;
  doc.fillColor(MUTED).font('Times-Italic').fontSize(9)
    .text('Item',   M, y)
    .text('Qty',    W - 200, y, { width: 40, align: 'center' })
    .text('Amount', W - M - 80, y, { width: 80, align: 'right' });
  doc.moveTo(M, y + 14).lineTo(W - M, y + 14).strokeColor(ACCENT).lineWidth(0.3).stroke();

  y += 22;
  doc.fillColor(INK).font('Times-Roman').fontSize(10);
  for (const it of data.items) {
    const name = it.variantName ? `${it.name} (${it.variantName})` : it.name;
    doc.text(name, M, y, { width: W - 280 });
    doc.text(String(it.quantity), W - 200, y, { width: 40, align: 'center' });
    doc.text(fmtINR(it.totalPrice), W - M - 80, y, { width: 80, align: 'right' });
    y += 16;
  }

  // Totals.
  y += 6;
  doc.moveTo(M, y).lineTo(W - M, y).strokeColor(ACCENT).lineWidth(0.3).stroke();
  y += 10;

  const tot = (label: string, v: number, bold = false) => {
    doc.font(bold ? 'Times-Bold' : 'Times-Roman').fontSize(bold ? 13 : 10);
    doc.fillColor(bold ? INK : MUTED).text(label, M, y, { width: W - M - 100 });
    doc.fillColor(INK).text(fmtINR(v), W - M - 100, y, { width: 100, align: 'right' });
    y += bold ? 22 : 16;
  };
  tot('Subtotal', data.subtotal);
  if (data.taxAmount) tot('Tax', data.taxAmount);
  if (data.serviceAmount) tot('Service', data.serviceAmount);
  if (data.discountAmount) tot('Discount', -data.discountAmount);
  tot('Total', data.totalAmount, true);

  if (data.paymentStatus === 'PAID') {
    y += 8;
    doc.font('Times-Italic').fontSize(11).fillColor(ACCENT).text('— Paid with thanks —', M, y, { width: W - M * 2, align: 'center' });
    if (data.transactionId) {
      doc.fillColor(MUTED).fontSize(8).text(`UTR · ${data.transactionId}`, M, y + 16, { width: W - M * 2, align: 'center' });
    }
  }

  doc.fillColor(MUTED).font('Times-Italic').fontSize(9)
    .text('Thank you for visiting · cafeqr.pro', M, doc.page.height - 36, { width: W - M * 2, align: 'center' });

  doc.end();
  return bufferFromDoc(doc);
}
