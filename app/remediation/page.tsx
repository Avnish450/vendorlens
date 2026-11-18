import { prisma } from '@/lib/db';
import { RemediationList, RemediationRow } from '@/components/remediation/remediation-list';

export const dynamic = 'force-dynamic';

export default async function RemediationQueuePage() {
  const items = await prisma.remediationItem.findMany({
    include: {
      vendor: {
        select: { name: true, domain: true, criticality: true },
      },
      finding: {
        select: {
          checkName: true,
          category: true,
          severity: true,
          evidence: true,
          recommendedFix: true,
        },
      },
    },
    orderBy: { priority: 'desc' },
  });

  const formatted: RemediationRow[] = items.map((i) => ({
    id: i.id,
    findingId: i.findingId,
    vendorId: i.vendorId,
    vendorName: i.vendor.name,
    domain: i.vendor.domain,
    criticality: i.vendor.criticality,
    checkName: i.finding.checkName,
    category: i.finding.category,
    severity: i.finding.severity,
    evidence: i.finding.evidence,
    recommendedFix: i.finding.recommendedFix,
    priority: i.priority,
    status: i.status as any,
    note: i.note,
    createdAt: i.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Prioritized Remediation Queue
        </h2>
        <p className="text-xs text-muted-foreground">
          Targeted security actions ranked by business impact: (Check Severity Weight × Vendor Criticality)
        </p>
      </div>

      <RemediationList initialItems={formatted} />
    </div>
  );
}
