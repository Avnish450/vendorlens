/**
 * TLS / Certificate Security Collector
 *
 * Connects to the vendor's domain on port 443 and inspects the TLS
 * certificate and protocol version. Checks:
 * - Certificate validity (not expired)
 * - Certificate expiry window (>30 days)
 * - TLS protocol version (1.2 or 1.3)
 * - Certificate trust (not self-signed)
 */

import tls from 'tls';
import type { CollectorResult, CollectorOptions } from '@/lib/collectors/types';

/**
 * Connect to a host via TLS and extract certificate details.
 * Returns the socket's peer certificate and protocol version.
 */
function tlsConnect(
  domain: string,
  timeoutMs: number
): Promise<{
  cert: tls.PeerCertificate;
  protocol: string | null;
}> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('TLS connection timed out'));
    }, timeoutMs);

    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false, // We want to inspect even invalid certs
      },
      () => {
        clearTimeout(timer);
        const cert = socket.getPeerCertificate();
        const protocol = socket.getProtocol();
        socket.end();
        resolve({ cert, protocol });
      }
    );

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Check certificate validity (not expired).
 */
function checkCertValidity(cert: tls.PeerCertificate, domain: string): CollectorResult {
  const now = new Date();
  const validFrom = new Date(cert.valid_from);
  const validTo = new Date(cert.valid_to);

  if (now < validFrom || now > validTo) {
    return {
      checkName: 'Certificate Validity',
      category: 'transport',
      status: 'FAIL',
      severity: 'Critical',
      evidence: `Certificate is ${now > validTo ? 'expired' : 'not yet valid'}. Valid from ${cert.valid_from} to ${cert.valid_to}.`,
      sourceUrl: `tls:${domain}:443`,
      rawValue: `valid_from=${cert.valid_from}, valid_to=${cert.valid_to}`,
      confidence: 'High',
      whyItMatters:
        'An expired or invalid certificate means connections are not properly authenticated and ' +
        'browsers will show security warnings.',
      recommendedFix: 'Renew the TLS certificate immediately and set up automated renewal.',
    };
  }

  return {
    checkName: 'Certificate Validity',
    category: 'transport',
    status: 'PASS',
    severity: 'Critical',
    evidence: `Certificate is valid. Issued: ${cert.valid_from}, Expires: ${cert.valid_to}.`,
    sourceUrl: `tls:${domain}:443`,
    rawValue: `valid_from=${cert.valid_from}, valid_to=${cert.valid_to}`,
    confidence: 'High',
    whyItMatters: 'A valid certificate ensures encrypted and authenticated connections.',
    recommendedFix: '',
  };
}

/**
 * Check certificate expiry window (>30 days).
 */
function checkCertExpiry(cert: tls.PeerCertificate, domain: string): CollectorResult {
  const now = new Date();
  const validTo = new Date(cert.valid_to);
  const daysUntilExpiry = Math.floor(
    (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry <= 30) {
    return {
      checkName: 'Certificate Expiry Window',
      category: 'transport',
      status: 'FAIL',
      severity: 'Medium',
      evidence: `Certificate expires in ${daysUntilExpiry} day(s) (${cert.valid_to}). Threshold: 30 days.`,
      sourceUrl: `tls:${domain}:443`,
      rawValue: `days_until_expiry=${daysUntilExpiry}`,
      confidence: 'High',
      whyItMatters:
        'Certificates expiring soon risk causing outages if not renewed in time and suggest ' +
        'a lack of automated certificate management.',
      recommendedFix:
        'Renew the certificate and implement automated renewal (e.g., via Let\'s Encrypt with certbot).',
    };
  }

  return {
    checkName: 'Certificate Expiry Window',
    category: 'transport',
    status: 'PASS',
    severity: 'Medium',
    evidence: `Certificate expires in ${daysUntilExpiry} days (${cert.valid_to}).`,
    sourceUrl: `tls:${domain}:443`,
    rawValue: `days_until_expiry=${daysUntilExpiry}`,
    confidence: 'High',
    whyItMatters: 'Adequate certificate lifetime indicates proper certificate management.',
    recommendedFix: '',
  };
}

/**
 * Check TLS protocol version.
 */
function checkTlsProtocol(
  protocol: string | null,
  domain: string
): CollectorResult {
  const acceptable = ['TLSv1.2', 'TLSv1.3'];

  if (!protocol) {
    return {
      checkName: 'TLS Protocol Version',
      category: 'transport',
      status: 'UNKNOWN',
      severity: 'High',
      evidence: 'Could not determine TLS protocol version.',
      sourceUrl: `tls:${domain}:443`,
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'Modern TLS versions protect against known protocol-level attacks.',
      recommendedFix: 'Ensure the server is configured with TLS 1.2 or 1.3.',
    };
  }

  if (acceptable.includes(protocol)) {
    return {
      checkName: 'TLS Protocol Version',
      category: 'transport',
      status: 'PASS',
      severity: 'High',
      evidence: `Server supports ${protocol}.`,
      sourceUrl: `tls:${domain}:443`,
      rawValue: protocol,
      confidence: 'High',
      whyItMatters: 'Modern TLS versions provide strong encryption against known attacks.',
      recommendedFix: '',
    };
  }

  return {
    checkName: 'TLS Protocol Version',
    category: 'transport',
    status: 'FAIL',
    severity: 'High',
    evidence: `Server is using ${protocol}, which is outdated and has known vulnerabilities.`,
    sourceUrl: `tls:${domain}:443`,
    rawValue: protocol,
    confidence: 'High',
    whyItMatters:
      'TLS 1.0 and 1.1 are deprecated due to vulnerabilities like POODLE and BEAST that can ' +
      'compromise encrypted traffic.',
    recommendedFix:
      'Upgrade the server to support TLS 1.2 or TLS 1.3 and disable older protocol versions.',
  };
}

/**
 * Check certificate trust (not self-signed).
 */
function checkCertTrust(cert: tls.PeerCertificate, domain: string): CollectorResult {
  // A self-signed certificate has the same issuer and subject
  const issuerCN = cert.issuer?.CN || '';
  const subjectCN = cert.subject?.CN || '';

  const isSelfSigned =
    issuerCN === subjectCN &&
    cert.issuer?.O === cert.subject?.O &&
    issuerCN !== '';

  if (isSelfSigned) {
    return {
      checkName: 'Certificate Trust',
      category: 'transport',
      status: 'FAIL',
      severity: 'High',
      evidence: `Certificate appears to be self-signed. Issuer: ${issuerCN}, Subject: ${subjectCN}.`,
      sourceUrl: `tls:${domain}:443`,
      rawValue: `issuer=${issuerCN}, subject=${subjectCN}`,
      confidence: 'High',
      whyItMatters:
        'Self-signed certificates are not trusted by browsers and cannot verify server identity, ' +
        'enabling man-in-the-middle attacks.',
      recommendedFix:
        'Obtain a certificate from a trusted certificate authority (e.g., Let\'s Encrypt, DigiCert).',
    };
  }

  return {
    checkName: 'Certificate Trust',
    category: 'transport',
    status: 'PASS',
    severity: 'High',
    evidence: `Certificate issued by: ${issuerCN || cert.issuer?.O || 'Unknown CA'}. Subject: ${subjectCN || domain}.`,
    sourceUrl: `tls:${domain}:443`,
    rawValue: `issuer=${issuerCN}, subject=${subjectCN}`,
    confidence: 'High',
    whyItMatters: 'A certificate from a trusted CA verifies the server\'s identity.',
    recommendedFix: '',
  };
}

/**
 * Collect TLS/certificate security findings for a domain.
 *
 * Connects to port 443 and inspects the certificate and protocol.
 * Returns UNKNOWN results for all checks if the connection fails.
 *
 * @param opts - Collector options with a `domain` field.
 * @returns Array of CollectorResult objects.
 */
export async function collectTls(
  opts: CollectorOptions
): Promise<CollectorResult[]> {
  const timeout = opts.timeout ?? 10_000;
  const domain = opts.domain;

  try {
    const { cert, protocol } = await tlsConnect(domain, timeout);

    // If cert has no subject, we didn't get a proper certificate
    if (!cert || !cert.subject) {
      return [
        {
          checkName: 'Certificate Validity',
          category: 'transport',
          status: 'UNKNOWN',
          severity: 'Critical',
          evidence: `Connected to ${domain}:443 but no certificate was presented.`,
          sourceUrl: `tls:${domain}:443`,
          rawValue: '',
          confidence: 'Low',
          whyItMatters: 'A valid TLS certificate is essential for secure communication.',
          recommendedFix: 'Ensure the server is configured with a valid TLS certificate.',
        },
      ];
    }

    return [
      checkCertValidity(cert, domain),
      checkCertExpiry(cert, domain),
      checkTlsProtocol(protocol, domain),
      checkCertTrust(cert, domain),
    ];
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error';

    // Return UNKNOWN for all checks — connection failed
    const unknownResult = (checkName: string, severity: 'Critical' | 'High' | 'Medium'): CollectorResult => ({
      checkName,
      category: 'transport',
      status: 'UNKNOWN',
      severity,
      evidence: `Could not establish TLS connection to ${domain}:443: ${errorMsg}`,
      sourceUrl: `tls:${domain}:443`,
      rawValue: '',
      confidence: 'Low',
      whyItMatters: 'TLS connection is required to assess transport security.',
      recommendedFix: 'Ensure the server accepts TLS connections on port 443.',
    });

    return [
      unknownResult('Certificate Validity', 'Critical'),
      unknownResult('Certificate Expiry Window', 'Medium'),
      unknownResult('TLS Protocol Version', 'High'),
      unknownResult('Certificate Trust', 'High'),
    ];
  }
}
