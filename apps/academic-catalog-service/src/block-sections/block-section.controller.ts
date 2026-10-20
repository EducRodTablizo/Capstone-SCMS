import { Router, Request, Response } from 'express';
import { blockSectionRepository } from './block-section.repository';
import { authenticate, requireRole } from '../guards/role.guard';
import { BlockSectionStatus } from './block-section.entity';

export const blockSectionRouter = Router();

// GET /api/v1/block-sections
blockSectionRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const programId = req.query.program_id as string | undefined;
    const status = req.query.status as BlockSectionStatus | undefined;

    if (status && !['Active', 'Dissolved', 'Merged'].includes(status)) {
      res.status(422).json({ statusCode: 422, message: 'Invalid block section status (SMS-031 AC1).', error: 'Unprocessable Entity' });
      return;
    }

    const sections = await blockSectionRepository.findAll(programId, status);
    res.status(200).json({ statusCode: 200, count: sections.length, data: sections });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to retrieve block sections.', error: err.message });
  }
});

// GET /api/v1/block-sections/:id
blockSectionRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const section = await blockSectionRepository.findById(req.params.id);
    if (!section) {
      res.status(404).json({ statusCode: 404, message: 'Block section not found.', error: 'Not Found' });
      return;
    }
    res.status(200).json({ statusCode: 200, data: section });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to retrieve section.', error: err.message });
  }
});

// POST /api/v1/block-sections (SMS-031 AC4: Academic Head Only)
blockSectionRouter.post('/', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const { program_id, cohort_admission_year, year_level, section_number, display_label } = req.body;
    if (!program_id || !cohort_admission_year || !year_level || !section_number || !display_label) {
      res.status(422).json({
        statusCode: 422,
        message: 'Missing fields: program_id, cohort_admission_year, year_level, section_number, display_label are required.',
        error: 'Unprocessable Entity',
      });
      return;
    }

    const created = await blockSectionRepository.create(req.body);
    res.status(201).json({ statusCode: 201, message: 'Block section registered successfully (SMS-031).', data: created });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ statusCode: 409, message: 'Block section cohort already exists for this program.', error: 'Conflict' });
      return;
    }
    res.status(500).json({ statusCode: 500, message: 'Failed to create block section.', error: err.message });
  }
});

// PATCH /api/v1/block-sections/:id/status (SMS-031 AC3: Dissolve or Merge Section)
blockSectionRouter.patch('/:id/status', authenticate, requireRole(['ACADEMIC_HEAD']), async (req: Request, res: Response) => {
  try {
    const { status, merged_into_section_id } = req.body;
    if (!status || !['Active', 'Dissolved', 'Merged'].includes(status)) {
      res.status(422).json({ statusCode: 422, message: 'Status must be Active, Dissolved, or Merged (SMS-031).', error: 'Unprocessable Entity' });
      return;
    }

    if (status === 'Merged' && !merged_into_section_id) {
      res.status(422).json({ statusCode: 422, message: 'merged_into_section_id is required when merging a section.', error: 'Unprocessable Entity' });
      return;
    }

    const updated = await blockSectionRepository.updateStatus(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ statusCode: 404, message: 'Block section not found.', error: 'Not Found' });
      return;
    }

    res.status(200).json({ statusCode: 200, message: `Block section status updated to ${status} (SMS-031).`, data: updated });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: 'Failed to update section status.', error: err.message });
  }
});
