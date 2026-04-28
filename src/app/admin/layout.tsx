import Link from 'next/link';
import { Coffee, Shield } from 'lucide-react';
import { requireSuperAdmin } from '@/lib/guards';
import { DashboardSidebar, MobileBottomNav } from '@/components/dashboard/sidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin();
  return (
    <div className="min-h-screen flex bg-cream-50">
      <DashboardSidebar role="SUPER_ADMIN" isAdmin />
      <div className="flex-1 min-w-0 flex flex-col pb-24 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-coffee-100 bg-white/85 backdrop-blur">
          <div className="px-4 md:px-6 h-14 flex items-center justify-between">
            <div className="md:hidden flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-coffee-gradient text-cream-50">
                <Shield className="h-4 w-4" />
              </span>
              <span className="font-bold text-coffee-900">Super Admin</span>
            </div>
            <div className="hidden md:block text-sm text-coffee-600">
              Logged in as <span className="font-semibold text-coffee-900">{session.user.email}</span>
            </div>
            <Link href="/dashboard" className="text-xs text-coffee-700 hover:text-coffee-900">
              Switch to my cafe →
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <MobileBottomNav isAdmin />
    </div>
  );
}
