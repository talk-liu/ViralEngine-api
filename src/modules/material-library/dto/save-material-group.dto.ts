import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SaveMaterialGroupDto {
  @ApiProperty({ description: '分组名称' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  name: string;

  @ApiPropertyOptional({ description: '分组描述' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiPropertyOptional({ description: '排序权重，越小越靠前', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
