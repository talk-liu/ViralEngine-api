import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const VIDEO_DETAIL_PLATFORMS = [
  'douyin',
  'kuaishou',
  'bilibili',
  'xiaohongshu',
  'general',
] as const;

export type VideoDetailPlatform = (typeof VIDEO_DETAIL_PLATFORMS)[number];

export class GenerateVideoDetailsDto {
  @ApiProperty({
    type: [String],
    example: ['夏日防晒', '油皮护肤'],
    description: '输入话题，AI 将据此生成标题、描述、话题与标签',
  })
  @IsArray()
  @ArrayMinSize(1, { message: '至少提供 1 个话题' })
  @ArrayMaxSize(10, { message: '话题最多 10 个' })
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  topics: string[];

  @ApiPropertyOptional({
    example: '清透防晒喷雾',
    description: '关联商品名称，有助于生成卖货话术',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  productName?: string;

  @ApiPropertyOptional({
    enum: VIDEO_DETAIL_PLATFORMS,
    default: 'douyin',
    description: '目标发布平台，影响文案风格',
  })
  @IsOptional()
  @IsIn(VIDEO_DETAIL_PLATFORMS)
  platform?: VideoDetailPlatform = 'douyin';

  @ApiPropertyOptional({
    example: '口语化、紧迫感、适合直播切片二次发布',
    description: '额外风格或卖点说明',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  extraPrompt?: string;
}

export class GenerateVideoDetailsResponseDto {
  @ApiProperty({ example: '油皮夏天也能清爽出门！这支防晒真的绝了' })
  title: string;

  @ApiProperty({
    example:
      '夏天出油脱妆？这支防晒喷雾一喷成膜不闷痘，SPF50+ 通勤户外都够用…',
  })
  description: string;

  @ApiProperty({ type: [String], example: ['夏日防晒', '油皮护肤', '防晒喷雾'] })
  topics: string[];

  @ApiProperty({ type: [String], example: ['防晒', '护肤', '好物分享'] })
  tags: string[];

  @ApiProperty({
    example:
      '姐妹们夏天最怕什么？脸油还晒黑！今天这支防晒喷雾我真的按头安利…',
    description: '适合口播或字幕的卖货话术（约 80–200 字）',
  })
  salesScript: string;
}
