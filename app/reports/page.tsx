'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, Table as TableIcon, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ReportsPage() {
  const [vendors, setVendors] = React.useState<Array<{ id: string; name: string; domain: string }>>([]);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string>('');

  React.useEffect(() => {
    fetch('/api/vendors')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setVendors(data);
          if (data.length > 0) setSelectedVendorId(data[0].id);
        }
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Risk & Compliance Reports Export
        </h2>
        <p className="text-xs text-muted-foreground">
          Generate audit-ready documentation and evidence-backed third-party risk assessments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Vendor Assessment Report */}
        <Card className="shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center mb-2">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Individual Vendor Risk Dossier (PDF)</CardTitle>
            <CardDescription className="text-xs">
              Complete executive assessment packet including overall score, letter grade, signal coverage, full verified findings table, and methodology disclaimer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="text-xs font-semibold text-foreground">Select Vendor for PDF Generation</label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border text-xs bg-background text-foreground"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.domain})
                </option>
              ))}
            </select>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <a
              href={`/api/reports/pdf?vendorId=${selectedVendorId}`}
              download
              className="w-full"
            >
              <Button size="sm" className="w-full gap-2 text-xs" disabled={!selectedVendorId}>
                <FileDown className="h-4 w-4" />
                <span>Generate Vendor Risk PDF</span>
              </Button>
            </a>
          </CardFooter>
        </Card>

        {/* Portfolio CSV Register */}
        <Card className="shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <TableIcon className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Portfolio Risk Register (CSV)</CardTitle>
            <CardDescription className="text-xs">
              Structured RFC 4180 CSV export of your complete monitored vendor inventory. Includes risk scores, letter grades, criticalities, and last-scanned timestamps for procurement and compliance audits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-3.5 rounded-lg border bg-muted/20 text-xs space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Included Fields</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Vendor Name, Domain, Category, Criticality, Security Score, Grade, Risk Tier, Signal Coverage %, and Last Scanned Date.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <a href="/api/reports/csv" download className="w-full">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                <FileDown className="h-4 w-4" />
                <span>Download Portfolio CSV Register</span>
              </Button>
            </a>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
