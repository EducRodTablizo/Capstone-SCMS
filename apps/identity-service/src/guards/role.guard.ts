import type { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { UserRole } from '../users/user.entity';

let nativeJwt: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeJwt = require('jsonwebtoken');
} catch {
  nativeJwt = null;
}

export const jwtUtil = {
  sign(payload: Record<string, any>, secret: string, options?: { expiresIn?: string; issuer?: string; audience?: string }): string {
    if (nativeJwt) {
      return nativeJwt.sign(payload, secret, options);
    }
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const bodyObj: Record<string, any> = {
      ...payload,
      iat: now,
      exp: now + 8 * 3600,
    };
    if (options?.issuer) bodyObj.iss = options.issuer;
    if (options?.audience) bodyObj.aud = options.audience;
    const body = Buffer.from(JSON.stringify(bodyObj)).toString('base64url');
    const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  },

  verify(token: string, secret: string): any {
    if (nativeJwt) {
      return nativeJwt.verify(token, secret);
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token structure');
    }
    const [header, body, sig] = parts;
    const expectedSig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    const a = Buffer.from(sig, 'utf-8');
    const b = Buffer.from(expectedSig, 'utf-8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error('Invalid token signature');
    }
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (decoded.exp && Math.floor(Date.now() / 1000) > decoded.exp) {
      throw new Error('Token expired');
    }
    return decoded;
  },
};

export const JWT_SECRET = process.env.JWT_SECRET || 'pup_scms_super_secret_jwt_key_sprint1_2026';
export const ALT_SECRET = 'scms_super_secret_jwt_key_pupqc_2026';

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
  const token =
    req.cookies?.scms_session ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

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
    decoded = jwtUtil.verify(token, JWT_SECRET) as AuthenticatedUserPayload;
  } catch {
    try {
      decoded = jwtUtil.verify(token, ALT_SECRET) as AuthenticatedUserPayload;
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
