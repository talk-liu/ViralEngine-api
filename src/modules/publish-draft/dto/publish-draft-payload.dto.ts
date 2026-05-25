import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PlatformId } from '../../platform/enums/platform-id.enum';

export class PublishDraftCartItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2048)
  @ValidateIf((o: PublishDraftCartItemDto) => Boolean(o.link?.trim()))
  @IsUrl({}, { message: '商品链接格式不正确' })
  link: string;
}

export class PublishDraftLocationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(512)
  address: string;
}

export class PublishDraftPlatformOverrideDto {
  @ApiProperty()
  @IsBoolean()
  customized: boolean;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ type: [PublishDraftCartItemDto], default: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublishDraftCartItemDto)
  @ArrayMaxSize(5, { message: '每平台购物车商品最多 5 个' })
  cartItems?: PublishDraftCartItemDto[];

  @ApiPropertyOptional({ type: PublishDraftLocationDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PublishDraftLocationDto)
  location: PublishDraftLocationDto | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  coverAssetId?: string | null;
}

export class PublishDraftPayloadDto {
  @ApiProperty({ example: '夏日 vlog' })
  @IsString()
  @MaxLength(80, { message: '标题不能超过 80 字' })
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: '话题最多 10 个' })
  @MaxLength(64, { each: true })
  topics: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(9, { message: '标签最多 9 个' })
  @MaxLength(64, { each: true })
  tags: string[];

  @ApiProperty({ example: '' })
  @IsString()
  scheduleAt: string;

  @ApiProperty()
  @IsBoolean()
  showSchedule: boolean;

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/PublishDraftPlatformOverrideDto' },
  })
  @IsObject()
  platformOverrides: Partial<Record<PlatformId, PublishDraftPlatformOverrideDto>>;
}
