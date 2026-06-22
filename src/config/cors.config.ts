import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** 允许任意来源跨域（回显请求 Origin，兼容 credentials） */
export function buildCorsOptions(): CorsOptions {
  return {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  };
}
