/**
 * Grounded AI & Template-Based Risk Summary Generator
 *
 * Generates an executive security posture summary.
 * If ANTHROPIC_API_KEY or GEMINI_API_KEY is present, calls the LLM with strict grounding
 * instructions (relying exclusively on cited evidence).
 * Otherwise, generates a structured deterministic executive summary.
 */

import { Finding } from './scoring';

interface VendorSummaryInput {
  name: string;
  domain: string;
  category: string;
  criticality: string;
  score: number;
  grade: string;
  riskTier: string;
  coveragePercent: number;
}

export async function generateSummary(
  vendor: VendorSummaryInput,
  findings: Finding[]
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const fails = findings.filter(f => f.status === 'FAIL');
  const passes = findings.filter(f => f.status === 'PASS');
  const unknowns = findings.filter(f => f.status === 'UNKNOWN');

  // Format factual findings payload for LLM or template
  const findingsSummaryText = findings.map(f =>
    `- [${f.status}] ${f.checkName} (${f.category}, Severity: ${f.severity}): ${f.evidence}`
  ).join('\n');

  // 1. Anthropic Claude Grounded Summary
  if (anthropicKey) {
    try {
      const prompt = `You are a certified third-party vendor risk auditor. Generate a concise 3-paragraph executive security briefing for vendor "${vendor.name}" (${vendor.domain}).
Score: ${vendor.score}/100 | Grade: ${vendor.grade} | Tier: ${vendor.riskTier} | Assessment Coverage: ${vendor.coveragePercent}%.
Criticality: ${vendor.criticality}.

STRICT GROUNDING RULES:
1. Base your statements ONLY on the verified findings list below.
2. If evidence is missing for any check or marked UNKNOWN, state "Insufficient data available" — NEVER speculate, assume, or invent security controls.
3. Every risk claim must cite the specific check name (e.g. "According to the DMARC policy check...").
4. Structure into: (1) Executive Stance, (2) Key Weaknesses & Strengths, (3) Priority Procurement Recommendation.

VERIFIED FINDINGS:
${findingsSummaryText}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.content?.[0]?.text;
        if (text) return text.trim();
      }
    } catch {
      // Fall through to deterministic template if upstream call fails
    }
  }

  // 2. Gemini Grounded Summary
  if (geminiKey) {
    try {
      const prompt = `You are a certified third-party risk management specialist. Generate a factual, professional executive summary for vendor "${vendor.name}" (${vendor.domain}).
Score: ${vendor.score}/100 | Grade: ${vendor.grade} | Risk Tier: ${vendor.riskTier} | Coverage: ${vendor.coveragePercent}%.

RULES:
- Use ONLY the following verified findings.
- State "Insufficient data" if unknown. Do not invent details.
- Cite the exact check name for each finding.

FINDINGS:
${findingsSummaryText}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch {
      // Fall through
    }
  }

  // 3. Deterministic Grounded Template Summary (Zero Key Dependency)
  const paragraphs: string[] = [];

  // Paragraph 1: Executive Overview
  paragraphs.push(
    `VendorLens evaluated ${vendor.name} (${vendor.domain}) in the ${vendor.category} category. ` +
    `The vendor currently holds an overall security score of ${vendor.score}/100 (Grade ${vendor.grade}, ${vendor.riskTier} Risk Tier) ` +
    `with an assessment signal coverage of ${vendor.coveragePercent}%. Given its assigned business criticality of "${vendor.criticality}", ` +
    (vendor.score >= 80
      ? `the organization demonstrates a resilient baseline security posture suitable for low-friction procurement approval.`
      : vendor.score >= 65
      ? `the vendor maintains acceptable standard controls but exhibits targeted hygiene deficiencies requiring conditional sign-off.`
      : `the vendor presents multiple significant security lapses that warrant remediation milestones before contract ratification.`)
  );

  // Paragraph 2: Core Observations
  const notableFails = fails.slice(0, 3).map(f => `${f.checkName} (${f.evidence})`);
  const notablePasses = passes.slice(0, 3).map(p => p.checkName);

  let obsText = '';
  if (notableFails.length > 0) {
    obsText += `Key areas of exposure identified: ${notableFails.join('; ')}. `;
  } else {
    obsText += `Zero critical or high-severity vulnerabilities were identified across scanned public surfaces. `;
  }

  if (notablePasses.length > 0) {
    obsText += `Positive security controls confirmed in place include: ${notablePasses.join(', ')}. `;
  }

  if (unknowns.length > 0) {
    const unkNames = unknowns.slice(0, 2).map(u => u.checkName).join(', ');
    obsText += `Note: Insufficient data was available for ${unkNames}; these signals were omitted from negative scoring.`;
  }

  paragraphs.push(obsText);

  // Paragraph 3: Procurement & Remediation Recommendation
  if (vendor.riskTier === 'Critical' || vendor.riskTier === 'High') {
    paragraphs.push(
      `Remediation Recommendation: High-priority review required. Prioritize resolving ${fails[0]?.checkName || 'flagged items'} ` +
      `prior to expanding data sharing or system interconnectivity. Request formal confirmation from vendor security representatives.`
    );
  } else {
    paragraphs.push(
      `Ongoing Governance: Maintain standard quarterly automated re-evaluations via VendorLens. No immediate blocking items detected for current procurement operations.`
    );
  }

  return paragraphs.join('\n\n');
}
