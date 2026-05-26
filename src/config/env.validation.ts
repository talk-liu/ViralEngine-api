import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  DB_SYNCHRONIZE: boolean;

  @IsString()
  REDIS_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsInt()
  @Min(0)
  REDIS_DB: number;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  SWAGGER_ENABLED: boolean;

  @IsString()
  SWAGGER_PATH: string;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string = '7d';

  @IsOptional()
  @IsInt()
  @Min(1000)
  THROTTLE_TTL?: number = 60000;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT?: number = 100;

  @IsOptional()
  @IsInt()
  @Min(60)
  SMS_CODE_TTL?: number = 300;

  @IsOptional()
  @IsInt()
  @Min(30)
  SMS_COOLDOWN_TTL?: number = 60;

  @IsOptional()
  @IsInt()
  @Min(60)
  CAPTCHA_TTL?: number = 300;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  HTTPS_ENABLED?: boolean;

  @IsOptional()
  @IsString()
  HTTPS_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  HTTPS_PORT?: number;

  @IsOptional()
  @IsString()
  OAUTH_CALLBACK_BASE_URL?: string;

  @IsOptional()
  @IsString()
  SSL_KEY_PATH?: string;

  @IsOptional()
  @IsString()
  SSL_CERT_PATH?: string;

  @IsOptional()
  @IsString()
  ENCRYPTION_KEY?: string;

  @IsOptional()
  @IsString()
  DOUYIN_CLIENT_KEY?: string;

  @IsOptional()
  @IsString()
  DOUYIN_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  DOUYIN_REDIRECT_URI?: string;

  @IsOptional()
  @IsString()
  KUAISHOU_APP_ID?: string;

  @IsOptional()
  @IsString()
  KUAISHOU_APP_SECRET?: string;

  @IsOptional()
  @IsString()
  KUAISHOU_REDIRECT_URI?: string;

  @IsOptional()
  @IsString()
  STORAGE_LOCAL_PATH?: string;

  @IsOptional()
  @IsString()
  STORAGE_PUBLIC_BASE_URL?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  STORAGE_SIGNED_URL_TTL?: number;

  @IsOptional()
  @IsString()
  STORAGE_SIGNED_URL_SECRET?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  DRAFT_MAX_COUNT_PER_USER?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  DRAFT_VIDEO_MAX_BYTES?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  DRAFT_COVER_MAX_BYTES?: number;

  @IsOptional()
  @IsString()
  MEDIA_AI_QUEUE_KEY?: string;

  @IsOptional()
  @IsString()
  MEDIA_WORKER_SECRET?: string;
}
