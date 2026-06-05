import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { FLASHHEAD_PARAM_DEFAULTS } from '../constants/flashhead-params.constant';

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

export class CreateFlashHeadJobDto {
  @ApiPropertyOptional({
    description: '随机种子',
    default: FLASHHEAD_PARAM_DEFAULTS.seed,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  @Max(2147483647)
  seed?: number;

  @ApiPropertyOptional({
    description: '是否启用人脸检测与裁剪',
    default: FLASHHEAD_PARAM_DEFAULTS.useFaceCrop,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  useFaceCrop?: boolean;

  @ApiPropertyOptional({
    description: '音频编码模式',
    enum: ['once', 'stream'],
    default: FLASHHEAD_PARAM_DEFAULTS.audioEncodeMode,
  })
  @IsOptional()
  @IsIn(['once', 'stream'])
  audioEncodeMode?: 'once' | 'stream';
}
