import { Router, Request, Response } from 'express';
import { programRepository } from './program.repository';
import { authenticate, requireRole } from '../guards/role.guard';
import { ProgramStatus } from './program.entity';

export const programRouter = Router();

// GET /api/v1/programs (Both Academic Head & Faculty Staff can list programs)
programRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as ProgramStatus | undefined;
    if (statusFilter && !['Active', 'Phased out'].includes(statusFilter)) {
      res.status(422).json({
        statusCode: 422,
        message: 'Invalid status filter. Allowed values: Active, Phased out',
        error: 'Unprocessable Entity',
      });
      return;
    }

    const programs = await programRepository.findAll(statusFilter);
    res.status(200).json({
      statusCode: 200,
      count: programs.length,
      data: programs,
    });
  } catch (err: any) {
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to retrieve academic programs.',
      error: err.message,
    });
  }
});

// GET /api/v1/programs/:id
programRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const program = await programRepository.findById(req.params.id);
    if (!program) {
      res.status(404).json({
        statusCode: 404,
        message: `Program with ID '${req.params.id}' not found.`,
        error: 'Not Found',
      });
      return;
    }
    res.status(200).json({ statusCode: 200, data: program });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: err.message });
  }
});

// POST /api/v1/programs (SMS-021 AC1 & AC3: Academic Head only)
programRouter.post('/', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const { code, title, name, description, status } = req.body;
    const finalTitle = title || name;

    if (!code || typeof code !== 'string' || !code.trim()) {
      res.status(422).json({
        statusCode: 422,
        message: 'Program code is required (e.g., BSIT).',
        error: 'Unprocessable Entity',
      });
      return;
    }

    if (!finalTitle || typeof finalTitle !== 'string' || !finalTitle.trim()) {
      res.status(422).json({
        statusCode: 422,
        message: 'Program title is required.',
        error: 'Unprocessable Entity',
      });
      return;
    }

    const targetStatus = status || 'Active';
    if (!['Active', 'Phased out'].includes(targetStatus)) {
      res.status(422).json({
        statusCode: 422,
        message: "Status must be either 'Active' or 'Phased out' (SMS-021 AC1).",
        error: 'Unprocessable Entity',
      });
      return;
    }

    const existing = await programRepository.findByCode(code);
    if (existing) {
      res.status(409).json({
        statusCode: 409,
        message: `Program code '${code.trim().toUpperCase()}' already exists.`,
        error: 'Conflict',
      });
      return;
    }

    const created = await programRepository.create({
      code,
      title: finalTitle,
      description,
      status: targetStatus,
    });

    res.status(201).json({
      statusCode: 201,
      message: 'Program created successfully (SMS-021).',
      data: created,
    });
  } catch (err: any) {
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to create program.',
      error: err.message,
    });
  }
});

// PATCH /api/v1/programs/:id (SMS-021 AC1 & AC3: Academic Head only)
programRouter.patch('/:id', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const { title, name, description, status } = req.body;
    const finalTitle = title !== undefined ? title : name;

    if (status !== undefined && !['Active', 'Phased out'].includes(status)) {
      res.status(422).json({
        statusCode: 422,
        message: "Status must be either 'Active' or 'Phased out' (SMS-021 AC1).",
        error: 'Unprocessable Entity',
      });
      return;
    }

    const existing = await programRepository.findById(req.params.id);
    if (!existing) {
      res.status(404).json({
        statusCode: 404,
        message: `Program with ID '${req.params.id}' not found.`,
        error: 'Not Found',
      });
      return;
    }

    const updated = await programRepository.update(req.params.id, {
      title: finalTitle,
      description,
      status,
    });

    res.status(200).json({
      statusCode: 200,
      message: 'Program updated successfully (SMS-021).',
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to update program.',
      error: err.message,
    });
  }
});
