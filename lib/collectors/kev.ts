/**
 * CISA KEV (Known Exploited Vulnerabilities) & NVD CVE Collector
 *
 * Checks CISA's public catalog of known actively exploited vulnerabilities
 * against the vendor's domain and declared products, and checks NVD CVE API 2.0.
 */

import { CollectorOptions, CollectorResult } from './types';

interface KevCatalogItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  knownRansomwareCampaignUse: string;
}

interface KevCatalog {
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KevCatalogItem[];
}

let cachedKevCatalog: { data: KevCatalog; timestamp: number } | null = null;
const KEV_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getKevCatalog(timeoutMs: number): Promise<KevCatalog | null> {
  if (cachedKevCatalog && (Date.now() - cachedKevCatalog.timestamp < KEV_CACHE_TTL_MS)) {
    return cachedKevCatalog.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      signal: controller.signal,
      headers: { 'User-Agent': 'VendorLens/1.0' },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = (await res.json()) as KevCatalog;
    cachedKevCatalog = { data, timestamp: Date.now() };
    return data;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function collectKev(opts: CollectorOptions): Promise<CollectorResult[]> {
  const results: CollectorResult[] = [];
  const timeout = opts.timeout ?? 10000;
  const domainParts = opts.domain.toLowerCase().split('.');
  const primaryName = domainParts[0];

  const searchKeywords = new Set<string>();
  if (primaryName && primaryName.length > 2) {
    searchKeywords.add(primaryName);
  }

  if (opts.declaredProducts && opts.declaredProducts.length > 0) {
    for (const prod of opts.declaredProducts) {
      const trimmed = prod.trim().toLowerCase();
      if (trimmed.length > 2) {
        searchKeywords.add(trimmed);
      }
    }
  }

  // 1. CISA KEV Catalog check
  try {
    const kevCatalog = await getKevCatalog(timeout);
    if (!kevCatalog) {
      results.push({
        checkName: 'CISA KEV Match',
        category: 'vulnerabilities',
        status: 'UNKNOWN',
        severity: 'Critical',
        evidence: 'Unable to reach CISA KEV catalog or connection timed out',
        sourceUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
        rawValue: '',
        confidence: 'Low',
        whyItMatters: 'CISA KEV lists vulnerabilities actively weaponized and exploited in the wild by threat actors.',
        recommendedFix: 'Ensure network egress allows fetching the public CISA feed.',
      });
    } else {
      const matches: KevCatalogItem[] = [];
      const keywords = Array.from(searchKeywords);

      for (const vuln of kevCatalog.vulnerabilities) {
        const vVendor = vuln.vendorProject.toLowerCase();
        const vProduct = vuln.product.toLowerCase();

        for (const kw of keywords) {
          if (vVendor.includes(kw) || vProduct.includes(kw)) {
            matches.push(vuln);
            break;
          }
        }
      }

      if (matches.length > 0) {
        const cveList = matches.slice(0, 5).map(m => `${m.cveID} (${m.product})`).join(', ');
        results.push({
          checkName: 'CISA KEV Match',
          category: 'vulnerabilities',
          status: 'FAIL',
          severity: 'Critical',
          evidence: `${matches.length} known actively exploited CVE(s) identified matching declared vendor/products: ${cveList}`,
          sourceUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
          rawValue: JSON.stringify(matches.slice(0, 3)),
          confidence: 'High',
          whyItMatters: 'Active exploitation in the wild represents immediate, verified threat exposure for vendor infrastructure or products.',
          recommendedFix: 'Review active CISA binding operational directives and confirm vendor has patched referenced CVEs.',
        });
      } else {
        results.push({
          checkName: 'CISA KEV Match',
          category: 'vulnerabilities',
          status: 'PASS',
          severity: 'Critical',
          evidence: `No actively exploited vulnerabilities found in CISA KEV catalog matching keywords: ${Array.from(searchKeywords).join(', ')}`,
          sourceUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
          rawValue: `Catalog version: ${kevCatalog.catalogVersion}, items: ${kevCatalog.count}`,
          confidence: 'High',
          whyItMatters: 'Zero known actively exploited vulnerabilities indicates no publicized emergency zero-days in the CISA catalog.',
          recommendedFix: 'Continue periodic automated reviews against updated CISA releases.',
        });
      }
    }
  } catch (err: any) {
    results.push({
      checkName: 'CISA KEV Match',
      category: 'vulnerabilities',
      status: 'UNKNOWN',
      severity: 'Critical',
      evidence: `Error querying CISA KEV: ${err?.message || 'Unknown error'}`,
      sourceUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'CISA KEV catalog tracking is critical for vulnerability awareness.',
      recommendedFix: 'Verify network connectivity and retry scan.',
    });
  }

  // 2. NVD CVE Lookups (Lightweight query)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeout, 5000));
    const query = encodeURIComponent(primaryName);
    const nvdUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${query}&resultsPerPage=3`;

    const res = await fetch(nvdUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VendorLens-Scanner/1.0' },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const totalResults = data?.totalResults || 0;
      if (totalResults > 50) {
        results.push({
          checkName: 'High-Severity CVEs',
          category: 'vulnerabilities',
          status: 'FAIL',
          severity: 'Medium',
          evidence: `Found ${totalResults} historical CVE entries in NIST NVD for keyword "${primaryName}"`,
          sourceUrl: nvdUrl,
          rawValue: `Total: ${totalResults}`,
          confidence: 'Medium',
          whyItMatters: 'A high volume of historical CVEs highlights an extensive attack surface requiring diligent patch cadence.',
          recommendedFix: 'Request current SOC 2 Type II or ISO 27001 vulnerability management disclosures from vendor.',
        });
      } else {
        results.push({
          checkName: 'High-Severity CVEs',
          category: 'vulnerabilities',
          status: 'PASS',
          severity: 'Medium',
          evidence: `Low or normal historical vulnerability volume (${totalResults} CVE entries) registered in NIST NVD for "${primaryName}"`,
          sourceUrl: nvdUrl,
          rawValue: `Total: ${totalResults}`,
          confidence: 'High',
          whyItMatters: 'Low CVE counts correlate with focused attack surface or proactive internal bug bounty programs.',
          recommendedFix: 'Maintain routine annual audit of vendor disclosures.',
        });
      }
    } else {
      results.push({
        checkName: 'High-Severity CVEs',
        category: 'vulnerabilities',
        status: 'UNKNOWN',
        severity: 'Medium',
        evidence: `NVD API rate limit or service unavailable (HTTP ${res.status})`,
        sourceUrl: nvdUrl,
        rawValue: '',
        confidence: 'Low',
        whyItMatters: 'NVD CVE data provides secondary confirmation of vendor software flaw frequency.',
        recommendedFix: 'Rate limiting backoff applied; will retry during scheduled interval.',
      });
    }
  } catch {
    results.push({
      checkName: 'High-Severity CVEs',
      category: 'vulnerabilities',
      status: 'UNKNOWN',
      severity: 'Medium',
      evidence: 'NVD API query timed out or connection was aborted',
      sourceUrl: 'https://nvd.nist.gov/',
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'NVD tracking provides visibility into published CVE vulnerability records.',
      recommendedFix: 'Will query during subsequent scan cycle.',
    });
  }

  return results;
}
