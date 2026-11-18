import { SCORING_MODEL } from '@/lib/scoring';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, CheckCircle2, HelpCircle, AlertTriangle, Calculator } from 'lucide-react';

export default function HowScoringWorksPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="border-b pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Deterministic Scoring Methodology
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          VendorLens operates on a zero-blackbox, 100% transparent, evidence-backed scoring algorithm.
          Every point gained or deducted is traceable to verifiable public security signals.
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Evidence-First Baseline</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every deduction requires raw, verifiable signal data (e.g. DNS TXT record, TLS handshake result, HTTP header value). No evidence = zero deduction.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-blue-500" />
              <span>UNKNOWN Never Penalizes</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If an endpoint is temporarily unreachable or an optional API is not configured, the check status is UNKNOWN. UNKNOWN lowers <strong>Coverage %</strong>, never the score.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Criticality Multiplier</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              In the remediation queue, findings are prioritized by <code>Severity Weight × Vendor Criticality</code>. A flaw in a High-criticality vendor is surfaced first.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grade and Tier Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Letter Grade Thresholds</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">Score Range</TableHead>
                <TableHead className="text-xs">Grade</TableHead>
                <TableHead className="text-xs">Procurement Implication</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              <TableRow>
                <TableCell className="font-mono font-bold">90 – 100</TableCell>
                <TableCell><Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Grade A</Badge></TableCell>
                <TableCell className="text-muted-foreground">Excellent public posture; low-friction approval</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold">80 – 89</TableCell>
                <TableCell><Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Grade B</Badge></TableCell>
                <TableCell className="text-muted-foreground">Good standard posture; minor hygiene follow-up</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold">65 – 79</TableCell>
                <TableCell><Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Grade C</Badge></TableCell>
                <TableCell className="text-muted-foreground">Acceptable controls; requires conditional remediation</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold">50 – 64</TableCell>
                <TableCell><Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Grade D</Badge></TableCell>
                <TableCell className="text-muted-foreground">Elevated exposure; requires security sign-off</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold">0 – 49</TableCell>
                <TableCell><Badge className="bg-red-500/10 text-red-600 border-red-500/20">Grade F</Badge></TableCell>
                <TableCell className="text-muted-foreground">Critical vulnerabilities; procurement blocked</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Risk Tiers</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">Score Range</TableHead>
                <TableHead className="text-xs">Risk Tier</TableHead>
                <TableHead className="text-xs">Monitoring Cadence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              <TableRow>
                <TableCell className="font-mono font-bold">80 – 100</TableCell>
                <TableCell><span className="text-emerald-600 font-bold">Low Risk</span></TableCell>
                <TableCell className="text-muted-foreground">Weekly automated scans</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold">65 – 79</TableCell>
                <TableCell><span className="text-amber-600 font-bold">Medium Risk</span></TableCell>
                <TableCell className="text-muted-foreground">Bi-weekly scans + review queue</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold">40 – 64</TableCell>
                <TableCell><span className="text-orange-600 font-bold">High Risk</span></TableCell>
                <TableCell className="text-muted-foreground">Daily continuous monitoring</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold">0 – 39</TableCell>
                <TableCell><span className="text-red-600 font-bold">Critical Risk</span></TableCell>
                <TableCell className="text-muted-foreground">Continuous monitoring + real-time alerts</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Full Category and Check Breakdown from SCORING_MODEL */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-foreground">Scoring Categories & Check Specifications</h3>

        {SCORING_MODEL.categories.map((category) => (
          <Card key={category.id} className="shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    {category.name}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {category.description}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-bold px-2.5 py-1">
                  Weight: {Math.round(category.weight * 100)}%
                </Badge>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="text-xs font-semibold w-1/4">Check Name</TableHead>
                  <TableHead className="text-xs font-semibold">Severity</TableHead>
                  <TableHead className="text-xs font-semibold">Max Deduction</TableHead>
                  <TableHead className="text-xs font-semibold">Evaluation Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {category.checks.map((chk) => (
                  <TableRow key={chk.name} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground">
                      {chk.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          chk.severity === 'Critical' ? 'border-red-500 text-red-600' :
                          chk.severity === 'High' ? 'border-orange-500 text-orange-600' :
                          'border-border text-muted-foreground'
                        }`}
                      >
                        {chk.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-red-600 dark:text-red-400">
                      -{chk.maxDeduction} pts
                    </TableCell>
                    <TableCell className="text-muted-foreground leading-relaxed">
                      {chk.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>
    </div>
  );
}
