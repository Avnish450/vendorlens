/**
 * ============================================================================
 * VendorLens Scoring Engine
 * ============================================================================
 *
 * This is the core deterministic scoring model for VendorLens. Every vendor
 * receives a score from 0 to 100, where 100 represents the LOWEST risk.
 *
 * The model is fully transparent — the SCORING_MODEL constant at the bottom
 * of this file is rendered on the "How Scoring Works" page so users can
 * understand exactly how their vendors are evaluated.
 *
 * ============================================================================
 * SCORING OVERVIEW
 * ============================================================================
 *
 * Total Score: 0–100 (100 = lowest risk)
 *
 * The score is composed of five weighted categories:
 *
 *   ┌──────────────────────────────────────────┬────────┐
 *   │ Category                                 │ Weight │
 *   ├──────────────────────────────────────────┼────────┤
 *   │ Email & DNS Security                     │   20%  │
 *   │ Transport Security (TLS)                 │   20%  │
 *   │ Web Application Hardening (Headers)      │   15%  │
 *   │ Known Exploited Vulnerabilities (KEV)    │   30%  │
 *   │ Exposure & Hygiene                       │   15%  │
 *   └──────────────────────────────────────────┴────────┘
 *
 * Within each category, individual checks can deduct points when they FAIL.
 * Each category starts at 100% and deductions bring it down. The category
 * score (0–100) is then multiplied by the category weight to determine its
 * contribution to the overall score.
 *
 * ============================================================================
 * IMPORTANT: UNKNOWN STATUS HANDLING
 * ============================================================================
 *
 * When a check returns UNKNOWN (data could not be retrieved), it does NOT
 * reduce the score. Instead, it lowers the "coverage" percentage, which
 * indicates how much of the vendor's security posture we were able to assess.
 *
 * This prevents vendors from being penalized for network issues, timeouts,
 * or data source unavailability during a scan.
 *
 * ============================================================================
 * GRADE & RISK TIER MAPPING
 * ============================================================================
 *
 *   Grade:  A = 90–100  |  B = 80–89  |  C = 65–79  |  D = 50–64  |  F = 0–49
 *
 *   Risk Tier:  Low = 80–100  |  Medium = 65–79  |  High = 40–64  |  Critical = 0–39
 *
 * ============================================================================
 */

import type { CollectorResult, CheckStatus, Severity, CheckCategory } from '@/lib/collectors/types';

// ============================================================================
// Types
// ============================================================================

/** A finding is a CollectorResult that has been stored (may include an id). */
export interface Finding extends CollectorResult {
  id?: string;
}

/** Breakdown of a single scoring category. */
export interface CategoryBreakdown {
  /** Category identifier. */
  category: CheckCategory;
  /** Human-readable category name. */
  name: string;
  /** Weight of this category in the overall score (0–1). */
  weight: number;
  /** Score for this category (0–100). */
  score: number;
  /** Weighted contribution to overall score. */
  weightedScore: number;
  /** Number of checks that returned PASS. */
  passCount: number;
  /** Number of checks that returned FAIL. */
  failCount: number;
  /** Number of checks that returned UNKNOWN. */
  unknownCount: number;
  /** Total number of checks in this category. */
  totalChecks: number;
  /** Percentage of checks that were evaluable (PASS or FAIL, not UNKNOWN). */
  coverage: number;
}

/** The complete result of scoring a vendor. */
export interface ScoringResult {
  /** Overall score from 0 to 100. */
  score: number;
  /** Letter grade: A, B, C, D, or F. */
  grade: string;
  /** Risk tier: Low, Medium, High, or Critical. */
  riskTier: string;
  /** Overall coverage percentage (how many checks returned definitive results). */
  coverage: number;
  /** Breakdown by category. */
  categoryBreakdown: CategoryBreakdown[];
}

// ============================================================================
// Check Definitions
// ============================================================================

/**
 * Definition of a single scoring check. This structure is used both for
 * scoring calculations and for rendering the "How Scoring Works" page.
 */
export interface CheckDefinition {
  /** Unique name matching the CollectorResult.checkName field. */
  name: string;
  /** Which category this check belongs to. */
  category: CheckCategory;
  /** Relative weight within its category (all weights in a category sum to 1). */
  weightInCategory: number;
  /** Maximum points this check can deduct from its category score (0–100 scale). */
  maxDeduction: number;
  /** Severity level. */
  severity: Severity;
  /** Description of what this check evaluates. */
  description: string;
  /** What a FAIL result means. */
  failDescription: string;
  /** What a PASS result means. */
  passDescription: string;
}

/**
 * Definition of a scoring category, containing its checks.
 */
export interface CategoryDefinition {
  /** Category identifier. */
  id: CheckCategory;
  /** Human-readable name. */
  name: string;
  /** Description of what this category covers. */
  description: string;
  /** Weight in the overall score (all weights sum to 1.0). */
  weight: number;
  /** Individual checks within this category. */
  checks: CheckDefinition[];
}

/**
 * The complete scoring model definition.
 */
export interface ScoringModelDefinition {
  /** Version of the scoring model. */
  version: string;
  /** Human-readable description. */
  description: string;
  /** Total score range maximum. */
  maxScore: number;
  /** Grade mapping table. */
  grades: { grade: string; min: number; max: number; label: string }[];
  /** Risk tier mapping table. */
  riskTiers: { tier: string; min: number; max: number; label: string }[];
  /** All scoring categories with their checks. */
  categories: CategoryDefinition[];
}

// ============================================================================
// Scoring Model Definition
// ============================================================================

/**
 * SCORING_MODEL — the single source of truth for all scoring logic.
 *
 * This constant is exported and used in two places:
 * 1. The `calculateScore()` function below (for actual scoring)
 * 2. The "How Scoring Works" page (to render a human-readable explanation)
 *
 * Every check defined here must correspond to a `checkName` emitted by
 * one of the collectors. The weights, deductions, and descriptions are
 * all documented here for full transparency.
 */
export const SCORING_MODEL: ScoringModelDefinition = {
  version: '1.0.0',
  description:
    'VendorLens evaluates third-party vendor security posture across five categories. ' +
    'Each category contains specific checks that can deduct points when they fail. ' +
    'The overall score is a weighted average of category scores, ranging from 0 (highest risk) ' +
    'to 100 (lowest risk). Checks that return UNKNOWN (data unavailable) do not affect the score ' +
    'but reduce the coverage percentage.',
  maxScore: 100,

  grades: [
    { grade: 'A', min: 90, max: 100, label: 'Excellent security posture' },
    { grade: 'B', min: 80, max: 89, label: 'Good security posture with minor gaps' },
    { grade: 'C', min: 65, max: 79, label: 'Moderate risk — notable gaps exist' },
    { grade: 'D', min: 50, max: 64, label: 'Poor security posture — significant gaps' },
    { grade: 'F', min: 0, max: 49, label: 'Critical risk — immediate attention required' },
  ],

  riskTiers: [
    { tier: 'Low', min: 80, max: 100, label: 'Acceptable risk level' },
    { tier: 'Medium', min: 65, max: 79, label: 'Monitor and address gaps' },
    { tier: 'High', min: 40, max: 64, label: 'Escalate — remediation plan needed' },
    { tier: 'Critical', min: 0, max: 39, label: 'Immediate action required' },
  ],

  categories: [
    // ========================================================================
    // Category 1: Email & DNS Security (20% of total score)
    // ========================================================================
    {
      id: 'email_dns',
      name: 'Email & DNS Security',
      description:
        'Evaluates the vendor\'s email authentication and DNS security configuration. ' +
        'Proper SPF, DKIM, and DMARC records prevent email spoofing and phishing attacks ' +
        'that could target your organization using the vendor\'s domain.',
      weight: 0.20,
      checks: [
        {
          name: 'SPF Record',
          category: 'email_dns',
          weightInCategory: 0.25,
          maxDeduction: 25,
          severity: 'Medium',
          description: 'Checks for a valid SPF (Sender Policy Framework) TXT record.',
          failDescription:
            'No SPF record was found. Without SPF, anyone can send emails that appear to come ' +
            'from this domain, enabling phishing and spoofing attacks.',
          passDescription:
            'A valid SPF record is published, specifying which mail servers are authorized to ' +
            'send email on behalf of this domain.',
        },
        {
          name: 'DKIM Record',
          category: 'email_dns',
          weightInCategory: 0.20,
          maxDeduction: 20,
          severity: 'Medium',
          description:
            'Checks for DKIM (DomainKeys Identified Mail) records across common selectors ' +
            '(google, default, selector1, selector2, k1, mail).',
          failDescription:
            'No DKIM records were found for any common selector. Without DKIM, email recipients ' +
            'cannot verify that emails from this domain have not been tampered with in transit.',
          passDescription:
            'At least one DKIM record was found, enabling cryptographic verification of email ' +
            'authenticity and integrity.',
        },
        {
          name: 'DMARC Policy',
          category: 'email_dns',
          weightInCategory: 0.25,
          maxDeduction: 25,
          severity: 'High',
          description:
            'Checks for a DMARC (Domain-based Message Authentication, Reporting & Conformance) ' +
            'record and evaluates its policy strength (none, quarantine, or reject).',
          failDescription:
            'No DMARC record was found, or the policy is set to "none" (monitoring only). ' +
            'Without an enforcing DMARC policy, spoofed emails from this domain will be delivered ' +
            'to recipients.',
          passDescription:
            'A DMARC record is published with an enforcing policy (quarantine or reject), ' +
            'protecting against domain spoofing in email.',
        },
        {
          name: 'MX Records',
          category: 'email_dns',
          weightInCategory: 0.15,
          maxDeduction: 15,
          severity: 'Low',
          description: 'Checks that valid MX (Mail Exchange) records are configured.',
          failDescription:
            'No MX records were found. This may indicate the domain is not configured for ' +
            'email, or there is a DNS misconfiguration.',
          passDescription:
            'Valid MX records are present, indicating proper email infrastructure configuration.',
        },
        {
          name: 'CAA Records',
          category: 'email_dns',
          weightInCategory: 0.15,
          maxDeduction: 15,
          severity: 'Low',
          description:
            'Checks for CAA (Certificate Authority Authorization) DNS records that restrict ' +
            'which CAs can issue certificates for the domain.',
          failDescription:
            'No CAA records were found. Without CAA, any certificate authority can issue ' +
            'certificates for this domain, increasing the risk of unauthorized certificate issuance.',
          passDescription:
            'CAA records are present, restricting certificate issuance to authorized CAs only.',
        },
      ],
    },

    // ========================================================================
    // Category 2: Transport Security — TLS (20% of total score)
    // ========================================================================
    {
      id: 'transport',
      name: 'Transport Security (TLS)',
      description:
        'Evaluates the vendor\'s TLS/SSL configuration for their web services. ' +
        'Strong transport security ensures that data transmitted between users and the ' +
        'vendor\'s servers is encrypted and cannot be intercepted.',
      weight: 0.20,
      checks: [
        {
          name: 'Certificate Validity',
          category: 'transport',
          weightInCategory: 0.30,
          maxDeduction: 30,
          severity: 'Critical',
          description: 'Checks that the TLS certificate is currently valid (not expired).',
          failDescription:
            'The TLS certificate is expired. Expired certificates cause browser warnings ' +
            'and indicate poor security maintenance. Data in transit may not be properly encrypted.',
          passDescription:
            'The TLS certificate is valid and not expired.',
        },
        {
          name: 'Certificate Expiry Window',
          category: 'transport',
          weightInCategory: 0.20,
          maxDeduction: 20,
          severity: 'Medium',
          description:
            'Checks that the TLS certificate has more than 30 days before expiration.',
          failDescription:
            'The TLS certificate expires within 30 days. This suggests a lack of automated ' +
            'certificate renewal and risks an outage if not renewed in time.',
          passDescription:
            'The TLS certificate has more than 30 days until expiration, indicating proper ' +
            'certificate lifecycle management.',
        },
        {
          name: 'TLS Protocol Version',
          category: 'transport',
          weightInCategory: 0.30,
          maxDeduction: 30,
          severity: 'High',
          description:
            'Checks that the server supports TLS 1.2 or TLS 1.3. Older versions (SSL 3.0, ' +
            'TLS 1.0, TLS 1.1) have known vulnerabilities.',
          failDescription:
            'The server is using an outdated TLS protocol version with known vulnerabilities. ' +
            'TLS 1.0 and 1.1 are deprecated and vulnerable to attacks like POODLE and BEAST.',
          passDescription:
            'The server supports TLS 1.2 or TLS 1.3, providing strong transport encryption.',
        },
        {
          name: 'Certificate Trust',
          category: 'transport',
          weightInCategory: 0.20,
          maxDeduction: 20,
          severity: 'High',
          description:
            'Checks that the certificate is issued by a trusted certificate authority (not self-signed).',
          failDescription:
            'The certificate appears to be self-signed. Self-signed certificates are not trusted ' +
            'by browsers and cannot verify the server\'s identity, enabling man-in-the-middle attacks.',
          passDescription:
            'The certificate is issued by a recognized, trusted certificate authority.',
        },
      ],
    },

    // ========================================================================
    // Category 3: Web Application Hardening — Headers (15% of total score)
    // ========================================================================
    {
      id: 'web_hardening',
      name: 'Web Application Hardening',
      description:
        'Evaluates the presence and configuration of HTTP security headers. ' +
        'These headers instruct browsers to enable security features that protect users ' +
        'from common web attacks like XSS, clickjacking, and MIME-type confusion.',
      weight: 0.15,
      checks: [
        {
          name: 'HSTS Header',
          category: 'web_hardening',
          weightInCategory: 0.25,
          maxDeduction: 25,
          severity: 'High',
          description:
            'Checks for the Strict-Transport-Security (HSTS) header, which tells browsers to ' +
            'always use HTTPS when connecting to the site.',
          failDescription:
            'No HSTS header was found. Without HSTS, users can be redirected to insecure HTTP ' +
            'connections, enabling man-in-the-middle attacks and SSL stripping.',
          passDescription:
            'HSTS header is present, ensuring browsers always use encrypted HTTPS connections.',
        },
        {
          name: 'Content Security Policy',
          category: 'web_hardening',
          weightInCategory: 0.20,
          maxDeduction: 20,
          severity: 'Medium',
          description:
            'Checks for a Content-Security-Policy (CSP) header that restricts which resources ' +
            'the page can load.',
          failDescription:
            'No Content-Security-Policy header was found. Without CSP, the site is more vulnerable ' +
            'to cross-site scripting (XSS) and data injection attacks.',
          passDescription:
            'A Content-Security-Policy header is set, reducing the risk of XSS and injection attacks.',
        },
        {
          name: 'X-Frame-Options',
          category: 'web_hardening',
          weightInCategory: 0.15,
          maxDeduction: 15,
          severity: 'Medium',
          description:
            'Checks for the X-Frame-Options header that prevents clickjacking by controlling ' +
            'whether the page can be embedded in frames.',
          failDescription:
            'No X-Frame-Options header was found. The site may be vulnerable to clickjacking ' +
            'attacks where it is embedded in a malicious frame.',
          passDescription:
            'X-Frame-Options header is set, protecting against clickjacking attacks.',
        },
        {
          name: 'X-Content-Type-Options',
          category: 'web_hardening',
          weightInCategory: 0.15,
          maxDeduction: 15,
          severity: 'Low',
          description:
            'Checks for the X-Content-Type-Options header with value "nosniff" to prevent ' +
            'MIME-type sniffing.',
          failDescription:
            'X-Content-Type-Options header is missing or not set to "nosniff". Browsers may ' +
            'misinterpret file types, potentially executing malicious content.',
          passDescription:
            'X-Content-Type-Options is set to "nosniff", preventing MIME-type confusion attacks.',
        },
        {
          name: 'Referrer-Policy',
          category: 'web_hardening',
          weightInCategory: 0.10,
          maxDeduction: 10,
          severity: 'Low',
          description:
            'Checks for a Referrer-Policy header that controls how much referrer information ' +
            'is included with requests.',
          failDescription:
            'No Referrer-Policy header was found. Sensitive URL parameters or paths may be leaked ' +
            'to third-party sites via the Referer header.',
          passDescription:
            'Referrer-Policy is configured, controlling the disclosure of referrer information.',
        },
        {
          name: 'Permissions-Policy',
          category: 'web_hardening',
          weightInCategory: 0.15,
          maxDeduction: 15,
          severity: 'Low',
          description:
            'Checks for a Permissions-Policy (formerly Feature-Policy) header that restricts ' +
            'which browser features the page can use.',
          failDescription:
            'No Permissions-Policy header was found. The site does not explicitly restrict access ' +
            'to sensitive browser APIs like camera, microphone, and geolocation.',
          passDescription:
            'Permissions-Policy is set, restricting access to sensitive browser features.',
        },
      ],
    },

    // ========================================================================
    // Category 4: Known Exploited Vulnerabilities (30% of total score)
    // ========================================================================
    {
      id: 'vulnerabilities',
      name: 'Known Exploited Vulnerabilities',
      description:
        'Checks the vendor\'s products against the CISA Known Exploited Vulnerabilities (KEV) ' +
        'catalog and NIST NVD for known CVEs. This is the highest-weighted category because ' +
        'actively exploited vulnerabilities represent immediate, concrete threats.',
      weight: 0.30,
      checks: [
        {
          name: 'CISA KEV Match',
          category: 'vulnerabilities',
          weightInCategory: 0.60,
          maxDeduction: 60,
          severity: 'Critical',
          description:
            'Checks whether any of the vendor\'s declared products appear in the CISA Known ' +
            'Exploited Vulnerabilities (KEV) catalog — a list of vulnerabilities that are being ' +
            'actively exploited in the wild.',
          failDescription:
            'One or more of the vendor\'s products have entries in the CISA KEV catalog, meaning ' +
            'there are known, actively exploited vulnerabilities. This requires immediate attention.',
          passDescription:
            'None of the vendor\'s products appear in the CISA KEV catalog. No actively exploited ' +
            'vulnerabilities were identified.',
        },
        {
          name: 'High-Severity CVEs',
          category: 'vulnerabilities',
          weightInCategory: 0.40,
          maxDeduction: 40,
          severity: 'High',
          description:
            'Queries the NIST NVD for recent CVEs related to the vendor\'s products with ' +
            'high or critical CVSS scores.',
          failDescription:
            'High or critical severity CVEs were found for the vendor\'s products in the NVD. ' +
            'These should be evaluated for applicability and patching status.',
          passDescription:
            'No high or critical severity CVEs were found for the vendor\'s products in the NVD.',
        },
      ],
    },

    // ========================================================================
    // Category 5: Exposure & Hygiene (15% of total score)
    // ========================================================================
    {
      id: 'exposure',
      name: 'Exposure & Hygiene',
      description:
        'Evaluates the vendor\'s operational security hygiene, including subdomain sprawl, ' +
        'certificate transparency, security contact availability, and data breach history.',
      weight: 0.15,
      checks: [
        {
          name: 'Subdomain Sprawl',
          category: 'exposure',
          weightInCategory: 0.25,
          maxDeduction: 25,
          severity: 'Medium',
          description:
            'Uses Certificate Transparency logs to count the number of unique subdomains. ' +
            'More than 200 subdomains may indicate sprawl that increases the attack surface.',
          failDescription:
            'More than 200 unique subdomains were found in certificate transparency logs, ' +
            'suggesting potential subdomain sprawl that increases the attack surface.',
          passDescription:
            'The number of subdomains is within a reasonable range, indicating controlled ' +
            'infrastructure.',
        },
        {
          name: 'Expiring Certificates (CT)',
          category: 'exposure',
          weightInCategory: 0.20,
          maxDeduction: 20,
          severity: 'Medium',
          description:
            'Checks certificate transparency logs for certificates that will expire within 30 days.',
          failDescription:
            'Certificates expiring within 30 days were found in CT logs, indicating potential ' +
            'certificate management issues.',
          passDescription:
            'No certificates expiring within 30 days were found in CT logs.',
        },
        {
          name: 'Security.txt',
          category: 'exposure',
          weightInCategory: 0.20,
          maxDeduction: 20,
          severity: 'Low',
          description:
            'Checks for a security.txt file at /.well-known/security.txt containing a Contact field.',
          failDescription:
            'No security.txt file was found. This makes it harder for security researchers to ' +
            'responsibly report vulnerabilities they discover.',
          passDescription:
            'A valid security.txt is published, providing clear channels for vulnerability disclosure.',
        },
        {
          name: 'Data Breaches (HIBP)',
          category: 'exposure',
          weightInCategory: 0.20,
          maxDeduction: 20,
          severity: 'High',
          description:
            'Checks Have I Been Pwned for known data breaches involving this domain.',
          failDescription:
            'The domain has appeared in known data breaches recorded by Have I Been Pwned.',
          passDescription:
            'No known data breaches involving this domain were found in Have I Been Pwned.',
        },
        {
          name: 'Open Ports & Services (Shodan)',
          category: 'exposure',
          weightInCategory: 0.15,
          maxDeduction: 15,
          severity: 'Medium',
          description:
            'Uses Shodan to check for unexpected open ports or exposed services.',
          failDescription:
            'Unexpected open ports or potentially risky services were detected by Shodan.',
          passDescription:
            'No unexpected open ports or risky services were detected.',
        },
      ],
    },
  ],
};

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Build a lookup map from check name to its definition.
 * This is used during scoring to find the deduction rules for each finding.
 */
function buildCheckMap(): Map<string, { check: CheckDefinition; categoryDef: CategoryDefinition }> {
  const map = new Map<string, { check: CheckDefinition; categoryDef: CategoryDefinition }>();
  for (const cat of SCORING_MODEL.categories) {
    for (const check of cat.checks) {
      map.set(check.name, { check, categoryDef: cat });
    }
  }
  return map;
}

const checkMap = buildCheckMap();

/**
 * Get the letter grade for a given score.
 *
 * @param score - A score from 0 to 100.
 * @returns The corresponding letter grade (A, B, C, D, or F).
 *
 * Mapping:
 *   A = 90–100 (Excellent)
 *   B = 80–89  (Good)
 *   C = 65–79  (Moderate risk)
 *   D = 50–64  (Poor)
 *   F = 0–49   (Critical risk)
 */
export function getGrade(score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const { grade, min, max } of SCORING_MODEL.grades) {
    if (clamped >= min && clamped <= max) return grade;
  }
  return 'F';
}

/**
 * Get the risk tier for a given score.
 *
 * @param score - A score from 0 to 100.
 * @returns The corresponding risk tier (Low, Medium, High, or Critical).
 *
 * Mapping:
 *   Low      = 80–100
 *   Medium   = 65–79
 *   High     = 40–64
 *   Critical = 0–39
 */
export function getRiskTier(score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const { tier, min, max } of SCORING_MODEL.riskTiers) {
    if (clamped >= min && clamped <= max) return tier;
  }
  return 'Critical';
}

/**
 * Calculate a priority score for a finding based on its severity and the
 * vendor's criticality level. Higher numbers = higher priority.
 *
 * Used for sorting and display: most urgent findings appear first.
 *
 * @param severity - The finding's severity: Critical, High, Medium, Low, Info
 * @param criticality - The vendor's business criticality: Critical, High, Medium, Low
 * @returns A priority number from 0 to 100.
 */
export function calculatePriority(severity: string, criticality: string): number {
  const severityScores: Record<string, number> = {
    Critical: 50,
    High: 40,
    Medium: 25,
    Low: 10,
    Info: 0,
  };

  const criticalityMultipliers: Record<string, number> = {
    Critical: 2.0,
    High: 1.5,
    Medium: 1.0,
    Low: 0.75,
  };

  const sevScore = severityScores[severity] ?? 0;
  const critMultiplier = criticalityMultipliers[criticality] ?? 1.0;

  return Math.min(100, Math.round(sevScore * critMultiplier));
}

/**
 * Calculate the overall vendor security score from an array of findings.
 *
 * Algorithm:
 * 1. For each scoring category, start at 100 points.
 * 2. For each FAIL finding in that category, deduct the check's maxDeduction.
 * 3. UNKNOWN findings don't affect the score but reduce coverage.
 * 4. PASS findings confirm the check was evaluated and passed.
 * 5. The category score is clamped to [0, 100].
 * 6. The overall score is the weighted average of all category scores.
 *
 * @param findings - Array of findings from a vendor scan.
 * @returns A complete ScoringResult with score, grade, risk tier, coverage, and breakdown.
 */
export function calculateScore(findings: Finding[]): ScoringResult {
  const categoryBreakdown: CategoryBreakdown[] = [];

  let totalWeightedScore = 0;
  let totalEvaluableChecks = 0;
  let totalChecks = 0;

  for (const categoryDef of SCORING_MODEL.categories) {
    // Start each category at 100 (perfect score)
    let categoryScore = 100;
    let passCount = 0;
    let failCount = 0;
    let unknownCount = 0;

    // Find all findings for this category
    const categoryFindings = findings.filter(
      (f) => f.category === categoryDef.id
    );

    // Track which checks we've seen (to count checks not in findings)
    const seenChecks = new Set<string>();

    for (const finding of categoryFindings) {
      seenChecks.add(finding.checkName);

      if (finding.status === 'PASS') {
        passCount++;
      } else if (finding.status === 'FAIL') {
        failCount++;
        // Look up the check definition to get the deduction amount
        const checkInfo = checkMap.get(finding.checkName);
        if (checkInfo) {
          categoryScore -= checkInfo.check.maxDeduction;
        }
      } else if (finding.status === 'UNKNOWN') {
        unknownCount++;
        // UNKNOWN does NOT reduce score — it only affects coverage
      }
    }

    // Count checks defined in the model but not present in findings as UNKNOWN
    for (const checkDef of categoryDef.checks) {
      if (!seenChecks.has(checkDef.name)) {
        unknownCount++;
      }
    }

    const totalCategoryChecks = categoryDef.checks.length;
    const evaluable = passCount + failCount;
    const coverage =
      totalCategoryChecks > 0 ? (evaluable / totalCategoryChecks) * 100 : 0;

    // Clamp category score to [0, 100]
    categoryScore = Math.max(0, Math.min(100, categoryScore));

    const weightedScore = categoryScore * categoryDef.weight;

    categoryBreakdown.push({
      category: categoryDef.id,
      name: categoryDef.name,
      weight: categoryDef.weight,
      score: categoryScore,
      weightedScore,
      passCount,
      failCount,
      unknownCount,
      totalChecks: totalCategoryChecks,
      coverage,
    });

    totalWeightedScore += weightedScore;
    totalEvaluableChecks += evaluable;
    totalChecks += totalCategoryChecks;
  }

  // Round the final score
  const score = Math.round(Math.max(0, Math.min(100, totalWeightedScore)));

  // Overall coverage
  const coverage =
    totalChecks > 0 ? Math.round((totalEvaluableChecks / totalChecks) * 100) : 0;

  return {
    score,
    grade: getGrade(score),
    riskTier: getRiskTier(score),
    coverage,
    categoryBreakdown,
  };
}
