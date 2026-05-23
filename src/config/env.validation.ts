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
}
