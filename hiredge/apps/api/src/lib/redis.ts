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
    console.warn('[Redis] REDIS_URL not set — running without Redis cache');
    return null;
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => {
      if (times > 5) return null; // Stop reconnecting after 5 attempts
      return Math.min(times * 1000, 5000);
    },
    lazyConnect: true,
  });
};

const rawRedis = createRedis();
let redisAvailable = false;
let loggedError = false;

if (rawRedis) {
  rawRedis.on('error', (err: Error) => {
    redisAvailable = false;
    if (!loggedError) {
      console.warn(`[Redis] Unavailable: ${err.message || 'connection failed'} — running without cache`);
      loggedError = true;
    }
  });

  rawRedis.on('connect', () => {
    redisAvailable = true;
    loggedError = false;
    console.log('[Redis] Connected');
  });

  // Attempt initial connection
  rawRedis.connect().catch(() => {
    // Already handled by error event
  });
}

// Resilient wrapper: all operations are safe even if Redis is unavailable
const redis = {
  async get(key: string): Promise<string | null> {
    if (!rawRedis || !redisAvailable) return null;
    try {
      return await rawRedis.get(key);
    } catch {
      return null;
    }
  },
  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!rawRedis || !redisAvailable) return;
    try {
      await rawRedis.setex(key, seconds, value);
    } catch {
      // ignore
    }
  },
  async set(key: string, value: string, ...args: any[]): Promise<void> {
    if (!rawRedis || !redisAvailable) return;
    try {
      // Support redis.set(key, value, 'EX', ttl) syntax
      if (args.length >= 2 && args[0] === 'EX') {
        await rawRedis.setex(key, args[1] as number, value);
      } else {
        await rawRedis.set(key, value);
      }
    } catch {
      // ignore
    }
  },
  async del(key: string): Promise<void> {
    if (!rawRedis || !redisAvailable) return;
    try {
      await rawRedis.del(key);
    } catch {
      // ignore
    }
  },
  async incr(key: string): Promise<number> {
    if (!rawRedis || !redisAvailable) return 0;
    try {
      return await rawRedis.incr(key);
    } catch {
      return 0;
    }
  },
  async expire(key: string, seconds: number): Promise<void> {
    if (!rawRedis || !redisAvailable) return;
    try {
      await rawRedis.expire(key, seconds);
    } catch {
      // ignore
    }
  },
  async exists(key: string): Promise<number> {
    if (!rawRedis || !redisAvailable) return 0;
    try {
      return await rawRedis.exists(key);
    } catch {
      return 0;
    }
  },
};

export { redis };
export default redis;
