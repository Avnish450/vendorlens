import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runFullScan } from '@/lib/collectors/orchestrator';
import { calculateScore, calculatePriority } from '@/lib/scoring';

export async function POST(req: NextRequest) {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        scanResults: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const results = [];

    // Process vendors sequentially to avoid overwhelming rate limits
    for (const vendor of vendors) {
      try {
        let findings: any[] = [];
        let isFromCache = false;

        try {
          const prods = vendor.declaredProducts
            ? vendor.declaredProducts.split(',').map((p) => p.trim())
            : [];
          const scanOut = await runFullScan(vendor.domain, prods, 10000);
          findings = scanOut.results;
        } catch {
          const cached = await prisma.cachedSnapshot.findUnique({
            where: { domain: vendor.domain },
          });
          if (cached) {
            findings = JSON.parse(cached.data).findings || [];
            isFromCache = true;
          }
        }

        if (findings.length > 0) {
          const scoring = calculateScore(findings);
          const scan = await prisma.scanResult.create({
            data: {
              vendorId: vendor.id,
              score: scoring.score,
              grade: scoring.grade,
              riskTier: scoring.riskTier,
              coveragePercent: scoring.coverage,
              isFromCache,
              timestamp: new Date(),
            },
          });

          await prisma.scoreHistory.create({
            data: {
              vendorId: vendor.id,
              score: scoring.score,
              grade: scoring.grade,
              coverage: scoring.coverage,
              date: new Date(),
              isSynthetic: false,
            },
          });

          results.push({ id: vendor.id, name: vendor.name, score: scoring.score, isFromCache });
        }
      } catch (err: any) {
        results.push({ id: vendor.id, name: vendor.name, error: err.message });
      }
    }

    return NextResponse.json({ success: true, scannedCount: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to run batch scan' }, { status: 500 });
  }
}
