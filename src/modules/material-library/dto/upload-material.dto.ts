import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

function parseTagIds(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map(String);
        }
      } catch {
        // fall through
      }
    }
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

export class UploadMaterialDto {
  @Allow()
  @ApiProperty({ type: 'string', format: 'binary', description: '素材文件' })
  file?: unknown;

  @ApiPropertyOptional({ description: '显示名称，默认取原始文件名' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  name?: string;

  @ApiPropertyOptional({ description: '关联分组 ID，可不传' })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: '关联标签 ID 列表，可不传；支持 JSON 数组或逗号分隔',
  })
  @IsOptional()
  @Transform(({ value }) => parseTagIds(value))
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
