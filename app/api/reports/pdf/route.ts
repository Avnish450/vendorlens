import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateVendorPdf } from '@/lib/pdf';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
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
    if (!latestScan) {
      return NextResponse.json({ error: 'No scan results available for vendor' }, { status: 400 });
    }

    const pdfBuffer = generateVendorPdf(
      {
        name: vendor.name,
        domain: vendor.domain,
        category: vendor.category,
        criticality: vendor.criticality,
        declaredProducts: vendor.declaredProducts,
      },
      {
        score: latestScan.score,
        grade: latestScan.grade,
        riskTier: latestScan.riskTier,
        coveragePercent: latestScan.coveragePercent,
        timestamp: latestScan.timestamp,
        isFromCache: latestScan.isFromCache,
      },
      latestScan.findings as any
    );

    const safeName = vendor.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="VendorLens_${safeName}_Risk_Report.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
