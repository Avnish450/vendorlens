/**
 * Certificate Transparency (crt.sh) Collector
 *
 * Checks Certificate Transparency logs via crt.sh to evaluate public subdomain sprawl
 * and certificate issuance hygiene for the vendor's domain.
 */

import { CollectorOptions, CollectorResult } from './types';

interface CrtShEntry {
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  id: number;
  entry_timestamp: string;
  not_before: string;
  not_after: string;
  serial_number: string;
}

export async function collectCrt(opts: CollectorOptions): Promise<CollectorResult[]> {
  const results: CollectorResult[] = [];
  const timeout = opts.timeout ?? 10000;
  const domain = opts.domain.toLowerCase().trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VendorLens-CT-Monitor/1.0' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      results.push({
        checkName: 'Subdomain Sprawl',
        category: 'exposure',
        status: 'UNKNOWN',
        severity: 'Low',
        evidence: `crt.sh returned HTTP status ${res.status}`,
        sourceUrl: url,
        rawValue: '',
        confidence: 'Low',
        whyItMatters: 'Certificate transparency logs reveal all public certificates issued for a domain and subdomains.',
        recommendedFix: 'No immediate action; crt.sh rate limit or temporary upstream unavailability.',
      });
      return results;
    }

    const data = (await res.json()) as CrtShEntry[];

    if (!Array.isArray(data)) {
      results.push({
        checkName: 'Subdomain Sprawl',
        category: 'exposure',
        status: 'UNKNOWN',
        severity: 'Low',
        evidence: 'crt.sh returned unexpected response format',
        sourceUrl: url,
        rawValue: '',
        confidence: 'Low',
        whyItMatters: 'Subdomain inventory helps identify orphaned assets and shadow IT.',
        recommendedFix: 'Retry during next scheduled scan.',
      });
      return results;
    }

    // Extract unique subdomains
    const subdomains = new Set<string>();
    const now = new Date();
    let expiringSoonCount = 0;

    for (const item of data) {
      if (item.name_value) {
        const names = item.name_value.split('\n');
        for (const n of names) {
          const clean = n.trim().toLowerCase();
          if (clean && clean.endsWith(domain)) {
            subdomains.add(clean);
          }
        }
      }

      if (item.not_after) {
        const expiry = new Date(item.not_after);
        const daysToExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysToExpiry > 0 && daysToExpiry <= 14) {
          expiringSoonCount++;
        }
      }
    }

    const subCount = subdomains.size;

    // 1. Subdomain Sprawl Check
    if (subCount > 250) {
      results.push({
        checkName: 'Subdomain Sprawl',
        category: 'exposure',
        status: 'FAIL',
        severity: 'Medium',
        evidence: `Significant attack surface: ${subCount} distinct subdomains observed in Certificate Transparency logs`,
        sourceUrl: url,
        rawValue: `Count: ${subCount}`,
        confidence: 'High',
        whyItMatters: 'Excessive subdomains often correlate with shadow IT, orphaned DNS records, and subdomain takeover risks.',
        recommendedFix: 'Conduct external attack surface management (ASM) review to deprecate stale subdomains and records.',
      });
    } else {
      results.push({
        checkName: 'Subdomain Sprawl',
        category: 'exposure',
        status: 'PASS',
        severity: 'Low',
        evidence: `Controlled public footprint: ${subCount} distinct subdomains discovered in CT logs`,
        sourceUrl: url,
        rawValue: `Count: ${subCount}`,
        confidence: 'High',
        whyItMatters: 'A well-scoped domain structure minimizes exposure to DNS hijacking and unmaintained endpoints.',
        recommendedFix: 'Continue monitoring certificate issuance via CT alerting.',
      });
    }

    // 2. Expiring Sub-Certificates
    if (expiringSoonCount > 3) {
      results.push({
        checkName: 'Expiring Certificates (CT)',
        category: 'exposure',
        status: 'FAIL',
        severity: 'Medium',
        evidence: `${expiringSoonCount} certificates across subdomains expire within 14 days without confirmed renewal`,
        sourceUrl: url,
        rawValue: `Expiring: ${expiringSoonCount}`,
        confidence: 'Medium',
        whyItMatters: 'Subdomain certificate lapses can trigger browser security errors and API client breakage.',
        recommendedFix: 'Verify ACME / Let\'s Encrypt / Cloudflare auto-renewal pipelines are functioning.',
      });
    } else {
      results.push({
        checkName: 'Expiring Certificates (CT)',
        category: 'exposure',
        status: 'PASS',
        severity: 'Low',
        evidence: 'No critical batch of expiring subdomain certificates detected in CT logs',
        sourceUrl: url,
        rawValue: `Expiring in <14d: ${expiringSoonCount}`,
        confidence: 'High',
        whyItMatters: 'Healthy certificate rotation prevents unexpected outage across auxiliary services.',
        recommendedFix: 'Maintain automated certificate management.',
      });
    }
  } catch (err: any) {
    clearTimeout(timer);
    results.push({
      checkName: 'Subdomain Sprawl',
      category: 'exposure',
      status: 'UNKNOWN',
      severity: 'Low',
      evidence: `Could not complete crt.sh query: ${err?.message || 'Connection aborted'}`,
      sourceUrl: `https://crt.sh/?q=%25.${encodeURIComponent(domain)}`,
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'Public CT logs reveal historical certificate issuance patterns.',
      recommendedFix: 'Check public crt.sh availability.',
    });
  }

  return results;
}
