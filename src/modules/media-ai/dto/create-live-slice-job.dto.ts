import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function toOptionalInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class CreateLiveSliceJobDto {
  @ApiPropertyOptional({
    description: '切片最短时长（秒）',
    default: 15,
    minimum: 5,
    maximum: 120,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value, 15))
  @IsInt()
  @Min(5)
  @Max(120)
  minDuration?: number = 15;

  @ApiPropertyOptional({
    description: '切片最长时长（秒）',
    default: 60,
    minimum: 10,
    maximum: 180,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value, 60))
  @IsInt()
  @Min(10)
  @Max(180)
  maxDuration?: number = 60;

  @ApiPropertyOptional({
    description: '最多输出切片数量',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value, 20))
  @IsInt()
  @Min(1)
  @Max(50)
  maxClips?: number = 20;

  @ApiPropertyOptional({
    description: '输出画面比例',
    enum: ['original', '9:16'],
    default: '9:16',
  })
  @IsOptional()
  @IsIn(['original', '9:16'])
  aspectRatio?: 'original' | '9:16' = '9:16';

  @ApiPropertyOptional({
    description: '语言代码，留空自动检测',
    example: 'zh',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description:
      '购物车商品 JSON 数组，用于 ASR 热词与高光关联。示例：[{"id":"1","title":"面膜","link":""}]',
  })
  @IsOptional()
  @IsString()
  cartItems?: string;

  @ApiPropertyOptional({
    description: '自定义高光识别策略（追加到系统 Prompt）',
  })
  @IsOptional()
  @IsString()
  highlightPrompt?: string;
}
