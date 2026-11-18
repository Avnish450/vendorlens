/**
 * Collector Type Definitions
 *
 * Shared types used by all security data collectors in VendorLens.
 * Each collector produces an array of CollectorResult objects that
 * feed into the scoring engine.
 */

/** The outcome of a security check. */
export type CheckStatus = 'PASS' | 'FAIL' | 'UNKNOWN';

/** Severity level of a finding. */
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

/** Confidence in the accuracy of the finding. */
export type Confidence = 'High' | 'Medium' | 'Low';

/** Category of security check — maps to scoring model categories. */
export type CheckCategory =
  | 'email_dns'
  | 'transport'
  | 'web_hardening'
  | 'vulnerabilities'
  | 'exposure';

/**
 * The result of a single security check performed by a collector.
 *
 * Each collector returns an array of these. They are stored as findings
 * in the database and fed into the scoring engine.
 */
export interface CollectorResult {
  /** Human-readable name of the check (e.g., "SPF Record", "HSTS Header"). */
  checkName: string;

  /** Which scoring category this check belongs to. */
  category: CheckCategory;

  /** Whether the check passed, failed, or couldn't be determined. */
  status: CheckStatus;

  /** Severity of a failure. For PASS results, indicates what severity it would be if it failed. */
  severity: Severity;

  /** Factual description of what was found (e.g., "No DMARC record found at _dmarc.example.com"). */
  evidence: string;

  /** URL or service used to obtain this data. */
  sourceUrl: string;

  /** Raw data value retrieved (e.g., the actual header value, TXT record content). */
  rawValue: string;

  /** How confident we are in this result. */
  confidence: Confidence;

  /** Plain-English explanation of why this check matters for security posture. */
  whyItMatters: string;

  /** Actionable recommendation for fixing a FAIL result. */
  recommendedFix: string;
}

/**
 * Options passed to every collector function.
 */
export interface CollectorOptions {
  /** The domain to scan (e.g., "example.com"). */
  domain: string;

  /** Request timeout in milliseconds. Defaults to 10000 (10 seconds). */
  timeout?: number;

  /** Products the vendor has declared they use (for KEV/CVE matching). */
  declaredProducts?: string[];
}
