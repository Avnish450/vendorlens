/**
 * RFC 9116 Security.txt Collector
 *
 * Checks for presence and validity of /.well-known/security.txt
 * allowing security researchers to report vulnerabilities responsibly.
 */

import { CollectorOptions, CollectorResult } from './types';

export async function collectSecurityTxt(opts: CollectorOptions): Promise<CollectorResult[]> {
  const results: CollectorResult[] = [];
  const timeout = opts.timeout ?? 8000;
  const domain = opts.domain.toLowerCase().trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const targetUrl = `https://${domain}/.well-known/security.txt`;

  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VendorLens-SecurityTxt-Checker/1.0',
        'Accept': 'text/plain',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (res.ok) {
      const text = await res.text();
      const hasContact = /Contact:\s*(mailto:|https?:|\+)/i.test(text);
      const hasExpires = /Expires:\s*/i.test(text);

      if (hasContact) {
        results.push({
          checkName: 'Security.txt',
          category: 'exposure',
          status: 'PASS',
          severity: 'Low',
          evidence: `RFC 9116 security.txt discovered with valid Contact directive${hasExpires ? ' and Expires timestamp' : ''}`,
          sourceUrl: targetUrl,
          rawValue: text.slice(0, 300),
          confidence: 'High',
          whyItMatters: 'A valid security.txt allows ethical researchers to report vulnerabilities quickly before malicious exploitation.',
          recommendedFix: 'Keep the Contact and Expires directives refreshed in accordance with RFC 9116.',
        });
      } else {
        results.push({
          checkName: 'Security.txt',
          category: 'exposure',
          status: 'FAIL',
          severity: 'Low',
          evidence: 'A file was returned at /.well-known/security.txt but missing the mandatory "Contact:" field',
          sourceUrl: targetUrl,
          rawValue: text.slice(0, 150),
          confidence: 'High',
          whyItMatters: 'Security.txt requires at least one Contact directive to establish a vulnerability disclosure channel.',
          recommendedFix: 'Add a valid Contact: mailto:security@domain.com line to the file.',
        });
      }
    } else if (res.status === 404) {
      results.push({
        checkName: 'Security.txt',
        category: 'exposure',
        status: 'FAIL',
        severity: 'Low',
        evidence: 'No security.txt found at /.well-known/security.txt (HTTP 404)',
        sourceUrl: targetUrl,
        rawValue: 'HTTP 404',
        confidence: 'High',
        whyItMatters: 'Lack of security.txt slows coordinated vulnerability disclosure and bug reports from external researchers.',
        recommendedFix: 'Deploy an RFC 9116 compliant security.txt file at https://' + domain + '/.well-known/security.txt',
      });
    } else {
      results.push({
        checkName: 'Security.txt',
        category: 'exposure',
        status: 'FAIL',
        severity: 'Low',
        evidence: `Server returned HTTP ${res.status} when requesting /.well-known/security.txt`,
        sourceUrl: targetUrl,
        rawValue: `Status: ${res.status}`,
        confidence: 'Medium',
        whyItMatters: 'External vulnerability disclosure policy could not be verified.',
        recommendedFix: 'Ensure web server serves text/plain for /.well-known/security.txt.',
      });
    }
  } catch (err: any) {
    clearTimeout(timer);
    results.push({
      checkName: 'Security.txt',
      category: 'exposure',
      status: 'UNKNOWN',
      severity: 'Low',
      evidence: `Could not retrieve security.txt: ${err?.message || 'Connection failed'}`,
      sourceUrl: targetUrl,
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'Verifies external security reporting policy.',
      recommendedFix: 'Check HTTPS availability on vendor domain.',
    });
  }

  return results;
}
