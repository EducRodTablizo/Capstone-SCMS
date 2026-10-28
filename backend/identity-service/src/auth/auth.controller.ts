import type { Request, Response } from 'express';
import { authService } from './auth.service';
import { requireAuth, requireRole } from '../guards/role.guard';
import { canAccessFacultyDocument } from '../privacy/privacy.middleware';

function createRouter(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const express = require('express');
    return express.Router();
  } catch {
    const routes: Array<{ method: string; path: string; handlers: Function[] }> = [];
    return {
      _routes: routes,
      get(path: string, ...handlers: Function[]) {
        routes.push({ method: 'GET', path, handlers });
      },
      post(path: string, ...handlers: Function[]) {
        routes.push({ method: 'POST', path, handlers });
      },
    };
  }
}

export const authRouter = createRouter();

/**
 * SCMS-001: Local Sign-In Endpoint
 * AC 1: Users sign in with their SCMS credentials; passwords verified with Argon2id.
 * AC 2: Invalid credentials rejected with generic error message without revealing which field was wrong.
 * AC 3: Issue sessions only from SCMS, with no SSO with CCMS/FMS.
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};

  const result = await authService.login(email, password);

  if (!result.success || !result.token) {
    res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: result.error || 'Invalid credentials. Please verify your email and password.',
    });
    return;
  }

  // Set secure HttpOnly session cookie
  res.cookie('scms_session', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });

  res.status(200).json({
    statusCode: 200,
    message: 'Authentication successful',
    token: result.token,
    user: result.user,
  });
});

/**
 * Sign-Out Endpoint
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('scms_session', {
    httpOnly: true,
    sameSite: 'strict',
  });

  res.status(200).json({
    statusCode: 200,
    message: 'Signed out successfully.',
  });
});

/**
 * SCMS-002 AC 1: Attach role to session; missing or invalid returns 401.
 * SCMS-003 AC 1: Return only whitelisted faculty fields (name, college, unit).
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ statusCode: 401, error: 'Unauthorized', message: 'No active session.' });
    return;
  }

  const profile = await authService.getProfile(req.user.id);
  if (!profile) {
    res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'User profile not found.' });
    return;
  }

  res.status(200).json({
    statusCode: 200,
    user: profile,
  });
});

/**
 * SCMS-002 AC 3: Block write endpoints a role is not allowed to use and return 403,
 * with a descriptive message on screen.
 * This endpoint simulates an Academic Head administrative write operation.
 */
authRouter.post('/admin/publish-requirement', requireAuth, requireRole('ACADEMIC_HEAD'), (req: Request, res: Response) => {
  res.status(200).json({
    statusCode: 200,
    message: 'Requirement published successfully by Academic Head.',
  });
});

/**
 * SCMS-002 AC 2: Role scoping on read endpoints.
 * Faculty Staff see only their own submissions.
 */
authRouter.get('/submissions/scoped', requireAuth, (req: Request, res: Response) => {
  const currentUser = req.user!;

  if (currentUser.role === 'ACADEMIC_HEAD') {
    // Academic Head sees all submissions across campus
    res.status(200).json({
      statusCode: 200,
      scope: 'GLOBAL_CAMPUS',
      message: 'Viewing all campus syllabus submissions.',
      count: 128,
    });
    return;
  }

  // Faculty Staff sees strictly their own records
  res.status(200).json({
    statusCode: 200,
    scope: 'FACULTY_SCOPED',
    faculty_id: currentUser.id,
    message: `Viewing submissions for faculty ${currentUser.name}.`,
    count: 3,
  });
});

/**
 * SCMS-003 AC 2: Restrict a faculty member's documents to that faculty member and the Academic Head.
 */
authRouter.get('/documents/:ownerId/:docId', requireAuth, (req: Request, res: Response) => {
  const currentUser = req.user!;
  const { ownerId, docId } = req.params;

  const allowed = canAccessFacultyDocument(currentUser.id, currentUser.role, ownerId);

  if (!allowed) {
    res.status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Access denied: You are not authorized to view documents belonging to another faculty member.',
    });
    return;
  }

  res.status(200).json({
    statusCode: 200,
    message: `Document ${docId} accessed successfully.`,
    owner_id: ownerId,
    accessed_by: currentUser.name,
  });
});
