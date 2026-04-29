/**
 * Live computation of which tables in a cafe are occupied right now.
 *
 * The Table.isOccupied column is a cached flag — multiple write paths
 * keep it in sync (place-order sets, status-update / cancel clears),
 * but historically a few paths missed clearing it (CANCELLED branch,
 * bulk-delete) and the flag rotted. Pages that show table state should
 * call this helper instead of trusting the stored bool, so a Completed
 * or Cancelled order frees the table on the next render no matter
 * what.
 *
 * "Open" = the order is still meaningfully holding the table:
 *   NEW · ACCEPTED · PREPARING · READY
 * SERVED / COMPLETED / CANCELLED → table is free.
 */
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

const OPEN_STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'READY'] as const;

export async function getLiveOccupiedSet(cafeId: string): Promise<Set<string>> {
  const rows = await prisma.order.groupBy({
    by: ['tableId'],
    where: {
      cafeId,
      tableId: { not: null },
      status: { in: [...OPEN_STATUSES] as OrderStatus[] },
    },
    _count: { tableId: true },
  });
  return new Set(rows.map((r) => r.tableId).filter((id): id is string => Boolean(id)));
}

/**
 * Augment a list of tables with a fresh isOccupied derived from
 * open-order count. Cheap — one grouped count per page render.
 */
export async function withLiveOccupancy<T extends { id: string; isOccupied?: boolean }>(
  cafeId: string,
  tables: T[],
): Promise<(T & { isOccupied: boolean })[]> {
  const occupied = await getLiveOccupiedSet(cafeId);
  return tables.map((t) => ({ ...t, isOccupied: occupied.has(t.id) }));
}
