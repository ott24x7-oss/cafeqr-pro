/**
 * Modern: clean accent stripe across the top, sans-serif throughout, no
 * borders. Lots of whitespace, designed-feel.
 */
import PDFDocument from 'pdfkit';
import type { InvoiceData } from './types';
import { bufferFromDoc, fmtINR, formatDate, pdfDocOpts } from './shared';

const ACCENT = '#0F766E';   // teal
const INK    = '#0F172A';
const MUTED  = '#64748B';

export function renderModern(data: InvoiceData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A5', margin: 0, ...pdfDocOpts(data) });
  const W = doc.page.width;
  const M = 36;

  // Top accent stripe.
  doc.rect(0, 0, W, 90).fill(ACCENT);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(20).text(data.cafeName, M, 26);
  doc.font('Helvetica').fontSize(10).fillColor('#E2F8F5').text(
    [data.cafeAddress, data.cafePhone].filter(Boolean).join('  •  '), M, 52, { width: W - M * 2 });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff')
    .text('RECEIPT', W - M - 100, 26, { width: 100, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#E2F8F5')
    .text(`#${data.orderNumber}`, W - M - 100, 44, { width: 100, align: 'right' });

  // Body.
  let y = 120;
  doc.fillColor(MUTED).font('Helvetica').fontSize(9)
    .text('Issued', M, y).text(formatDate(data.createdAt), M, y + 12, { lineBreak: false });
  if (data.paidAt) {
    doc.fillColor(MUTED).text('Paid', W - M - 140, y, { width: 140, align: 'right' });
    doc.fillColor(INK).font('Helvetica-Bold').text(formatDate(data.paidAt), W - M - 140, y + 12, { width: 140, align: 'right' });
  }

  if (data.customerName || data.tableNumber) {
    y += 38;
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('Customer', M, y);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11)
      .text([data.tableNumber ? `Table ${data.tableNumber}` : null, data.customerName, data.customerPhone].filter(Boolean).join('  •  '), M, y + 12);
  }

  // Items table — no borders, generous spacing.
  y += 44;
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(9)
    .text('ITEM',   M,        y)
    .text('QTY',    W - 200,  y, { width: 40, align: 'center' })
    .text('AMOUNT', W - M - 80, y, { width: 80, align: 'right' });
  doc.moveTo(M, y + 14).lineTo(W - M, y + 14).strokeColor(ACCENT).lineWidth(1).stroke();

  y += 20;
  doc.font('Helvetica').fontSize(10).fillColor(INK);
  for (const it of data.items) {
    const name = it.variantName ? `${it.name} (${it.variantName})` : it.name;
    doc.text(name, M, y, { width: W - 280 });
    doc.text(String(it.quantity), W - 200, y, { width: 40, align: 'center' });
    doc.text(fmtINR(it.totalPrice), W - M - 80, y, { width: 80, align: 'right' });
    y += 18;
  }

  // Totals.
  y += 8;
  doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
  y += 10;
  const totalRow = (label: string, val: number, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 13 : 10)
      .fillColor(bold ? INK : MUTED)
      .text(label, M, y, { width: W - M - 100 });
    doc.fillColor(INK).font('Helvetica-Bold')
      .text(fmtINR(val), W - M - 100, y, { width: 100, align: 'right' });
    y += bold ? 22 : 16;
  };
  totalRow('Subtotal', data.subtotal);
  if (data.taxAmount) totalRow('Tax / GST', data.taxAmount);
  if (data.serviceAmount) totalRow('Service', data.serviceAmount);
  if (data.discountAmount) totalRow('Discount', -data.discountAmount);
  totalRow('Total', data.totalAmount, true);

  // Paid badge.
  if (data.paymentStatus === 'PAID') {
    y += 6;
    doc.roundedRect(M, y, 70, 22, 4).fill(ACCENT);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10).text('PAID', M, y + 6, { width: 70, align: 'center' });
    if (data.transactionId) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(9)
        .text(`UTR: ${data.transactionId}`, M + 80, y + 7, { width: W - M - 80 });
    }
  }

  // Footer.
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
    .text('Thank you for visiting · Powered by CafeQR Pro', M, doc.page.height - 32, { width: W - M * 2, align: 'center' });

  doc.end();
  return bufferFromDoc(doc);
}
