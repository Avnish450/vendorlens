/**
 * SSRF (Server-Side Request Forgery) Protection
 *
 * Validates domains before making outbound requests to ensure we don't
 * accidentally scan internal infrastructure, loopback addresses, or
 * private network ranges.
 */

import dns from 'dns/promises';

/** Result of a domain validation check. */
export interface DomainValidationResult {
  safe: boolean;
  reason?: string;
}

/**
 * Internal TLDs and hostnames that should never be scanned.
 */
const BLOCKED_TLDS = new Set([
  'local',
  'internal',
  'corp',
  'home',
  'lan',
  'intranet',
  'private',
  'test',
  'example',
  'invalid',
  'localhost',
]);

/**
 * Blocked hostname patterns (exact matches).
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'broadcasthost',
  'ip6-localhost',
  'ip6-loopback',
]);

/**
 * Check if an IPv4 address is in a private/reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed → treat as unsafe
  }

  const [a, b, c] = parts;

  // Loopback: 127.0.0.0/8
  if (a === 127) return true;

  // RFC1918: 10.0.0.0/8
  if (a === 10) return true;

  // RFC1918: 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;

  // RFC1918: 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // Link-local: 169.254.0.0/16
  if (a === 169 && b === 254) return true;

  // Current network: 0.0.0.0/8
  if (a === 0) return true;

  // Shared address space (CGNAT): 100.64.0.0/10
  if (a === 100 && b >= 64 && b <= 127) return true;

  // IETF Protocol Assignments: 192.0.0.0/24
  if (a === 192 && b === 0 && c === 0) return true;

  // Documentation: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;

  // Benchmarking: 198.18.0.0/15
  if (a === 198 && (b === 18 || b === 19)) return true;

  // Multicast: 224.0.0.0/4
  if (a >= 224 && a <= 239) return true;

  // Reserved: 240.0.0.0/4 and 255.255.255.255
  if (a >= 240) return true;

  return false;
}

/**
 * Check if an IPv6 address is in a private/reserved range.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // Loopback
  if (normalized === '::1') return true;

  // Unspecified
  if (normalized === '::') return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const v4MappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4MappedMatch) {
    return isPrivateIPv4(v4MappedMatch[1]);
  }

  // Link-local: fe80::/10
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe80')) return true;

  // Unique local: fc00::/7 (fc00:: and fd00::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Multicast: ff00::/8
  if (normalized.startsWith('ff')) return true;

  // Documentation: 2001:db8::/32
  if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0db8:')) return true;

  // Teredo: 2001:0000::/32
  if (normalized.startsWith('2001:0000:') || normalized.startsWith('2001:0:')) return true;

  return false;
}

/**
 * Check if a string looks like an IP address.
 */
function looksLikeIP(domain: string): boolean {
  // IPv4 pattern
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return true;

  // IPv6 pattern (contains colons)
  if (domain.includes(':')) return true;

  // Hex-encoded IP or octal IP patterns
  if (/^0x[0-9a-f]+$/i.test(domain)) return true;
  if (/^0\d+$/.test(domain)) return true;

  // Decimal IP (single large number)
  if (/^\d{8,}$/.test(domain)) return true;

  return false;
}

/**
 * Sanitize a domain string for validation.
 * Trims whitespace, converts to lowercase, removes trailing dots and slashes,
 * strips protocol prefixes and paths.
 */
function sanitizeDomain(input: string): string {
  let domain = input.trim().toLowerCase();

  // Remove protocol prefix if present
  domain = domain.replace(/^https?:\/\//, '');

  // Remove path, query, hash, port
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split('#')[0];
  domain = domain.split(':')[0];

  // Remove trailing dots
  domain = domain.replace(/\.+$/, '');

  return domain;
}

/**
 * Validate a domain for safe outbound requests.
 *
 * Performs the following checks:
 * 1. Sanitizes the domain string
 * 2. Rejects empty, too-long, or malformed domains
 * 3. Rejects IP addresses and IP-like patterns
 * 4. Rejects known internal hostnames and TLDs
 * 5. Resolves DNS and checks all returned IPs against private/reserved ranges
 *
 * @param domain - The domain to validate
 * @returns An object with `safe: true` if the domain is safe to scan, or
 *          `safe: false` with a `reason` string explaining why it was rejected.
 */
export async function validateDomain(
  domain: string
): Promise<DomainValidationResult> {
  // Step 1: Sanitize
  const sanitized = sanitizeDomain(domain);

  // Step 2: Basic validation
  if (!sanitized) {
    return { safe: false, reason: 'Empty domain' };
  }

  if (sanitized.length > 253) {
    return { safe: false, reason: 'Domain exceeds maximum length (253 characters)' };
  }

  // Must contain at least one dot (except for explicitly blocked names)
  if (!sanitized.includes('.') && BLOCKED_HOSTNAMES.has(sanitized)) {
    return { safe: false, reason: `Blocked hostname: ${sanitized}` };
  }

  if (!sanitized.includes('.')) {
    return { safe: false, reason: 'Domain must contain at least one dot' };
  }

  // Validate domain format: labels separated by dots
  const labels = sanitized.split('.');
  for (const label of labels) {
    if (!label) {
      return { safe: false, reason: 'Domain contains empty label' };
    }
    if (label.length > 63) {
      return { safe: false, reason: 'Domain label exceeds 63 characters' };
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) {
      return { safe: false, reason: `Invalid domain label: "${label}"` };
    }
  }

  // Step 3: Reject IP-like patterns
  if (looksLikeIP(sanitized)) {
    return { safe: false, reason: 'IP addresses are not allowed — provide a domain name' };
  }

  // Step 4: Check blocked hostnames
  if (BLOCKED_HOSTNAMES.has(sanitized)) {
    return { safe: false, reason: `Blocked hostname: ${sanitized}` };
  }

  // Step 5: Check TLD against blocked list
  const tld = labels[labels.length - 1];
  if (BLOCKED_TLDS.has(tld)) {
    return { safe: false, reason: `Blocked TLD: .${tld}` };
  }

  // Step 6: DNS resolution — check all resolved IPs
  const ipv4Addresses: string[] = [];
  const ipv6Addresses: string[] = [];

  try {
    const v4 = await dns.resolve4(sanitized);
    ipv4Addresses.push(...v4);
  } catch {
    // No A records — that's fine, we'll check AAAA
  }

  try {
    const v6 = await dns.resolve6(sanitized);
    ipv6Addresses.push(...v6);
  } catch {
    // No AAAA records — that's fine
  }

  // If no records at all, the domain doesn't resolve
  if (ipv4Addresses.length === 0 && ipv6Addresses.length === 0) {
    return { safe: false, reason: 'Domain does not resolve to any IP address' };
  }

  // Check every IPv4 address
  for (const ip of ipv4Addresses) {
    if (isPrivateIPv4(ip)) {
      return {
        safe: false,
        reason: `Domain resolves to private/reserved IPv4 address: ${ip}`,
      };
    }
  }

  // Check every IPv6 address
  for (const ip of ipv6Addresses) {
    if (isPrivateIPv6(ip)) {
      return {
        safe: false,
        reason: `Domain resolves to private/reserved IPv6 address: ${ip}`,
      };
    }
  }

  return { safe: true };
}
