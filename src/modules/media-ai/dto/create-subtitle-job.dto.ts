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
    description: '输出格式',
    enum: ['srt', 'vtt'],
    default: 'srt',
  })
  @IsOptional()
  @IsIn(['srt', 'vtt'])
  format?: string;
}
