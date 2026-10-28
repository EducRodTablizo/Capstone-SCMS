import argon2 from 'argon2';

/**
 * SCMS-001 AC 1: Users sign in with their SCMS credentials; no password is stored in plain text.
 * Implements Argon2id password hashing with recommended OWASP memory and iteration parameters.
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  return argon2.hash(plainTextPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,       // 3 iterations
    parallelism: 1,
  });
}

/**
 * Verifies a plain text password against an Argon2id hash.
 * Timing-safe against timing attacks.
 */
export async function verifyPassword(passwordHash: string, candidatePassword: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, candidatePassword);
  } catch (error) {
    return false;
  }
}
