'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface TierCount {
  tier: string;
  count: number;
}

interface TierDonutProps {
  data: TierCount[];
}

const TIER_COLORS: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

export function TierDonut({ data }: TierDonutProps) {
  const chartData = data.filter((d) => d.count > 0);
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card className="flex flex-col shadow-xs border bg-card">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Tier Distribution</CardTitle>
          <span className="text-xs font-mono text-muted-foreground">{total} total vendors</span>
        </div>
        <CardDescription className="text-xs">
          Posture categorization across Low, Medium, High, and Critical risk tiers
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="tier"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={3}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.tier}`}
                    fill={TIER_COLORS[entry.tier] || '#64748b'}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0];
                    const count = item.value as number;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div className="bg-popover border text-popover-foreground px-3 py-1.5 rounded shadow-sm text-xs font-mono">
                        <span className="font-semibold">{item.name} Risk:</span> {count} vendors ({pct}%)
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
