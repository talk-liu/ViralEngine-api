import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LiveSliceManifestDto } from './live-slice-manifest.dto';

export class MediaJobResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'watermark' })
  type: string;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty()
  progress: number;

  @ApiPropertyOptional()
  inputUrl?: string;

  @ApiPropertyOptional()
  outputUrl?: string;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional()
  startedAt?: string;

  @ApiPropertyOptional()
  completedAt?: string;

  @ApiPropertyOptional({
    type: LiveSliceManifestDto,
    description: 'live_slice 任务完成后的切片清单（含签名下载 URL）',
  })
  manifest?: LiveSliceManifestDto;
}
