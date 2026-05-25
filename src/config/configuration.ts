export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH ?? 'docs',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
  sms: {
    codeTtl: parseInt(process.env.SMS_CODE_TTL ?? '300', 10),
    cooldownTtl: parseInt(process.env.SMS_COOLDOWN_TTL ?? '60', 10),
  },
  captcha: {
    ttl: parseInt(process.env.CAPTCHA_TTL ?? '300', 10),
  },
  cors: {
    origins: process.env.CORS_ORIGINS ?? '',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  oauth: {
    douyin: {
      clientKey: process.env.DOUYIN_CLIENT_KEY ?? '',
      clientSecret: process.env.DOUYIN_CLIENT_SECRET ?? '',
      redirectUri: process.env.DOUYIN_REDIRECT_URI ?? '',
    },
    kuaishou: {
      appId: process.env.KUAISHOU_APP_ID ?? '',
      appSecret: process.env.KUAISHOU_APP_SECRET ?? '',
      redirectUri: process.env.KUAISHOU_REDIRECT_URI ?? '',
    },
  },
});
