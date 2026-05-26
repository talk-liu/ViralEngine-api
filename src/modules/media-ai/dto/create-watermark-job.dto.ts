import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWatermarkJobDto {
  @ApiProperty({ description: '水印文字', example: 'ViralEngine' })
  @IsString()
  @MaxLength(128)
  text: string;

  @ApiPropertyOptional({
    description: '水印位置',
    enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
    default: 'bottom-right',
  })
  @IsOptional()
  @IsIn(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
  position?: string;

  @ApiPropertyOptional({ description: '字体大小', default: 24 })
  @IsOptional()
  fontSize?: number;
}
