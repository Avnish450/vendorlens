'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Shield,
  Lightbulb,
} from 'lucide-react';
import { Finding } from '@/lib/scoring';

interface FindingsTableProps {
  findings: Finding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'PASS' | 'FAIL' | 'UNKNOWN'>('ALL');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('ALL');
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRows(next);
  };

  const filteredFindings = React.useMemo(() => {
    return findings.filter((f) => {
      const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;
      const matchCategory = categoryFilter === 'ALL' || f.category === categoryFilter;
      return matchStatus && matchCategory;
    });
  }, [findings, statusFilter, categoryFilter]);

  const counts = React.useMemo(() => {
    return {
      all: findings.length,
      pass: findings.filter((f) => f.status === 'PASS').length,
      fail: findings.filter((f) => f.status === 'FAIL').length,
      unknown: findings.filter((f) => f.status === 'UNKNOWN').length,
    };
  }, [findings]);

  return (
    <div className="space-y-3">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('ALL')}
            className="h-8 text-xs"
          >
            All Findings ({counts.all})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'FAIL' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('FAIL')}
            className="h-8 text-xs text-red-600 dark:text-red-400 gap-1"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Failing ({counts.fail})</span>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'PASS' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('PASS')}
            className="h-8 text-xs text-emerald-600 dark:text-emerald-400 gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Passing ({counts.pass})</span>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'UNKNOWN' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('UNKNOWN')}
            className="h-8 text-xs text-muted-foreground gap-1"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Unknown ({counts.unknown})</span>
          </Button>
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-8 px-2.5 rounded-md border text-xs bg-background text-foreground"
        >
          <option value="ALL">All Scoring Domains</option>
          <option value="email_dns">Email & DNS Security</option>
          <option value="transport">Transport Security (TLS)</option>
          <option value="web_hardening">Web Application Hardening</option>
          <option value="vulnerabilities">Known Exploited Vulnerabilities</option>
          <option value="exposure">Exposure & Hygiene</option>
        </select>
      </div>

      {/* Findings Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[30px]"></TableHead>
              <TableHead className="text-xs font-semibold">Security Check</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Severity</TableHead>
              <TableHead className="text-xs font-semibold">Evidence / Signal Observation</TableHead>
              <TableHead className="text-xs font-semibold">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFindings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  No security findings matched this filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredFindings.map((finding, idx) => {
                const rowKey = finding.id || `f-${idx}`;
                const isExpanded = expandedRows.has(rowKey);

                return (
                  <React.Fragment key={rowKey}>
                    <TableRow
                      onClick={() => toggleRow(rowKey)}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="p-2 text-center text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>

                      <TableCell className="font-semibold text-xs text-foreground">
                        {finding.checkName}
                      </TableCell>

                      <TableCell>
                        {finding.status === 'PASS' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            PASS
                          </span>
                        )}
                        {finding.status === 'FAIL' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            FAIL
                          </span>
                        )}
                        {finding.status === 'UNKNOWN' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                            UNKNOWN
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            finding.severity === 'Critical' ? 'border-red-500 text-red-600 dark:text-red-400' :
                            finding.severity === 'High' ? 'border-orange-500 text-orange-600 dark:text-orange-400' :
                            finding.severity === 'Medium' ? 'border-amber-500 text-amber-600 dark:text-amber-400' :
                            'border-border text-muted-foreground'
                          }`}
                        >
                          {finding.severity}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-foreground max-w-md truncate">
                        <span title={finding.evidence}>{finding.evidence}</span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {finding.confidence}
                      </TableCell>
                    </TableRow>

                    {/* Expandable Explanation Row */}
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={6} className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-md border bg-card space-y-1">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-primary" />
                                <span>Why this signal matters</span>
                              </div>
                              <p className="text-muted-foreground leading-relaxed">
                                {finding.whyItMatters || 'Evaluates baseline perimeter resilience against common exploit vectors.'}
                              </p>
                            </div>

                            <div className="p-3 rounded-md border bg-card space-y-1">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                                <span>Recommended Remediation</span>
                              </div>
                              <p className="text-muted-foreground leading-relaxed">
                                {finding.recommendedFix || 'Audit vendor compliance documentation and verify active implementation.'}
                              </p>
                            </div>
                          </div>

                          {finding.sourceUrl && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span>Signal Source:</span>
                              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">
                                {finding.sourceUrl}
                              </code>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
