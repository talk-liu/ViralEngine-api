import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class NameAcquisitionRecordItemDto {
  @ApiPropertyOptional({ example: '广东', default: '' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  region?: string;

  @ApiProperty({
    example:
      'https://www.douyin.com/user/MS4wLjABAAAAcPoN3Y-ngXSn7ooejOum-cWPYuiSkhEkyEGLNs8lxBs',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: '链接必须是 http:// 或 https:// 格式' },
  )
  url: string;
}

export class SaveNameAcquisitionRecordsDto {
  @ApiProperty({ type: [NameAcquisitionRecordItemDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NameAcquisitionRecordItemDto)
  records: NameAcquisitionRecordItemDto[];
}
