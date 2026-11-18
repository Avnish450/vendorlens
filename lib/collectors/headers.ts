/**
 * HTTP Security Headers Collector
 *
 * Fetches the vendor's HTTPS homepage and checks for the presence
 * and configuration of important security headers:
 * - Strict-Transport-Security (HSTS)
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 */

import type { CollectorResult, CollectorOptions } from '@/lib/collectors/types';

/**
 * Definition for a header check.
 */
interface HeaderCheck {
  headerName: string;
  checkName: string;
  severity: 'High' | 'Medium' | 'Low';
  /** Optional validation function. If not provided, presence alone is sufficient. */
  validate?: (value: string) => { valid: boolean; detail: string };
  whyItMatters: string;
  recommendedFix: string;
}

/**
 * All header checks to perform.
 */
const HEADER_CHECKS: HeaderCheck[] = [
  {
    headerName: 'strict-transport-security',
    checkName: 'HSTS Header',
    severity: 'High',
    validate: (value) => {
      const hasMaxAge = /max-age\s*=\s*(\d+)/i.test(value);
      if (!hasMaxAge) {
        return { valid: false, detail: 'HSTS header present but missing max-age directive' };
      }
      const match = value.match(/max-age\s*=\s*(\d+)/i);
      const maxAge = match ? parseInt(match[1], 10) : 0;
      if (maxAge < 31536000) {
        return {
          valid: true,
          detail: `HSTS present with max-age=${maxAge} (recommended: at least 31536000 / 1 year)`,
        };
      }
      return { valid: true, detail: `HSTS properly configured: ${value}` };
    },
    whyItMatters:
      'HSTS tells browsers to always use HTTPS, preventing SSL stripping and downgrade attacks.',
    recommendedFix:
      'Add the header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
  },
  {
    headerName: 'content-security-policy',
    checkName: 'Content Security Policy',
    severity: 'Medium',
    whyItMatters:
      'CSP restricts which resources the page can load, providing strong defense against XSS attacks.',
    recommendedFix:
      'Add a Content-Security-Policy header that restricts script and resource sources.',
  },
  {
    headerName: 'x-frame-options',
    checkName: 'X-Frame-Options',
    severity: 'Medium',
    validate: (value) => {
      const normalized = value.toUpperCase().trim();
      if (normalized === 'DENY' || normalized === 'SAMEORIGIN') {
        return { valid: true, detail: `X-Frame-Options set to ${normalized}` };
      }
      return {
        valid: false,
        detail: `X-Frame-Options has unrecognized value: ${value}`,
      };
    },
    whyItMatters:
      'X-Frame-Options prevents the page from being embedded in frames, defending against clickjacking.',
    recommendedFix: 'Add the header: X-Frame-Options: DENY (or SAMEORIGIN if framing is needed).',
  },
  {
    headerName: 'x-content-type-options',
    checkName: 'X-Content-Type-Options',
    severity: 'Low',
    validate: (value) => {
      if (value.toLowerCase().trim() === 'nosniff') {
        return { valid: true, detail: 'X-Content-Type-Options correctly set to "nosniff"' };
      }
      return {
        valid: false,
        detail: `X-Content-Type-Options has incorrect value: "${value}" (must be "nosniff")`,
      };
    },
    whyItMatters:
      'Prevents browsers from MIME-sniffing, which could lead to interpreting files as executable code.',
    recommendedFix: 'Add the header: X-Content-Type-Options: nosniff',
  },
  {
    headerName: 'referrer-policy',
    checkName: 'Referrer-Policy',
    severity: 'Low',
    whyItMatters:
      'Controls how much referrer information is sent with requests, preventing leakage of sensitive URLs.',
    recommendedFix:
      'Add the header: Referrer-Policy: strict-origin-when-cross-origin (or stricter).',
  },
  {
    headerName: 'permissions-policy',
    checkName: 'Permissions-Policy',
    severity: 'Low',
    whyItMatters:
      'Restricts access to browser features like camera, microphone, and geolocation to reduce attack surface.',
    recommendedFix:
      'Add the header: Permissions-Policy: camera=(), microphone=(), geolocation=()',
  },
];

/**
 * Collect HTTP security header findings for a domain.
 *
 * Fetches the HTTPS homepage and checks each header.
 *
 * @param opts - Collector options with a `domain` field.
 * @returns Array of CollectorResult objects.
 */
export async function collectHeaders(
  opts: CollectorOptions
): Promise<CollectorResult[]> {
  const timeout = opts.timeout ?? 10_000;
  const domain = opts.domain;
  const url = `https://${domain}`;

  let response: Response;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'VendorLens Security Scanner/1.0',
      },
    });

    clearTimeout(timer);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // If HEAD fails, try GET
    try {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), timeout);

      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller2.signal,
        headers: {
          'User-Agent': 'VendorLens Security Scanner/1.0',
        },
      });

      clearTimeout(timer2);
    } catch (retryError) {
      // Both HEAD and GET failed — return UNKNOWN for all checks
      return HEADER_CHECKS.map((check) => ({
        checkName: check.checkName,
        category: 'web_hardening' as const,
        status: 'UNKNOWN' as const,
        severity: check.severity,
        evidence: `Could not fetch ${url}: ${errorMsg}`,
        sourceUrl: url,
        rawValue: '',
        confidence: 'Low' as const,
        whyItMatters: check.whyItMatters,
        recommendedFix: check.recommendedFix,
      }));
    }
  }

  const results: CollectorResult[] = [];

  for (const check of HEADER_CHECKS) {
    const headerValue = response.headers.get(check.headerName);

    if (!headerValue) {
      results.push({
        checkName: check.checkName,
        category: 'web_hardening',
        status: 'FAIL',
        severity: check.severity,
        evidence: `${check.checkName} header is not set on ${url}`,
        sourceUrl: url,
        rawValue: '',
        confidence: 'High',
        whyItMatters: check.whyItMatters,
        recommendedFix: check.recommendedFix,
      });
      continue;
    }

    // If there's a validation function, use it
    if (check.validate) {
      const validation = check.validate(headerValue);
      results.push({
        checkName: check.checkName,
        category: 'web_hardening',
        status: validation.valid ? 'PASS' : 'FAIL',
        severity: check.severity,
        evidence: validation.detail,
        sourceUrl: url,
        rawValue: headerValue,
        confidence: 'High',
        whyItMatters: check.whyItMatters,
        recommendedFix: validation.valid ? '' : check.recommendedFix,
      });
    } else {
      // Presence check is sufficient
      results.push({
        checkName: check.checkName,
        category: 'web_hardening',
        status: 'PASS',
        severity: check.severity,
        evidence: `${check.checkName} header is present: ${headerValue.substring(0, 200)}`,
        sourceUrl: url,
        rawValue: headerValue,
        confidence: 'High',
        whyItMatters: check.whyItMatters,
        recommendedFix: '',
      });
    }
  }

  return results;
}
