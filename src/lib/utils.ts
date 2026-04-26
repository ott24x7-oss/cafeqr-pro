import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Currencies the dashboard exposes in the picker. Locale picks a sensible
 *  number-format default; the cafe still controls the actual currency. */
export const CURRENCIES: { code: string; symbol: string; label: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',  label: 'INR · Indian Rupee',         locale: 'en-IN' },
  { code: 'USD', symbol: '$',  label: 'USD · US Dollar',            locale: 'en-US' },
  { code: 'EUR', symbol: '€',  label: 'EUR · Euro',                 locale: 'en-IE' },
  { code: 'GBP', symbol: '£',  label: 'GBP · British Pound',        locale: 'en-GB' },
  { code: 'AED', symbol: 'د.إ', label: 'AED · UAE Dirham',          locale: 'en-AE' },
  { code: 'SGD', symbol: 'S$', label: 'SGD · Singapore Dollar',     locale: 'en-SG' },
  { code: 'AUD', symbol: 'A$', label: 'AUD · Australian Dollar',    locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', label: 'CAD · Canadian Dollar',      locale: 'en-CA' },
];

const CURRENCY_LOCALE = new Map(CURRENCIES.map((c) => [c.code, c.locale]));

export function formatCurrency(amount: number, currency = 'INR') {
  const locale = CURRENCY_LOCALE.get(currency) ?? 'en-IN';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sym = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
    return `${sym}${amount.toFixed(2)}`;
  }
}

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...opts,
  }).format(date);
}

export function timeAgo(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [
    [60 * 60 * 24, 'd'],
    [60 * 60, 'h'],
    [60, 'm'],
    [1, 's'],
  ];
  for (const [s, label] of intervals) {
    const v = Math.floor(seconds / s);
    if (v >= 1) return `${v}${label} ago`;
  }
  return 'just now';
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function genCode(prefix = '', len = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return prefix + code;
}

export function genOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear().toString().slice(2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${ymd}-${rand}`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-800 border-amber-200',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-200',
  PREPARING: 'bg-orange-100 text-orange-800 border-orange-200',
  READY: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  SERVED: 'bg-teal-100 text-teal-800 border-teal-200',
  COMPLETED: 'bg-coffee-100 text-coffee-800 border-coffee-200',
  CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',
};
