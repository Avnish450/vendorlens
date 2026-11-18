import { prisma } from '@/lib/db';
import { VendorTable, VendorTableRow } from '@/components/vendors/vendor-table';

export const dynamic = 'force-dynamic';

export default async function VendorsDirectoryPage() {
  const vendors = await prisma.vendor.findMany({
    include: {
      scanResults: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
      scoreHistory: {
        orderBy: { date: 'desc' },
        take: 2,
      },
    },
    orderBy: { name: 'asc' },
  });

  const formattedVendors: VendorTableRow[] = vendors.map((v) => {
    const scan = v.scanResults[0];
    const score = scan?.score ?? 100;
    const grade = scan?.grade ?? 'A';
    const riskTier = scan?.riskTier ?? 'Low';
    const coverage = scan?.coveragePercent ?? 100;
    const lastScanned = scan?.timestamp ?? v.createdAt;

    const hRecent = v.scoreHistory[0]?.score ?? score;
    const hPast = v.scoreHistory[1]?.score ?? hRecent;
    const trend: 'up' | 'down' | 'stable' =
      hRecent > hPast ? 'up' : hRecent < hPast ? 'down' : 'stable';

    return {
      id: v.id,
      name: v.name,
      domain: v.domain,
      category: v.category,
      criticality: v.criticality,
      score,
      grade,
      riskTier,
      coveragePercent: coverage,
      lastScanned,
      trend,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Third-Party Vendor Directory
          </h2>
          <p className="text-xs text-muted-foreground">
            Search, filter, and audit verified continuous perimeter risk signals
          </p>
        </div>
      </div>

      <VendorTable initialVendors={formattedVendors} />
    </div>
  );
}
