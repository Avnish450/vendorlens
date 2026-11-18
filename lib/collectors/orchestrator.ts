/**
 * Scan Orchestrator
 *
 * Runs all security data collectors concurrently for a target domain.
 * Enforces SSRF domain validation, timeouts, and error isolation.
 * Guarantees that individual collector failures never crash the overall scan.
 */

import { validateDomain } from '../ssrf';
import { CollectorOptions, CollectorResult } from './types';
import { collectDns } from './dns';
import { collectTls } from './tls';
import { collectHeaders } from './headers';
import { collectKev } from './kev';
import { collectCrt } from './crt';
import { collectSecurityTxt } from './security-txt';
import { collectHibp } from './hibp';
import { collectShodan } from './shodan';

export interface ScanRunResult {
  domain: string;
  results: CollectorResult[];
  errors: string[];
  durationMs: number;
}

export async function runFullScan(
  domain: string,
  declaredProducts?: string[],
  timeoutMs: number = 15000
): Promise<ScanRunResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const results: CollectorResult[] = [];

  // 1. SSRF and Domain Safety Check
  const domainValidation = await validateDomain(domain);
  if (!domainValidation.safe) {
    throw new Error(`Security validation rejected domain "${domain}": ${domainValidation.reason}`);
  }

  const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const opts: CollectorOptions = {
    domain: cleanDomain,
    timeout: timeoutMs,
    declaredProducts: declaredProducts || [],
  };

  // 2. Parallel collector execution
  const collectorTasks = [
    { name: 'DNS & Email', fn: () => collectDns(opts) },
    { name: 'TLS & Certificate', fn: () => collectTls(opts) },
    { name: 'HTTP Security Headers', fn: () => collectHeaders(opts) },
    { name: 'CISA KEV & NVD', fn: () => collectKev(opts) },
    { name: 'Certificate Transparency', fn: () => collectCrt(opts) },
    { name: 'Security.txt', fn: () => collectSecurityTxt(opts) },
    { name: 'HaveIBeenPwned (Optional)', fn: () => collectHibp(opts) },
    { name: 'Shodan (Optional)', fn: () => collectShodan(opts) },
  ];

  const outcomes = await Promise.allSettled(collectorTasks.map(t => t.fn()));

  outcomes.forEach((outcome, idx) => {
    const task = collectorTasks[idx];
    if (outcome.status === 'fulfilled') {
      results.push(...outcome.value);
    } else {
      const errMsg = `Collector ${task.name} failed: ${outcome.reason?.message || 'Unknown error'}`;
      errors.push(errMsg);
    }
  });

  return {
    domain: cleanDomain,
    results,
    errors,
    durationMs: Date.now() - startTime,
  };
}
