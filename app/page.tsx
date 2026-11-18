import { prisma } from '@/lib/db';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { PortfolioScore } from '@/components/dashboard/portfolio-score';
import { TierDonut } from '@/components/dashboard/tier-donut';
import { TopPriority } from '@/components/dashboard/top-priority';
import { ScoreDrops } from '@/components/dashboard/score-drops';
import { isStale } from '@/lib/utils';
import { calculatePriority } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const vendors = await prisma.vendor.findMany({
    include: {
      scanResults: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
      scoreHistory: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });

  const totalVendors = vendors.length;
  let totalScore = 0;
  let criticalCount = 0;
  let staleCount = 0;
  const tierCounts: Record<string, number> = {
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0,
  };

  const priorityList = vendors.map((v) => {
    const scan = v.scanResults[0];
    const score = scan?.score ?? 100;
    const grade = scan?.grade ?? 'A';
    const riskTier = scan?.riskTier ?? 'Low';
    const coverage = scan?.coveragePercent ?? 100;
    const lastScanDate = scan?.timestamp ?? v.createdAt;

    totalScore += score;
    if (riskTier === 'Critical' || riskTier === 'High') {
      criticalCount++;
    }
    tierCounts[riskTier] = (tierCounts[riskTier] || 0) + 1;

    if (isStale(new Date(lastScanDate))) {
      staleCount++;
    }

    // Determine 30-day trend
    const hRecent = v.scoreHistory[0]?.score ?? score;
    const hPast = v.scoreHistory[v.scoreHistory.length - 1]?.score ?? score;
    const trend: 'up' | 'down' | 'stable' =
      hRecent > hPast ? 'up' : hRecent < hPast ? 'down' : 'stable';

    // Priority = severity_weight * criticality
    const sevForScore = score < 60 ? 'Critical' : score < 75 ? 'High' : 'Medium';
    const priorityScore = calculatePriority(sevForScore, v.criticality);

    return {
      id: v.id,
      name: v.name,
      domain: v.domain,
      category: v.category,
      criticality: v.criticality,
      score,
      grade,
      riskTier,
      coverage,
      priorityScore,
      trend,
      hPast,
      hRecent,
    };
  });

  const averageScore = totalVendors > 0 ? Math.round(totalScore / totalVendors) : 100;
  const portfolioGrade =
    averageScore >= 90 ? 'A' : averageScore >= 80 ? 'B' : averageScore >= 65 ? 'C' : averageScore >= 50 ? 'D' : 'F';
  const portfolioTier =
    averageScore >= 80 ? 'Low' : averageScore >= 65 ? 'Medium' : averageScore >= 40 ? 'High' : 'Critical';

  // Top 5 Priority Vendors
  const topPriorityVendors = [...priorityList]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);

  // Score Drops in the last 30 days (≥10 points drop)
  const scoreDrops = priorityList
    .filter((v) => v.hPast - v.hRecent >= 10)
    .map((v) => ({
      vendorId: v.id,
      vendorName: v.name,
      domain: v.domain,
      previousScore: v.hPast,
      currentScore: v.hRecent,
      dropPoints: v.hPast - v.hRecent,
      criticality: v.criticality,
      triggerReason: 'Newly disclosed CISA KEV exploitation or missing critical DMARC/HSTS controls detected.',
    }));

  return (
    <div className="space-y-6">
      {/* Top Level KPIs */}
      <KpiCards
        totalVendors={totalVendors}
        averageScore={averageScore}
        criticalVendorsCount={criticalCount}
        staleVendorsCount={staleCount}
      />

      {/* Middle Row: Score Gauge + Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioScore
          score={averageScore}
          grade={portfolioGrade}
          riskTier={portfolioTier}
          coverage={92}
        />
        <TierDonut
          data={[
            { tier: 'Low', count: tierCounts['Low'] || 0 },
            { tier: 'Medium', count: tierCounts['Medium'] || 0 },
            { tier: 'High', count: tierCounts['High'] || 0 },
            { tier: 'Critical', count: tierCounts['Critical'] || 0 },
          ]}
        />
      </div>

      {/* Bottom Row: Top Priority Queue + Score Drops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopPriority vendors={topPriorityVendors} />
        <ScoreDrops items={scoreDrops} />
      </div>
    </div>
  );
}
