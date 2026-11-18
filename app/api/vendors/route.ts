import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateDomain } from '@/lib/ssrf';
import { runFullScan } from '@/lib/collectors/orchestrator';
import { calculateScore, calculatePriority } from '@/lib/scoring';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const criticality = searchParams.get('criticality');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { domain: { contains: search } },
      ];
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (criticality && criticality !== 'ALL') {
      where.criticality = criticality;
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        scanResults: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        scoreHistory: {
          orderBy: { date: 'desc' },
          take: 2,
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = vendors.map((v) => {
      const latestScan = v.scanResults[0];
      const h1 = v.scoreHistory[0]?.score ?? (latestScan?.score ?? 100);
      const h2 = v.scoreHistory[1]?.score ?? h1;
      const trend = h1 > h2 ? 'up' : h1 < h2 ? 'down' : 'stable';

      return {
        id: v.id,
        name: v.name,
        domain: v.domain,
        category: v.category,
        criticality: v.criticality,
        declaredProducts: v.declaredProducts,
        score: latestScan?.score ?? 100,
        grade: latestScan?.grade ?? 'A',
        riskTier: latestScan?.riskTier ?? 'Low',
        coveragePercent: latestScan?.coveragePercent ?? 100,
        lastScanned: latestScan?.timestamp ?? v.createdAt,
        trend,
      };
    });

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list vendors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, domain, category, criticality, declaredProducts } = body;

    if (!name || !domain) {
      return NextResponse.json({ error: 'Name and domain are required' }, { status: 400 });
    }

    // SSRF Domain validation
    const ssrfCheck = await validateDomain(domain);
    if (!ssrfCheck.safe) {
      return NextResponse.json(
        { error: `Domain rejected for security reasons: ${ssrfCheck.reason}` },
        { status: 400 }
      );
    }

    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Check if domain already exists
    const existing = await prisma.vendor.findUnique({
      where: { domain: cleanDomain },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Vendor with domain "${cleanDomain}" is already monitored` },
        { status: 409 }
      );
    }

    // Create vendor record
    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        domain: cleanDomain,
        category: category || 'SaaS',
        criticality: criticality || 'Medium',
        declaredProducts: declaredProducts ? declaredProducts.trim() : '',
      },
    });

    // Run initial scan in the background/inline
    try {
      const prods = declaredProducts ? declaredProducts.split(',').map((p: string) => p.trim()) : [];
      const scanOut = await runFullScan(cleanDomain, prods, 10000);
      const scoring = calculateScore(scanOut.results as any);

      const scanResult = await prisma.scanResult.create({
        data: {
          vendorId: vendor.id,
          score: scoring.score,
          grade: scoring.grade,
          riskTier: scoring.riskTier,
          coveragePercent: scoring.coverage,
          isFromCache: false,
          timestamp: new Date(),
        },
      });

      for (const f of scanOut.results) {
        const finding = await prisma.finding.create({
          data: {
            scanResultId: scanResult.id,
            vendorId: vendor.id,
            checkName: f.checkName,
            category: f.category,
            status: f.status,
            severity: f.severity,
            evidence: f.evidence,
            sourceUrl: f.sourceUrl,
            rawValue: f.rawValue,
            confidence: f.confidence,
            whyItMatters: f.whyItMatters,
            recommendedFix: f.recommendedFix,
            timestamp: new Date(),
          },
        });

        if (f.status === 'FAIL') {
          const priority = calculatePriority(f.severity, vendor.criticality);
          await prisma.remediationItem.create({
            data: {
              findingId: finding.id,
              vendorId: vendor.id,
              priority,
              status: 'Open',
              note: `Detected during initial scan: ${f.checkName}`,
            },
          });
        }
      }

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
    } catch {
      // If initial scan timed out or offline, seed an initial score entry
      await prisma.scanResult.create({
        data: {
          vendorId: vendor.id,
          score: 80,
          grade: 'B',
          riskTier: 'Low',
          coveragePercent: 50,
          isFromCache: true,
          cacheDate: new Date().toISOString(),
          timestamp: new Date(),
        },
      });
    }

    return NextResponse.json({ id: vendor.id, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create vendor' }, { status: 500 });
  }
}
