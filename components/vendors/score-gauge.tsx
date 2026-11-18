'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ScoreGaugeProps {
  score: number;
  grade: string;
  riskTier: string;
  coverage: number;
  isFromCache?: boolean;
}

export function ScoreGauge({ score, grade, riskTier, coverage, isFromCache }: ScoreGaugeProps) {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Low':
        return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
      case 'Medium':
        return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
      case 'High':
        return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
      default:
        return 'text-red-500 border-red-500/30 bg-red-500/10';
    }
  };

  return (
    <Card className="flex flex-col shadow-xs bg-card border">
      <CardContent className="p-6 flex flex-col justify-between h-full space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
              Security Score
            </span>
            <Badge variant="outline" className={`font-mono text-xs font-semibold px-2 py-0.5 ${getTierColor(riskTier)}`}>
              {riskTier} Risk
            </Badge>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold font-mono tracking-tight text-foreground">
              {score}
            </span>
            <span className="text-sm font-mono text-muted-foreground">/ 100</span>
            <span className="ml-auto text-xl font-bold font-mono text-foreground border px-2 py-0.5 rounded bg-muted/40">
              Grade {grade}
            </span>
          </div>
        </div>

        {/* Coverage Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted-foreground">Signal Coverage</span>
            <span className="font-semibold text-foreground">{coverage}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-300"
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>

        {isFromCache && (
          <div className="text-[11px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
            Cached snapshot (offline fallback mode)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
