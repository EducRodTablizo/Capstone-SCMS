import Redis, { RedisOptions } from 'ioredis';
import { REDIS_URI } from './db';

/**
 * Creates an ioredis client instance configured for the provided URI.
 * Automatically enables TLS when connecting via 'rediss://' (e.g. Upstash).
 */
export function createRedisClient(customUri?: string): Redis {
  const uri = customUri || REDIS_URI;
  const isTls = uri.startsWith('rediss://');

  const options: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 5) return null; // stop retry after 5 attempts
      return Math.min(times * 500, 2000);
    },
  };

  if (isTls) {
    options.tls = {
      rejectUnauthorized: false,
    };
  }

  return new Redis(uri, options);
}

export { REDIS_URI };

