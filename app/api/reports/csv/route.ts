import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePortfolioCsv } from '@/lib/csv';

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        scanResults: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const exportRows = vendors.map((v) => {
      const scan = v.scanResults[0];
      return {
        name: v.name,
        domain: v.domain,
        category: v.category,
        criticality: v.criticality,
        score: scan?.score ?? 100,
        grade: scan?.grade ?? 'A',
        riskTier: scan?.riskTier ?? 'Low',
        coveragePercent: scan?.coveragePercent ?? 100,
        lastScanned: scan?.timestamp ?? v.createdAt,
      };
    });

    const csvContent = generatePortfolioCsv(exportRows);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="VendorLens_Portfolio_Risk_Register.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to export CSV' }, { status: 500 });
  }
}
