import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calcCart } from '@/lib/order-utils';
import { genOrderNumber } from '@/lib/utils';
import { notifyNewOrder } from '@/lib/notify';

const cartItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  unitPrice: z.number(),
  quantity: z.number().int().min(1),
  variantName: z.string().optional(),
  variantPrice: z.number().optional(),
  addons: z.array(z.object({ name: z.string(), price: z.number() })).optional(),
  note: z.string().optional(),
});

const schema = z.object({
  cafeSlug: z.string(),
  tableCode: z.string().optional(),
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']).default('DINE_IN'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerNote: z.string().optional(),
  items: z.array(cartItemSchema).min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const cafe = await prisma.cafe.findUnique({
      where: { slug: body.cafeSlug },
      include: { settings: true },
    });
    if (!cafe) return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    if (cafe.status === 'SUSPENDED') return NextResponse.json({ error: 'Cafe not accepting orders' }, { status: 403 });

    let table = null;
    if (body.tableCode) {
      table = await prisma.table.findUnique({ where: { code: body.tableCode } });
      if (table && table.cafeId !== cafe.id) return NextResponse.json({ error: 'Table mismatch' }, { status: 400 });
    }

    const totals = calcCart(body.items, cafe.settings, body.type);
    const orderNumber = genOrderNumber();

    // Add a 1–99 paise nonce so each order has a unique amount on the wire.
    // The IMAP matcher uses this to disambiguate concurrent payments that
    // would otherwise share the same rounded total (e.g. two ₹178.50 orders
    // → one becomes ₹178.87, the other ₹178.13).
    const noncePaise = Math.floor(Math.random() * 99) + 1; // 1..99
    const payableAmount = Math.round((totals.totalAmount + noncePaise / 100) * 100) / 100;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        cafeId: cafe.id,
        tableId: table?.id,
        type: body.type,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerNote: body.customerNote,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        serviceAmount: totals.serviceAmount,
        packingAmount: totals.packingAmount,
        deliveryAmount: totals.deliveryAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        payableAmount,
        status: 'NEW',
        statusHistory: [{ status: 'NEW', at: new Date().toISOString() }] as any,
        items: {
          create: body.items.map((i) => {
            const base = i.variantPrice ?? i.unitPrice;
            const addonSum = (i.addons ?? []).reduce((s, a) => s + a.price, 0);
            return {
              menuItemId: i.menuItemId,
              name: i.name,
              variantName: i.variantName,
              addonNames: (i.addons ?? []).map((a) => a.name),
              unitPrice: base + addonSum,
              quantity: i.quantity,
              totalPrice: (base + addonSum) * i.quantity,
              note: i.note,
            };
          }),
        },
      },
      include: { items: true, table: true, cafe: true },
    });

    if (table) {
      await prisma.table.update({ where: { id: table.id }, data: { isOccupied: true } });
    }

    // Notification record for owner
    await prisma.notification.create({
      data: {
        cafeId: cafe.id,
        kind: 'ORDER_NEW',
        title: `New order #${order.orderNumber}`,
        body: `${order.items.length} items · ₹${order.totalAmount.toFixed(0)}${table ? ' · Table ' + table.number : ''}`,
        link: `/dashboard/orders/${order.id}`,
      },
    });

    // Fire-and-forget WhatsApp fan-out (owner + admins + staff opted in).
    notifyNewOrder(order.id).catch(() => {});

    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 400 });
  }
}
