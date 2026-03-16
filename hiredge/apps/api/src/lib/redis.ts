import Redis from 'ioredis';

// En développement sans Redis, on utilise un mock en mémoire
const createRedis = () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RedisMock = require('ioredis-mock');
      return new RedisMock();
    } catch {
      // ioredis-mock non disponible, on tente la connexion réelle
    }
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not set — using in-memory fallback');
    return null;
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 500, 10000),
    enableOfflineQueue: false,
  });
};

const rawRedis = createRedis();

if (rawRedis) {
  rawRedis.on('error', (err: Error) => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Redis] Connection error:', err.message);
    }
  });

  rawRedis.on('connect', () => {
    // connected
  });
}

// Resilient wrapper: all operations are safe even if Redis is unavailable
const redis = {
  async get(key: string): Promise<string | null> {
    try {
      return rawRedis ? await rawRedis.get(key) : null;
    } catch {
      return null;
    }
  },
  async setex(key: string, seconds: number, value: string): Promise<void> {
    try {
      if (rawRedis) await rawRedis.setex(key, seconds, value);
    } catch {
      // ignore
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (rawRedis) await rawRedis.set(key, value);
    } catch {
      // ignore
    }
  },
  async del(key: string): Promise<void> {
    try {
      if (rawRedis) await rawRedis.del(key);
    } catch {
      // ignore
    }
  },
  async incr(key: string): Promise<number> {
    try {
      return rawRedis ? await rawRedis.incr(key) : 0;
    } catch {
      return 0;
    }
  },
  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (rawRedis) await rawRedis.expire(key, seconds);
    } catch {
      // ignore
    }
  },
  async exists(key: string): Promise<number> {
    try {
      return rawRedis ? await rawRedis.exists(key) : 0;
    } catch {
      return 0;
    }
  },
};

export { redis };
export default redis;
