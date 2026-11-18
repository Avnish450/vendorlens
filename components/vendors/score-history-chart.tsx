'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface ScoreHistoryPoint {
  date: string;
  score: number;
  grade: string;
  isSynthetic?: boolean;
}

interface ScoreHistoryChartProps {
  data: ScoreHistoryPoint[];
}

export function ScoreHistoryChart({ data }: ScoreHistoryChartProps) {
  const hasSynthetic = data.some((d) => d.isSynthetic);

  // Format data for display
  const chartData = data.map((d) => {
    const parsed = new Date(d.date);
    return {
      date: parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: d.score,
      grade: d.grade,
      fullDate: parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
  });

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">60-Day Score Trajectory</CardTitle>
          <CardDescription className="text-xs">
            Historical security score evolution and trend analysis
          </CardDescription>
        </div>
        {hasSynthetic && (
          <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded border">
            Demo History (60-day synthetic baseline)
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-popover border text-popover-foreground px-3 py-2 rounded-lg shadow-md text-xs">
                        <div className="font-semibold text-foreground">{item.fullDate}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-muted-foreground">Score:</span>
                          <strong className="text-primary">{item.score}/100</strong>
                          <span className="text-muted-foreground">(Grade {item.grade})</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
