import { Coffee } from 'lucide-react';
import { getOwnerCafe } from '@/lib/guards';
import { DashboardSidebar, MobileBottomNav, MobileMenuButton } from '@/components/dashboard/sidebar';
import { NotificationsBell } from '@/components/dashboard/notifications-bell';
import { OpenClosedToggle } from '@/components/dashboard/open-closed-toggle';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, cafe, staffRole } = await getOwnerCafe();

  if (!cafe) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream-50 p-6">
        <div className="card-warm max-w-md w-full text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-cream-200 grid place-items-center">
            <Coffee className="h-6 w-6 text-coffee-700" />
          </div>
          <h1 className="font-display text-2xl font-bold text-coffee-900 mt-3">No cafe found</h1>
          <p className="text-coffee-600 mt-1">This account isn't linked to the cafe. Please contact the administrator.</p>
        </div>
      </div>
    );
  }

  const role = staffRole ?? 'OWNER';

  return (
    <div className="min-h-screen flex bg-cream-50">
      <DashboardSidebar role={role} cafeName={cafe.name} />
      <div className="flex-1 min-w-0 flex flex-col pb-24 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-coffee-100 bg-white/85 backdrop-blur">
          <div className="px-4 md:px-6 h-14 flex items-center justify-between">
            <div className="md:hidden flex items-center gap-2 min-w-0">
              <MobileMenuButton compact />
              <span
                className="grid h-8 w-8 place-items-center rounded-lg bg-coffee-gradient text-cream-50 bg-cover bg-center shrink-0"
                data-brand-logo
              >
                <Coffee className="h-4 w-4" data-brand-logo-icon />
              </span>
              <span className="font-bold text-coffee-900 truncate min-w-0">{cafe.name}</span>
            </div>
            <div className="hidden md:block text-sm text-coffee-600">
              Welcome back, <span className="font-semibold text-coffee-900">{session.user.name ?? 'there'}</span>
            </div>
            <div className="flex items-center gap-2">
              {role === 'OWNER' && (
                <OpenClosedToggle initialOpen={(cafe as any).isOpen ?? true} />
              )}
              <NotificationsBell cafeId={cafe.id} />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
