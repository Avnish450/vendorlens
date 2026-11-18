import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const items = await prisma.remediationItem.findMany({
      where,
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

    const formatted = items.map((i) => ({
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

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list remediation items' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, note } = body;

    const data: any = {};
    if (status) data.status = status;
    if (note !== undefined) data.note = note;

    const updated = await prisma.remediationItem.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update remediation item' }, { status: 500 });
  }
}
