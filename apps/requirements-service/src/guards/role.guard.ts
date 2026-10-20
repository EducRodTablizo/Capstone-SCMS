import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'scms_jwt_secret_dev_key_2026_super_secure';

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

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({
      statusCode: 401,
      message: 'Invalid or expired session token.',
      error: 'Unauthorized',
    });
  }
}

export function requireRole(allowedRoles: ('ACADEMIC_HEAD' | 'FACULTY_STAFF')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        statusCode: 401,
        message: 'Authentication required.',
        error: 'Unauthorized',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        statusCode: 403,
        message: `Access Denied: Only ${allowedRoles.join(', ')} can perform this action (SMS-004 AC3).`,
        error: 'Forbidden',
      });
      return;
    }

    next();
  };
}
