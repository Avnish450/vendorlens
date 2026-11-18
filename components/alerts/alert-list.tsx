'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingDown,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Bell,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { formatTimeAgo } from '@/lib/utils';

export interface AlertItem {
  id: string;
  vendorId: string;
  vendorName: string;
  domain: string;
  type: 'SCORE_DROP' | 'KEV_MATCH' | 'CERT_EXPIRY';
  title: string;
  message: string;
  severity: string;
  dismissed: boolean;
  createdAt: string | Date;
}

interface AlertListProps {
  initialAlerts: AlertItem[];
}

export function AlertList({ initialAlerts }: AlertListProps) {
  const [alerts, setAlerts] = React.useState<AlertItem[]>(initialAlerts);
  const [filter, setFilter] = React.useState<'ACTIVE' | 'DISMISSED' | 'ALL'>('ACTIVE');

  const filteredAlerts = React.useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'ACTIVE') return !a.dismissed;
      if (filter === 'DISMISSED') return a.dismissed;
      return true;
    });
  }, [alerts, filter]);

  const handleDismiss = async (id: string, dismissed: boolean) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, dismissed }),
      });

      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, dismissed } : a))
        );
      }
    } catch {
      // Optimistic
    }
  };

  const activeCount = alerts.filter((a) => !a.dismissed).length;

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={filter === 'ACTIVE' ? 'default' : 'outline'}
            onClick={() => setFilter('ACTIVE')}
            className="h-8 text-xs gap-1.5"
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Active Alerts ({activeCount})</span>
          </Button>
          <Button
            size="sm"
            variant={filter === 'DISMISSED' ? 'default' : 'outline'}
            onClick={() => setFilter('DISMISSED')}
            className="h-8 text-xs text-muted-foreground"
          >
            Dismissed ({alerts.length - activeCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
            className="h-8 text-xs text-muted-foreground"
          >
            All History ({alerts.length})
          </Button>
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <Card className="text-center py-12 shadow-xs">
            <CardContent>
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No alerts active</p>
              <p className="text-xs text-muted-foreground mt-1">
                Zero critical score drops, CISA KEV detections, or expiring certificates pending review.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => {
            const isScoreDrop = alert.type === 'SCORE_DROP';
            const isKev = alert.type === 'KEV_MATCH';
            const isCert = alert.type === 'CERT_EXPIRY';

            return (
              <Card
                key={alert.id}
                className={`shadow-xs transition-colors ${
                  alert.dismissed ? 'opacity-60 bg-muted/20' : 'border-red-500/20 bg-card'
                }`}
              >
                <CardContent className="p-4 flex items-start gap-3.5">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isKev ? 'bg-red-500/10 text-red-600' :
                      isScoreDrop ? 'bg-orange-500/10 text-orange-600' :
                      'bg-amber-500/10 text-amber-600'
                    }`}
                  >
                    {isKev && <ShieldAlert className="h-5 w-5" />}
                    {isScoreDrop && <TrendingDown className="h-5 w-5" />}
                    {isCert && <Clock className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/vendors/${alert.vendorId}`}
                          className="font-bold text-sm text-foreground hover:text-primary hover:underline"
                        >
                          {alert.vendorName}
                        </Link>
                        <span className="text-xs text-muted-foreground font-normal">({alert.domain})</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            alert.severity === 'Critical' ? 'border-red-500 text-red-600' :
                            'border-orange-500 text-orange-600'
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>

                      <span className="text-[11px] text-muted-foreground">
                        {formatTimeAgo(new Date(alert.createdAt))}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-foreground pt-0.5">
                      {alert.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="flex items-center justify-between pt-2">
                      <Link
                        href={`/vendors/${alert.vendorId}`}
                        className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                      >
                        <span>Investigate Vendor Signals</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>

                      {alert.dismissed ? (
                        <button
                          onClick={() => handleDismiss(alert.id, false)}
                          className="text-xs text-muted-foreground hover:text-foreground font-medium"
                        >
                          Reopen Alert
                        </button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDismiss(alert.id, true)}
                          className="h-7 text-xs gap-1"
                        >
                          <EyeOff className="h-3 w-3" />
                          <span>Dismiss</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
