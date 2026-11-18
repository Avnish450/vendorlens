'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  FileDown,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScoreGauge } from '@/components/vendors/score-gauge';
import { ScoreHistoryChart } from '@/components/vendors/score-history-chart';
import { CategoryBreakdown } from '@/components/vendors/category-breakdown';
import { FindingsTable } from '@/components/vendors/findings-table';
import { ScanProgress } from '@/components/vendors/scan-progress';
import { formatTimeAgo } from '@/lib/utils';

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [vendor, setVendor] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  const fetchVendor = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/vendors/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setVendor(data);
    } catch {
      router.push('/vendors');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  React.useEffect(() => {
    if (id) {
      fetchVendor();
    }
  }, [id, fetchVendor]);

  // Load analyst security briefing
  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/summary/${id}`);
      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setSummary('Unable to generate security briefing at this time.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Run live re-scan
  const handleRescan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: id }),
      });
      if (res.ok) {
        await fetchVendor();
      }
    } catch (err: any) {
      alert(`Scan failed: ${err?.message}`);
    } finally {
      setScanning(false);
    }
  };

  // Delete vendor
  const handleDelete = async () => {
    try {
      await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      router.push('/vendors');
      router.refresh();
    } catch {
      alert('Failed to delete vendor');
    }
  };

  if (loading || !vendor) {
    return (
      <div className="py-20 text-center space-y-3 font-mono text-xs text-muted-foreground">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p>Loading vendor assessment dossier...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link href="/vendors">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{vendor.name}</h2>
              <Badge variant="outline" className="text-xs font-mono font-normal">
                {vendor.category}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono font-normal">
                {vendor.criticality} Criticality
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
              <span>{vendor.domain}</span>
              <span>•</span>
              <span>Last scanned: {formatTimeAgo(new Date(vendor.lastScanned))}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live Rescan Button */}
          <Button
            size="sm"
            variant="default"
            disabled={scanning}
            onClick={handleRescan}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Running Collectors...' : 'Run Live Scan'}</span>
          </Button>

          {/* Export PDF Button */}
          <a href={`/api/reports/pdf?vendorId=${vendor.id}`} download>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
              <FileDown className="h-3.5 w-3.5" />
              <span>Export PDF</span>
            </Button>
          </a>

          {/* Edit Profile */}
          <Link href={`/vendors/${vendor.id}/edit`}>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
              <Edit className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
          </Link>

          {/* Delete Button */}
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" onClick={handleDelete} className="h-8 text-xs">
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)} className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteConfirm(true)}
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
              title="Delete Vendor"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Live Scan Tracker Banner (if active) */}
      <ScanProgress isScanning={scanning} />

      {/* Top Visual Cards: Scorecard + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScoreGauge
          score={vendor.score}
          grade={vendor.grade}
          riskTier={vendor.riskTier}
          coverage={vendor.coveragePercent}
          isFromCache={vendor.isFromCache}
        />
        <div className="lg:col-span-2">
          <CategoryBreakdown categories={vendor.categoryBreakdown || []} />
        </div>
      </div>

      {/* 60-Day Score Trajectory */}
      <ScoreHistoryChart data={vendor.scoreHistory || []} />

      {/* Security Analyst Briefing */}
      <Card className="shadow-xs border bg-card">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Security Assessment Briefing</CardTitle>
            <CardDescription className="text-xs">
              Evidence-based synthesis derived exclusively from verified public signals
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchSummary}
            disabled={loadingSummary}
            className="h-7 text-xs gap-1 font-mono"
          >
            <FileText className="h-3 w-3" />
            <span>{summary ? 'Refresh Briefing' : 'Generate Briefing'}</span>
          </Button>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed pt-1">
          {summary ? (
            <div className="p-3.5 rounded-md bg-muted/30 border text-foreground whitespace-pre-line font-mono text-[11px] leading-relaxed">
              {summary}
            </div>
          ) : (
            <p className="font-mono text-[11px]">
              Click &quot;Generate Briefing&quot; to compile a factual security synthesis from the recorded findings.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Verified Security Findings & Evidence Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Verified Security Findings & Telemetry</h3>
          <span className="text-xs font-mono text-muted-foreground">
            {vendor.findings?.length || 0} checks logged
          </span>
        </div>
        <FindingsTable findings={vendor.findings || []} />
      </div>
    </div>
  );
}
