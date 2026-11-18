import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  CheckCircle2,
  Clock,
  Terminal,
  FileText,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

export default function AboutAndPricingPage() {
  const tiers = [
    {
      name: 'Starter',
      price: '$299',
      period: '/ month',
      description: 'Standard perimeter monitoring for growing procurement teams.',
      features: [
        'Up to 25 monitored third-party vendors',
        'Weekly automated security telemetry scans',
        'Alert notifications on score drops (≥10 pts)',
        'CISA KEV catalog tracking & RFC 9116 verification',
        'Portfolio CSV risk register export',
      ],
      cta: 'Select Starter',
      featured: false,
    },
    {
      name: 'Professional',
      price: '$799',
      period: '/ month',
      description: 'Complete continuous intelligence for enterprise compliance & SOC teams.',
      features: [
        'Up to 100 monitored vendors',
        'Daily automated multi-collector telemetry',
        'Exportable PDF risk assessment dossiers',
        'Prioritized remediation queue (Severity × Criticality)',
        'Side-by-side vendor comparison matrix',
        'Deterministic automated security briefing generator',
      ],
      cta: 'Select Professional',
      featured: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'annual billing',
      description: 'Dedicated governance for regulated financial and healthcare organizations.',
      features: [
        'Unlimited third-party vendors & supply chain assets',
        'Continuous 6-hour scanning cadence',
        'SAML 2.0 / Okta SSO & role-based access control',
        'Custom scoring weights & risk multiplier tuning',
        'REST API access & webhook event streams',
        'Dedicated Technical Account Manager & SLA guarantee',
      ],
      cta: 'Contact Sales',
      featured: false,
    },
  ];

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Title */}
      <div className="space-y-2 border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Platform Architecture & Commercial Licensing
        </h2>
        <p className="text-xs text-muted-foreground font-mono">
          Continuous, evidence-backed vendor risk intelligence replacing periodic static spreadsheets.
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-xs border bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Zero Assessment Latency</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Audits take seconds instead of 4 weeks of questionnaire delays. Public DNS, TLS handshakes, and CISA feeds are gathered directly.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <span>100% Deterministic Formula</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Zero black-box or opaque ML predictions. Scores are calculated via a documented, open formula: 100 minus category deductions.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span>Evidence-Backed Verification</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every score deduction includes raw evidence, source URLs, and timestamps. UNKNOWN status never penalizes vendors.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Tiers */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <h3 className="text-base font-bold text-foreground">
            Subscription Options
          </h3>
          <p className="text-xs text-muted-foreground">
            Predictable annual and monthly plans scaled to vendor volume
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`shadow-xs flex flex-col justify-between border bg-card ${
                tier.featured ? 'border-foreground shadow-sm' : ''
              }`}
            >
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold font-mono">{tier.name}</CardTitle>
                  {tier.featured && (
                    <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                      Standard
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1 font-mono">
                  <span className="text-2xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-xs text-muted-foreground">{tier.period}</span>
                </div>
                <CardDescription className="text-xs mt-1">{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 py-4">
                {tier.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-foreground shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </CardContent>

              <CardFooter className="pt-3 border-t">
                <Button
                  variant={tier.featured ? 'default' : 'outline'}
                  size="sm"
                  className="w-full text-xs font-mono"
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
