/**
 * Portfolio CSV Exporter
 *
 * Formats full vendor portfolio records into RFC 4180 compliant CSV.
 */

interface VendorExportRow {
  name: string;
  domain: string;
  category: string;
  criticality: string;
  score: number;
  grade: string;
  riskTier: string;
  coveragePercent: number;
  lastScanned: string | Date;
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function generatePortfolioCsv(vendors: VendorExportRow[]): string {
  const headers = [
    'Vendor Name',
    'Domain',
    'Category',
    'Business Criticality',
    'Security Score',
    'Grade',
    'Risk Tier',
    'Coverage %',
    'Last Scanned',
  ];

  const lines: string[] = [headers.map(escapeCsv).join(',')];

  for (const v of vendors) {
    const dateStr = v.lastScanned ? new Date(v.lastScanned).toISOString() : 'Never';
    lines.push([
      escapeCsv(v.name),
      escapeCsv(v.domain),
      escapeCsv(v.category),
      escapeCsv(v.criticality),
      escapeCsv(v.score),
      escapeCsv(v.grade),
      escapeCsv(v.riskTier),
      escapeCsv(v.coveragePercent),
      escapeCsv(dateStr),
    ].join(','));
  }

  return lines.join('\n');
}
