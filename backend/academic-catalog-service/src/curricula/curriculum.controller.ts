import { Router, Request, Response } from 'express';
import { curriculumRepository } from './curriculum.repository';
import { authenticate, requireRole } from '../guards/role.guard';

export const curriculumRouter = Router();

// GET /api/v1/curricula
curriculumRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const programId = req.query.program_id as string | undefined;
    const list = await curriculumRepository.findAll(programId);
    res.status(200).json({ statusCode: 200, count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to retrieve curricula.', error: err.message });
  }
});

// GET /api/v1/curricula/:id
curriculumRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const curr = await curriculumRepository.findById(req.params.id);
    if (!curr) {
      res.status(404).json({ statusCode: 404, message: 'Curriculum not found.', error: 'Not Found' });
      return;
    }
    res.status(200).json({ statusCode: 200, data: curr });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to retrieve curriculum.', error: err.message });
  }
});

// POST /api/v1/curricula (SMS-030 AC3: Academic Head Only)
curriculumRouter.post('/', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const { program_id, curriculum_code, name, effective_start_term } = req.body;
    if (!program_id || !curriculum_code || !name || !effective_start_term) {
      res.status(422).json({
        statusCode: 422,
        message: 'Missing required fields: program_id, curriculum_code, name, effective_start_term are required.',
        error: 'Unprocessable Entity',
      });
      return;
    }

    const existing = await curriculumRepository.findByCode(curriculum_code.trim());
    if (existing) {
      res.status(409).json({ statusCode: 409, message: `Curriculum code '${curriculum_code}' already exists.`, error: 'Conflict' });
      return;
    }

    const created = await curriculumRepository.create(req.body);
    res.status(201).json({ statusCode: 201, message: 'Curriculum created successfully (SMS-030).', data: created });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to create curriculum.', error: err.message });
  }
});

// POST /api/v1/curricula/:id/courses (SMS-030: Add Course to Curriculum)
curriculumRouter.post('/:id/courses', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const { course_id, year_level, semester } = req.body;
    if (!course_id || !year_level || !semester) {
      res.status(422).json({ statusCode: 422, message: 'course_id, year_level, and semester are required.', error: 'Unprocessable Entity' });
      return;
    }

    const curr = await curriculumRepository.findById(req.params.id);
    if (!curr) {
      res.status(404).json({ statusCode: 404, message: 'Curriculum not found.', error: 'Not Found' });
      return;
    }

    const item = await curriculumRepository.addCourse(req.params.id, req.body);
    res.status(201).json({ statusCode: 201, message: 'Course successfully linked to curriculum (SMS-030).', data: item });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to add course to curriculum.', error: err.message });
  }
});
