import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateSubtitleJobDto {
  @ApiPropertyOptional({
    description: '语言代码，留空自动检测',
    example: 'zh',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: '输出格式（txt 为纯文本，不含时间轴）',
    enum: ['srt', 'vtt', 'txt'],
    default: 'srt',
  })
  @IsOptional()
  @IsIn(['srt', 'vtt', 'txt'])
  format?: string;
}
