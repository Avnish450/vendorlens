/**
 * DNS & Email Security Collector
 *
 * Checks the vendor's email authentication and DNS security configuration:
 * - SPF (Sender Policy Framework) record
 * - DKIM (DomainKeys Identified Mail) across common selectors
 * - DMARC (Domain-based Message Authentication) policy
 * - MX (Mail Exchange) records
 * - CAA (Certificate Authority Authorization) records
 */

import dns from 'dns/promises';
import type { CollectorResult, CollectorOptions } from '@/lib/collectors/types';

/** Common DKIM selectors to probe. */
const DKIM_SELECTORS = ['google', 'default', 'selector1', 'selector2', 'k1', 'mail'];

/**
 * Wrap a DNS query with a timeout.
 */
async function dnsWithTimeout<T>(
  query: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    query,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS query timed out')), timeoutMs)
    ),
  ]);
}

/**
 * Check for SPF record.
 */
async function checkSpf(
  domain: string,
  timeout: number
): Promise<CollectorResult> {
  try {
    const records = await dnsWithTimeout(dns.resolveTxt(domain), timeout);
    const flat = records.map((r) => r.join(''));
    const spf = flat.find((r) => r.toLowerCase().startsWith('v=spf1'));

    if (spf) {
      return {
        checkName: 'SPF Record',
        category: 'email_dns',
        status: 'PASS',
        severity: 'Medium',
        evidence: `SPF record found: ${spf.substring(0, 200)}`,
        sourceUrl: `dns:${domain}/TXT`,
        rawValue: spf,
        confidence: 'High',
        whyItMatters:
          'SPF records specify which mail servers are authorized to send email for a domain, ' +
          'preventing email spoofing.',
        recommendedFix: '',
      };
    }

    return {
      checkName: 'SPF Record',
      category: 'email_dns',
      status: 'FAIL',
      severity: 'Medium',
      evidence: `No SPF record found in TXT records for ${domain}`,
      sourceUrl: `dns:${domain}/TXT`,
      rawValue: '',
      confidence: 'High',
      whyItMatters:
        'Without an SPF record, anyone can forge emails appearing to come from this domain.',
      recommendedFix:
        'Add a TXT record with "v=spf1" specifying authorized mail servers (e.g., "v=spf1 include:_spf.google.com ~all").',
    };
  } catch (error) {
    return {
      checkName: 'SPF Record',
      category: 'email_dns',
      status: 'UNKNOWN',
      severity: 'Medium',
      evidence: `Could not retrieve TXT records for ${domain}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sourceUrl: `dns:${domain}/TXT`,
      rawValue: '',
      confidence: 'Low',
      whyItMatters:
        'SPF records specify which mail servers are authorized to send email for a domain.',
      recommendedFix: 'Ensure DNS is properly configured and TXT records are queryable.',
    };
  }
}

/**
 * Check for DKIM records across common selectors.
 */
async function checkDkim(
  domain: string,
  timeout: number
): Promise<CollectorResult> {
  const foundSelectors: string[] = [];

  for (const selector of DKIM_SELECTORS) {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    try {
      const records = await dnsWithTimeout(dns.resolveTxt(dkimDomain), timeout);
      const flat = records.map((r) => r.join(''));
      if (flat.some((r) => r.includes('v=DKIM1') || r.includes('k=rsa') || r.includes('p='))) {
        foundSelectors.push(selector);
      }
    } catch {
      // Selector not found — continue to next
    }
  }

  if (foundSelectors.length > 0) {
    return {
      checkName: 'DKIM Record',
      category: 'email_dns',
      status: 'PASS',
      severity: 'Medium',
      evidence: `DKIM record(s) found for selector(s): ${foundSelectors.join(', ')}`,
      sourceUrl: `dns:${domain}/_domainkey`,
      rawValue: foundSelectors.join(', '),
      confidence: 'High',
      whyItMatters:
        'DKIM cryptographically signs emails, allowing recipients to verify they have not ' +
        'been altered in transit.',
      recommendedFix: '',
    };
  }

  return {
    checkName: 'DKIM Record',
    category: 'email_dns',
    status: 'FAIL',
    severity: 'Medium',
    evidence: `No DKIM records found for selectors: ${DKIM_SELECTORS.join(', ')}`,
    sourceUrl: `dns:${domain}/_domainkey`,
    rawValue: '',
    confidence: 'Medium',
    whyItMatters:
      'Without DKIM, email recipients cannot verify that messages from this domain are authentic ' +
      'and unaltered.',
    recommendedFix:
      'Configure DKIM signing for your email service and publish the public key as a TXT record ' +
      'under a _domainkey selector.',
  };
}

/**
 * Check for DMARC policy.
 */
async function checkDmarc(
  domain: string,
  timeout: number
): Promise<CollectorResult> {
  const dmarcDomain = `_dmarc.${domain}`;

  try {
    const records = await dnsWithTimeout(dns.resolveTxt(dmarcDomain), timeout);
    const flat = records.map((r) => r.join(''));
    const dmarc = flat.find((r) => r.toLowerCase().startsWith('v=dmarc1'));

    if (!dmarc) {
      return {
        checkName: 'DMARC Policy',
        category: 'email_dns',
        status: 'FAIL',
        severity: 'High',
        evidence: `No DMARC record found at ${dmarcDomain}`,
        sourceUrl: `dns:${dmarcDomain}/TXT`,
        rawValue: '',
        confidence: 'High',
        whyItMatters:
          'DMARC ties together SPF and DKIM and tells receivers what to do with unauthenticated mail.',
        recommendedFix:
          'Add a TXT record at _dmarc.yourdomain.com with at minimum "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com".',
      };
    }

    // Parse the policy value
    const policyMatch = dmarc.match(/;\s*p\s*=\s*(none|quarantine|reject)/i);
    const policy = policyMatch ? policyMatch[1].toLowerCase() : 'none';

    if (policy === 'none') {
      return {
        checkName: 'DMARC Policy',
        category: 'email_dns',
        status: 'FAIL',
        severity: 'High',
        evidence: `DMARC record found but policy is "none" (monitoring only, not enforcing): ${dmarc.substring(0, 200)}`,
        sourceUrl: `dns:${dmarcDomain}/TXT`,
        rawValue: dmarc,
        confidence: 'High',
        whyItMatters:
          'A DMARC policy of "none" only monitors — it does not prevent spoofed emails from being delivered.',
        recommendedFix:
          'Upgrade the DMARC policy from p=none to p=quarantine or p=reject after reviewing DMARC reports.',
      };
    }

    return {
      checkName: 'DMARC Policy',
      category: 'email_dns',
      status: 'PASS',
      severity: 'High',
      evidence: `DMARC record found with enforcing policy (p=${policy}): ${dmarc.substring(0, 200)}`,
      sourceUrl: `dns:${dmarcDomain}/TXT`,
      rawValue: dmarc,
      confidence: 'High',
      whyItMatters:
        'An enforcing DMARC policy (quarantine/reject) actively prevents spoofed emails.',
      recommendedFix: '',
    };
  } catch (error) {
    return {
      checkName: 'DMARC Policy',
      category: 'email_dns',
      status: 'UNKNOWN',
      severity: 'High',
      evidence: `Could not query DMARC record at ${dmarcDomain}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sourceUrl: `dns:${dmarcDomain}/TXT`,
      rawValue: '',
      confidence: 'Low',
      whyItMatters:
        'DMARC tells email receivers how to handle unauthenticated mail from this domain.',
      recommendedFix: 'Ensure DNS is properly configured for the _dmarc subdomain.',
    };
  }
}

/**
 * Check for MX records.
 */
async function checkMx(
  domain: string,
  timeout: number
): Promise<CollectorResult> {
  try {
    const records = await dnsWithTimeout(dns.resolveMx(domain), timeout);

    if (records.length > 0) {
      const mxList = records
        .sort((a, b) => a.priority - b.priority)
        .map((r) => `${r.priority} ${r.exchange}`)
        .join(', ');

      return {
        checkName: 'MX Records',
        category: 'email_dns',
        status: 'PASS',
        severity: 'Low',
        evidence: `${records.length} MX record(s) found: ${mxList.substring(0, 200)}`,
        sourceUrl: `dns:${domain}/MX`,
        rawValue: mxList,
        confidence: 'High',
        whyItMatters:
          'MX records direct email to the correct mail servers, essential for email infrastructure.',
        recommendedFix: '',
      };
    }

    return {
      checkName: 'MX Records',
      category: 'email_dns',
      status: 'FAIL',
      severity: 'Low',
      evidence: `No MX records found for ${domain}`,
      sourceUrl: `dns:${domain}/MX`,
      rawValue: '',
      confidence: 'High',
      whyItMatters: 'Without MX records, the domain cannot receive email properly.',
      recommendedFix: 'Configure MX records pointing to your email provider.',
    };
  } catch (error) {
    return {
      checkName: 'MX Records',
      category: 'email_dns',
      status: 'UNKNOWN',
      severity: 'Low',
      evidence: `Could not retrieve MX records for ${domain}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sourceUrl: `dns:${domain}/MX`,
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'MX records are essential for email routing.',
      recommendedFix: 'Ensure DNS is properly configured.',
    };
  }
}

/**
 * Check for CAA records.
 */
async function checkCaa(
  domain: string,
  timeout: number
): Promise<CollectorResult> {
  try {
    const records = await dnsWithTimeout(dns.resolveCaa(domain), timeout);

    if (records.length > 0) {
      const caaList = records
        .map((r: any) => `${r.critical ? 'critical ' : ''}${r.issue || r.issuewild || r.tag || ''} ${r.value || ''}`.trim())
        .join('; ');

      return {
        checkName: 'CAA Records',
        category: 'email_dns',
        status: 'PASS',
        severity: 'Low',
        evidence: `${records.length} CAA record(s) found: ${caaList.substring(0, 200)}`,
        sourceUrl: `dns:${domain}/CAA`,
        rawValue: caaList,
        confidence: 'High',
        whyItMatters:
          'CAA records restrict which certificate authorities can issue certificates for the domain.',
        recommendedFix: '',
      };
    }

    return {
      checkName: 'CAA Records',
      category: 'email_dns',
      status: 'FAIL',
      severity: 'Low',
      evidence: `No CAA records found for ${domain}`,
      sourceUrl: `dns:${domain}/CAA`,
      rawValue: '',
      confidence: 'High',
      whyItMatters:
        'Without CAA records, any CA can issue certificates for the domain, increasing risk of unauthorized certificates.',
      recommendedFix:
        'Add CAA DNS records specifying which certificate authorities are authorized (e.g., "0 issue letsencrypt.org").',
    };
  } catch (error) {
    // NODATA response is common and means no CAA records exist
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('ENODATA') || msg.includes('ENOTFOUND')) {
      return {
        checkName: 'CAA Records',
        category: 'email_dns',
        status: 'FAIL',
        severity: 'Low',
        evidence: `No CAA records found for ${domain}`,
        sourceUrl: `dns:${domain}/CAA`,
        rawValue: '',
        confidence: 'High',
        whyItMatters:
          'Without CAA records, any CA can issue certificates for the domain.',
        recommendedFix:
          'Add CAA DNS records specifying authorized certificate authorities.',
      };
    }

    return {
      checkName: 'CAA Records',
      category: 'email_dns',
      status: 'UNKNOWN',
      severity: 'Low',
      evidence: `Could not retrieve CAA records for ${domain}: ${msg || 'Unknown error'}`,
      sourceUrl: `dns:${domain}/CAA`,
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'CAA records restrict certificate issuance.',
      recommendedFix: 'Ensure DNS is properly configured.',
    };
  }
}

/**
 * Collect DNS & email security findings for a domain.
 *
 * Runs all DNS checks (SPF, DKIM, DMARC, MX, CAA) and returns
 * the results as CollectorResult objects for scoring.
 *
 * @param opts - Collector options with at minimum a `domain` field.
 * @returns Array of CollectorResult objects, one per check.
 */
export async function collectDns(
  opts: CollectorOptions
): Promise<CollectorResult[]> {
  const timeout = opts.timeout ?? 10_000;
  const domain = opts.domain;

  const results = await Promise.allSettled([
    checkSpf(domain, timeout),
    checkDkim(domain, timeout),
    checkDmarc(domain, timeout),
    checkMx(domain, timeout),
    checkCaa(domain, timeout),
  ]);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<CollectorResult> =>
        r.status === 'fulfilled'
    )
    .map((r) => r.value);
}
