import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 500, 10000),
  enableOfflineQueue: false,
  lazyConnect: false,
});

let redisErrorLogged = false;
redis.on('error', (err) => {
  if (!redisErrorLogged) {
    console.error('[Redis] Connection error:', err.message, '(suppressing further errors until reconnect)');
    redisErrorLogged = true;
  }
});

redis.on('connect', () => {
  redisErrorLogged = false;
  console.log('[Redis] Connected');
});

export { redis };
export default redis;
