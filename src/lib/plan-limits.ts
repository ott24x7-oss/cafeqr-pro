import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';

/**
 * Plan-tier resolution + usage counters + feature-flag helpers.
 *
 * Single source of truth for "is this cafe allowed to do X right now?"
 * Used by both server-side enforcement (API routes) and UI surfaces
 * (banners, lock overlays). React.cache() means a single render that
 * checks the plan + counts orders + counts menu items hits the DB once
 * per cafe per request.
 */

/** Soft-warn buffer above the limit before we hard-block the order
 *  flow. Per the design spec: 100% triggers warning UI, 110% hard
 *  blocks new orders. */
export const ORDER_LIMIT_HARD_BLOCK_RATIO = 1.10;

export interface PlanLimits {
  planId: string | null;
  planSlug: string | null;
  planName: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxTables: number;
  maxMenuItems: number;
  maxStaff: number;
  maxOrdersPerMonth: number;       // 0 = unlimited
  features: {
    whatsapp: boolean;
    loyalty: boolean;
    payment: boolean;
    coupons: boolean;
    customBranding: boolean;
    customSubdomain: boolean;
    prioritySupport: boolean;
    analytics: boolean;
    multiLanguage: boolean;
  };
}

/** Cafes whose `planId` is missing or unresolvable get this safe
 *  fallback — the Free Lifetime tier, with everything locked. */
const FALLBACK_FREE: Omit<PlanLimits, 'planId' | 'planSlug' | 'planName'> = {
  priceMonthly: 0,
  priceYearly: 0,
  maxTables: 2,
  maxMenuItems: 10,
  maxStaff: 1,
  maxOrdersPerMonth: 30,
  features: {
    whatsapp: false,
    loyalty: false,
    payment: false,
    coupons: false,
    customBranding: false,
    customSubdomain: false,
    prioritySupport: false,
    analytics: false,
    multiLanguage: false,
  },
};

/**
 * Pure converter — turns an already-fetched Plan record into PlanLimits
 * without touching the DB. Use this whenever the caller already has
 * `cafe.plan` from a parent fetch (e.g. dashboard layout's
 * getOwnerCafe), so we don't pay for a redundant Cafe round-trip.
 */
export function planToLimits(plan: any | null | undefined): PlanLimits {
  if (!plan) {
    return { planId: null, planSlug: null, planName: null, ...FALLBACK_FREE };
  }
  return {
    planId: plan.id,
    planSlug: plan.slug,
    planName: plan.name,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    maxTables: plan.maxTables,
    maxMenuItems: plan.maxMenuItems,
    maxStaff: plan.maxStaff,
    maxOrdersPerMonth: plan.maxOrdersPerMonth ?? 0,
    features: {
      whatsapp: plan.whatsappEnabled,
      loyalty: plan.loyaltyEnabled ?? true,
      payment: plan.paymentEnabled ?? true,
      coupons: plan.couponsEnabled ?? true,
      customBranding: plan.customBranding,
      customSubdomain: plan.customSubdomain,
      prioritySupport: plan.prioritySupport,
      analytics: plan.analytics,
      multiLanguage: plan.multiLanguage,
    },
  };
}

/** Resolve a cafe's current plan limits. Cached per-request.
 *  Use planToLimits() instead when you already have the Plan object —
 *  this fn issues a Cafe round-trip you'd otherwise duplicate. */
export const getPlanLimits = cache(async (cafeId: string): Promise<PlanLimits> => {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { planId: true, plan: true },
  }).catch(() => null);
  return planToLimits(cafe?.plan);
});

/** First moment of the current calendar month, in server time. */
function startOfMonth(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/** Count of orders placed this calendar month for the given cafe.
 *  Excludes CANCELLED orders so a cafe isn't punished for cancellations. */
export const countOrdersThisMonth = cache(async (cafeId: string): Promise<number> => {
  return prisma.order.count({
    where: {
      cafeId,
      createdAt: { gte: startOfMonth() },
      status: { not: 'CANCELLED' },
    },
  });
});

/** Total existing menu items for a cafe (used by maxMenuItems guard). */
export const countMenuItems = cache(async (cafeId: string): Promise<number> => {
  return prisma.menuItem.count({ where: { cafeId } });
});

/** Total tables for a cafe (used by maxTables guard). */
export const countTables = cache(async (cafeId: string): Promise<number> => {
  return prisma.table.count({ where: { cafeId } });
});

export interface OrderLimitDecision {
  /** Hard-blocked: refuse to accept the order. */
  blocked: boolean;
  /** Soft-warn: accept but raise a UI signal to the owner. */
  warn: boolean;
  current: number;
  limit: number;        // 0 = unlimited
  ratio: number;        // current / limit (Infinity if limit=0 with current>0 is impossible since limit=0 means unlimited)
}

export function evaluateOrderLimit(current: number, limit: number): OrderLimitDecision {
  if (limit <= 0) {
    return { blocked: false, warn: false, current, limit: 0, ratio: 0 };
  }
  const ratio = current / limit;
  return {
    blocked: ratio >= ORDER_LIMIT_HARD_BLOCK_RATIO,
    warn: ratio >= 1 && ratio < ORDER_LIMIT_HARD_BLOCK_RATIO,
    current,
    limit,
    ratio,
  };
}

/** Convenience: full snapshot of (plan, usage, decision) for a cafe.
 *  Used by the dashboard banner and the order-placement guard. */
export async function getOrderUsage(cafeId: string) {
  const [limits, current] = await Promise.all([
    getPlanLimits(cafeId),
    countOrdersThisMonth(cafeId),
  ]);
  return {
    plan: limits,
    decision: evaluateOrderLimit(current, limits.maxOrdersPerMonth),
  };
}
