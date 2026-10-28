import { Router, Request, Response } from 'express';
import { termRepository } from './term.repository';
import { authenticate, requireRole } from '../guards/role.guard';
import { TermStatus } from './calendar.entity';

export const termRouter = Router();

/**
 * SMS-018: Academic Terms SSOT
 * AC 1: Each academic term has term code, academic year, semester, start/end dates, and status.
 */
termRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const terms = await termRepository.findAll();
    res.status(200).json({
      statusCode: 200,
      count: terms.length,
      data: terms,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, error: err.message });
  }
});

termRouter.get('/active', authenticate, async (req: Request, res: Response) => {
  try {
    const active = await termRepository.getActiveTerm();
    if (!active) {
      res.status(404).json({ statusCode: 404, message: 'No active academic term configured.' });
      return;
    }
    res.status(200).json({ statusCode: 200, data: active });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, error: err.message });
  }
});

termRouter.get('/:termCode', authenticate, async (req: Request, res: Response) => {
  try {
    const term = await termRepository.findByCode(req.params.termCode);
    if (!term) {
      res.status(404).json({ statusCode: 404, message: `Term '${req.params.termCode}' not found.` });
      return;
    }
    res.status(200).json({ statusCode: 200, data: term });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, error: err.message });
  }
});

/**
 * SMS-018 AC 3: Academic Head sets submission window for each term.
 * Only Academic Head can execute this.
 */
termRouter.patch(
  '/:termCode/submission-window',
  authenticate,
  requireRole(['ACADEMIC_HEAD']),
  async (req: Request, res: Response) => {
    try {
      const { termCode } = req.params;
      const { window_start, window_end } = req.body;

      if (!window_start || !window_end) {
        res.status(422).json({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'Both window_start and window_end are required to configure a term submission window.',
        });
        return;
      }

      const term = await termRepository.findByCode(termCode);
      if (!term) {
        res.status(404).json({ statusCode: 404, message: `Term '${termCode}' not found.` });
        return;
      }

      const start = new Date(window_start);
      const end = new Date(window_end);
      if (start >= end) {
        res.status(422).json({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'Submission window start must be before submission window end.',
        });
        return;
      }

      const updated = await termRepository.updateSubmissionWindow(termCode, window_start, window_end);

      res.status(200).json({
        statusCode: 200,
        message: `Submission window configured for term '${termCode}' (SMS-018 AC3).`,
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({ statusCode: 500, error: err.message });
    }
  }
);

/**
 * SMS-018 AC 1: Academic Head updates term status
 */
termRouter.patch(
  '/:termCode/status',
  authenticate,
  requireRole(['ACADEMIC_HEAD']),
  async (req: Request, res: Response) => {
    try {
      const { termCode } = req.params;
      const { status } = req.body;

      const allowedStatuses: TermStatus[] = [
        'UPCOMING',
        'ACTIVE',
        'CLOSED',
        'ARCHIVED',
        'Upcoming',
        'Active',
        'Closed',
        'Archived',
      ];
      if (!allowedStatuses.includes(status)) {
        res.status(422).json({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: `Invalid term status. Allowed values: UPCOMING, ACTIVE, CLOSED, ARCHIVED`,
        });
        return;
      }

      const updated = await termRepository.updateStatus(termCode, status);
      if (!updated) {
        res.status(404).json({ statusCode: 404, message: `Term '${termCode}' not found.` });
        return;
      }

      res.status(200).json({
        statusCode: 200,
        message: `Term '${termCode}' status updated to '${updated.status}'.`,
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({ statusCode: 500, error: err.message });
    }
  }
);
