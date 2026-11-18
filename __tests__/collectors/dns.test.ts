import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveTxt = vi.fn();
const mockResolveMx = vi.fn();
const mockResolveCaa = vi.fn();

vi.mock('dns/promises', () => {
  return {
    default: {
      resolveTxt: (...args: any[]) => mockResolveTxt(...args),
      resolveMx: (...args: any[]) => mockResolveMx(...args),
      resolveCaa: (...args: any[]) => mockResolveCaa(...args),
    },
  };
});

import { collectDns } from '@/lib/collectors/dns';

describe('DNS & Email Security Collector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('identifies valid SPF record when present', async () => {
    mockResolveTxt.mockImplementation(async (hostname: string) => {
      if (hostname === 'example.com') {
        return [['v=spf1 include:_spf.google.com ~all']];
      }
      if (hostname.startsWith('_dmarc.')) {
        return [['v=DMARC1; p=reject; rua=mailto:dmarc@example.com']];
      }
      return [];
    });

    mockResolveMx.mockResolvedValue([
      { exchange: 'aspmx.l.google.com', priority: 1 },
    ]);

    mockResolveCaa.mockResolvedValue([
      { critical: 0, issue: 'letsencrypt.org' },
    ]);

    const results = await collectDns({ domain: 'example.com' });
    const spf = results.find(r => r.checkName.toLowerCase().includes('spf'));
    const dmarc = results.find(r => r.checkName.toLowerCase().includes('dmarc'));

    expect(spf).toBeDefined();
    expect(spf?.status).toBe('PASS');
    expect(dmarc).toBeDefined();
    expect(dmarc?.status).toBe('PASS');
  });

  it('marks DMARC as FAIL when policy is p=none', async () => {
    mockResolveTxt.mockImplementation(async (hostname: string) => {
      if (hostname.startsWith('_dmarc.')) {
        return [['v=DMARC1; p=none']];
      }
      return [['v=spf1 -all']];
    });

    mockResolveMx.mockResolvedValue([]);
    mockResolveCaa.mockResolvedValue([]);

    const results = await collectDns({ domain: 'example.com' });
    const dmarc = results.find(r => r.checkName.toLowerCase().includes('dmarc'));

    expect(dmarc).toBeDefined();
    expect(dmarc?.status).toBe('FAIL');
    expect(dmarc?.evidence.toLowerCase()).toContain('p=none');
  });

  it('gracefully handles DNS resolution failure with safe status', async () => {
    mockResolveTxt.mockRejectedValue(new Error('ENOTFOUND'));
    mockResolveMx.mockRejectedValue(new Error('ETIMEOUT'));
    mockResolveCaa.mockRejectedValue(new Error('SERVFAIL'));

    const results = await collectDns({ domain: 'nonexistent-xyz-domain.com' });
    expect(results.length).toBeGreaterThan(0);
    const allValidStatuses = results.every(r => ['PASS', 'FAIL', 'UNKNOWN'].includes(r.status));
    expect(allValidStatuses).toBe(true);
  });
});
