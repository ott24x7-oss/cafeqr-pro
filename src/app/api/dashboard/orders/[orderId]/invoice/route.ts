/**
 * Server-side PDF download for the dashboard order detail page. Streams a
 * pdfkit-rendered invoice — same template as the post-payment WhatsApp
 * attachment — so the cafe owner gets a print-ready file instead of the
 * previous html2canvas screenshot which was flaky on long bills.
 */
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { renderInvoicePdf, invoiceDataFromOrder } from '@/lib/invoice-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return new Response('unauthorized', { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      items: true,
      table: true,
      payment: true,
      cafe: { include: { settings: true } },
    },
  });
  if (!order || order.cafeId !== cafe.id) {
    return new Response('not found', { status: 404 });
  }

  const template = (order.cafe?.settings as any)?.invoiceTemplate ?? 'classic';
  const pdf = await renderInvoicePdf(invoiceDataFromOrder(order), template);

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${order.orderNumber}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
