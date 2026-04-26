/**
 * Helpers shared across all template renderers.
 */
import type { InvoiceData } from './types';

export const fmtINR = (n: number) => `Rs. ${n.toFixed(2)}`;

export function formatDate(d: Date): string {
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function bufferFromDoc(doc: any): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export function pdfDocOpts(data: InvoiceData) {
  return {
    info: {
      Title: `Invoice ${data.orderNumber}`,
      Author: data.cafeName,
      Subject: `Order ${data.orderNumber}`,
    },
  };
}
