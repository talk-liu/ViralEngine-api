import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { LATENTSYNC_PARAM_DEFAULTS } from '../constants/latentsync-params.constant';

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return undefined;
}

export class CreateLatentSyncJobDto {
  @ApiPropertyOptional({
    description: '随机种子',
    default: LATENTSYNC_PARAM_DEFAULTS.seed,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(-1)
  @Max(2147483647)
  seed?: number;

  @ApiPropertyOptional({
    description: '扩散推理步数',
    default: LATENTSYNC_PARAM_DEFAULTS.inferenceSteps,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  inferenceSteps?: number;

  @ApiPropertyOptional({
    description: '引导系数',
    default: LATENTSYNC_PARAM_DEFAULTS.guidanceScale,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsNumber()
  @Min(0.5)
  @Max(5)
  guidanceScale?: number;

  @ApiPropertyOptional({
    description: '是否启用 DeepCache 加速',
    default: LATENTSYNC_PARAM_DEFAULTS.enableDeepcache,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  enableDeepcache?: boolean;

  @ApiPropertyOptional({
    description: '人脸关键点时序平滑系数',
    default: LATENTSYNC_PARAM_DEFAULTS.landmarkSmoothAlpha,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  @Max(1)
  landmarkSmoothAlpha?: number;
}
