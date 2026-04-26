/**
 * Minimal: black-and-white, all-Helvetica, hairline rules. Designed to look
 * good when printed in monochrome on a regular printer.
 */
import PDFDocument from 'pdfkit';
import type { InvoiceData } from './types';
import { bufferFromDoc, fmtINR, formatDate, pdfDocOpts } from './shared';

export function renderMinimal(data: InvoiceData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A5', margin: 40, ...pdfDocOpts(data) });
  const W = doc.page.width;
  const M = 40;

  doc.fillColor('#000').font('Helvetica-Bold').fontSize(11).text(data.cafeName.toUpperCase(), M, 40, { characterSpacing: 1.5 });
  doc.font('Helvetica').fontSize(8).text(
    [data.cafeAddress, data.cafePhone, data.cafeGst].filter(Boolean).join('  ·  '),
    M, 56, { width: W - M * 2 });

  // Hairline rule.
  const rule = (y: number) => doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#000').lineWidth(0.4).stroke();
  rule(80);

  doc.font('Helvetica').fontSize(9).fillColor('#000')
    .text(`Receipt  #${data.orderNumber}`, M, 90)
    .text(formatDate(data.createdAt), M, 104);
  if (data.tableNumber) doc.text(`Table ${data.tableNumber}`, W - M - 100, 90, { width: 100, align: 'right' });
  if (data.customerName) doc.text(data.customerName, W - M - 100, 104, { width: 100, align: 'right' });

  rule(124);

  // Items.
  let y = 134;
  doc.font('Helvetica-Bold').fontSize(8)
    .text('ITEM', M, y)
    .text('QTY', W - M - 130, y, { width: 30, align: 'right' })
    .text('AMOUNT', W - M - 90, y, { width: 90, align: 'right' });
  rule(y + 14);
  y += 20;

  doc.font('Helvetica').fontSize(9);
  for (const it of data.items) {
    const name = it.variantName ? `${it.name} (${it.variantName})` : it.name;
    doc.text(name, M, y, { width: W - M * 2 - 130 });
    doc.text(String(it.quantity), W - M - 130, y, { width: 30, align: 'right' });
    doc.text(fmtINR(it.totalPrice), W - M - 90, y, { width: 90, align: 'right' });
    y += 14;
  }

  rule(y + 4);
  y += 12;

  const tot = (label: string, v: number, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9);
    doc.text(label, M, y, { width: W - M - 100 });
    doc.text(fmtINR(v), W - M - 100, y, { width: 100, align: 'right' });
    y += bold ? 18 : 14;
  };
  tot('Subtotal', data.subtotal);
  if (data.taxAmount) tot('Tax', data.taxAmount);
  if (data.serviceAmount) tot('Service', data.serviceAmount);
  if (data.discountAmount) tot('Discount', -data.discountAmount);
  rule(y);
  y += 6;
  tot('Total', data.totalAmount, true);

  if (data.paymentStatus === 'PAID') {
    y += 6;
    doc.font('Helvetica-Bold').fontSize(10).text('PAID', M, y);
    if (data.transactionId) doc.font('Helvetica').fontSize(8).text(`UTR: ${data.transactionId}`, M + 50, y + 1);
  }

  doc.font('Helvetica').fontSize(7).fillColor('#666')
    .text('Thank you · cafeqr.pro', M, doc.page.height - 32, { width: W - M * 2, align: 'center' });

  doc.end();
  return bufferFromDoc(doc);
}
