import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateScore } from '@/lib/scoring';

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
          include: {
            findings: true,
          },
        },
        scoreHistory: {
          orderBy: { date: 'asc' },
          take: 60,
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const latestScan = vendor.scanResults[0];
    const findings = latestScan?.findings || [];
    const scoreCalc = calculateScore(findings as any);

    return NextResponse.json({
      id: vendor.id,
      name: vendor.name,
      domain: vendor.domain,
      category: vendor.category,
      criticality: vendor.criticality,
      declaredProducts: vendor.declaredProducts,
      score: latestScan?.score ?? 100,
      grade: latestScan?.grade ?? 'A',
      riskTier: latestScan?.riskTier ?? 'Low',
      coveragePercent: latestScan?.coveragePercent ?? 100,
      isFromCache: latestScan?.isFromCache ?? false,
      lastScanned: latestScan?.timestamp ?? vendor.createdAt,
      findings,
      categoryBreakdown: scoreCalc.categoryBreakdown,
      scoreHistory: vendor.scoreHistory.map((h) => ({
        date: h.date.toISOString(),
        score: h.score,
        grade: h.grade,
        isSynthetic: h.isSynthetic,
      })),
      alerts: vendor.alerts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error fetching vendor' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, category, criticality, declaredProducts } = body;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: name?.trim(),
        category,
        criticality,
        declaredProducts: declaredProducts?.trim(),
      },
    });

    return NextResponse.json(vendor);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error updating vendor' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.vendor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error deleting vendor' }, { status: 500 });
  }
}
