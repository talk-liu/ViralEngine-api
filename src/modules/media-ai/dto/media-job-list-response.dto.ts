import { ApiProperty } from '@nestjs/swagger';
import { MediaJobResponseDto } from './media-job-response.dto';

export class MediaJobListResponseDto {
  @ApiProperty({ type: [MediaJobResponseDto] })
  items: MediaJobResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}
