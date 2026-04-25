import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
import { prisma } from './prisma';
import type { UserRole } from '@prisma/client';

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) redirect('/login');
  return session;
}

export async function requireSuperAdmin() {
  return requireRole(['SUPER_ADMIN']);
}

export async function requireOwnerOrStaff() {
  return requireRole(['CAFE_OWNER', 'STAFF', 'SUPER_ADMIN']);
}

/** For dashboard pages — returns the cafe owned by current user. */
export async function getOwnerCafe() {
  const session = await requireRole(['CAFE_OWNER', 'STAFF', 'SUPER_ADMIN']);
  if (session.user.role === 'STAFF') {
    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { cafe: { include: { settings: true, plan: true } } },
    });
    return { session, cafe: staff?.cafe ?? null, staffRole: staff?.role ?? null };
  }
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: session.user.id },
    include: { settings: true, plan: true },
    orderBy: { createdAt: 'asc' },
  });
  return { session, cafe, staffRole: null };
}
