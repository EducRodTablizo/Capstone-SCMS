import { Router, Request, Response } from 'express';
import { calendarRepository } from './calendar.repository';
import { deadlineEngine } from './deadline.engine';
import { authenticate } from '../guards/role.guard';
import { CalendarSnapshotPayload } from './calendar.entity';

export const calendarRouter = Router();

/**
 * SMS-032: CCMS Calendar Snapshot Push Ingestion
 * AC 1: Ingests full snapshot with academic term, statutory holidays, and suspensions.
 * AC 2: Stored read-only in SMS and acknowledges push with success response.
 * AC 3: Idempotent: push with processed sync ID acknowledged without duplicate work.
 */
calendarRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const payload = req.body as CalendarSnapshotPayload;
    const syncId = payload.sync_id || payload.syncId;
    const termCode = payload.academic_term?.term_code || payload.term_code || payload.termId;

    if (!syncId || !termCode) {
      res.status(422).json({
        statusCode: 422,
        result: 'REJECTED',
        error: 'Unprocessable Entity',
        reason: 'Invalid CCMS calendar push payload: sync ID and term code are mandatory.',
        message: 'Invalid CCMS calendar push payload: sync ID and term code are mandatory.',
      });
      return;
    }

    const result = await calendarRepository.saveSnapshot(payload);

    res.status(200).json({
      statusCode: 200,
      syncId: result.sync_id,
      sync_id: result.sync_id,
      result: 'ACCEPTED',
      status: result.status,
      termId: result.term_code,
      term_code: result.term_code,
      counts: result.counts,
      events_ingested: result.events_count,
      reason:
        result.status === 'ALREADY_PROCESSED'
          ? 'CCMS calendar snapshot was already ingested and verified (Idempotent ACK).'
          : 'CCMS official academic calendar snapshot ingested successfully into SCMS.',
      message:
        result.status === 'ALREADY_PROCESSED'
          ? 'CCMS calendar snapshot was already ingested and verified (Idempotent ACK).'
          : 'CCMS official academic calendar snapshot ingested successfully into SCMS.',
    });
  } catch (err: any) {
    res.status(500).json({
      statusCode: 500,
      result: 'REJECTED',
      error: 'Internal Server Error',
      reason: 'Failed to ingest CCMS calendar snapshot: ' + err.message,
      message: 'Failed to ingest CCMS calendar snapshot: ' + err.message,
    });
  }
});

/**
 * GET /api/v1/calendar/events
 * Returns holidays & suspensions for a given term
 */
calendarRouter.get('/events', authenticate, async (req: Request, res: Response) => {
  try {
    const termCode = (req.query.term_code as string) || '2026-1S';
    const events = await calendarRepository.getEventsByTerm(termCode);
    res.status(200).json({
      statusCode: 200,
      term_code: termCode,
      count: events.length,
      data: events,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, error: err.message });
  }
});

/**
 * SMS-033: Intelligent Calendar-Aware Deadline Calculation Endpoint
 * POST /api/v1/calendar/calculate-deadline
 * Takes a candidate deadline and computes automatic pushouts based on weekends, holidays, and suspensions.
 */
calendarRouter.post('/calculate-deadline', authenticate, async (req: Request, res: Response) => {
  try {
    const { deadline, term_code } = req.body;
    if (!deadline) {
      res.status(422).json({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Deadline is required for calculation.',
      });
      return;
    }

    const termCode = term_code || '2026-1S';
    const result = await deadlineEngine.calculateAdjustedDeadline(deadline, termCode);

    res.status(200).json({
      statusCode: 200,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, error: err.message });
  }
});
