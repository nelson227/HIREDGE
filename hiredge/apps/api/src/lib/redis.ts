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
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 500, 10000),
    enableOfflineQueue: false,
  });
};

const redis = createRedis();

redis.on('error', (err: Error) => {
  // Silencieux en dev — le mock ne devrait pas émettre d'erreurs
  if (process.env.NODE_ENV === 'production') {
    console.error('[Redis] Connection error:', err.message);
  }
});

redis.on('connect', () => {
  // connected
});

export { redis };
export default redis;
