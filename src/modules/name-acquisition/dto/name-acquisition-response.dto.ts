import { ApiProperty } from '@nestjs/swagger';

export class SaveNameAcquisitionRecordsResponseDto {
  @ApiProperty({ example: 2 })
  savedCount: number;
}
