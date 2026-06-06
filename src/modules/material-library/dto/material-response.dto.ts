import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialType } from '../enums/material-type.enum';

export class MaterialTagSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class MaterialGroupSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  materialCount: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class MaterialSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: MaterialType })
  type: MaterialType;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  groupId: string | null;

  @ApiPropertyOptional({ nullable: true })
  groupName?: string | null;

  @ApiProperty({ type: [MaterialTagSummaryDto] })
  tags: MaterialTagSummaryDto[];

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ description: '文件大小（字节）' })
  fileSize: string;

  @ApiProperty({ description: '签名访问 URL' })
  url: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class MaterialDetailDto extends MaterialSummaryDto {}

export class MaterialListResponseDto {
  @ApiProperty({ type: [MaterialSummaryDto] })
  items: MaterialSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class MaterialGroupListResponseDto {
  @ApiProperty({ type: [MaterialGroupSummaryDto] })
  items: MaterialGroupSummaryDto[];
}

export class MaterialTagListResponseDto {
  @ApiProperty({ type: [MaterialTagSummaryDto] })
  items: MaterialTagSummaryDto[];

  @ApiProperty()
  materialCount: number;
}

export class MaterialTagDetailDto extends MaterialTagSummaryDto {
  @ApiProperty()
  materialCount: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
