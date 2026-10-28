import { Router, Request, Response } from 'express';
import { requirementRepository } from './requirement.repository';
import { deadlineEngine } from '../calendar/deadline.engine';
import { calendarRepository } from '../calendar/calendar.repository';
import { authenticate, requireRole } from '../guards/role.guard';
import { RequirementStatus } from './requirement.entity';

export const requirementRouter = Router();

// GET /api/v1/requirements (Both Academic Head & Faculty Staff with role scoping)
requirementRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;
    const programCode = req.query.program_code as string | undefined;
    const termCode = req.query.term_code as string | undefined;
    let statusFilter = req.query.status as RequirementStatus | undefined;

    // SMS-007 AC1 & SMS-005 AC3: Faculty Staff see only Published requirements
    if (userRole === 'FACULTY_STAFF') {
      statusFilter = 'PUBLISHED';
    }

    if (statusFilter && !['DRAFT', 'PUBLISHED', 'CLOSED'].includes(statusFilter)) {
      res.status(422).json({
        statusCode: 422,
        message: 'Invalid requirement status. Allowed values: DRAFT, PUBLISHED, CLOSED',
        error: 'Unprocessable Entity',
      });
      return;
    }

    const items = await requirementRepository.findAll(statusFilter, programCode, termCode);
    res.status(200).json({
      statusCode: 200,
      count: items.length,
      data: items,
    });
  } catch (err: any) {
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to retrieve requirements.',
      error: err.message,
    });
  }
});

// GET /api/v1/requirements/:id
requirementRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const item = await requirementRepository.findById(req.params.id);
    if (!item) {
      res.status(404).json({ statusCode: 404, message: 'Requirement not found.', error: 'Not Found' });
      return;
    }

    // Faculty cannot inspect Draft or Closed requirements
    if (req.user?.role === 'FACULTY_STAFF' && item.status !== 'PUBLISHED') {
      res.status(403).json({ statusCode: 403, message: 'Access Denied: Requirement is not published (SMS-005 AC3).', error: 'Forbidden' });
      return;
    }

    res.status(200).json({ statusCode: 200, data: item });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to retrieve requirement.', error: err.message });
  }
});

// POST /api/v1/requirements (SMS-004 AC3: Academic Head Only)
requirementRouter.post('/', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const { program_code, term_code, name, description, deadline_at } = req.body;
    if (!program_code || !term_code || !name) {
      res.status(422).json({
        statusCode: 422,
        message: 'Missing required fields: program_code, term_code, and name are required (SMS-004).',
        error: 'Unprocessable Entity',
      });
      return;
    }

    // SMS-021 AC2 & SMS-004 AC1: Requirements can be defined only for Active programs in the list
    const programValidation = await requirementRepository.verifyProgramIsActive(program_code.trim());
    if (!programValidation.exists) {
      res.status(422).json({
        statusCode: 422,
        message: `Program '${program_code}' does not exist in the Academic Catalog (SMS-021, SMS-004).`,
        error: 'Unprocessable Entity',
      });
      return;
    }
    if (!programValidation.isActive) {
      res.status(422).json({
        statusCode: 422,
        message: `Requirements cannot be defined for phased-out program '${program_code}'. Requirements can be defined only for Active programs in the list (SMS-021 AC2, SMS-004 AC1).`,
        error: 'Unprocessable Entity',
      });
      return;
    }

    // SMS-033: If deadline is provided, run intelligent calendar adjustment
    let finalDeadline = deadline_at;
    let adjustmentLog: any = null;
    if (deadline_at) {
      const adjusted = await deadlineEngine.calculateAdjustedDeadline(deadline_at, term_code.trim());
      finalDeadline = adjusted.adjusted_deadline;
      adjustmentLog = adjusted;
    }

    const created = await requirementRepository.create({
      ...req.body,
      deadline_at: finalDeadline,
    });

    res.status(201).json({
      statusCode: 201,
      message: 'Requirement definition created successfully in DRAFT status (SMS-004).',
      data: created,
      calendar_adjustment: adjustmentLog,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to create requirement.', error: err.message });
  }
});

// PATCH /api/v1/requirements/:id (SMS-004 AC3 & SMS-005 AC2: Publish or Edit Requirement)
requirementRouter.patch('/:id', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const existing = await requirementRepository.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ statusCode: 404, message: 'Requirement not found.', error: 'Not Found' });
      return;
    }

    if (req.body.status && !['DRAFT', 'PUBLISHED', 'CLOSED'].includes(req.body.status)) {
      res.status(422).json({ statusCode: 422, message: 'Invalid status. Allowed values: DRAFT, PUBLISHED, CLOSED', error: 'Unprocessable Entity' });
      return;
    }

    let payloadToUpdate = { ...req.body };

    // SMS-033: If deadline is updated, recalculate calendar pushout
    if (req.body.deadline_at) {
      const adjusted = await deadlineEngine.calculateAdjustedDeadline(req.body.deadline_at, existing.term_code);
      payloadToUpdate.deadline_at = adjusted.adjusted_deadline;
    }

    const updated = await requirementRepository.update(req.params.id, payloadToUpdate);
    res.status(200).json({
      statusCode: 200,
      message: 'Requirement updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to update requirement.', error: err.message });
  }
});

/**
 * SMS-005 AC 1 & SMS-033: Set deadline for requirement from term window with auto-pushout
 */
requirementRouter.patch('/:id/deadline', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deadline_at } = req.body;

    if (!deadline_at) {
      res.status(422).json({ statusCode: 422, message: 'deadline_at timestamp is required (SMS-005 AC1).' });
      return;
    }

    const existing = await requirementRepository.findById(id);
    if (!existing) {
      res.status(404).json({ statusCode: 404, message: 'Requirement not found.' });
      return;
    }

    // SMS-005 AC1: Check if deadline is within term submission window
    const term = await calendarRepository.getTermByCode(existing.term_code);
    if (term?.submission_window_start && term?.submission_window_end) {
      const cand = new Date(deadline_at);
      const winStart = new Date(term.submission_window_start);
      const winEnd = new Date(term.submission_window_end);
      if (cand < winStart || cand > winEnd) {
        res.status(422).json({
          statusCode: 422,
          message: `Deadline must be within the term submission window (${term.submission_window_start.split('T')[0]} to ${term.submission_window_end.split('T')[0]}) (SMS-005 AC1).`,
        });
        return;
      }
    }

    // Calculate smart calendar pushout (SMS-033)
    const adjustment = await deadlineEngine.calculateAdjustedDeadline(deadline_at, existing.term_code);

    const updated = await requirementRepository.update(id, {
      deadline_at: adjustment.adjusted_deadline,
    });

    res.status(200).json({
      statusCode: 200,
      message: `Requirement deadline updated to ${adjustment.adjusted_deadline} (SMS-005, SMS-033).`,
      data: updated,
      calendar_adjustment: adjustment,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, error: err.message });
  }
});

/**
 * SMS-005 AC 2: Publish requirement so Faculty Staff can view it
 */
requirementRouter.patch('/:id/publish', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const existing = await requirementRepository.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ statusCode: 404, message: 'Requirement not found.' });
      return;
    }

    const updated = await requirementRepository.update(req.params.id, { status: 'PUBLISHED' });
    res.status(200).json({
      statusCode: 200,
      message: `Requirement '${existing.name}' published successfully (SMS-005 AC2).`,
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, error: err.message });
  }
});

/**
 * SMS-005 AC 2: Close requirement to block new submissions
 */
requirementRouter.patch('/:id/close', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const existing = await requirementRepository.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ statusCode: 404, message: 'Requirement not found.' });
      return;
    }

    const updated = await requirementRepository.update(req.params.id, { status: 'CLOSED' });
    res.status(200).json({
      statusCode: 200,
      message: `Requirement '${existing.name}' is now closed (SMS-005 AC2).`,
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, error: err.message });
  }
});
