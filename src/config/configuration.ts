import {
  buildLocalHttpsBaseUrl,
  normalizeBaseUrl,
  resolveOAuthRedirectUri,
} from './oauth-url.util';

export default () => {
  const httpsEnabled = process.env.HTTPS_ENABLED === 'true';
  const httpsHost = process.env.HTTPS_HOST ?? '127.0.0.1';
  const httpsPort = parseInt(process.env.HTTPS_PORT ?? '3443', 10);
  const oauthCallbackBaseUrl = normalizeBaseUrl(
    process.env.OAUTH_CALLBACK_BASE_URL ||
      (httpsEnabled ? buildLocalHttpsBaseUrl(httpsHost, httpsPort) : ''),
  );

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    https: {
      enabled: httpsEnabled,
      host: httpsHost,
      port: httpsPort,
      keyPath: process.env.SSL_KEY_PATH ?? 'certs/dev-key.pem',
      certPath: process.env.SSL_CERT_PATH ?? 'certs/dev-cert.pem',
      callbackBaseUrl: oauthCallbackBaseUrl,
    },
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
      tencent: {
        secretId: process.env.TENCENT_SMS_SECRET_ID ?? '',
        secretKey: process.env.TENCENT_SMS_SECRET_KEY ?? '',
        sdkAppId: process.env.TENCENT_SMS_SDK_APP_ID ?? '',
        signName: process.env.TENCENT_SMS_SIGN_NAME ?? '',
        templateId: process.env.TENCENT_SMS_TEMPLATE_ID ?? '',
        region: process.env.TENCENT_SMS_REGION ?? 'ap-guangzhou',
      },
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
    storage: {
      localPath: process.env.STORAGE_LOCAL_PATH ?? 'storage',
      publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? '',
      signedUrlTtl: parseInt(process.env.STORAGE_SIGNED_URL_TTL ?? '3600', 10),
      signedUrlSecret:
        process.env.STORAGE_SIGNED_URL_SECRET ?? process.env.JWT_SECRET ?? '',
    },
    mediaAi: {
      queueKey: process.env.MEDIA_AI_QUEUE_KEY ?? 'media-ai:jobs',
      queuePrefix:
        process.env.MEDIA_AI_QUEUE_PREFIX ??
        process.env.MEDIA_AI_QUEUE_KEY ??
        'media-ai:jobs',
      workerSecret:
        process.env.MEDIA_WORKER_SECRET ?? 'change-me-media-worker-secret',
      outputRetentionHours: parseInt(
        process.env.MEDIA_JOB_OUTPUT_RETENTION_HOURS ?? '12',
        10,
      ),
    },
    llm: {
      apiBase:
        process.env.LLM_API_BASE ??
        'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: process.env.LLM_API_KEY ?? '',
      model: process.env.LLM_MODEL ?? 'qwen-plus',
      timeoutMs: parseInt(process.env.LLM_TIMEOUT ?? '120', 10) * 1000,
    },
    publishDraft: {
      maxPerUser: parseInt(process.env.DRAFT_MAX_COUNT_PER_USER ?? '100', 10),
      videoMaxBytes: parseInt(
        process.env.DRAFT_VIDEO_MAX_BYTES ?? String(4 * 1024 * 1024 * 1024),
        10,
      ),
      coverMaxBytes: parseInt(
        process.env.DRAFT_COVER_MAX_BYTES ?? String(10 * 1024 * 1024),
        10,
      ),
    },
    materialLibrary: {
      maxPerUser: parseInt(
        process.env.MATERIAL_MAX_COUNT_PER_USER ?? '500',
        10,
      ),
      imageMaxBytes: parseInt(
        process.env.MATERIAL_IMAGE_MAX_BYTES ?? String(10 * 1024 * 1024),
        10,
      ),
      audioMaxBytes: parseInt(
        process.env.MATERIAL_AUDIO_MAX_BYTES ?? String(100 * 1024 * 1024),
        10,
      ),
      videoMaxBytes: parseInt(
        process.env.MATERIAL_VIDEO_MAX_BYTES ?? String(4 * 1024 * 1024 * 1024),
        10,
      ),
    },
    oauth: {
      douyin: {
        clientKey: process.env.DOUYIN_CLIENT_KEY ?? '',
        clientSecret: process.env.DOUYIN_CLIENT_SECRET ?? '',
        redirectUri: resolveOAuthRedirectUri(
          process.env.DOUYIN_REDIRECT_URI,
          oauthCallbackBaseUrl,
          'douyin',
        ),
      },
      kuaishou: {
        appId: process.env.KUAISHOU_APP_ID ?? '',
        appSecret: process.env.KUAISHOU_APP_SECRET ?? '',
        redirectUri: resolveOAuthRedirectUri(
          process.env.KUAISHOU_REDIRECT_URI,
          oauthCallbackBaseUrl,
          'kuaishou',
        ),
      },
    },
  };
};
