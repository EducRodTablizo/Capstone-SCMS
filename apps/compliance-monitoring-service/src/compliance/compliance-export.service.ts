import { ComplianceRecord, ComplianceMetrics } from './compliance.entity';
import * as crypto from 'crypto';

interface PdfLineItem {
  heading?: string;
  size?: number;
  bold?: string;
  text?: string;
  gap?: number;
}

export class ComplianceExportService {
  /**
   * Generates standard RFC 4180 CSV compliance matrix (SMS-037 AC 1)
   */
  public generateCsv(records: ComplianceRecord[], termLabel = 'A.Y. 2026-2027 1st Semester'): string {
    const header = [
      'Course Code',
      'Course Title',
      'Block Section',
      'Program',
      'Assigned Faculty',
      'Academic Rank',
      'Consultation Hours',
      'Compliance Status',
      'Submission File',
      'Version',
      'Submitted At',
      'Reviewed At',
      'Deadline',
      'Academic Term'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map(r => [
      escapeCsv(r.course_code),
      escapeCsv(r.course_title),
      escapeCsv(r.section_label),
      escapeCsv(r.program_code),
      escapeCsv(r.faculty_name),
      escapeCsv(r.academic_rank || 'Instructor I'),
      escapeCsv(r.consultation_hours || 'Standard Hours'),
      escapeCsv(r.status),
      escapeCsv(r.file_name || 'N/A'),
      escapeCsv(r.version_label || 'N/A'),
      escapeCsv(r.submitted_at || 'Pending'),
      escapeCsv(r.reviewed_at || 'Pending'),
      escapeCsv(r.due_date),
      escapeCsv(termLabel)
    ].join(','));

    return [header.join(','), ...rows].join('\r\n');
  }

  /**
   * Generates Official Institutional Compliance Monitoring Matrix PDF (SMS-037 AC 1 & AC 2)
   */
  public generatePdf(
    records: ComplianceRecord[],
    metrics: ComplianceMetrics,
    actorName = 'Dr. Maria Santos',
    termLabel = 'A.Y. 2026-2027 1st Semester'
  ): Buffer {
    const lines: PdfLineItem[] = [
      { heading: 'POLYTECHNIC UNIVERSITY OF THE PHILIPPINES', size: 14 },
      { heading: 'QUEZON CITY CAMPUS - OFFICE OF THE ACADEMIC HEAD', size: 10 },
      { gap: 8 },
      { bold: 'OFFICIAL SYLLABUS COMPLIANCE MONITORING AUDIT MATRIX' },
      { gap: 8 },
      { text: `Academic Term: ${termLabel}     Generated At: ${new Date().toISOString()}` },
      { text: `Authorized Reviewer: ${actorName} (Academic Head, PUPQC)` },
      { text: `Total Course Sections: ${metrics.total_assigned}     Total Submitted: ${metrics.total_submitted}     Total Approved: ${metrics.status_counts.approved}` },
      { text: `Institutional Compliance Rate: ${metrics.compliance_rate}%     Submission Rate: ${metrics.submission_rate}%` },
      { text: `Status Breakdown: Not Submitted (${metrics.status_counts.not_submitted}), Under Review (${metrics.status_counts.under_review}), Returned (${metrics.status_counts.returned}), Resubmitted (${metrics.status_counts.resubmitted}), Overdue (${metrics.status_counts.overdue}), Unassigned (${metrics.status_counts.unassigned})` },
      { gap: 12 },
      { bold: 'COURSE SECTION COMPLIANCE ROSTER:' },
      { gap: 4 }
    ];

    // Add up to top 25 course section lines to fit PDF page cleanly
    for (let i = 0; i < Math.min(records.length, 25); i++) {
      const r = records[i];
      const line = `[${r.status.padEnd(12)}] ${r.course_code.padEnd(9)} ${r.section_label.padEnd(9)} ${r.faculty_name.slice(0, 22).padEnd(23)} Due: ${r.due_date ? r.due_date.slice(0, 10) : '2026-11-15'}`;
      lines.push({ text: line });
    }

    if (records.length > 25) {
      lines.push({ text: `... and ${records.length - 25} additional course sections in active roster.` });
    }

    lines.push({ gap: 12 });
    lines.push({ bold: 'OFFICIAL QUALITY ASSURANCE & ACCREDITATION VERIFICATION:' });
    lines.push({ text: '  This document is certified for official university QA, CHED, and AACCUP compliance reviews.' });
    lines.push({ text: `  Reference Hash: SHA-256 [${crypto.createHash('sha256').update(new Date().toISOString() + actorName).digest('hex').slice(0, 16)}]` });
    lines.push({ gap: 8 });
    lines.push({ text: '  Certified by: ' + actorName });
    lines.push({ text: '  Academic Head, Polytechnic University of the Philippines - Quezon City Campus' });

    return this.renderPdfBinary(lines);
  }

  private renderPdfBinary(items: PdfLineItem[]): Buffer {
    let stream = 'BT\n';
    let y = 740;

    for (const item of items) {
      if (item.heading) {
        const text = this.escapePdfText(item.heading);
        const size = item.size || 12;
        stream += `/F2 ${size} Tf\n1 0 0 1 45 ${y} Tm\n(${text}) Tj\n`;
        y -= size + 5;
      } else if (item.bold) {
        const text = this.escapePdfText(item.bold);
        stream += `/F2 9.5 Tf\n1 0 0 1 45 ${y} Tm\n(${text}) Tj\n`;
        y -= 13;
      } else if (item.text) {
        const text = this.escapePdfText(item.text);
        stream += `/F1 8 Tf\n1 0 0 1 45 ${y} Tm\n(${text}) Tj\n`;
        y -= 12;
      } else if (item.gap) {
        y -= item.gap;
      }
    }
    stream += 'ET\n';

    const streamLen = Buffer.byteLength(stream);

    const obj1 = '<< /Type /Catalog /Pages 2 0 R >>';
    const obj2 = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    const obj3 = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>';
    const obj4 = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    const obj5 = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
    const obj6 = `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`;

    const allObjs = [obj1, obj2, obj3, obj4, obj5, obj6];
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const xref = [0];

    for (let i = 0; i < allObjs.length; i++) {
      xref.push(Buffer.byteLength(pdf));
      pdf += `${i + 1} 0 obj\n${allObjs[i]}\nendobj\n`;
    }

    const startXref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${allObjs.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= allObjs.length; i++) {
      const off = String(xref[i]).padStart(10, '0');
      pdf += `${off} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${allObjs.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return Buffer.from(pdf, 'latin1');
  }

  private escapePdfText(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}

export const complianceExportService = new ComplianceExportService();
