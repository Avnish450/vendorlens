import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runFullScan } from '@/lib/collectors/orchestrator';
import { calculateScore, calculatePriority } from '@/lib/scoring';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = rateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please retry in ${rate.resetIn} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { vendorId } = body;

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        scanResults: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const previousScore = vendor.scanResults[0]?.score ?? 100;

    let scanFindings: any[] = [];
    let isFromCache = false;
    let cacheDate: string | null = null;

    try {
      // 1. Try Live Scan
      const prods = vendor.declaredProducts
        ? vendor.declaredProducts.split(',').map((p) => p.trim())
        : [];

      const scanResult = await runFullScan(vendor.domain, prods, 12000);
      scanFindings = scanResult.results;
    } catch (scanErr: any) {
      // 2. Offline Fallback to CachedSnapshot
      console.warn(`Live scan failed for ${vendor.domain}, attempting cached snapshot:`, scanErr?.message);

      const cached = await prisma.cachedSnapshot.findUnique({
        where: { domain: vendor.domain },
      });

      if (cached) {
        const parsed = JSON.parse(cached.data);
        scanFindings = parsed.findings || [];
        isFromCache = true;
        cacheDate = cached.capturedAt.toISOString();
      } else {
        throw new Error(`Live scan failed and no cached snapshot exists: ${scanErr?.message}`);
      }
    }

    // 3. Compute deterministic score
    const scoring = calculateScore(scanFindings);

    // 4. Save new ScanResult
    const newScan = await prisma.scanResult.create({
      data: {
        vendorId: vendor.id,
        score: scoring.score,
        grade: scoring.grade,
        riskTier: scoring.riskTier,
        coveragePercent: scoring.coverage,
        isFromCache,
        cacheDate,
        timestamp: new Date(),
      },
    });

    // 5. Store findings and queue remediation items
    for (const f of scanFindings) {
      const finding = await prisma.finding.create({
        data: {
          scanResultId: newScan.id,
          vendorId: vendor.id,
          checkName: f.checkName,
          category: f.category,
          status: f.status,
          severity: f.severity,
          evidence: f.evidence,
          sourceUrl: f.sourceUrl || '',
          rawValue: f.rawValue || '',
          confidence: f.confidence || 'High',
          whyItMatters: f.whyItMatters || '',
          recommendedFix: f.recommendedFix || '',
          timestamp: new Date(),
        },
      });

      if (f.status === 'FAIL') {
        const priority = calculatePriority(f.severity, vendor.criticality);
        // Avoid duplicate active remediation items for the exact same check
        const existingOpen = await prisma.remediationItem.findFirst({
          where: {
            vendorId: vendor.id,
            status: { in: ['Open', 'In Review'] },
            finding: { checkName: f.checkName },
          },
        });

        if (!existingOpen) {
          await prisma.remediationItem.create({
            data: {
              findingId: finding.id,
              vendorId: vendor.id,
              priority,
              status: 'Open',
              note: `Triggered from scan: ${f.checkName}`,
            },
          });
        }
      }
    }

    // 6. Record Score History
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

    // 7. Evaluate and trigger alerts
    const drop = previousScore - scoring.score;
    if (drop >= 10) {
      await prisma.alert.create({
        data: {
          vendorId: vendor.id,
          type: 'SCORE_DROP',
          title: `Score Degradation: -${drop} points`,
          message: `Vendor security posture dropped from ${previousScore} to ${scoring.score} during live assessment.`,
          severity: drop >= 20 ? 'Critical' : 'High',
          dismissed: false,
        },
      });
    }

    const hasKevFail = scanFindings.some(
      (f) => f.checkName.includes('KEV') && f.status === 'FAIL'
    );
    if (hasKevFail) {
      await prisma.alert.create({
        data: {
          vendorId: vendor.id,
          type: 'KEV_MATCH',
          title: 'Active CISA KEV Vulnerability Identified',
          message: 'Public CISA catalog matched actively weaponized zero-day against vendor products.',
          severity: 'Critical',
          dismissed: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      scanResultId: newScan.id,
      score: scoring.score,
      grade: scoring.grade,
      riskTier: scoring.riskTier,
      coveragePercent: scoring.coverage,
      isFromCache,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to complete scan' },
      { status: 500 }
    );
  }
}
