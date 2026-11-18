'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ScanProgressProps {
  isScanning: boolean;
  statusText?: string;
  checksCompleted?: string[];
}

const ALL_CHECKS = [
  'SSRF Domain Guard & DNS Resolution',
  'SPF, DKIM, DMARC, MX & CAA Records',
  'TLS Protocol, Certificate Trust & Expiry',
  'HTTP Security Hardening (HSTS, CSP, X-Frame)',
  'CISA Known Exploited Vulnerabilities (KEV) Feed',
  'Certificate Transparency (crt.sh) Subdomains',
  'RFC 9116 /.well-known/security.txt Verification',
];

export function ScanProgress({ isScanning, statusText, checksCompleted = [] }: ScanProgressProps) {
  if (!isScanning) return null;

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-md animate-in fade-in-50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Live Security Telemetry Scan In Progress...
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {checksCompleted.length} of {ALL_CHECKS.length} collectors finished
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          {ALL_CHECKS.map((check, idx) => {
            const isDone = checksCompleted.includes(check) || idx < checksCompleted.length;
            const isCurrent = idx === checksCompleted.length;

            return (
              <div
                key={check}
                className="flex items-center gap-2 text-xs py-0.5 text-muted-foreground"
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                )}
                <span className={isCurrent ? 'font-medium text-foreground' : ''}>
                  {check}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
