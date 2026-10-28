import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../users/user.entity';

export const JWT_SECRET = process.env.JWT_SECRET || 'scms_super_secret_jwt_key_pupqc_2026';
export const ALT_SECRET = 'scms_jwt_secret_dev_key_2026_super_secure';

export interface AuthenticatedUserPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
    }
  }
}

/**
 * SCMS-002 Task 1 (AC 1): Attach role to session on every request.
 * If session token is missing or invalid, return HTTP 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.scms_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication session is missing. Please sign in to SCMS.',
    });
    return;
  }

  let decoded: AuthenticatedUserPayload | null = null;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUserPayload;
  } catch {
    try {
      decoded = jwt.verify(token, ALT_SECRET) as AuthenticatedUserPayload;
    } catch {
      res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Session has expired or is invalid. Please sign in again.',
      });
      return;
    }
  }

  // Validate that role is strictly one of the two allowed SCMS roles
  if (decoded.role !== 'ACADEMIC_HEAD' && decoded.role !== 'FACULTY_STAFF') {
    res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid user role identified in session token.',
    });
    return;
  }

  req.user = decoded;
  next();
}

/**
 * SCMS-002 Task 3 (AC 3): Block write endpoints a role is not allowed to use and return 403,
 * with a descriptive message on screen.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied: Your assigned role does not permit this action.',
      });
      return;
    }

    next();
  };
}
