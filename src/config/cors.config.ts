import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** 开发环境：localhost / 127.0.0.1 / Wails 桌面端（端口动态） */
const DEV_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|wails\.localhost)(:\d+)?$/;

export function buildCorsOptions(
  nodeEnv: string,
  corsOrigins?: string,
): CorsOptions {
  const explicitOrigins =
    corsOrigins
      ?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) ?? [];

  const allowAll = explicitOrigins.includes('*');

  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowAll || explicitOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (nodeEnv !== 'production' && DEV_ORIGIN_PATTERN.test(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  };
}
