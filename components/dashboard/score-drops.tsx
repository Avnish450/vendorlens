import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TrendingDown, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScoreDropItem {
  vendorId: string;
  vendorName: string;
  domain: string;
  previousScore: number;
  currentScore: number;
  dropPoints: number;
  criticality: string;
  triggerReason: string;
}

interface ScoreDropsProps {
  items: ScoreDropItem[];
}

export function ScoreDrops({ items }: ScoreDropsProps) {
  if (items.length === 0) {
    return (
      <Card className="shadow-xs border bg-card">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-sm font-semibold">30-Day Posture Degradations</CardTitle>
          <CardDescription className="text-xs">
            Vendors exhibiting significant security score drops (≥10 pts)
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-xs font-mono text-muted-foreground">
          No significant score degradations detected in the last 30 days.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xs border bg-card">
      <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span>30-Day Score Drops</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Vendors exhibiting ≥10 point degradation requiring immediate audit review
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-xs font-mono font-semibold text-red-500 border-red-500/30">
          {items.length} flagged
        </Badge>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.vendorId}
            className="p-3.5 rounded-md border bg-muted/20 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Link
                href={`/vendors/${item.vendorId}`}
                className="font-semibold text-xs hover:underline text-foreground flex items-center gap-1.5"
              >
                <span>{item.vendorName}</span>
                <span className="text-[11px] font-mono text-muted-foreground">({item.domain})</span>
              </Link>
              <span className="text-xs font-mono font-bold text-red-500 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded">
                -{item.dropPoints} pts
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed font-mono text-[11px]">
              {item.triggerReason}
            </p>

            <div className="flex items-center justify-between pt-1 border-t text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Score:</span>
                <span className="text-muted-foreground line-through">{item.previousScore}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-red-500 font-bold">{item.currentScore}</span>
              </div>

              <Link
                href={`/vendors/${item.vendorId}`}
                className="text-xs text-foreground font-semibold hover:underline"
              >
                Inspect Signals →
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
