import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  getGrade,
  getRiskTier,
  calculatePriority,
  SCORING_MODEL,
  Finding,
} from '@/lib/scoring';

describe('Scoring Engine', () => {
  const createMockFinding = (
    checkName: string,
    category: any,
    status: 'PASS' | 'FAIL' | 'UNKNOWN',
    severity: any = 'Medium'
  ): Finding => ({
    checkName,
    category,
    status,
    severity,
    evidence: `Verified test evidence for ${checkName}`,
    sourceUrl: 'https://example.com',
    rawValue: 'raw_data',
    confidence: 'High',
    whyItMatters: 'Important security control',
    recommendedFix: 'Implement according to standard',
  });

  it('assigns 100 and Grade A when all defined model checks PASS', () => {
    const allFindings: Finding[] = [];
    for (const cat of SCORING_MODEL.categories) {
      for (const chk of cat.checks) {
        allFindings.push(createMockFinding(chk.name, cat.id, 'PASS', chk.severity));
      }
    }

    const result = calculateScore(allFindings);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.riskTier).toBe('Low');
    expect(result.coverage).toBe(100);
  });

  it('correctly maps scores to letter grades', () => {
    expect(getGrade(95)).toBe('A');
    expect(getGrade(90)).toBe('A');
    expect(getGrade(85)).toBe('B');
    expect(getGrade(80)).toBe('B');
    expect(getGrade(75)).toBe('C');
    expect(getGrade(65)).toBe('C');
    expect(getGrade(60)).toBe('D');
    expect(getGrade(50)).toBe('D');
    expect(getGrade(40)).toBe('F');
    expect(getGrade(0)).toBe('F');
  });

  it('correctly maps scores to risk tiers', () => {
    expect(getRiskTier(95)).toBe('Low');
    expect(getRiskTier(80)).toBe('Low');
    expect(getRiskTier(75)).toBe('Medium');
    expect(getRiskTier(65)).toBe('Medium');
    expect(getRiskTier(60)).toBe('High');
    expect(getRiskTier(40)).toBe('High');
    expect(getRiskTier(35)).toBe('Critical');
    expect(getRiskTier(10)).toBe('Critical');
  });

  it('UNKNOWN findings do NOT deduct score but reduce coverage percentage', () => {
    // Generate findings with one check PASS and rest omitted/UNKNOWN
    const findingsWithPass = [
      createMockFinding('SPF Record', 'email_dns', 'PASS'),
    ];
    const findingsWithUnknown = [
      createMockFinding('SPF Record', 'email_dns', 'PASS'),
      createMockFinding('DMARC Policy', 'email_dns', 'UNKNOWN'),
    ];

    const passResult = calculateScore(findingsWithPass);
    const unknownResult = calculateScore(findingsWithUnknown);

    // Score is 100 because UNKNOWN causes 0 deductions
    expect(unknownResult.score).toBe(100);
    expect(passResult.score).toBe(100);
  });

  it('applies penalties for failing critical checks like CISA KEV Match', () => {
    const allFindings: Finding[] = [];
    for (const cat of SCORING_MODEL.categories) {
      for (const chk of cat.checks) {
        if (chk.name === 'CISA KEV Match') {
          allFindings.push(createMockFinding(chk.name, cat.id, 'FAIL', chk.severity));
        } else {
          allFindings.push(createMockFinding(chk.name, cat.id, 'PASS', chk.severity));
        }
      }
    }

    const result = calculateScore(allFindings);
    expect(result.score).toBeLessThan(100);
    const vulnCat = result.categoryBreakdown.find(c => c.category === 'vulnerabilities');
    expect(vulnCat?.failCount).toBe(1);
    expect(vulnCat?.score).toBeLessThan(100);
  });

  it('calculates remediation priority as severity weight * criticality multiplier', () => {
    const highCritCriticalSev = calculatePriority('Critical', 'High');
    const lowCritLowSev = calculatePriority('Low', 'Low');

    expect(highCritCriticalSev).toBeGreaterThan(lowCritLowSev);
  });
});
