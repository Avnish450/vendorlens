import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface PortfolioScoreProps {
  score: number;
  grade: string;
  riskTier: string;
  coverage: number;
}

export function PortfolioScore({ score, grade, riskTier, coverage }: PortfolioScoreProps) {
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Low':
        return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
      case 'Medium':
        return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
      default:
        return 'text-red-500 border-red-500/30 bg-red-500/10';
    }
  };

  return (
    <Card className="flex flex-col shadow-xs border bg-card">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Portfolio Risk Index</CardTitle>
          <Badge variant="outline" className={`font-mono text-xs font-semibold px-2 py-0.5 ${getTierBadge(riskTier)}`}>
            {riskTier} Risk
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Aggregated deterministic security posture across all evaluated vendors
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between p-6 space-y-4">
        <div>
          <span className="text-[11px] font-mono uppercase text-muted-foreground tracking-wider">
            Average Score
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold font-mono text-foreground tracking-tight">
              {score}
            </span>
            <span className="text-sm font-mono text-muted-foreground">/ 100</span>
            <span className="ml-auto text-xl font-bold font-mono text-foreground border px-2.5 py-0.5 rounded bg-muted/40">
              Grade {grade}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted-foreground">Average Signal Coverage</span>
            <span className="font-semibold text-foreground">{coverage}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-300"
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
