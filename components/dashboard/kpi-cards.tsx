import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

interface KpiCardsProps {
  totalVendors: number;
  averageScore: number;
  criticalVendorsCount: number;
  staleVendorsCount: number;
}

export function KpiCards({
  totalVendors,
  averageScore,
  criticalVendorsCount,
  staleVendorsCount,
}: KpiCardsProps) {
  const cards = [
    {
      title: 'Monitored Vendors',
      value: totalVendors.toString(),
      subtext: 'Active perimeters',
      icon: Building2,
    },
    {
      title: 'Portfolio Score',
      value: `${averageScore}/100`,
      subtext: averageScore >= 80 ? 'Grade A (Low Risk)' : 'Grade B (Medium Risk)',
      icon: ShieldCheck,
    },
    {
      title: 'Critical Attention',
      value: criticalVendorsCount.toString(),
      subtext: 'High-risk or KEV match',
      icon: AlertTriangle,
      highlight: criticalVendorsCount > 0,
    },
    {
      title: 'Stale Signals (>7d)',
      value: staleVendorsCount.toString(),
      subtext: 'Scheduled for refresh',
      icon: Clock,
      highlight: staleVendorsCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="shadow-2xs border bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </p>
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
                  {card.value}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{card.subtext}</p>
              </div>
              <div className="h-9 w-9 rounded-md border flex items-center justify-center shrink-0 bg-muted/40 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
