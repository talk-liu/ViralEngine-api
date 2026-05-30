import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LiveSliceClipDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  startSec: number;

  @ApiProperty()
  endSec: number;

  @ApiProperty()
  durationSec: number;

  @ApiProperty()
  score: number;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional()
  productName?: string;

  @ApiPropertyOptional()
  productId?: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: [String] })
  topics: string[];

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional()
  videoUrl?: string;

  @ApiPropertyOptional()
  coverUrl?: string;

  @ApiPropertyOptional()
  subtitleUrl?: string;
}

export class LiveSliceManifestDto {
  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty()
  sourceDurationSec: number;

  @ApiProperty({ example: 'funasr' })
  asrEngine: string;

  @ApiProperty({ type: [LiveSliceClipDto] })
  clips: LiveSliceClipDto[];
}
