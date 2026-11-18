import { describe, it, expect, vi } from 'vitest';
import { collectHeaders } from '@/lib/collectors/headers';

describe('HTTP Security Headers Collector', () => {
  it('passes when modern security headers are configured', async () => {
    const mockHeaders = new Headers({
      'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
      'content-security-policy': "default-src 'self'",
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    });

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: mockHeaders,
      status: 200,
    } as any);

    const results = await collectHeaders({ domain: 'secure-bank.com' });
    const hsts = results.find(r => r.checkName.toLowerCase().includes('hsts') || r.checkName.includes('Strict-Transport'));
    const csp = results.find(r => r.checkName.toLowerCase().includes('csp') || r.checkName.includes('Content Security'));

    expect(hsts?.status).toBe('PASS');
    expect(csp?.status).toBe('PASS');

    vi.restoreAllMocks();
  });

  it('fails individual checks when headers are missing', async () => {
    const mockHeaders = new Headers({
      'x-content-type-options': 'nosniff',
    });

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: mockHeaders,
      status: 200,
    } as any);

    const results = await collectHeaders({ domain: 'legacy-site.org' });
    const hsts = results.find(r => r.checkName.toLowerCase().includes('hsts') || r.checkName.includes('Strict-Transport'));
    expect(hsts?.status).toBe('FAIL');

    vi.restoreAllMocks();
  });

  it('returns UNKNOWN status on network disconnect or fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network unreachable'));

    const results = await collectHeaders({ domain: 'unreachable.test' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.status === 'UNKNOWN')).toBe(true);

    vi.restoreAllMocks();
  });
});
