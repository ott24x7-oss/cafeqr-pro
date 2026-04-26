/**
 * Shared shape for every invoice template renderer. Each template gets the
 * same `InvoiceData` and returns a Promise<Buffer>; the dispatcher in
 * `lib/invoice-pdf.ts` picks one based on cafe.settings.invoiceTemplate.
 */
import type { InvoiceData } from '../invoice-pdf';
export type { InvoiceData };

export interface TemplateMeta {
  key: string;
  name: string;
  blurb: string;
}

export const TEMPLATES: TemplateMeta[] = [
  { key: 'classic', name: 'Classic',  blurb: 'Coffee + cream brand colours, A5, friendly.' },
  { key: 'modern',  name: 'Modern',   blurb: 'Clean accent stripe at top, sans-serif.' },
  { key: 'minimal', name: 'Minimal',  blurb: 'Black-and-white only, ultra-clean.' },
  { key: 'receipt', name: 'Receipt',  blurb: 'Thermal-printer style, narrow 80mm width.' },
  { key: 'elegant', name: 'Elegant',  blurb: 'Italic accents, hairline rules, refined.' },
  { key: 'bold',    name: 'Bold',     blurb: 'Big colour header block, large type.' },
];

export type TemplateKey = (typeof TEMPLATES)[number]['key'];
