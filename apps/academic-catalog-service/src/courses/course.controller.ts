import { Router, Request, Response } from 'express';
import { courseRepository } from './course.repository';
import { authenticate, requireRole } from '../guards/role.guard';
import { CourseStatus } from './course.entity';

export const courseRouter = Router();

// GET /api/v1/courses (Both Academic Head & Faculty Staff can view)
courseRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as CourseStatus | undefined;
    const searchFilter = req.query.search as string | undefined;

    if (statusFilter && !['Draft', 'Active', 'Revised', 'Retired'].includes(statusFilter)) {
      res.status(422).json({
        statusCode: 422,
        message: 'Invalid course status. Allowed values: Draft, Active, Revised, Retired (SMS-022 AC3)',
        error: 'Unprocessable Entity',
      });
      return;
    }

    const courses = await courseRepository.findAll(statusFilter, searchFilter);
    res.status(200).json({
      statusCode: 200,
      count: courses.length,
      data: courses,
    });
  } catch (err: any) {
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to retrieve courses.',
      error: err.message,
    });
  }
});

// GET /api/v1/courses/:id
courseRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const course = await courseRepository.findById(req.params.id);
    if (!course) {
      res.status(404).json({
        statusCode: 404,
        message: `Course with ID '${req.params.id}' not found.`,
        error: 'Not Found',
      });
      return;
    }
    res.status(200).json({ statusCode: 200, data: course });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to retrieve course.', error: err.message });
  }
});

// POST /api/v1/courses (SMS-022 AC6: Only Academic Head can add course)
courseRouter.post('/', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const { course_code, title } = req.body;
    if (!course_code || !course_code.trim()) {
      res.status(422).json({ statusCode: 422, message: 'Course code is required (e.g., INTE 30103).', error: 'Unprocessable Entity' });
      return;
    }
    if (!title || !title.trim()) {
      res.status(422).json({ statusCode: 422, message: 'Course title is required.', error: 'Unprocessable Entity' });
      return;
    }

    const existing = await courseRepository.findByCodeAndVersion(course_code.trim(), 1);
    if (existing) {
      res.status(409).json({
        statusCode: 409,
        message: `Course code '${course_code}' version 1 already exists. Use versioning endpoint for revisions (SMS-022 AC4).`,
        error: 'Conflict',
      });
      return;
    }

    const newCourse = await courseRepository.create(req.body);
    res.status(201).json({
      statusCode: 201,
      message: 'Course created successfully in Master Catalogue (SMS-022).',
      data: newCourse,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to create course.', error: err.message });
  }
});

// PATCH /api/v1/courses/:id (SMS-022 AC6: Only Academic Head can modify course)
courseRouter.patch('/:id', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const existing = await courseRepository.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ statusCode: 404, message: `Course with ID '${req.params.id}' not found.`, error: 'Not Found' });
      return;
    }

    if (req.body.status && !['Draft', 'Active', 'Revised', 'Retired'].includes(req.body.status)) {
      res.status(422).json({ statusCode: 422, message: 'Invalid course status (SMS-022 AC3).', error: 'Unprocessable Entity' });
      return;
    }

    const updated = await courseRepository.update(req.params.id, req.body);
    res.status(200).json({
      statusCode: 200,
      message: 'Course updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to update course.', error: err.message });
  }
});

// POST /api/v1/courses/:id/version (SMS-022 AC4: Create new immutable version)
courseRouter.post('/:id/version', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const existing = await courseRepository.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ statusCode: 404, message: 'Course not found.', error: 'Not Found' });
      return;
    }

    const versioned = await courseRepository.createVersion(req.params.id);
    res.status(201).json({
      statusCode: 201,
      message: `Created version ${versioned?.version} for course '${existing.course_code}' (SMS-022 AC4).`,
      data: versioned,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to create course version.', error: err.message });
  }
});
