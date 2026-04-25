import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      _count: { select: { ownedCafes: true, staffOf: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Users</h1>
        <p className="text-coffee-600 text-sm">{users.length} users on the platform</p>
      </div>

      <div className="card-warm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="text-left text-coffee-500 border-b border-coffee-100">
              <th className="py-2">User</th><th>Email</th><th>Role</th><th>Cafes</th><th>Active</th><th>Joined</th>
            </tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-coffee-50 last:border-0">
                  <td className="py-2 font-semibold text-coffee-900">{u.name ?? '—'}</td>
                  <td>{u.email}</td>
                  <td><span className="pill-coffee">{u.role}</span></td>
                  <td>{u._count.ownedCafes + u._count.staffOf}</td>
                  <td><span className={`pill ${u.isActive ? 'pill-wa' : 'pill-rose'}`}>{u.isActive ? 'yes' : 'no'}</span></td>
                  <td className="text-xs">{formatDate(u.createdAt, { dateStyle: 'short', timeStyle: undefined })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
