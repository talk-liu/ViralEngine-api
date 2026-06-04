import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  INDEXTTS2_PARAM_DEFAULTS,
  INDEXTTS2_PARAM_LIMITS,
} from '../constants/indextts2-params.constant';

function toOptionalInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalFloat(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  return fallback;
}

export class CreateTtsJobDto {
  @ApiProperty({ description: '待合成文本', example: '欢迎大家体验 IndexTTS2。' })
  @IsString()
  @MaxLength(10000)
  text: string;

  @ApiPropertyOptional({
    description:
      '情感控制：0=音色参考同源，1=情感参考音频，2=情感向量，3=情感描述文本',
    enum: [0, 1, 2, 3],
    default: INDEXTTS2_PARAM_DEFAULTS.emoControlMethod,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value, INDEXTTS2_PARAM_DEFAULTS.emoControlMethod))
  @IsInt()
  @IsIn([0, 1, 2, 3])
  emoControlMethod?: number = INDEXTTS2_PARAM_DEFAULTS.emoControlMethod;

  @ApiPropertyOptional({
    description: '情感权重（emo_alpha）',
    default: INDEXTTS2_PARAM_DEFAULTS.emoWeight,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalFloat(value, INDEXTTS2_PARAM_DEFAULTS.emoWeight))
  @IsNumber()
  @Min(0)
  @Max(1)
  emoWeight?: number = INDEXTTS2_PARAM_DEFAULTS.emoWeight;

  @ApiPropertyOptional({
    description:
      '情感向量 JSON 数组，8 维：[喜,怒,哀,惧,厌恶,低落,惊喜,平静]。emoControlMethod=2 时使用',
    example: '[0,0,0,0,0,0,0,1]',
  })
  @IsOptional()
  @IsString()
  emoVector?: string;

  @ApiPropertyOptional({
    description: '情感描述文本；emoControlMethod=3 时使用',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  emoText?: string;

  @ApiPropertyOptional({
    description: '情感随机采样',
    default: INDEXTTS2_PARAM_DEFAULTS.emoRandom,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value, INDEXTTS2_PARAM_DEFAULTS.emoRandom))
  @IsBoolean()
  emoRandom?: boolean = INDEXTTS2_PARAM_DEFAULTS.emoRandom;

  @ApiPropertyOptional({
    description: '分句最大 Token 数',
    default: INDEXTTS2_PARAM_DEFAULTS.maxTextTokensPerSegment,
    minimum: 20,
    maximum: INDEXTTS2_PARAM_LIMITS.maxTextTokens,
  })
  @IsOptional()
  @Transform(({ value }) =>
    toOptionalInt(value, INDEXTTS2_PARAM_DEFAULTS.maxTextTokensPerSegment),
  )
  @IsInt()
  @Min(20)
  @Max(INDEXTTS2_PARAM_LIMITS.maxTextTokens)
  maxTextTokensPerSegment?: number =
    INDEXTTS2_PARAM_DEFAULTS.maxTextTokensPerSegment;

  @ApiPropertyOptional({
    description: '句间静音（毫秒）',
    default: INDEXTTS2_PARAM_DEFAULTS.intervalSilence,
  })
  @IsOptional()
  @Transform(({ value }) =>
    toOptionalInt(value, INDEXTTS2_PARAM_DEFAULTS.intervalSilence),
  )
  @IsInt()
  @Min(0)
  @Max(5000)
  intervalSilence?: number = INDEXTTS2_PARAM_DEFAULTS.intervalSilence;

  @ApiPropertyOptional({
    description: '详细推理日志',
    default: INDEXTTS2_PARAM_DEFAULTS.verbose,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value, INDEXTTS2_PARAM_DEFAULTS.verbose))
  @IsBoolean()
  verbose?: boolean = INDEXTTS2_PARAM_DEFAULTS.verbose;

  @ApiPropertyOptional({ default: INDEXTTS2_PARAM_DEFAULTS.doSample })
  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value, INDEXTTS2_PARAM_DEFAULTS.doSample))
  @IsBoolean()
  doSample?: boolean = INDEXTTS2_PARAM_DEFAULTS.doSample;

  @ApiPropertyOptional({ default: INDEXTTS2_PARAM_DEFAULTS.topP })
  @IsOptional()
  @Transform(({ value }) => toOptionalFloat(value, INDEXTTS2_PARAM_DEFAULTS.topP))
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number = INDEXTTS2_PARAM_DEFAULTS.topP;

  @ApiPropertyOptional({ default: INDEXTTS2_PARAM_DEFAULTS.topK })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value, INDEXTTS2_PARAM_DEFAULTS.topK))
  @IsInt()
  @Min(0)
  @Max(100)
  topK?: number = INDEXTTS2_PARAM_DEFAULTS.topK;

  @ApiPropertyOptional({ default: INDEXTTS2_PARAM_DEFAULTS.temperature })
  @IsOptional()
  @Transform(({ value }) =>
    toOptionalFloat(value, INDEXTTS2_PARAM_DEFAULTS.temperature),
  )
  @IsNumber()
  @Min(0.1)
  @Max(2)
  temperature?: number = INDEXTTS2_PARAM_DEFAULTS.temperature;

  @ApiPropertyOptional({ default: INDEXTTS2_PARAM_DEFAULTS.lengthPenalty })
  @IsOptional()
  @Transform(({ value }) =>
    toOptionalFloat(value, INDEXTTS2_PARAM_DEFAULTS.lengthPenalty),
  )
  @IsNumber()
  @Min(-2)
  @Max(2)
  lengthPenalty?: number = INDEXTTS2_PARAM_DEFAULTS.lengthPenalty;

  @ApiPropertyOptional({ default: INDEXTTS2_PARAM_DEFAULTS.numBeams })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value, INDEXTTS2_PARAM_DEFAULTS.numBeams))
  @IsInt()
  @Min(1)
  @Max(10)
  numBeams?: number = INDEXTTS2_PARAM_DEFAULTS.numBeams;

  @ApiPropertyOptional({ default: INDEXTTS2_PARAM_DEFAULTS.repetitionPenalty })
  @IsOptional()
  @Transform(({ value }) =>
    toOptionalFloat(value, INDEXTTS2_PARAM_DEFAULTS.repetitionPenalty),
  )
  @IsNumber()
  @Min(0.1)
  @Max(20)
  repetitionPenalty?: number = INDEXTTS2_PARAM_DEFAULTS.repetitionPenalty;

  @ApiPropertyOptional({
    description: '生成 mel token 上限',
    default: INDEXTTS2_PARAM_DEFAULTS.maxMelTokens,
    maximum: INDEXTTS2_PARAM_LIMITS.maxMelTokens,
  })
  @IsOptional()
  @Transform(({ value }) =>
    toOptionalInt(value, INDEXTTS2_PARAM_DEFAULTS.maxMelTokens),
  )
  @IsInt()
  @Min(50)
  @Max(INDEXTTS2_PARAM_LIMITS.maxMelTokens)
  maxMelTokens?: number = INDEXTTS2_PARAM_DEFAULTS.maxMelTokens;
}
