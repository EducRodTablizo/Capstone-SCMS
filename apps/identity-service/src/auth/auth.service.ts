import { userRepository } from '../users/user.repository';
import { verifyPassword } from './password.util';
import { filterFacultyPersonalData } from '../privacy/privacy.middleware';
import { SafeFacultyProfile } from '../users/user.entity';
import { JWT_SECRET, AuthenticatedUserPayload, jwtUtil } from '../guards/role.guard';

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

  async getProfile(userId: string): Promise<SafeFacultyProfile | null> {
    const user = await userRepository.findById(userId);
    if (!user) return null;
    return filterFacultyPersonalData(user);
  }
}

export const authService = new AuthService();
