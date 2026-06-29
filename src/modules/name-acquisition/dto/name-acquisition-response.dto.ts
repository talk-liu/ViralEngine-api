import { ApiProperty } from '@nestjs/swagger';

export class SaveNameAcquisitionRecordsResponseDto {
  @ApiProperty({ example: 2 })
  savedCount: number;
}

export class ClearNameAcquisitionRecordsResponseDto {
  @ApiProperty({ example: 10 })
  deletedCount: number;
}

export class NameAcquisitionRecordDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '广东' })
  region: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  createdAt: string;
}

export class NameAcquisitionRecordListResponseDto {
  @ApiProperty({ type: [NameAcquisitionRecordDto] })
  items: NameAcquisitionRecordDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}
