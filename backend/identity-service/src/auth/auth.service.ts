import { userRepository } from '../users/user.repository';
import { verifyPassword } from './password.util';
import { filterFacultyPersonalData } from '../privacy/privacy.middleware';
import { SafeFacultyProfile } from '../users/user.entity';
import { JWT_SECRET, AuthenticatedUserPayload, jwtUtil } from '../guards/role.guard';
import { verifyToken, createClerkClient } from '@clerk/backend';
import * as jose from 'jose';

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: SafeFacultyProfile;
  error?: string;
}

export class AuthService {
  /**
   * SCMS-001: Authenticate with SCMS local accounts
   * AC 1: Passwords verified against Argon2id hash.
   * AC 2: Generic error on failure without disclosing whether email or password was wrong.
   * AC 3: Standalone session token issued solely by SCMS.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    if (!email || !password) {
      return {
        success: false,
        error: 'Invalid credentials. Please verify your email and password.',
      };
    }

    const user = await userRepository.findByEmail(email);

    // Timing-attack mitigation: If user not found, perform dummy verification to balance compute time
    if (!user) {
      // Dummy hash matching Argon2 format to balance execution time
      await verifyPassword('$argon2id$v=19$m=65536,t=3,p=1$c2FtcGxlc2FsdDEyMzQ1Ng$rV1z9X9v8Y4w7e6r5t4y3u2i1o0p', password);
      return {
        success: false,
        error: 'Invalid credentials. Please verify your email and password.',
      };
    }

    const isPasswordValid = await verifyPassword(user.password_hash, password);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid credentials. Please verify your email and password.',
      };
    }

    if (!user.is_active) {
      return {
        success: false,
        error: 'Account is disabled. Please contact the Academic Head.',
      };
    }

    // SCMS-002 AC 1: Attach role strictly to the session
    const payload: AuthenticatedUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: `${user.first_name} ${user.last_name}`,
    };

    const token = jwtUtil.sign(payload, JWT_SECRET, {
      expiresIn: '8h',
      issuer: 'scms-auth-service',
      audience: 'scms-client',
    });

    return {
      success: true,
      token,
      user: filterFacultyPersonalData(user),
    };
  }

  /**
   * Clerk OIDC Integration: Authenticate via Clerk session token
   * 1. Verifies Clerk JWT against Clerk JWKS/Issuer/Secret Key.
   * 2. Extracts email from claims or fetches user profile from Clerk API.
   * 3. Queries SCMS PostgreSQL users table.
   * 4. Enforces Invite-only policy (403 Forbidden if email not found).
   * 5. Issues local SCMS JWT with role and user details.
   */
  async clerkLogin(clerkToken: string): Promise<LoginResult & { statusCode?: number }> {
    if (!clerkToken) {
      return {
        success: false,
        statusCode: 400,
        error: 'Missing Clerk authentication token.',
      };
    }

    let email: string | null = null;
    const secretKey = process.env.CLERK_SECRET_KEY;
    const issuer = process.env.CLERK_ISSUER_URL;
    const isPlaceholderSecret = !secretKey || secretKey.startsWith('sk_test_placeholder');

    try {
      if (!isPlaceholderSecret) {
        // Full Clerk token verification
        const verifiedPayload = await verifyToken(clerkToken, {
          secretKey,
          issuer: issuer || undefined,
        });

        const claims = verifiedPayload as Record<string, any>;
        email = claims?.email || claims?.email_address || claims?.primary_email_address || null;

        // If email not present in token payload claims, query Clerk REST API
        if (!email && claims?.sub) {
          try {
            const clerk = createClerkClient({ secretKey });
            const clerkUser = await clerk.users.getUser(claims.sub);
            email = clerkUser.emailAddresses?.find((e: any) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
              || clerkUser.emailAddresses?.[0]?.emailAddress
              || null;
          } catch (fetchErr) {
            console.warn('[Clerk] Could not fetch user from Clerk API:', fetchErr);
          }
        }
      } else {
        // Development / mock fallback token decoding
        const decoded = jose.decodeJwt(clerkToken) as Record<string, any>;
        email = decoded?.email || decoded?.email_address || decoded?.primary_email_address || (decoded?.sub && decoded.sub.includes('@') ? decoded.sub : null);
      }
    } catch (err: any) {
      console.error('[Clerk Verification Error]:', err);
      return {
        success: false,
        statusCode: 401,
        error: 'Invalid or expired Clerk session token.',
      };
    }

    if (!email) {
      return {
        success: false,
        statusCode: 400,
        error: 'Unable to extract email from Clerk session.',
      };
    }

    // Look up email in local PostgreSQL users table
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Invite-only policy
      return {
        success: false,
        statusCode: 403,
        error: 'Invite-only policy: Your institutional email is not registered in SCMS. Please contact the Academic Head.',
      };
    }

    if (!user.is_active) {
      return {
        success: false,
        statusCode: 403,
        error: 'Account is disabled. Please contact the Academic Head.',
      };
    }

    // SCMS-002: Issue local session token with role
    const payload: AuthenticatedUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: `${user.first_name} ${user.last_name}`,
    };

    const token = jwtUtil.sign(payload, JWT_SECRET, {
      expiresIn: '8h',
      issuer: 'scms-auth-service',
      audience: 'scms-client',
    });

    return {
      success: true,
      statusCode: 200,
      token,
      user: filterFacultyPersonalData(user),
    };
  }

  async getProfile(userId: string): Promise<SafeFacultyProfile | null> {
    const user = await userRepository.findById(userId);
    if (!user) return null;
    return filterFacultyPersonalData(user);
  }
}

export const authService = new AuthService();
