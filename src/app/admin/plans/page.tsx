import { prisma } from '@/lib/prisma';
import { PlansEditor } from '@/components/admin/plans-editor';

export const dynamic = 'force-dynamic';

export default async function AdminPlans() {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  return <PlansEditor initial={plans} />;
}
