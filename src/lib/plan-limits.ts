import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';

/**
 * Single-cafe build: the SaaS plan/subscription layer has been removed.
 *
 * This module used to resolve a cafe's plan tier and enforce usage caps.
 * The whole app now runs as ONE cafe with no tiers, so every limit is
 * unlimited and every feature is on. The exports/signatures are kept so
 * the existing call sites (menu/tables/settings/orders APIs + dashboard)
 * compile and behave as "always allowed" without edits.
 */

/** Kept for back-compat; never used now that limits are unlimited. */
export const ORDER_LIMIT_HARD_BLOCK_RATIO = 1.10;

/** A "very large" cap that count-based guards (count >= max) never reach. */
const UNLIMITED = 1_000_000_000;

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

/** The single, unlimited "plan" every surface now sees. */
const UNLIMITED_LIMITS: PlanLimits = {
  planId: null,
  planSlug: null,
  planName: null,
  priceMonthly: 0,
  priceYearly: 0,
  maxTables: UNLIMITED,
  maxMenuItems: UNLIMITED,
  maxStaff: UNLIMITED,
  maxOrdersPerMonth: 0, // 0 = unlimited (see evaluateOrderLimit)
  features: {
    whatsapp: true,
    loyalty: true,
    payment: true,
    coupons: true,
    customBranding: true,
    customSubdomain: true,
    prioritySupport: true,
    analytics: true,
    multiLanguage: true,
  },
};

/** No-op converter — single cafe is always unlimited regardless of input. */
export function planToLimits(_plan?: any | null | undefined): PlanLimits {
  return UNLIMITED_LIMITS;
}

/** Single cafe → always unlimited. */
export const getPlanLimits = cache(async (_cafeId: string): Promise<PlanLimits> => {
  return UNLIMITED_LIMITS;
});

/** First moment of the current calendar month, in server time. */
function startOfMonth(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/** Count of orders placed this calendar month (kept for dashboard stats). */
export const countOrdersThisMonth = cache(async (cafeId: string): Promise<number> => {
  return prisma.order.count({
    where: {
      cafeId,
      createdAt: { gte: startOfMonth() },
      status: { not: 'CANCELLED' },
    },
  });
});

/** Total existing menu items for a cafe (kept for dashboard stats). */
export const countMenuItems = cache(async (cafeId: string): Promise<number> => {
  return prisma.menuItem.count({ where: { cafeId } });
});

/** Total tables for a cafe (kept for dashboard stats). */
export const countTables = cache(async (cafeId: string): Promise<number> => {
  return prisma.table.count({ where: { cafeId } });
});

export interface OrderLimitDecision {
  blocked: boolean;
  warn: boolean;
  current: number;
  limit: number;        // 0 = unlimited
  ratio: number;
}

/** Always "allowed" — there are no order caps in the single-cafe build. */
export function evaluateOrderLimit(current: number, _limit: number): OrderLimitDecision {
  return { blocked: false, warn: false, current, limit: 0, ratio: 0 };
}

/** Convenience snapshot used by the dashboard + order-placement guard. */
export async function getOrderUsage(cafeId: string) {
  const current = await countOrdersThisMonth(cafeId);
  return {
    plan: UNLIMITED_LIMITS,
    decision: evaluateOrderLimit(current, 0),
  };
}
