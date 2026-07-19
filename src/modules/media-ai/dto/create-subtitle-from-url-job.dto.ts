import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { PlatformId } from '../../platform/enums/platform-id.enum';
import { SUPPORTED_PLATFORM_VIDEO_URL_IDS } from '../constants/platform-video-url.constant';

export class CreateSubtitleFromUrlJobDto {
  @ApiProperty({
    description: '平台视频分享链接（抖音/快手/小红书/视频号/B站/TikTok 等）',
    example: 'https://www.douyin.com/jingxuan?modal_id=7635649097567539306',
  })
  @IsString()
  @MaxLength(2048)
  @IsUrl(
    {
      require_protocol: true,
      protocols: ['http', 'https'],
      require_tld: false,
    },
    { message: '视频链接格式无效' },
  )
  url: string;

  @ApiPropertyOptional({
    description: '可选：显式指定平台 ID，用于校验链接与平台是否一致',
    enum: SUPPORTED_PLATFORM_VIDEO_URL_IDS,
  })
  @IsOptional()
  @IsEnum(PlatformId)
  platformId?: PlatformId;

  @ApiPropertyOptional({
    description: '语言代码，留空自动检测',
    example: 'zh',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: '输出格式',
    enum: ['srt', 'vtt'],
    default: 'srt',
  })
  @IsOptional()
  @IsIn(['srt', 'vtt'])
  format?: string;
}
