/**
 * Boot-time database bootstrap.
 *
 * Runs once per Node process (gated by a globalThis flag) right after the
 * server comes up — so a fresh Railway deploy with empty DB self-heals
 * without anyone having to SSH in and run `npm run db:seed`.
 *
 * Idempotent — safe to call on every boot. Two things it does:
 *   1. Plans (Starter / Pro / Business) — upserted by slug. The /pricing
 *      page and signup flow rely on these existing.
 *   2. Super admin user — upserted by email FROM env vars
 *      (SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME).
 *      Password is updated *only* when SUPER_ADMIN_FORCE_RESET=1, so a
 *      cafe owner who later changes their password through the UI doesn't
 *      get overwritten on every redeploy.
 */
import 'server-only';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const PLANS = [
  {
    name: 'Starter', slug: 'starter',
    description: 'Free for 14 days. Then ₹0/forever for tiny cafes.',
    priceMonthly: 0, priceYearly: 0,
    maxTables: 5, maxMenuItems: 30, maxStaff: 2,
    whatsappEnabled: true, customBranding: false, customSubdomain: false,
    prioritySupport: false, analytics: false, multiLanguage: false,
    isActive: true, isPopular: false, sortOrder: 0,
    features: ['5 QR tables', '30 menu items', 'Live order board', 'WhatsApp wa.me notifications'],
  },
  {
    name: 'Pro', slug: 'pro',
    description: 'For growing cafes. Most popular choice.',
    priceMonthly: 499, priceYearly: 4990,
    maxTables: 30, maxMenuItems: 200, maxStaff: 10,
    whatsappEnabled: true, customBranding: true, customSubdomain: false,
    prioritySupport: false, analytics: true, multiLanguage: true,
    isActive: true, isPopular: true, sortOrder: 1,
    features: [
      '30 tables · 200 items', 'Multi-staff with roles',
      'Custom branding (logo, colours)', 'Analytics & reports',
      'Coupons & happy-hour pricing', 'WhatsApp Cloud API ready',
    ],
  },
  {
    name: 'Business', slug: 'business',
    description: 'For chains and high-volume operations.',
    priceMonthly: 1499, priceYearly: 14990,
    maxTables: 200, maxMenuItems: 2000, maxStaff: 50,
    whatsappEnabled: true, customBranding: true, customSubdomain: true,
    prioritySupport: true, analytics: true, multiLanguage: true,
    isActive: true, isPopular: false, sortOrder: 2,
    features: [
      'Unlimited tables · 2000 items', 'Custom subdomain',
      'Priority support 24×7', 'CSV / API exports',
      'Dedicated account manager',
    ],
  },
];

export async function bootstrapDatabase(): Promise<{ plans: number; admin: 'created' | 'updated' | 'untouched' | 'skipped' }> {
  const G = globalThis as any;
  if (G.__cafeqr_bootstrapped) return { plans: 0, admin: 'skipped' };
  G.__cafeqr_bootstrapped = true;

  // ── Plans ────────────────────────────────────────────────────────────
  let plansSynced = 0;
  for (const p of PLANS) {
    try {
      await prisma.plan.upsert({ where: { slug: p.slug }, update: p, create: p });
      plansSynced += 1;
    } catch (e) {
      console.warn('[bootstrap] plan upsert failed for', p.slug, e);
    }
  }

  // ── Super admin ──────────────────────────────────────────────────────
  const adminEmail = (process.env.SUPER_ADMIN_EMAIL ?? '').toLowerCase().trim();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD ?? '';
  const adminName = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';
  const forceReset = process.env.SUPER_ADMIN_FORCE_RESET === '1';

  if (!adminEmail || !adminPassword) {
    return { plans: plansSynced, admin: 'skipped' };
  }

  let adminState: 'created' | 'updated' | 'untouched' = 'untouched';
  try {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      const hashed = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: { email: adminEmail, password: hashed, role: 'SUPER_ADMIN', isActive: true, name: adminName },
      });
      adminState = 'created';
    } else {
      // Promote to SUPER_ADMIN if the row exists but doesn't have the role
      // (handles the case where the email signed up as a regular user).
      const updates: any = {};
      if (existing.role !== 'SUPER_ADMIN') updates.role = 'SUPER_ADMIN';
      if (!existing.isActive) updates.isActive = true;
      if (forceReset) updates.password = await bcrypt.hash(adminPassword, 12);
      if (Object.keys(updates).length) {
        await prisma.user.update({ where: { id: existing.id }, data: updates });
        adminState = 'updated';
      }
    }
    console.log(
      `[bootstrap] super admin: ${adminEmail} (${adminState})` +
      (forceReset ? ' — password reset from env' : '')
    );
  } catch (e) {
    console.error('[bootstrap] super admin failed', e);
  }

  return { plans: plansSynced, admin: adminState };
}
