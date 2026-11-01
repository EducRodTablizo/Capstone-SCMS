import { Request, Response } from 'express';
import { submissionService } from './submission.service';
import { submissionRepository } from './submission.repository';

export class SubmissionController {
  async submit(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId, requirementStatus, facultyId, facultyName, courseCode, sectionLabel, mode, fileName, fileSize, obeFormPayload } = req.body;
      if (!requirementId || !facultyId || !courseCode || !sectionLabel) {
        res.status(400).json({ error: 'Missing required fields: requirementId, facultyId, courseCode, sectionLabel' });
        return;
      }
      const result = await submissionService.submitSyllabus({
        requirementId,
        requirementStatus,
        facultyId,
        facultyName,
        courseCode,
        sectionLabel,
        mode: mode || 'FILE_UPLOAD',
        fileName,
        fileSize: fileSize ? parseInt(fileSize, 10) : undefined,
        obeFormPayload
      });
      res.status(201).json({ success: true, data: result.submission, version: result.version });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const { requirement_id, status, course_code, faculty_id } = req.query;
      const list = await submissionRepository.listAll({
        requirement_id: requirement_id as string,
        status: status as string,
        course_code: course_code as string,
        faculty_id: faculty_id as string
      });
      res.json({ success: true, count: list.length, data: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const sub = await submissionRepository.findById(req.params.id);
      if (!sub) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }
      const reviews = await submissionRepository.getReviews(sub.id);
      const versions = await submissionRepository.getVersions(sub.id);
      res.json({ success: true, data: sub, reviews, versions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async openReview(req: Request, res: Response): Promise<void> {
    try {
      const { reviewerId, reviewerName } = req.body;
      const updated = await submissionService.openForReview({
        submissionId: req.params.id,
        reviewerId: reviewerId || 'acad_head_01',
        reviewerName: reviewerName || 'Academic Head'
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async review(req: Request, res: Response): Promise<void> {
    try {
      const { reviewerId, reviewerName, decision, comment } = req.body;
      const result = await submissionService.recordReviewDecision({
        submissionId: req.params.id,
        reviewerId: reviewerId || 'acad_head_01',
        reviewerName: reviewerName || 'Academic Head',
        decision,
        comment
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async resubmit(req: Request, res: Response): Promise<void> {
    try {
      const { facultyId, facultyName, fileName, fileSize, changeSummary } = req.body;
      if (!fileName) {
        res.status(400).json({ error: 'File name is required for resubmission.' });
        return;
      }
      const result = await submissionService.resubmitSyllabus({
        submissionId: req.params.id,
        facultyId: facultyId || 'fac_01',
        facultyName: facultyName || 'Faculty Staff',
        fileName,
        fileSize: fileSize ? parseInt(fileSize, 10) : 1024,
        changeSummary
      });
      res.json({ success: true, data: result.submission, version: result.version });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const versions = await submissionService.getVersionHistory(req.params.id);
      res.json({ success: true, count: versions.length, data: versions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const sub = await submissionRepository.findById(req.params.id);
      if (!sub) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }
      const fileName = sub.file_name || `${sub.course_code}_Syllabus.docx`;
      const isDocx = fileName.endsWith('.docx');
      const isPdf = fileName.endsWith('.pdf');
      
      const contentType = isPdf 
        ? 'application/pdf' 
        : isDocx 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        : 'application/octet-stream';

      const content = Buffer.from(
        `POLYTECHNIC UNIVERSITY OF THE PHILIPPINES\nQUEZON CITY CAMPUS\n\nOFFICIAL COURSE SYLLABUS\n\nCourse Code: ${sub.course_code}\nSection: ${sub.section_label}\nStatus: ${sub.status}\nSubmission Timestamp: ${sub.submitted_at || sub.created_at}\n\nI. COURSE DESCRIPTION\nThis syllabus provides the institutional learning framework and modular guide for ${sub.course_code} adhering to the 2024 revised PUPQC Outcomes-Based Teaching and Learning (OBTL) syllabus standard.\n\nII. COURSE LEARNING OUTCOMES\n1. Demonstrate comprehensive understanding of course fundamentals.\n2. Apply analytical and practical methods in laboratory and problem sets.\n3. Complete capstone course requirements conforming to university academic policies.\n\nIII. OFFICIAL SIGNATORIES\nFaculty In-Charge: ${sub.faculty_id}\nDepartment Chairperson: Dr. Maria Santos\nAcademic Head: Dr. Maria Santos\nCampus Director: Dr. Edgardo Delmo\n`
      );

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(content);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getPreview(req: Request, res: Response): Promise<void> {
    try {
      const sub = await submissionRepository.findById(req.params.id);
      if (!sub) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }
      const versions = await submissionRepository.getVersions(sub.id);
      const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;

      res.json({
        success: true,
        data: {
          submission_id: sub.id,
          course_code: sub.course_code,
          section_label: sub.section_label,
          file_name: sub.file_name || 'OBE_Form.pdf',
          version_label: latestVersion ? latestVersion.version_label : 'v1',
          status: sub.status,
          submitted_at: sub.submitted_at || sub.created_at,
          faculty_id: sub.faculty_id,
          faculty_name: latestVersion?.submitted_by_name || 'Prof. Juan Donayre',
          title: `${sub.course_code} - Official Course Syllabus`,
          description: `This official syllabus outlines the modular course plan, learning outcomes, and assessment rubrics for ${sub.course_code} (${sub.section_label}) under the PUPQC Outcomes-Based Teaching and Learning (OBTL) framework.`,
          clos: [
            'CLO 1: Explain the fundamental principles and theoretical models governing the subject discipline.',
            'CLO 2: Apply industry-standard problem-solving techniques and practical laboratory experiments.',
            'CLO 3: Evaluate real-world technical problems and design compliant, structured solutions.',
            'CLO 4: Demonstrate professional ethics, collaborative problem solving, and timely project delivery.'
          ],
          modules: [
            { week: 'Week 1-2', topic: 'Institutional Orientation & Course Overview', hours: 6 },
            { week: 'Week 3-5', topic: 'Core Foundations, Design Theories & Methodologies', hours: 9 },
            { week: 'Week 6-8', topic: 'Intermediate Applications & Laboratory Experiments', hours: 9 },
            { week: 'Week 9', topic: 'Midterm Departmental Examination', hours: 3 },
            { week: 'Week 10-14', topic: 'Advanced Practical Implementation & Lab Sets', hours: 15 },
            { week: 'Week 15-17', topic: 'Capstone Integration & Compliance Review', hours: 9 },
            { week: 'Week 18', topic: 'Final Comprehensive Course Examination & Defense', hours: 3 }
          ],
          grading_system: {
            class_standing: '70% (Quizzes 30%, Laboratory Works 20%, Project 20%)',
            major_exams: '30% (Midterm 15%, Final Exam 15%)',
            passing_mark: '75.0% (PUP Numerical Grade 3.0)'
          },
          signatories: [
            { role: 'Course Instructor', name: latestVersion?.submitted_by_name || 'Prof. Juan Donayre', status: 'Submitted' },
            { role: 'Department Chairperson', name: 'Dr. Maria Santos', status: sub.status === 'Approved' ? 'Approved' : 'Pending' },
            { role: 'Academic Head', name: 'Dr. Maria Santos', status: sub.status === 'Approved' ? 'Approved' : 'Pending' },
            { role: 'Campus Director', name: 'Dr. Edgardo Delmo', status: sub.status === 'Approved' ? 'Approved' : 'Pending' }
          ]
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async reassignAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { courseCode, sectionLabel, newFacultyId, newFacultyName, assignmentVersion, reason } = req.body;
      if (!courseCode || !sectionLabel || !newFacultyId) {
        res.status(400).json({ error: 'Missing required fields: courseCode, sectionLabel, newFacultyId' });
        return;
      }
      const result = await submissionService.reassignAssignment({
        courseCode,
        sectionLabel,
        newFacultyId,
        newFacultyName,
        assignmentVersion,
        reason
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async withdrawAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { courseCode, sectionLabel, reason } = req.body;
      if (!courseCode || !sectionLabel) {
        res.status(400).json({ error: 'Missing required fields: courseCode, sectionLabel' });
        return;
      }
      const result = await submissionService.withdrawAssignment({
        courseCode,
        sectionLabel,
        reason
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async assignSubstitute(req: Request, res: Response): Promise<void> {
    try {
      const { courseCode, sectionLabel, substituteId, substituteName, reason } = req.body;
      if (!courseCode || !sectionLabel || !substituteId) {
        res.status(400).json({ error: 'Missing required fields: courseCode, sectionLabel, substituteId' });
        return;
      }
      const result = await submissionService.assignSubstitute({
        courseCode,
        sectionLabel,
        substituteId,
        substituteName,
        reason
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async approveAssignment(req: Request, res: Response): Promise<void> {
    try {
      const result = await submissionService.ingestApprovedAssignment(req.body);
      res.status(result.statusCode).json({
        success: true,
        action: result.action,
        data: result.data,
      });
    } catch (err: any) {
      const status = err.statusCode || 400;
      res.status(status).json({
        success: false,
        error: err.message,
      });
    }
  }

  getSignatories(req: Request, res: Response): void {
    const signatories = submissionService.getSignatories();
    res.json({ success: true, data: signatories });
  }

  updateSignatories(req: Request, res: Response): void {
    try {
      const updated = submissionService.updateSignatories(req.body, req.body.updated_by || 'Dr. Maria Santos');
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async downloadPdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const pdfBuffer = await submissionService.generateObtlPdf(id);
      const sub = await submissionRepository.findById(id);
      const fileName = (sub ? sub.course_code.replace(/\s+/g, '_') : 'Syllabus') + '_OBTL_Official.pdf';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }
}

export const submissionController = new SubmissionController();
