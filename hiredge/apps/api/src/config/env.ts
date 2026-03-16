const isProduction = process.env.NODE_ENV === 'production';

// In production, JWT secrets MUST be explicitly set
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-change-me')) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Do not use default secrets.');
}
if (isProduction && (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'dev-refresh-secret-change-me')) {
  throw new Error('FATAL: JWT_REFRESH_SECRET must be set in production. Do not use default secrets.');
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8081',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessExpiresIn: '15m',
    refreshExpiresIn: '30d',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },

  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    index: process.env.PINECONE_INDEX || 'hiredge-jobs',
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
    bucket: process.env.S3_BUCKET || 'hiredge-files',
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@hiredge.app',
  },

  adzuna: {
    appId: process.env.ADZUNA_APP_ID || '',
    appKey: process.env.ADZUNA_APP_KEY || '',
  },

  jsearch: {
    apiKey: process.env.JSEARCH_API_KEY || '',
  },

  daily: {
    apiKey: process.env.DAILY_API_KEY || '',
  },
} as const;

// Flat alias for backward compatibility
export const env = {
  NODE_ENV: config.nodeEnv,
  PORT: config.port,
  API_URL: config.apiUrl,
  CORS_ORIGIN: config.corsOrigin,
  JWT_SECRET: config.jwt.secret,
  JWT_REFRESH_SECRET: config.jwt.refreshSecret,
  OPENAI_API_KEY: config.openai.apiKey,
  ANTHROPIC_API_KEY: config.anthropic.apiKey,
} as const;
