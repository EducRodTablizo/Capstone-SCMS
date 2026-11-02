import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pup_scms_super_secret_jwt_key_sprint1_2026';
const ALT_SECRET = 'scms_super_secret_jwt_key_pupqc_2026';
const DEV_SECRET = 'scms_jwt_secret_dev_key_2026_super_secure';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'ACADEMIC_HEAD' | 'FACULTY_STAFF';
  first_name: string;
  last_name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.cookies?.scms_session;

  if (!token) {
    res.status(401).json({
      statusCode: 401,
      message: 'Authentication required. Please sign in to SCMS.',
      error: 'Unauthorized',
    });
    return;
  }

  let payload: AuthenticatedUser | null = null;
  const secrets = [JWT_SECRET, ALT_SECRET, DEV_SECRET];
  for (const secret of secrets) {
    try {
      payload = jwt.verify(token, secret) as AuthenticatedUser;
      break;
    } catch {
      // try next
    }
  }

  if (!payload) {
    console.error('[academic-catalog-service auth] Failed to verify token with any known JWT_SECRET');
    res.status(401).json({
      statusCode: 401,
      message: 'Invalid or expired session token.',
      error: 'Unauthorized',
    });
    return;
  }

  req.user = payload;
  next();
}

export function requireRole(allowedRoles: ('ACADEMIC_HEAD' | 'FACULTY_STAFF')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        statusCode: 401,
        message: 'Authentication required. Please sign in to SCMS.',
        error: 'Unauthorized',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        statusCode: 403,
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
        error: 'Forbidden',
      });
      return;
    }

    next();
  };
}
