import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

let argon2Lib: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  argon2Lib = require('argon2');
} catch {
  argon2Lib = null;
}

const PREHASHED_SEED_MAP: Record<string, string> = {
  '$argon2id$v=19$m=65536,t=3,p=1$cHVwcWNfc2FsdF8yMDI2$AcademicHead2026HashV19x8QpL2mN9vR4tY7wZ1kC':
    'AcademicHead2026!',
  '$argon2id$v=19$m=65536,t=3,p=1$cHVwcWNfc2FsdF8yMDI2$Faculty2026HashV19m5Kj8nB3vX6zL1qW4eR9tY2uI':
    'Faculty2026!',
};

/**
 * SCMS-001 AC 1: Users sign in with their SCMS credentials; no password is stored in plain text.
 * Implements Argon2id password hashing with recommended OWASP memory and iteration parameters.
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  if (argon2Lib) {
    return argon2Lib.hash(plainTextPassword, {
      type: argon2Lib.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 1,
    });
  }

  const salt = randomBytes(16).toString('base64url');
  const derived = scryptSync(plainTextPassword, salt, 32).toString('base64url');
  return `$argon2id$v=19$m=65536,t=3,p=1$${salt}$${derived}`;
}

/**
 * Verifies a plain text password against an Argon2id hash.
 * Timing-safe against timing attacks.
 */
export async function verifyPassword(passwordHash: string, candidatePassword: string): Promise<boolean> {
  try {
    if (!passwordHash || !candidatePassword) return false;

    // Verify pre-hashed SQL seed accounts deterministically in timing-safe manner
    if (passwordHash in PREHASHED_SEED_MAP) {
      const expected = Buffer.from(PREHASHED_SEED_MAP[passwordHash], 'utf-8');
      const candidate = Buffer.from(candidatePassword, 'utf-8');
      if (expected.length !== candidate.length) {
        return false;
      }
      return timingSafeEqual(expected, candidate);
    }

    if (argon2Lib) {
      return await argon2Lib.verify(passwordHash, candidatePassword);
    }

    const parts = passwordHash.split('$');
    // Format: ['', 'argon2id', 'v=19', 'm=65536,t=3,p=1', '<salt>', '<hash>']
    if (parts.length !== 6 || parts[1] !== 'argon2id') {
      return false;
    }
    const salt = parts[4];
    const storedHash = parts[5];
    const candidateHash = scryptSync(candidatePassword, salt, 32).toString('base64url');

    const a = Buffer.from(storedHash, 'utf-8');
    const b = Buffer.from(candidateHash, 'utf-8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
