import { prisma } from '@/lib/db';
import { CompareGrid } from '@/components/compare/compare-grid';

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true, domain: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Vendor Comparison Analysis
        </h2>
        <p className="text-xs text-muted-foreground">
          Evaluate public security postures, category strengths, and finding parity side-by-side
        </p>
      </div>

      <CompareGrid allVendors={vendors} />
    </div>
  );
}
