/**
 * VendorLens PDF Report Generator
 *
 * Generates an executive third-party risk assessment report in PDF format
 * using jsPDF and jspdf-autotable.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Finding } from './scoring';

interface PdfVendorInput {
  name: string;
  domain: string;
  category: string;
  criticality: string;
  declaredProducts?: string;
}

interface PdfScanResultInput {
  score: number;
  grade: string;
  riskTier: string;
  coveragePercent: number;
  timestamp: Date | string;
  isFromCache?: boolean;
}

export function generateVendorPdf(
  vendor: PdfVendorInput,
  scan: PdfScanResultInput,
  findings: Finding[]
): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('VendorLens', margin, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Third-Party Vendor Risk Intelligence Report', margin, 54);

  const scanDate = new Date(scan.timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.text(`Generated: ${scanDate}`, pageWidth - margin - 110, 45);

  // Vendor Information Block
  let currentY = 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(vendor.name, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Domain: ${vendor.domain}  |  Category: ${vendor.category}  |  Criticality: ${vendor.criticality}`, margin, currentY + 16);

  // Score Box
  const scoreBoxY = currentY + 30;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, scoreBoxY, pageWidth - margin * 2, 70, 6, 6, 'FD');

  // Score metric
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  const scoreColor =
    scan.score >= 80 ? [34, 197, 94] : scan.score >= 65 ? [245, 158, 11] : [239, 68, 68];
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`${scan.score}`, margin + 25, scoreBoxY + 44);

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text('/100', margin + 70, scoreBoxY + 44);

  // Grade & Tier
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Grade: ${scan.grade}`, margin + 140, scoreBoxY + 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Risk Tier: ${scan.riskTier}`, margin + 140, scoreBoxY + 48);
  doc.text(`Assessment Signal Coverage: ${scan.coveragePercent}%`, margin + 280, scoreBoxY + 48);

  if (scan.isFromCache) {
    doc.setTextColor(245, 158, 11);
    doc.text('* Snapshot data (offline mode)', margin + 280, scoreBoxY + 32);
  }

  // Findings Table
  currentY = scoreBoxY + 90;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Verified Security Findings & Evidence', margin, currentY);

  const tableRows = findings.map(f => [
    f.checkName,
    f.status,
    f.severity,
    f.evidence,
    f.confidence,
  ]);

  autoTable(doc, {
    startY: currentY + 10,
    head: [['Security Check', 'Status', 'Severity', 'Evidence / Raw Value', 'Confidence']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50 },
      2: { cellWidth: 60 },
      3: { cellWidth: 240 },
      4: { cellWidth: 60 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        if (data.cell.raw === 'PASS') {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'FAIL') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
    },
  });

  // Footer / Methodology
  const finalY = (doc as any).lastAutoTable?.finalY || 600;
  if (finalY + 80 < pageHeight) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Methodology Note: VendorLens assesses observable public signals (SPF, DMARC, TLS, HTTP headers, CISA KEV, CT logs) ' +
      'using a deterministic scoring formula. UNKNOWN signals reflect unavailable data and do not reduce score. ' +
      'All findings are backed by verifiable evidence with zero speculative extrapolation.',
      margin,
      finalY + 30,
      { maxWidth: pageWidth - margin * 2 }
    );
  }

  return doc.output('arraybuffer') as unknown as Uint8Array;
}
