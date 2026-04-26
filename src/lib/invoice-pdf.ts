/**
 * Server-side PDF invoice/receipt renderer using pdfkit.
 *
 * Returns a `Buffer` so the WhatsApp bot (Baileys / Cloud API) can deliver it
 * as a document attachment to the customer right after payment is confirmed.
 *
 * Pure pdfkit — no headless browser, no external service. The layout is a
 * compact A5 receipt: cafe block, order metadata, items table, totals,
 * payment status, and a thank-you footer.
 */
import 'server-only';
import PDFDocument from 'pdfkit';

export interface InvoiceData {
  orderNumber: string;
  cafeName: string;
  cafeAddress?: string | null;
  cafePhone?: string | null;
  cafeGst?: string | null;
  tableNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt: Date;
  paidAt?: Date | null;
  items: { name: string; variantName?: string | null; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  packingAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
}

const COLORS = {
  ink: '#3E2D24',
  brown: '#6B4E3D',
  muted: '#85604A',
  divider: '#E8D5BE',
  cream: '#FFFBF5',
};

const fmtINR = (n: number) => `Rs. ${n.toFixed(2)}`;

/** Classic template — coffee + cream brand colours, A5. */
function renderClassic(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        info: {
          Title: `Invoice ${data.orderNumber}`,
          Author: data.cafeName,
          Subject: `Order ${data.orderNumber}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header
      doc
        .fillColor(COLORS.brown)
        .font('Helvetica-Bold').fontSize(20)
        .text(data.cafeName, { align: 'left' });

      doc.moveDown(0.15);
      if (data.cafeAddress) {
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(data.cafeAddress);
      }
      const subline = [
        data.cafePhone ? `Phone: ${data.cafePhone}` : null,
        data.cafeGst ? `GST: ${data.cafeGst}` : null,
      ].filter(Boolean).join('  •  ');
      if (subline) {
        doc.fillColor(COLORS.muted).fontSize(9).text(subline);
      }

      doc.moveDown(0.6);
      doc
        .strokeColor(COLORS.divider).lineWidth(1)
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .dash(2, { space: 2 }).stroke().undash();

      doc.moveDown(0.6);

      // ── Order metadata
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;

      doc
        .fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12)
        .text(`Receipt #${data.orderNumber}`, left, doc.y, { continued: false });

      const dateLine = `Placed: ${formatDate(data.createdAt)}`;
      const paidLine = data.paidAt ? `Paid: ${formatDate(data.paidAt)}` : null;
      doc
        .fillColor(COLORS.muted).font('Helvetica').fontSize(9)
        .text(dateLine, left, doc.y, { width: right - left });
      if (paidLine) doc.text(paidLine, left, doc.y, { width: right - left });

      const meta: string[] = [];
      if (data.tableNumber) meta.push(`Table ${data.tableNumber}`);
      if (data.customerName) meta.push(data.customerName);
      if (data.customerPhone) meta.push(data.customerPhone);
      if (meta.length) {
        doc.fillColor(COLORS.muted).fontSize(9).text(meta.join('  •  '));
      }

      doc.moveDown(0.7);

      // ── Items table
      const tableTop = doc.y;
      const colItem = left;
      const colQty = right - 170;
      const colRate = right - 110;
      const colTotal = right - 60;

      doc
        .fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(9)
        .text('ITEM', colItem, tableTop)
        .text('QTY', colQty, tableTop, { width: 40, align: 'center' })
        .text('RATE', colRate, tableTop, { width: 50, align: 'right' })
        .text('AMT', colTotal, tableTop, { width: 60, align: 'right' });

      doc
        .strokeColor(COLORS.divider).lineWidth(0.5)
        .moveTo(left, tableTop + 14).lineTo(right, tableTop + 14).stroke();

      let y = tableTop + 20;
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.ink);
      for (const it of data.items) {
        const name = it.variantName ? `${it.name} (${it.variantName})` : it.name;
        const lineHeight = doc.heightOfString(name, { width: colQty - colItem - 8 });
        doc
          .text(name, colItem, y, { width: colQty - colItem - 8 })
          .text(String(it.quantity), colQty, y, { width: 40, align: 'center' })
          .text(fmtINR(it.unitPrice), colRate, y, { width: 50, align: 'right' })
          .text(fmtINR(it.totalPrice), colTotal, y, { width: 60, align: 'right' });
        y += Math.max(lineHeight, 14) + 2;
      }

      doc.y = y + 4;
      doc
        .strokeColor(COLORS.divider).lineWidth(0.5)
        .moveTo(left, doc.y).lineTo(right, doc.y).stroke();
      doc.moveDown(0.5);

      // ── Totals block
      const totalRow = (label: string, amount: number, opts?: { bold?: boolean; muted?: boolean }) => {
        doc
          .font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(opts?.bold ? 12 : 10)
          .fillColor(opts?.muted ? COLORS.muted : COLORS.ink);
        doc.text(label, colRate - 80, doc.y, { width: 130, align: 'left', continued: true });
        doc.text(fmtINR(amount), { width: 60, align: 'right' });
      };
      totalRow('Subtotal', data.subtotal, { muted: true });
      if (data.discountAmount) totalRow('Discount', -data.discountAmount, { muted: true });
      if (data.taxAmount) totalRow('Tax / GST', data.taxAmount, { muted: true });
      if (data.serviceAmount) totalRow('Service', data.serviceAmount, { muted: true });
      if (data.packingAmount) totalRow('Packing', data.packingAmount, { muted: true });
      if (data.deliveryAmount) totalRow('Delivery', data.deliveryAmount, { muted: true });
      doc.moveDown(0.2);
      totalRow('Total', data.totalAmount, { bold: true });

      doc.moveDown(0.8);

      // ── Payment block
      const paid = data.paymentStatus === 'PAID';
      const tagBg = paid ? '#DCFCE7' : '#FEF3C7';
      const tagFg = paid ? '#166534' : '#92400E';
      const tagLabel = paid ? 'PAID' : data.paymentStatus.replace('_', ' ');
      doc.roundedRect(left, doc.y, 90, 22, 6).fillAndStroke(tagBg, tagBg);
      doc
        .fillColor(tagFg).font('Helvetica-Bold').fontSize(10)
        .text(tagLabel, left, doc.y - 18 + 6, { width: 90, align: 'center' });

      doc.moveDown(1.6);
      const payInfo: string[] = [];
      if (data.paymentMethod) payInfo.push(`Method: ${data.paymentMethod.toUpperCase()}`);
      if (data.transactionId) payInfo.push(`UTR: ${data.transactionId}`);
      if (payInfo.length) {
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(payInfo.join('  •  '), left, doc.y);
      }

      doc.moveDown(1.5);

      // ── Footer
      doc
        .fillColor(COLORS.brown).font('Helvetica-Oblique').fontSize(11)
        .text('Thank you for visiting!  ☕', { align: 'center' });
      doc.moveDown(0.3);
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
        .text('Powered by CafeQR Pro', { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Public renderer — picks one of the bundled templates by name. Defaults to
 * Classic for unknown values so a freshly-migrated cafe with no preference
 * keeps its existing-looking receipts.
 */
export async function renderInvoicePdf(
  data: InvoiceData,
  template: string = 'classic'
): Promise<Buffer> {
  switch (template) {
    case 'modern':  return (await import('./invoice-templates/modern')).renderModern(data);
    case 'minimal': return (await import('./invoice-templates/minimal')).renderMinimal(data);
    case 'receipt': return (await import('./invoice-templates/receipt')).renderReceipt(data);
    case 'elegant': return (await import('./invoice-templates/elegant')).renderElegant(data);
    case 'bold':    return (await import('./invoice-templates/bold')).renderBold(data);
    case 'classic':
    default:
      return renderClassic(data);
  }
}

/** Convenience: build InvoiceData from a Prisma order row. The grand-total
 *  printed on the receipt is what the customer actually paid — i.e. the
 *  paise-nonced `payableAmount` when set. The pre-rounding totalAmount is
 *  kept on the row for the cafe's own analytics. */
export function invoiceDataFromOrder(order: any): InvoiceData {
  const paid = order.payableAmount ?? order.totalAmount;
  return {
    orderNumber: order.orderNumber,
    cafeName: order.cafe?.name ?? 'Cafe',
    cafeAddress: order.cafe?.address,
    cafePhone: order.cafe?.phone,
    cafeGst: order.cafe?.gstNumber,
    tableNumber: order.table?.number ?? null,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    createdAt: new Date(order.createdAt),
    paidAt: order.payment?.paidAt ? new Date(order.payment.paidAt) : null,
    items: (order.items ?? []).map((i: any) => ({
      name: i.name,
      variantName: i.variantName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
    })),
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    serviceAmount: order.serviceAmount,
    packingAmount: order.packingAmount,
    deliveryAmount: order.deliveryAmount,
    discountAmount: order.discountAmount,
    totalAmount: paid,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.payment?.method,
    transactionId: order.payment?.transactionId,
  };
}
