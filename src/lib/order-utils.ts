import type { CafeSettings, OrderType } from '@prisma/client';

export interface CartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  variantName?: string;
  variantPrice?: number;
  addons?: { name: string; price: number }[];
  note?: string;
}

export interface PriceCalc {
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  packingAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  totalAmount: number;
  itemCount: number;
}

export function calcCart(
  items: CartItem[],
  settings: Partial<CafeSettings> | null,
  type: OrderType = 'DINE_IN',
  discountAmount = 0
): PriceCalc {
  const subtotal = items.reduce((s, it) => {
    const base = it.variantPrice ?? it.unitPrice;
    const addonSum = (it.addons ?? []).reduce((a, b) => a + (b.price || 0), 0);
    return s + (base + addonSum) * it.quantity;
  }, 0);
  const itemCount = items.reduce((s, it) => s + it.quantity, 0);

  const taxPct = settings?.taxPercent ?? 5;
  const taxableAfterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = +(taxableAfterDiscount * (taxPct / 100)).toFixed(2);

  const serviceAmount = type === 'DINE_IN' ? +(taxableAfterDiscount * ((settings?.serviceCharge ?? 0) / 100)).toFixed(2) : 0;
  const packingAmount = type === 'TAKEAWAY' ? settings?.packingCharge ?? 0 : 0;
  const deliveryAmount = type === 'DELIVERY' ? settings?.deliveryCharge ?? 0 : 0;

  const totalAmount = +(taxableAfterDiscount + taxAmount + serviceAmount + packingAmount + deliveryAmount).toFixed(2);

  return {
    subtotal: +subtotal.toFixed(2),
    taxAmount,
    serviceAmount,
    packingAmount,
    deliveryAmount,
    discountAmount,
    totalAmount,
    itemCount,
  };
}
