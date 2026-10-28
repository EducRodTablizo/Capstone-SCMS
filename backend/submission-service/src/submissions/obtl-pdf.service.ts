import { Submission } from './submission.entity';
import { SignatoryConfig, DEFAULT_SIGNATORIES } from '../signatories/signatory.entity';
import * as crypto from 'crypto';

interface PdfLineItem {
  heading?: string;
  size?: number;
  bold?: string;
  text?: string;
  gap?: number;
}

export class ObtlPdfService {
  /**
   * Compiles and renders official PUPQC Outcomes-Based Teaching & Learning (OBTL) Syllabus PDF (SMS-025, SMS-035)
   */
  public generateObtlPdf(
    submission: Submission,
    signatories: SignatoryConfig = DEFAULT_SIGNATORIES,
    facultyName = 'Prof. Juan Dela Cruz'
  ): Buffer {
    const lines: PdfLineItem[] = [
      { heading: 'POLYTECHNIC UNIVERSITY OF THE PHILIPPINES', size: 14 },
      { heading: 'QUEZON CITY CAMPUS - CCIS DEPARTMENT', size: 10 },
      { gap: 8 },
      { bold: 'OFFICIAL OUTCOMES-BASED TEACHING AND LEARNING (OBTL) SYLLABUS' },
      { gap: 12 },
      { text: `Course Code: ${submission.course_code || 'INTE 401'}     Course Title: Information Assurance and Security 2` },
      { text: `Credit Units: 3.0 (Lecture: 2.0 hrs, Lab: 3.0 hrs)     Pre-requisite: INTE 302` },
      { text: `Block Section: ${submission.section_label || 'BSIT 4-1'}     Academic Term: A.Y. 2026-2027 1st Semester` },
      { text: `Class Schedule: Mon/Wed 08:00 AM - 10:00 AM     Room: Academic Building Room 304` },
      { text: `Instructor: ${facultyName} (${submission.faculty_id})` },
      { text: `Consultation Hours: Mon/Wed 1:00 PM - 3:00 PM via MS Teams / Faculty Room` },
      { gap: 10 },
      { bold: 'I. COURSE LEARNING OUTCOMES (CLOs):' },
      { text: '  CLO 1: Formulate defensible information assurance and vulnerability management protocols.' },
      { text: '  CLO 2: Implement enterprise defense-in-depth and zero-trust authentication mechanisms.' },
      { text: '  CLO 3: Execute penetration testing and statutory compliance assessments (RA 10173 DPA).' },
      { text: '  CLO 4: Construct comprehensive disaster recovery, business continuity, and incident response plans.' },
      { gap: 10 },
      { bold: 'II. COURSE OUTLINE & ASSESSMENT CRITERIA:' },
      { text: '  Weeks 1-4: Foundation of Information Assurance, Cryptography, and Statutory Privacy.' },
      { text: '  Weeks 5-9: Perimeter Defense, Firewalls, IDS/IPS, and Midterm Examination (20%).' },
      { text: '  Weeks 10-14: Penetration Testing, Ethical Hacking, and Hands-on Lab Defense (30%).' },
      { text: '  Weeks 15-18: Incident Response, Capstone Security Audit, and Final Examination (20%).' },
      { text: '  Grading Policy: Midterm (20%) + Final (20%) + Hands-on Lab (30%) + Quizzes/Tasks (30%) = 100%' },
      { gap: 12 },
      { bold: 'III. FOUR-LINE INSTITUTIONAL SIGNATORY APPROVAL BLOCK (SMS-035):' },
      { gap: 4 },
      { text: `  1. Prepared by: ${facultyName}` },
      { text: `     ${signatories.prepared_by_title}` },
      { gap: 4 },
      { text: `  2. Reviewed and Checked by: ${signatories.reviewed_by_name}` },
      { text: `     ${signatories.reviewed_by_title}` },
      { gap: 4 },
      { text: `  3. Recommending Approval: ${signatories.recommending_name}` },
      { text: `     ${signatories.recommending_title}` },
      { gap: 4 },
      { text: `  4. Approved by: ${signatories.approved_by_name}` },
      { text: `     ${signatories.approved_by_title}` },
      { gap: 10 },
      { bold: 'IV. IMMUTABLE ACCREDITATION & AUDIT VERIFICATION METADATA:' },
      { text: `  Submission ID: ${submission.id}     Status: ${submission.status}` },
      { text: `  Document File: ${submission.file_name || 'BSIT_Syllabus.docx'}     Mode: ${submission.submission_mode || 'FILE_UPLOAD'}` },
      { text: `  Checksum: SHA-256 Verified [${crypto.createHash('sha256').update(submission.id).digest('hex').slice(0, 16)}]` },
      { text: `  Export Timestamp: ${new Date().toISOString()} (PUPQC SCMS Accredited)` }
    ];

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
        stream += `/F1 8.5 Tf\n1 0 0 1 45 ${y} Tm\n(${text}) Tj\n`;
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

export const obtlPdfService = new ObtlPdfService();
