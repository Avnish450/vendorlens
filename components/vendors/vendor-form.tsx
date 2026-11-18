'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface VendorFormProps {
  initialData?: {
    id: string;
    name: string;
    domain: string;
    category: string;
    criticality: string;
    declaredProducts: string;
  };
  isEdit?: boolean;
}

const CATEGORIES = [
  'Cloud',
  'SaaS',
  'Payments',
  'Healthcare',
  'Contractor',
  'Infrastructure',
  'Analytics',
  'Communication',
  'Security',
  'Finance',
];

const CRITICALITIES = [
  { value: 'Low', label: 'Low — Internal tools, no customer data access' },
  { value: 'Medium', label: 'Medium — Business operations, non-sensitive data' },
  { value: 'High', label: 'High — Core infrastructure, PII, payment or patient data' },
];

export function VendorForm({ initialData, isEdit = false }: VendorFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(initialData?.name || '');
  const [domain, setDomain] = React.useState(initialData?.domain || '');
  const [category, setCategory] = React.useState(initialData?.category || 'SaaS');
  const [criticality, setCriticality] = React.useState(initialData?.criticality || 'Medium');
  const [declaredProducts, setDeclaredProducts] = React.useState(initialData?.declaredProducts || '');

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Sanitize domain
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain || !cleanDomain.includes('.')) {
      setError('Please provide a valid public domain (e.g. "company.com")');
      return;
    }

    if (!name.trim()) {
      setError('Vendor name is required');
      return;
    }

    setLoading(true);

    try {
      const url = isEdit ? `/api/vendors/${initialData?.id}` : '/api/vendors';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          domain: cleanDomain,
          category,
          criticality,
          declaredProducts: declaredProducts.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save vendor');
      }

      router.push(`/vendors/${data.id || initialData?.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/vendors" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <CardTitle className="text-lg font-bold">
            {isEdit ? `Edit Vendor: ${initialData?.name}` : 'Register Third-Party Vendor'}
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          VendorLens will continuously monitor verified public security signals for this vendor
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name" className="text-xs font-semibold">Vendor Legal / Trading Name</Label>
              <Input
                id="vendor-name"
                placeholder="e.g. Acme Cloud Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor-domain" className="text-xs font-semibold">Primary Public Domain</Label>
              <Input
                id="vendor-domain"
                placeholder="e.g. acme.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
                disabled={isEdit} // Domain is immutable identifier
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Domain will be verified against SSRF blocklists and public DNS
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-category" className="text-xs font-semibold">Vendor Category</Label>
              <select
                id="vendor-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-md border text-xs bg-background text-foreground"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor-criticality" className="text-xs font-semibold">Business Criticality</Label>
              <select
                id="vendor-criticality"
                value={criticality}
                onChange={(e) => setCriticality(e.target.value)}
                className="w-full h-9 px-3 rounded-md border text-xs bg-background text-foreground"
              >
                {CRITICALITIES.map((crit) => (
                  <option key={crit.value} value={crit.value}>
                    {crit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor-products" className="text-xs font-semibold">
              Declared Products / Software Services (Comma-separated)
            </Label>
            <Textarea
              id="vendor-products"
              placeholder="e.g. Acme CDN, Acme DNS, Workers, API Gateway"
              value={declaredProducts}
              onChange={(e) => setDeclaredProducts(e.target.value)}
              className="text-xs min-h-[70px]"
            />
            <p className="text-[11px] text-muted-foreground">
              These product keywords are matched against the <strong>CISA Known Exploited Vulnerabilities (KEV)</strong> feed and the NIST NVD database.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-4">
          <Link href={isEdit ? `/vendors/${initialData?.id}` : '/vendors'}>
            <Button variant="outline" size="sm" type="button" className="text-xs">
              Cancel
            </Button>
          </Link>
          <Button size="sm" type="submit" disabled={loading} className="text-xs gap-1.5">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isEdit ? 'Save Changes' : 'Register & Run Initial Scan'}</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
