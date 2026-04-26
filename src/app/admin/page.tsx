import {
  Coffee, Users, ListOrdered, IndianRupee, Mail, Wifi, Bell, AlertCircle, ChevronRight,
  CreditCard, FileText, Globe, Shield,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils';
import Link from 'next/link';
import { BroadcastCard } from '@/components/admin/broadcast-card';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const now = new Date();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000);

  const [
    totalCafes, activeCafes, trialCafes, suspendedCafes,
    totalUsers, totalOrders, revenueAgg, recentCafes,
    activeSubs, trialEndingSoon, recentOrders,
    totalNotifications,
  ] = await Promise.all([
    prisma.cafe.count(),
    prisma.cafe.count({ where: { status: 'ACTIVE' } }),
    prisma.cafe.count({ where: { status: 'TRIAL' } }),
    prisma.cafe.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count(),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalAmount: true } }),
    prisma.cafe.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { owner: true, _count: { select: { orders: true } } } }),
    prisma.subscription.count({ where: { status: 'active', endsAt: { gte: now } } }),
    prisma.cafe.count({ where: { status: 'TRIAL', trialEndsAt: { gte: now, lte: sevenDaysFromNow } } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { cafe: { select: { name: true, slug: true } }, items: { select: { id: true } } },
    }),
    prisma.notification.count({ where: { kind: 'SYSTEM', createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
  ]);

  // System health snapshot — what transports / services are configured
  const G = globalThis as any;
  const baileysCount = (G.__cafeqr_baileys_sessions instanceof Map)
    ? G.__cafeqr_baileys_sessions.size : 0;
  const site = await getSiteSettings();
  const mailReady = !!(site.smtpHost && site.smtpUser && site.smtpPass)
    || !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    || true; // PHP relay is always available as a fallback
  const mailLabel =
    site.smtpHost ? `SMTP (DB · ${site.smtpHost})`
    : process.env.SMTP_HOST ? `SMTP (env · ${process.env.SMTP_HOST})`
    : 'PHP relay only';

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Super Admin</h1>
        <p className="text-coffee-600 text-sm">Platform overview · all cafes</p>
      </div>

      {/* Quick admin shortcuts — direct deep-links to the most-used config screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { l: 'Platform Payment', s: 'UPI + IMAP for subscriptions', href: '/admin/site?tab=payment', i: IndianRupee, hot: !site.platformUpiId },
          { l: 'Subscriptions',    s: 'Verify, cancel, scan now',      href: '/admin/subscriptions',     i: Bell,        hot: false },
          { l: 'Email / SMTP',     s: 'Outbound mail config',         href: '/admin/site?tab=email',   i: Mail,        hot: !site.smtpHost },
          { l: 'Plans',            s: 'Pricing & feature limits',      href: '/admin/plans',             i: CreditCard,  hot: false },
          { l: 'Cafes',            s: 'Suspend, reassign, manage',     href: '/admin/cafes',             i: Coffee,      hot: false },
          { l: 'Site content',     s: 'Marketing copy JSON',           href: '/admin/site?tab=content',  i: FileText,    hot: false },
        ].map((c) => (
          <Link
            key={c.l}
            href={c.href}
            className={`card-warm !p-3 hover:-translate-y-0.5 transition relative ${
              c.hot ? 'ring-2 ring-amber-300 bg-amber-50/40' : ''
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`h-9 w-9 grid place-items-center rounded-xl shrink-0 ${
                c.hot ? 'bg-amber-100 text-amber-800' : 'bg-coffee-gradient text-cream-50'
              }`}>
                <c.i className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-coffee-900 text-sm truncate">{c.l}</div>
                <div className="text-[11px] text-coffee-500 truncate">{c.s}</div>
              </div>
            </div>
            {c.hot && (
              <span className="absolute top-1.5 right-1.5 pill text-[9px] bg-amber-100 text-amber-800">
                <AlertCircle className="h-2.5 w-2.5" /> Set up
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total cafes', v: totalCafes, s: `${activeCafes} active · ${trialCafes} trial${suspendedCafes ? ` · ${suspendedCafes} suspended` : ''}`, i: Coffee },
          { l: 'Users', v: totalUsers, s: 'Owners + staff', i: Users },
          { l: 'Orders', v: totalOrders, s: 'Completed', i: ListOrdered },
          { l: 'GMV', v: formatCurrency(revenueAgg._sum.totalAmount ?? 0), s: 'All time', i: IndianRupee },
        ].map((s) => (
          <div key={s.l} className="card-warm">
            <s.i className="h-4 w-4 text-caramel-dark" />
            <div className="text-xs text-coffee-500 mt-1">{s.l}</div>
            <div className="font-display text-2xl font-bold text-coffee-900">{s.v}</div>
            <div className="text-xs text-coffee-500">{s.s}</div>
          </div>
        ))}
      </div>

      {/* Subscriptions + Trials + System health */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="card-warm">
          <div className="flex items-center gap-2 text-coffee-700 text-sm font-semibold">
            <IndianRupee className="h-4 w-4" /> Subscriptions
          </div>
          <div className="font-display text-3xl font-bold text-coffee-900 mt-2">{activeSubs}</div>
          <div className="text-xs text-coffee-600">currently active</div>
          <Link href="/admin/cafes" className="text-xs text-coffee-700 hover:underline mt-2 inline-flex items-center gap-1">
            Manage plans <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className={`card-warm ${trialEndingSoon > 0 ? 'border-amber-300 bg-amber-50/50' : ''}`}>
          <div className="flex items-center gap-2 text-coffee-700 text-sm font-semibold">
            <AlertCircle className="h-4 w-4" /> Trials ending in 7 days
          </div>
          <div className="font-display text-3xl font-bold text-coffee-900 mt-2">{trialEndingSoon}</div>
          <div className="text-xs text-coffee-600">{trialEndingSoon > 0 ? 'reach out + offer onboarding help' : 'all good'}</div>
        </div>

        <div className="card-warm">
          <div className="flex items-center gap-2 text-coffee-700 text-sm font-semibold">
            <Wifi className="h-4 w-4" /> System health
          </div>
          <ul className="text-xs text-coffee-700 mt-2 space-y-1.5">
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" /> Mail</span>
              <span className={`pill text-[10px] ${mailReady ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{mailLabel}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5"><Wifi className="h-3 w-3" /> Baileys</span>
              <span className={`pill text-[10px] ${baileysCount ? 'bg-emerald-100 text-emerald-800' : 'bg-coffee-100 text-coffee-700'}`}>
                {baileysCount} session{baileysCount !== 1 ? 's' : ''} live
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5"><Bell className="h-3 w-3" /> Broadcasts (30d)</span>
              <span className="pill text-[10px] bg-coffee-100 text-coffee-700">{totalNotifications}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {/* Broadcast (left, 1/3) */}
        <BroadcastCard />

        {/* Recent cafes (middle 1/3) */}
        <div className="card-warm">
          <h2 className="font-bold text-coffee-900 mb-3">Recent cafes</h2>
          <div className="divide-y divide-coffee-50">
            {recentCafes.map((c) => (
              <Link
                key={c.id}
                href={`/admin/cafes/${c.id}`}
                className="flex items-center justify-between py-2 hover:bg-cream-50 -mx-2 px-2 rounded"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-coffee-900 text-sm truncate">{c.name}</div>
                  <div className="text-[11px] text-coffee-500 truncate">{c.owner.name ?? c.owner.email}</div>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <span className={`pill text-[10px] ${c.status === 'ACTIVE' ? 'pill-wa' : c.status === 'TRIAL' ? 'pill-amber' : 'pill-rose'}`}>{c.status}</span>
                  <div className="text-[10px] text-coffee-500 mt-0.5">{c._count.orders} orders</div>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/admin/cafes" className="text-xs text-coffee-700 hover:underline mt-3 inline-flex items-center gap-1">
            All cafes <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Recent orders feed (right 1/3) */}
        <div className="card-warm">
          <h2 className="font-bold text-coffee-900 mb-3">Latest orders (all cafes)</h2>
          {recentOrders.length === 0 ? (
            <div className="text-sm text-coffee-500 py-6 text-center">No orders yet.</div>
          ) : (
            <ul className="divide-y divide-coffee-50">
              {recentOrders.map((o) => (
                <li key={o.id} className="py-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-coffee-900 truncate">#{o.orderNumber}</div>
                    <div className="text-[11px] text-coffee-500 truncate">{o.cafe?.name ?? '—'} · {o.items.length} items</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-coffee-900">{formatCurrency(o.totalAmount)}</div>
                    <div className="text-[10px] text-coffee-500">{timeAgo(o.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
