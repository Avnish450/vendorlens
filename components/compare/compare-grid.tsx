'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, GitCompare } from 'lucide-react';
import Link from 'next/link';

interface CompareVendor {
  id: string;
  name: string;
  domain: string;
  category: string;
  criticality: string;
  score: number;
  grade: string;
  riskTier: string;
  coveragePercent: number;
  findings: Array<{
    checkName: string;
    category: string;
    status: 'PASS' | 'FAIL' | 'UNKNOWN';
    severity: string;
    evidence: string;
  }>;
}

interface CompareGridProps {
  allVendors: Array<{ id: string; name: string; domain: string }>;
  initialSelectedIds?: string[];
}

export function CompareGrid({ allVendors, initialSelectedIds = [] }: CompareGridProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    initialSelectedIds.length > 0
      ? initialSelectedIds.slice(0, 3)
      : allVendors.slice(0, 2).map((v) => v.id)
  );

  const [compareData, setCompareData] = React.useState<CompareVendor[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (selectedIds.length === 0) return;

    let isMounted = true;
    setLoading(true);

    Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/vendors/${id}`)
          .then((res) => res.json())
          .catch(() => null)
      )
    ).then((results) => {
      if (isMounted) {
        setCompareData(results.filter(Boolean));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedIds]);

  const handleSelectVendor = (index: number, newId: string) => {
    const updated = [...selectedIds];
    updated[index] = newId;
    setSelectedIds(updated);
  };

  const handleAddSlot = () => {
    if (selectedIds.length < 3) {
      const remaining = allVendors.find((v) => !selectedIds.includes(v.id));
      if (remaining) {
        setSelectedIds([...selectedIds, remaining.id]);
      }
    }
  };

  const handleRemoveSlot = (index: number) => {
    if (selectedIds.length > 1) {
      setSelectedIds(selectedIds.filter((_, i) => i !== index));
    }
  };

  // Extract all unique check names for comparison matrix
  const allCheckNames = React.useMemo(() => {
    const set = new Set<string>();
    for (const v of compareData) {
      for (const f of v.findings || []) {
        set.add(f.checkName);
      }
    }
    return Array.from(set);
  }, [compareData]);

  return (
    <div className="space-y-6">
      {/* Selector Controls */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Vendor Comparison Matrix</CardTitle>
            </div>
            {selectedIds.length < 3 && (
              <Button size="sm" variant="outline" onClick={handleAddSlot} className="text-xs">
                + Add Third Vendor
              </Button>
            )}
          </div>
          <CardDescription className="text-xs">
            Compare verified security posture side-by-side across cloud and SaaS providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedIds.map((selectedId, idx) => (
              <div key={idx} className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Vendor #{idx + 1}</span>
                  {selectedIds.length > 2 && (
                    <button
                      onClick={() => handleRemoveSlot(idx)}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <select
                  value={selectedId}
                  onChange={(e) => handleSelectVendor(idx, e.target.value)}
                  className="w-full h-9 px-3 rounded-md border text-xs bg-background text-foreground"
                >
                  {allVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.domain})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {compareData.map((v) => {
          const scoreColor =
            v.score >= 80 ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' :
            v.score >= 65 ? 'text-amber-600 bg-amber-500/10 border-amber-500/20' :
            'text-red-600 bg-red-500/10 border-red-500/20';

          return (
            <Card key={v.id} className="shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {v.category}
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Criticality: {v.criticality}
                  </span>
                </div>
                <CardTitle className="text-base font-bold mt-1">
                  <Link href={`/vendors/${v.id}`} className="hover:underline hover:text-primary">
                    {v.name}
                  </Link>
                </CardTitle>
                <CardDescription className="text-xs">{v.domain}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="p-4 rounded-xl border flex items-center justify-between bg-muted/10">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Score</span>
                    <div className="text-3xl font-extrabold text-foreground">{v.score}/100</div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${scoreColor}`}>
                    Grade {v.grade} • {v.riskTier}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>Coverage: <strong>{v.coveragePercent}%</strong></span>
                  <span>Failing checks: <strong>{(v.findings || []).filter((f) => f.status === 'FAIL').length}</strong></span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Check-by-Check Matrix */}
      {compareData.length > 0 && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold">Signal-by-Signal Verification Matrix</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 font-semibold text-foreground w-1/3">Security Check</th>
                  {compareData.map((v) => (
                    <th key={v.id} className="p-3 font-semibold text-foreground">
                      {v.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {allCheckNames.map((chk) => (
                  <tr key={chk} className="hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{chk}</td>
                    {compareData.map((v) => {
                      const finding = (v.findings || []).find((f) => f.checkName === chk);
                      if (!finding) {
                        return <td key={v.id} className="p-3 text-muted-foreground">—</td>;
                      }

                      return (
                        <td key={v.id} className="p-3">
                          {finding.status === 'PASS' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              PASS
                            </span>
                          )}
                          {finding.status === 'FAIL' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              FAIL
                            </span>
                          )}
                          {finding.status === 'UNKNOWN' && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                              UNKNOWN
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
