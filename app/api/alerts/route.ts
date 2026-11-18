import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    const where: any = {};
    if (filter === 'active') {
      where.dismissed = false;
    } else if (filter === 'dismissed') {
      where.dismissed = true;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        vendor: {
          select: { name: true, domain: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = alerts.map((a) => ({
      id: a.id,
      vendorId: a.vendorId,
      vendorName: a.vendor.name,
      domain: a.vendor.domain,
      type: a.type as any,
      title: a.title,
      message: a.message,
      severity: a.severity,
      dismissed: a.dismissed,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list alerts' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, dismissed } = body;

    const alert = await prisma.alert.update({
      where: { id },
      data: { dismissed },
    });

    return NextResponse.json(alert);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update alert' }, { status: 500 });
  }
}
