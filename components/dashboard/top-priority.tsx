import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriorityVendor {
  id: string;
  name: string;
  domain: string;
  category: string;
  criticality: string;
  score: number;
  grade: string;
  riskTier: string;
  priorityScore: number;
  trend: 'up' | 'down' | 'stable';
}

interface TopPriorityProps {
  vendors: PriorityVendor[];
}

export function TopPriority({ vendors }: TopPriorityProps) {
  return (
    <Card className="shadow-xs border bg-card">
      <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold">Priority Review Queue</CardTitle>
          <CardDescription className="text-xs">
            Targeted review ranked by business impact: (Severity Weight × Criticality)
          </CardDescription>
        </div>
        <Link
          href="/remediation"
          className="text-xs font-mono font-medium text-foreground hover:underline flex items-center gap-1"
        >
          <span>Queue ({vendors.length})</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {vendors.map((vendor, idx) => {
            const scoreColor =
              vendor.score >= 80 ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' :
              vendor.score >= 65 ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' :
              'text-red-500 border-red-500/30 bg-red-500/10';

            return (
              <div
                key={vendor.id}
                className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-muted-foreground w-4 text-center">
                    0{idx + 1}
                  </span>
                  <div>
                    <Link
                      href={`/vendors/${vendor.id}`}
                      className="font-medium text-xs hover:underline flex items-center gap-1.5"
                    >
                      <span className="font-semibold text-foreground">{vendor.name}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">({vendor.domain})</span>
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-muted-foreground">
                      <span>{vendor.category}</span>
                      <span>•</span>
                      <span>Criticality: <strong className="text-foreground">{vendor.criticality}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {vendor.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                    {vendor.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                    {vendor.trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                  </div>

                  <div className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${scoreColor}`}>
                    {vendor.score} ({vendor.grade})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
