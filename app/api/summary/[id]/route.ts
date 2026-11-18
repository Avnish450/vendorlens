import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSummary } from '@/lib/ai-summary';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        scanResults: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          include: { findings: true },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const latestScan = vendor.scanResults[0];
    const findings = (latestScan?.findings || []) as any;

    const summaryText = await generateSummary(
      {
        name: vendor.name,
        domain: vendor.domain,
        category: vendor.category,
        criticality: vendor.criticality,
        score: latestScan?.score ?? 100,
        grade: latestScan?.grade ?? 'A',
        riskTier: latestScan?.riskTier ?? 'Low',
        coveragePercent: latestScan?.coveragePercent ?? 100,
      },
      findings
    );

    return NextResponse.json({ summary: summaryText });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to generate summary' }, { status: 500 });
  }
}
