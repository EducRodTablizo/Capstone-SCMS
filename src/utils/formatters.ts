/**
 * Formatter Utilities conforming to PUP Caloocan OneUI Standards
 */

/**
 * Truncates UUIDs or long IDs to the format `a1111111...1108`
 */
export function truncateUuid(id?: string | null): string {
  if (!id) return '-';
  const str = String(id).trim();
  if (str.length <= 12) return str;
  return `${str.slice(0, 8)}...${str.slice(-4)}`;
}

