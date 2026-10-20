import { Router, Request, Response } from 'express';
import { requirementRepository } from './requirement.repository';
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

    // Faculty cannot inspect Draft requirements
    if (req.user?.role === 'FACULTY_STAFF' && item.status !== 'PUBLISHED') {
      res.status(403).json({ statusCode: 403, message: 'Access Denied: Requirement is not published.', error: 'Forbidden' });
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
    const { program_code, term_code, name, description } = req.body;
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

    const created = await requirementRepository.create(req.body);
    res.status(201).json({
      statusCode: 201,
      message: 'Requirement definition created successfully in DRAFT status (SMS-004).',
      data: created,
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

    const updated = await requirementRepository.update(req.params.id, req.body);
    res.status(200).json({
      statusCode: 200,
      message: 'Requirement updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to update requirement.', error: err.message });
  }
});
