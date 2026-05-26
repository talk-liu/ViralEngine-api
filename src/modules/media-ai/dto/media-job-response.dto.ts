import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
