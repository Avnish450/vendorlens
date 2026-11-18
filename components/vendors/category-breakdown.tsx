import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CategoryBreakdown as CatBreakdownType } from '@/lib/scoring';

interface CategoryBreakdownProps {
  categories: CatBreakdownType[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Category Risk Breakdown</CardTitle>
        <CardDescription className="text-xs">
          Weighted contribution across five deterministic security domains
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {categories.map((cat) => {
          const pct = Math.round(cat.score);
          const barColor =
            pct >= 80 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-500' : 'bg-red-500';

          return (
            <div key={cat.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {cat.name}{' '}
                  <span className="text-muted-foreground font-normal">
                    ({Math.round(cat.weight * 100)}% weight)
                  </span>
                </span>
                <span className="font-bold text-foreground">
                  {cat.score} / 100
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {cat.passCount} passed, {cat.failCount} failed, {cat.unknownCount} unknown
                </span>
                <span>Coverage: {Math.round(cat.coverage)}%</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
