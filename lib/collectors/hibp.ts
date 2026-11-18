/**
 * HaveIBeenPwned (HIBP) Domain Breach Collector (Optional)
 *
 * Runs only if HIBP_API_KEY environment variable is configured.
 * Skips gracefully with zero deductions if not present.
 */

import { CollectorOptions, CollectorResult } from './types';

export async function collectHibp(opts: CollectorOptions): Promise<CollectorResult[]> {
  const apiKey = process.env.HIBP_API_KEY;
  if (!apiKey) {
    return []; // Gracefully skip when optional key is not provided
  }

  const results: CollectorResult[] = [];
  const timeout = opts.timeout ?? 8000;
  const domain = opts.domain.toLowerCase().trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(domain)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'hibp-api-key': apiKey,
        'user-agent': 'VendorLens-Domain-Audit/1.0',
      },
    });
    clearTimeout(timer);

    if (res.status === 404) {
      results.push({
        checkName: 'Data Breaches (HIBP)',
        category: 'exposure',
        status: 'PASS',
        severity: 'Medium',
        evidence: `No known domain-level breaches indexed by HaveIBeenPwned for ${domain}`,
        sourceUrl: 'https://haveibeenpwned.com',
        rawValue: '0 breaches',
        confidence: 'High',
        whyItMatters: 'Absence of known historical breaches reflects strong perimeter and account credential controls.',
        recommendedFix: 'Continue dark web monitoring for stolen credential leaks.',
      });
    } else if (res.ok) {
      const breaches = await res.json();
      const count = Array.isArray(breaches) ? breaches.length : 0;
      if (count > 0) {
        const sample = breaches.slice(0, 3).map((b: any) => b.Title || b.Name).join(', ');
        results.push({
          checkName: 'Data Breaches (HIBP)',
          category: 'exposure',
          status: 'FAIL',
          severity: 'Medium',
          evidence: `${count} breach event(s) associated with domain recorded by HIBP: ${sample}`,
          sourceUrl: 'https://haveibeenpwned.com',
          rawValue: JSON.stringify(breaches.slice(0, 2)),
          confidence: 'High',
          whyItMatters: 'Prior breaches increase the likelihood of credential stuffing attacks against company services.',
          recommendedFix: 'Enforce mandatory phishing-resistant FIDO2/MFA across all employee and admin accounts.',
        });
      }
    }
  } catch (err: any) {
    clearTimeout(timer);
    results.push({
      checkName: 'Data Breaches (HIBP)',
      category: 'exposure',
      status: 'UNKNOWN',
      severity: 'Medium',
      evidence: `HIBP API lookup failed: ${err?.message || 'Timeout'}`,
      sourceUrl: 'https://haveibeenpwned.com',
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'Checks historical credential and domain compromise exposure.',
      recommendedFix: 'Verify HIBP API key quota and network connectivity.',
    });
  }

  return results;
}
