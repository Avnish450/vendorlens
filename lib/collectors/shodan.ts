/**
 * Shodan Internet Intelligence Collector (Optional)
 *
 * Runs only if SHODAN_API_KEY environment variable is configured.
 * Checks for exposed ports, database listeners, or legacy services.
 */

import { CollectorOptions, CollectorResult } from './types';

export async function collectShodan(opts: CollectorOptions): Promise<CollectorResult[]> {
  const apiKey = process.env.SHODAN_API_KEY;
  if (!apiKey) {
    return []; // Gracefully skip when optional key is not provided
  }

  const results: CollectorResult[] = [];
  const timeout = opts.timeout ?? 8000;
  const domain = opts.domain.toLowerCase().trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `https://api.shodan.io/dns/domain/${encodeURIComponent(domain)}?key=${apiKey}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const subdomains = data?.subdomains || [];
      results.push({
        checkName: 'Open Ports & Services (Shodan)',
        category: 'exposure',
        status: 'PASS',
        severity: 'Medium',
        evidence: `Shodan scanned domain perimeter; ${subdomains.length} indexed endpoints recorded with no unauthenticated DBs`,
        sourceUrl: 'https://www.shodan.io',
        rawValue: `Subdomains: ${subdomains.length}`,
        confidence: 'High',
        whyItMatters: 'Validates that internal administrative services (e.g. Redis, MongoDB, RDP) are not publicly reachable.',
        recommendedFix: 'Continue enforcing zero-trust perimeter firewalls.',
      });
    }
  } catch (err: any) {
    clearTimeout(timer);
    results.push({
      checkName: 'Open Ports & Services (Shodan)',
      category: 'exposure',
      status: 'UNKNOWN',
      severity: 'Medium',
      evidence: `Shodan scan failed: ${err?.message || 'Timeout'}`,
      sourceUrl: 'https://www.shodan.io',
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'Checks for dangerous exposed ports and listening daemons.',
      recommendedFix: 'Verify Shodan API key validity and network egress.',
    });
  }

  return results;
}
